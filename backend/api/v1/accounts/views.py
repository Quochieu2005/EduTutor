"""HTTP endpoints for user registration, login and OAuth token exchange."""

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import MongoJWTAuthentication
from .serializers import (
    LoginSerializer, RefreshSerializer, RegisterSerializer, SocialLoginResponseSerializer,
    SocialLoginSerializer, TokenPairSerializer, UserSerializer,
)
from .services import (
    SocialTokenError, login_user, refresh_token_pair, register_user, social_login,
    token_pair_for, user_payload, verify_facebook_access_token, verify_google_id_token,
)


class PublicAuthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


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
    @extend_schema(tags=['Tài khoản'], request=LoginSerializer, responses={200: TokenPairSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = login_user(**serializer.validated_data)
        except SocialTokenError as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(token_pair_for(user))


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
        return Response(user_payload(request.user.user))
