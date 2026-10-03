"""HTTP endpoints for user registration, login, OAuth, and password recovery."""

import logging

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from .authentication import MongoJWTAuthentication
from .serializers import (
    AccountProfileSerializer, AccountProfileUpdateSerializer,
    ClerkExchangeSerializer,
    ForgotPasswordSerializer, LoginSerializer, MessageSerializer, RefreshSerializer,
    RegisterSerializer, ResetPasswordSerializer, SocialLoginResponseSerializer,
    SocialLoginSerializer, TokenPairSerializer, UnifiedLoginResponseSerializer,
    UnifiedLoginSerializer, UserSerializer,
)
from accounts.cloudinary_media import delete_asset, upload_user_avatar
from accounts.documents import Parent, Student, User
from accounts.email_registry import ACCOUNT_LABELS, email_owners
from mongoengine.errors import NotUniqueError
from .services import (
    PasswordResetTokenError, SocialTokenError, admin_token_pair, clerk_exchange, login_user, refresh_token_pair,
    register_user, request_user_password_reset, reset_user_password, social_login,
    token_pair_for, user_payload, verify_clerk_session_token, verify_facebook_access_token, verify_google_id_token,
)

logger = logging.getLogger(__name__)


class PublicAuthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'no-store'
        return response


class LoginThrottle(SimpleRateThrottle):
    scope = 'user_login'
    rate = '10/minute'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class ForgotPasswordThrottle(SimpleRateThrottle):
    scope = 'forgot_password'
    rate = '5/hour'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class ResetPasswordThrottle(SimpleRateThrottle):
    scope = 'reset_password'
    rate = '20/hour'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class ForgotPasswordView(PublicAuthView):
    throttle_classes = [ForgotPasswordThrottle]

    @extend_schema(tags=['Tài khoản'], request=ForgotPasswordSerializer, responses={200: MessageSerializer})
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            request_user_password_reset(serializer.validated_data['email'])
        except Exception:
            # Keep the same response for every email to avoid account discovery.
            logger.exception('Could not deliver user password-reset email')
        return Response({
            'message': 'Đã tiếp nhận yêu cầu. Nếu email hợp lệ và chưa vượt giới hạn, bạn sẽ nhận liên kết có hiệu lực 5 phút. Kiểm tra cả thư rác; nếu chưa nhận được, hãy thử lại sau 60 giây.'
        })


class ResetPasswordView(PublicAuthView):
    throttle_classes = [ResetPasswordThrottle]

    @extend_schema(tags=['Tài khoản'], request=ResetPasswordSerializer, responses={200: MessageSerializer})
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reset_user_password(
                raw_token=serializer.validated_data['token'],
                new_password=serializer.validated_data['new_password'],
            )
        except PasswordResetTokenError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại.'})


class RegisterView(PublicAuthView):
    @extend_schema(tags=['Tài khoản'], request=RegisterSerializer, responses={201: TokenPairSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = register_user(**serializer.validated_data)
        except SocialTokenError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(token_pair_for(user), status=status.HTTP_201_CREATED)


class LoginView(PublicAuthView):
    throttle_classes = [LoginThrottle]
    @extend_schema(tags=['Tài khoản'], request=LoginSerializer, responses={200: TokenPairSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = login_user(**serializer.validated_data)
        except SocialTokenError as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(token_pair_for(user))


class UnifiedLoginView(PublicAuthView):
    """Authenticate a website user or tutor from one shared login form."""

    throttle_classes = [LoginThrottle]

    @extend_schema(
        tags=['Tài khoản'], request=UnifiedLoginSerializer,
        responses={200: UnifiedLoginResponseSerializer},
    )
    def post(self, request):
        serializer = UnifiedLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        email = values['email'].strip().lower()
        account_type = values.get('account_type', 'auto')

        # The tutor collection has a separate password and JWT actor.  Keep
        # those boundaries intact while providing one predictable endpoint.
        from tutors.documents import Tutor
        from api.v1.tutors.services import TutorAuthError, login_tutor, tutor_token_pair

        owners = email_owners(email)
        owner_types = list(dict.fromkeys(owner['kind'] for owner in owners))
        has_user = any(kind in {'user', 'student', 'parent'} for kind in owner_types)
        has_tutor = 'tutor' in owner_types
        has_admin = 'admin' in owner_types
        if account_type == 'auto' and has_admin:
            from accounts.documents import Admin
            admin = Admin.objects(email=email).first()
            if admin is None or not admin.check_password(values['password']):
                return Response({'detail': 'Email hoặc mật khẩu không chính xác.'}, status=status.HTTP_401_UNAUTHORIZED)
            if admin.status != Admin.STATUS_ACTIVE:
                return Response({'detail': 'Tài khoản quản trị viên đã bị vô hiệu hóa.'}, status=status.HTTP_403_FORBIDDEN)
            return Response(admin_token_pair(admin), headers={'Cache-Control': 'no-store'})

        requested_matches = (
            account_type in owner_types
            or (account_type == 'user' and has_user)
        )
        if account_type != 'auto' and owner_types and not requested_matches:
            actual = ', '.join(ACCOUNT_LABELS[kind] for kind in owner_types)
            return Response({
                'detail': f'Email này thuộc tài khoản {actual}, không phải loại đã chọn.',
                'code': 'account_type_mismatch',
                'available_account_types': owner_types,
            }, status=status.HTTP_409_CONFLICT)

        try:
            if account_type == 'tutor' or (account_type == 'auto' and has_tutor):
                tutor = login_tutor(email=email, password=values['password'])
                payload = tutor_token_pair(tutor)
                payload['actor_type'] = 'tutor'
                payload['account'] = payload.pop('tutor')
                return Response(payload, headers={'Cache-Control': 'no-store'})

            user = login_user(email=email, password=values['password'])
            resolved_type = _account_type_for(user)
            if account_type in {'student', 'parent'} and resolved_type != account_type:
                return Response({
                    'detail': f'Email này không phải tài khoản {account_type}.',
                    'code': 'account_type_mismatch',
                }, status=status.HTTP_409_CONFLICT)
            payload = token_pair_for(user)
            payload['actor_type'] = resolved_type
            payload['account'] = payload.pop('user')
            return Response(payload, headers={'Cache-Control': 'no-store'})
        except (SocialTokenError, TutorAuthError) as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)


class ClerkExchangeView(PublicAuthView):
    """Exchange a verified Clerk browser session for a Django API JWT pair."""

    throttle_classes = [LoginThrottle]

    @extend_schema(tags=['Tài khoản'], request=ClerkExchangeSerializer, responses={200: TokenPairSerializer})
    def post(self, request):
        serializer = ClerkExchangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        try:
            claims = verify_clerk_session_token(values['clerk_token'])
            email = (str(claims.get('email') or '') or values['email']).strip().lower()

            # Tutor accounts are issued by Admin and live in their own
            # collection. A Clerk login with that verified email must receive
            # a tutor JWT instead of silently creating a student User.
            from tutors.documents import Tutor
            from api.v1.tutors.services import tutor_token_pair

            from accounts.documents import Admin
            admin = Admin.objects(email=email).first()
            if admin is not None:
                if admin.status != Admin.STATUS_ACTIVE:
                    return Response(
                        {'detail': 'Tài khoản quản trị viên đã bị vô hiệu hóa.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                return Response(admin_token_pair(admin), headers={'Cache-Control': 'no-store'})

            tutor = Tutor.objects(email=email).first()
            if tutor is not None:
                if tutor.status != Tutor.STATUS_ACTIVE:
                    return Response(
                        {'detail': 'Tài khoản gia sư đã bị vô hiệu hóa.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                payload = tutor_token_pair(tutor)
                payload['actor_type'] = 'tutor'
                payload['account'] = payload.pop('tutor')
                return Response(payload, headers={'Cache-Control': 'no-store'})

            user, _created = clerk_exchange(
                claims=claims,
                email=email,
                display_name=values.get('display_name', ''),
                avatar=values.get('avatar', ''),
            )
        except SocialTokenError as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)
        payload = token_pair_for(user)
        payload['actor_type'] = _account_type_for(user)
        payload['account'] = payload.pop('user')
        return Response(payload, headers={'Cache-Control': 'no-store'})


class SocialLoginView(PublicAuthView):
    provider = None

    @extend_schema(tags=['Tài khoản'], request=SocialLoginSerializer, responses={200: SocialLoginResponseSerializer, 201: SocialLoginResponseSerializer})
    def post(self, request):
        serializer = SocialLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            identity = self.verify(serializer.validated_data['token'])
            user, created = social_login(
                provider=self.provider,
                identity=identity,
                requested_username=serializer.validated_data.get('username', ''),
            )
        except SocialTokenError as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)
        payload = token_pair_for(user)
        payload['actor_type'] = _account_type_for(user)
        payload['account'] = payload.pop('user')
        payload['created'] = created
        return Response(payload, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class GoogleLoginView(SocialLoginView):
    provider = 'google'
    verify = staticmethod(verify_google_id_token)


class FacebookLoginView(SocialLoginView):
    provider = 'facebook'
    verify = staticmethod(verify_facebook_access_token)


class RefreshView(PublicAuthView):
    @extend_schema(tags=['Tài khoản'], request=RefreshSerializer, responses={200: TokenPairSerializer})
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            return Response(refresh_token_pair(serializer.validated_data['refresh']))
        except SocialTokenError as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Tài khoản'], responses={200: UserSerializer})
    def get(self, request):
        if not isinstance(request.user.user, User):
            return Response(
                {'detail': 'Tài khoản gia sư sử dụng API hồ sơ gia sư riêng.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(user_payload(request.user.user), headers={'Cache-Control': 'no-store'})


def _account_type_for(user):
    # The role is derived from the persisted profile, never from the legacy
    # marker in ``users``.  A fresh sign-up must remain a normal User.
    email = (user.email or '').strip().lower()
    if Student.objects(email=email, status='active').first() is not None:
        return 'student'
    if Parent.objects(email=email).first() is not None:
        return 'parent'
    return 'user'


def _account_profile_payload(user):
    email = user.email.strip().lower()
    student = Student.objects(email=email).first()
    parent = Parent.objects(email=email).first()
    role = _account_type_for(user)
    return {
        'account': user_payload(user),
        'role': role,
        'student': ({
            'id': int(student.id), 'slug': student.slug, 'name': student.name,
            'email': student.email, 'phone': student.phone, 'avatar': student.avatar,
            'status': student.status,
        } if student else None),
        'parent': ({
            'id': int(parent.id), 'slug': parent.slug, 'name': parent.name,
            'email': parent.email, 'phone': parent.phone, 'avatar': parent.avatar,
        } if parent else None),
    }


class AccountProfileView(APIView):
    """Profile for student/parent website accounts and their OAuth identities."""

    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @extend_schema(tags=['Hồ sơ'], responses={200: AccountProfileSerializer})
    def get(self, request):
        if not isinstance(request.user.user, User):
            return Response(
                {'detail': 'Tài khoản gia sư sử dụng API hồ sơ gia sư riêng.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(
            _account_profile_payload(request.user.user),
            headers={'Cache-Control': 'no-store'},
        )

    @extend_schema(
        tags=['Hồ sơ'], request=AccountProfileUpdateSerializer,
        responses={200: AccountProfileSerializer},
    )
    def patch(self, request):
        if not isinstance(request.user.user, User):
            return Response(
                {'detail': 'Tài khoản gia sư sử dụng API hồ sơ gia sư riêng.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = AccountProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = request.user.user
        student = Student.objects(email=user.email.strip().lower()).first()
        parent = Parent.objects(email=user.email.strip().lower()).first()
        values = serializer.validated_data
        old_public_ids = set()
        if 'username' in values and values['username'] != user.username:
            if User.objects(username=values['username'], id__ne=user.id).first() is not None:
                return Response({'username': ['Username này đã được sử dụng.']}, status=400)
            user.username = values['username']
        if 'display_name' in values:
            user.display_name = values['display_name']
            if student:
                student.name = values['display_name']
            if parent:
                parent.name = values['display_name']
        if student and 'phone' in values:
            student.phone = values['phone'] or None
        if parent and 'phone' in values:
            parent.phone = values['phone'] or None
        upload = values.get('avatar')
        if upload is not None:
            try:
                asset = upload_user_avatar(upload, user.username)
            except ValueError as error:
                return Response({'avatar': [str(error)]}, status=400)
            if user.avatar_public_id:
                old_public_ids.add(user.avatar_public_id)
            user.avatar = asset['secure_url']
            user.avatar_public_id = asset['public_id']
            if student:
                if student.avatar_public_id:
                    old_public_ids.add(student.avatar_public_id)
                student.avatar = asset['secure_url']
                student.avatar_public_id = asset['public_id']
            if parent:
                if parent.avatar_public_id:
                    old_public_ids.add(parent.avatar_public_id)
                parent.avatar = asset['secure_url']
                parent.avatar_public_id = asset['public_id']
        try:
            user.save()
            if student:
                student.save()
            if parent:
                parent.save()
        except NotUniqueError:
            return Response({'detail': 'Không thể cập nhật do thông tin bị trùng.'}, status=409)
        for public_id in old_public_ids - {user.avatar_public_id}:
            delete_asset(public_id)
        return Response(_account_profile_payload(user), headers={'Cache-Control': 'no-store'})
