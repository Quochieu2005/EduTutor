"""Business logic for local and provider-verified OAuth authentication."""

from datetime import datetime, timedelta, timezone
from functools import lru_cache
import json
import re
import secrets
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import jwt
from bson import ObjectId
from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.utils.crypto import salted_hmac
from mongoengine.errors import NotUniqueError
from mongoengine.queryset.visitor import Q

from accounts.documents import Admin, Parent, Student, User, UserPasswordResetToken
from accounts.email_registry import assert_email_available, email_owners


class SocialTokenError(ValueError):
    """A token supplied by a social provider could not be trusted."""


class PasswordResetTokenError(ValueError):
    """A password-reset link is invalid, expired, or already consumed."""


@lru_cache(maxsize=4)
def _clerk_jwks_client(issuer):
    """Reuse Clerk's JWKS cache across exchange requests and workers."""
    return jwt.PyJWKClient(f'{issuer}/.well-known/jwks.json', cache_jwk_set=True)


def _reset_token_digest(raw_token):
    return salted_hmac(
        'edututor.user-password-reset', raw_token, algorithm='sha256',
    ).hexdigest()


def _provider_json(url, *, timeout=8):
    try:
        request = Request(url, headers={'Accept': 'application/json'})
        with urlopen(request, timeout=timeout) as response:  # nosec B310 - trusted provider URLs only
            return json.loads(response.read().decode('utf-8'))
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        raise SocialTokenError('Không thể xác minh token với nhà cung cấp.') from error


def verify_google_id_token(token):
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise SocialTokenError('Máy chủ chưa cấu hình GOOGLE_OAUTH_CLIENT_ID.')

    params = urlencode({'id_token': token})
    payload = _provider_json(f'https://oauth2.googleapis.com/tokeninfo?{params}')
    if payload.get('aud') != settings.GOOGLE_OAUTH_CLIENT_ID:
        raise SocialTokenError('Google token không thuộc ứng dụng này.')
    if payload.get('iss') not in {'accounts.google.com', 'https://accounts.google.com'}:
        raise SocialTokenError('Google token có issuer không hợp lệ.')
    try:
        if int(payload.get('exp', 0)) <= datetime.now(timezone.utc).timestamp():
            raise SocialTokenError('Google token đã hết hạn.')
    except (TypeError, ValueError) as error:
        raise SocialTokenError('Google token đã hết hạn hoặc không hợp lệ.') from error
    if payload.get('email_verified') not in {'true', True}:
        raise SocialTokenError('Email Google chưa được xác minh.')
    if not payload.get('sub') or not payload.get('email'):
        raise SocialTokenError('Google token không có thông tin tài khoản cần thiết.')
    return {'uid': str(payload['sub']), 'email': payload['email'].lower(), 'name': payload.get('name', '')}


def verify_facebook_access_token(token):
    if not settings.FACEBOOK_APP_ID or not settings.FACEBOOK_APP_SECRET:
        raise SocialTokenError('Máy chủ chưa cấu hình FACEBOOK_APP_ID và FACEBOOK_APP_SECRET.')

    app_token = f'{settings.FACEBOOK_APP_ID}|{settings.FACEBOOK_APP_SECRET}'
    debug_params = urlencode({'input_token': token, 'access_token': app_token})
    debug = _provider_json(f'https://graph.facebook.com/debug_token?{debug_params}').get('data', {})
    if not debug.get('is_valid') or str(debug.get('app_id')) != str(settings.FACEBOOK_APP_ID):
        raise SocialTokenError('Facebook token không hợp lệ hoặc không thuộc ứng dụng này.')
    try:
        now = datetime.now(timezone.utc).timestamp()
        # Facebook can report 0 for a non-expiring timestamp. is_valid and
        # app_id must still have been checked by the provider above.
        for key in ('expires_at', 'data_access_expires_at'):
            expiry = int(debug.get(key, 0))
            if expiry and expiry <= now:
                raise SocialTokenError('Facebook token đã hết hạn.')
    except (TypeError, ValueError) as error:
        raise SocialTokenError('Facebook token đã hết hạn hoặc không hợp lệ.') from error

    profile_params = urlencode({'fields': 'id,name,email', 'access_token': token})
    profile = _provider_json(f'https://graph.facebook.com/me?{profile_params}')
    if not profile.get('id') or not profile.get('email'):
        raise SocialTokenError('Facebook chưa cung cấp email. Hãy cấp quyền email rồi thử lại.')
    if str(profile['id']) != str(debug.get('user_id')):
        raise SocialTokenError('Facebook token không khớp với tài khoản người dùng.')
    return {'uid': str(profile['id']), 'email': profile['email'].lower(), 'name': profile.get('name', '')}


def verify_clerk_session_token(token):
    """Verify the Clerk-issued RS256 session token against Clerk's JWKS."""
    issuer = settings.CLERK_JWT_ISSUER
    if not issuer:
        raise SocialTokenError('Máy chủ chưa cấu hình CLERK_JWT_ISSUER.')
    try:
        signing_key = _clerk_jwks_client(issuer).get_signing_key_from_jwt(token)
        options = {'require': ['exp', 'iat', 'sub'], 'verify_aud': bool(settings.CLERK_JWT_AUDIENCE)}
        kwargs = {'issuer': issuer, 'algorithms': ['RS256'], 'options': options, 'leeway': 5}
        if settings.CLERK_JWT_AUDIENCE:
            kwargs['audience'] = settings.CLERK_JWT_AUDIENCE
        return jwt.decode(token, signing_key.key, **kwargs)
    except jwt.exceptions.MissingCryptographyError as error:
        raise SocialTokenError('Backend thiếu thư viện xác minh RSA. Cần cài dependencies trong requirements.txt và khởi động lại backend.') from error
    except jwt.PyJWKClientConnectionError as error:
        raise SocialTokenError('Backend không tải được khóa xác minh Clerk. Vui lòng thử lại sau.') from error
    except jwt.ExpiredSignatureError as error:
        raise SocialTokenError('Token Clerk đã hết hạn. Vui lòng đăng nhập lại để lấy phiên mới.') from error
    except jwt.ImmatureSignatureError as error:
        raise SocialTokenError('Thời gian token Clerk chưa hợp lệ. Kiểm tra đồng hồ máy chạy backend.') from error
    except jwt.InvalidIssuerError as error:
        raise SocialTokenError('Issuer token không khớp CLERK_JWT_ISSUER của backend.') from error
    except jwt.InvalidAudienceError as error:
        raise SocialTokenError('Audience token không khớp CLERK_JWT_AUDIENCE của backend.') from error
    except jwt.PyJWKClientError as error:
        raise SocialTokenError('Không tìm thấy khóa xác minh token trong ứng dụng Clerk đã cấu hình.') from error
    except jwt.PyJWTError as error:
        raise SocialTokenError('Phiên Clerk không hợp lệ hoặc đã hết hạn.') from error
    except Exception as error:
        # Unexpected provider failures must not leak internals to the browser.
        raise SocialTokenError('Không thể kết nối tới dịch vụ xác thực Clerk. Vui lòng thử lại sau.') from error


def clerk_exchange(*, claims, email, display_name='', avatar=''):
    """Create or recover the local API identity bound to one Clerk subject."""
    subject = str(claims.get('sub') or '')
    if not subject:
        raise SocialTokenError('Clerk token không có định danh tài khoản.')

    supplied_email = (email or '').strip().lower()
    claim_email = str(claims.get('email') or '').strip().lower()
    if claim_email and supplied_email and claim_email != supplied_email:
        raise SocialTokenError('Email trong phiên Clerk không khớp với tài khoản đang đồng bộ.')
    email = claim_email or supplied_email
    if not email:
        raise SocialTokenError('Clerk token không có email để tạo tài khoản EduTutor.')

    display_name = (display_name or '').strip()
    avatar = (avatar or '').strip()
    user = User.objects(oauth_provider='clerk', oauth_uid=subject).first()
    if user is not None:
        changed = False
        if user.email != email and User.objects(email=email, id__ne=user.id).first() is None:
            user.email = email
            changed = True
        if display_name and user.display_name != display_name:
            user.display_name = display_name
            changed = True
        if avatar and user.avatar != avatar:
            user.avatar = avatar
            changed = True
        if changed:
            try:
                user.save()
            except NotUniqueError as error:
                raise SocialTokenError('Không thể đồng bộ thông tin tài khoản Clerk.') from error
        return user, False

    existing = User.objects(email=email).first()
    if existing is not None:
        conflicting = [owner for owner in email_owners(email) if owner['kind'] in {'tutor', 'admin'}]
        if conflicting:
            raise SocialTokenError('Email này đang thuộc một loại tài khoản khác trong EduTutor.')
        # A verified Clerk session can safely recover a legacy local account
        # with the same email. Keep its bcrypt password so local login keeps
        # working, and bind the immutable Clerk subject for future exchanges.
        if existing.oauth_uid and (existing.oauth_provider != 'clerk' or existing.oauth_uid != subject):
            raise SocialTokenError('Email này đã liên kết với tài khoản mạng xã hội khác.')
        existing.oauth_provider = 'clerk'
        existing.oauth_uid = subject
        if display_name:
            existing.display_name = display_name
        if avatar:
            existing.avatar = avatar
        try:
            existing.save()
        except NotUniqueError as error:
            raise SocialTokenError('Không thể liên kết tài khoản Clerk hiện có.') from error
        return existing, False

    try:
        assert_email_available(email)
    except ValueError as error:
        raise SocialTokenError(str(error)) from error
    username = unique_username(display_name or email.split('@', 1)[0])
    user = User(
        username=username,
        display_name=display_name.strip() or username,
        email=email,
        avatar=avatar.strip() or None,
        oauth_provider='clerk',
        oauth_uid=subject,
        # A newly authenticated website account is only a ``User``.  Its
        # student profile is created when it actually starts a learning flow.
        account_type=None,
    )
    user.set_password(secrets.token_urlsafe(48))
    try:
        user.save()
    except NotUniqueError as error:
        raise SocialTokenError('Không thể đồng bộ tài khoản Clerk. Vui lòng thử lại.') from error
    return user, True


def _username_base(value):
    base = re.sub(r'[^A-Za-z0-9_]+', '_', value or '').strip('_').lower()
    return (base or 'user')[:50]


def unique_username(value):
    base = _username_base(value)
    candidate = base
    suffix = 2
    while User.objects(username=candidate).first() is not None:
        suffix_text = f'_{suffix}'
        candidate = f'{base[:50 - len(suffix_text)]}{suffix_text}'
        suffix += 1
    return candidate


def _ensure_student_profile(user, *, oauth_provider=None, oauth_uid=None):
    """Create or update a student profile only after a learning action."""
    email = (user.email or '').strip().lower()
    if not email:
        return None
    existing = Student.objects(email=email).first()
    if existing is not None:
        changed = False
        display_name = getattr(user, 'display_name', None) or user.username or email.split('@', 1)[0]
        if display_name and existing.name != display_name[:150]:
            existing.name = display_name[:150]
            changed = True
        if oauth_provider and oauth_uid and not existing.oauth_uid:
            existing.oauth_provider = oauth_provider
            existing.oauth_uid = oauth_uid
            changed = True
        if changed:
            try:
                existing.save()
            except NotUniqueError:
                pass
        return existing
    base = _username_base(getattr(user, 'display_name', '') or user.username or email.split('@', 1)[0])
    slug = base
    suffix = 2
    while Student.objects(slug=slug).first() is not None:
        suffix_text = f'-{suffix}'
        slug = f'{base[:180 - len(suffix_text)]}{suffix_text}'
        suffix += 1
    student = Student(
        slug=slug,
        name=(getattr(user, 'display_name', '') or user.username or email.split('@', 1)[0])[:150],
        email=email,
        status='active',
        oauth_provider=oauth_provider,
        oauth_uid=oauth_uid,
    )
    student.set_password(secrets.token_urlsafe(32))
    try:
        student.save()
    except NotUniqueError:
        # A concurrent login may have created the profile already.
        return Student.objects(email=email).first()
    return student


def ensure_student_profile(user):
    """Promote one website ``User`` to an active learner exactly when needed.

    Registration and ordinary sign-in intentionally do not create a
    ``students`` record.  This function is called only by actions that need a
    learner (book a lesson, invite a tutor, or send a signed-in study request).
    It is idempotent so a repeated browser request cannot create duplicates.
    """
    if not isinstance(user, User):
        raise SocialTokenError('Chỉ tài khoản người dùng mới có thể gửi yêu cầu học.')
    student = _ensure_student_profile(
        user,
        oauth_provider=user.oauth_provider,
        oauth_uid=user.oauth_uid,
    )
    if student is None:
        raise SocialTokenError('Không thể tạo hồ sơ học viên cho tài khoản này.')
    if user.account_type != 'student':
        # ``account_type`` is retained for backward-compatible API payloads;
        # the Student document remains the source of truth for learner access.
        User.objects(id=user.id).update_one(set__account_type='student')
        user.account_type = 'student'
    return student


def _ensure_parent_profile(user):
    """Create/update the parent profile for an account registered as parent."""
    email = (user.email or '').strip().lower()
    if not email:
        return
    display_name = getattr(user, 'display_name', None) or user.username or email.split('@', 1)[0]
    existing = Parent.objects(email=email).first()
    if existing is not None:
        changed = False
        if display_name and existing.name != display_name[:150]:
            existing.name = display_name[:150]
            changed = True
        if getattr(user, 'avatar', None) and existing.avatar != user.avatar:
            existing.avatar = user.avatar
            changed = True
        if changed:
            try:
                existing.save()
            except NotUniqueError:
                pass
        return

    base = _username_base(display_name)
    slug = base
    suffix = 2
    while Parent.objects(slug=slug).first() is not None:
        suffix_text = f'-{suffix}'
        slug = f'{base[:180 - len(suffix_text)]}{suffix_text}'
        suffix += 1
    parent = Parent(
        slug=slug,
        name=display_name[:150],
        email=email,
        avatar=getattr(user, 'avatar', None) or None,
    )
    parent.set_password(secrets.token_urlsafe(32))
    try:
        parent.save()
    except NotUniqueError:
        return


def user_payload(user):
    return {
        'id': str(user.id),
        'username': user.username,
        'display_name': getattr(user, 'display_name', None) or user.username,
        'email': user.email,
        'avatar': getattr(user, 'avatar', None),
        'oauth_provider': user.oauth_provider or 'local',
        'account_type': getattr(user, 'account_type', None),
        'created_at': user.created_at,
    }


def token_pair_for(user):
    now = datetime.now(timezone.utc)
    access_expires = now + timedelta(minutes=settings.API_JWT_ACCESS_TTL_MINUTES)
    refresh_expires = now + timedelta(days=settings.API_JWT_REFRESH_TTL_DAYS)
    common = {
        'sub': str(user.id), 'email': user.email, 'iss': 'edututor-api', 'iat': now,
        'ver': user.token_version or 1,
    }
    access = jwt.encode({**common, 'token_type': 'access', 'exp': access_expires}, settings.SECRET_KEY, algorithm='HS256')
    refresh = jwt.encode({**common, 'token_type': 'refresh', 'exp': refresh_expires}, settings.SECRET_KEY, algorithm='HS256')
    return {
        'access': access,
        'refresh': refresh,
        'token_type': 'Bearer',
        'expires_in': int((access_expires - now).total_seconds()),
        'user': user_payload(user),
    }


def admin_token_pair(admin):
    """Issue a public-site API session for an Admin authenticated by Clerk."""
    now = datetime.now(timezone.utc)
    access_expires = now + timedelta(minutes=settings.API_JWT_ACCESS_TTL_MINUTES)
    refresh_expires = now + timedelta(days=settings.API_JWT_REFRESH_TTL_DAYS)
    common = {
        'sub': str(admin.id), 'email': admin.email, 'actor': 'admin',
        'iss': 'edututor-api', 'iat': now, 'ver': admin.session_version or 1,
    }
    access = jwt.encode({**common, 'token_type': 'access', 'exp': access_expires}, settings.SECRET_KEY, algorithm='HS256')
    refresh = jwt.encode({**common, 'token_type': 'refresh', 'exp': refresh_expires}, settings.SECRET_KEY, algorithm='HS256')
    return {
        'access': access, 'refresh': refresh, 'token_type': 'Bearer',
        'expires_in': int((access_expires - now).total_seconds()),
        'actor_type': 'admin',
        'account': {
            'id': int(admin.id), 'name': admin.name, 'email': admin.email,
            'avatar': admin.profile_image_url or None, 'role': admin.role,
            'status': admin.status,
        },
    }


def refresh_token_pair(refresh_token):
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=['HS256'], issuer='edututor-api',
                             options={'require': ['exp', 'iat', 'sub']})
    except jwt.ExpiredSignatureError as error:
        raise SocialTokenError('Refresh token đã hết hạn.') from error
    except jwt.PyJWTError as error:
        raise SocialTokenError('Refresh token không hợp lệ.') from error
    if payload.get('token_type') != 'refresh':
        raise SocialTokenError('Refresh token không hợp lệ.')
    if payload.get('actor') == 'admin':
        try:
            admin_id = int(payload.get('sub', ''))
        except (TypeError, ValueError) as error:
            raise SocialTokenError('Refresh token không hợp lệ.') from error
        admin = Admin.objects(id=admin_id, status=Admin.STATUS_ACTIVE).first()
        if admin is None or payload.get('ver', 1) != (admin.session_version or 1):
            raise SocialTokenError('Phiên quản trị viên không còn hiệu lực.')
        return admin_token_pair(admin)
    if not ObjectId.is_valid(payload.get('sub', '')):
        raise SocialTokenError('Refresh token không hợp lệ.')
    user = User.objects(id=payload['sub']).first()
    if user is None:
        raise SocialTokenError('Tài khoản không còn tồn tại.')
    if payload.get('ver', 1) != (user.token_version or 1):
        raise SocialTokenError('Phiên đăng nhập không còn hiệu lực.')
    return token_pair_for(user)


def request_user_password_reset(email):
    """Create and email a single-use five-minute link without exposing accounts."""
    email = email.strip().lower()
    user = User.objects(email=email).first()
    if user is None:
        return False

    now = datetime.now(timezone.utc)
    # Atomic, shared across workers: concurrent requests cannot all pass a
    # read-then-write cooldown, even when Redis is unavailable.
    reserved = User.objects(
        Q(password_reset_after=None) | Q(password_reset_after__lte=now), id=user.id,
    ).modify(set__password_reset_after=now + timedelta(seconds=settings.PASSWORD_RESET_RESEND_SECONDS))
    if reserved is None:
        return False
    sent_last_hour = UserPasswordResetToken.objects(
        user=user, created_at__gt=now - timedelta(hours=1),
    ).count()
    if sent_last_hour >= settings.PASSWORD_RESET_EMAILS_PER_HOUR:
        return False

    raw_token = secrets.token_urlsafe(32)
    reset_token = UserPasswordResetToken(
        user=user,
        token_version=user.token_version or 1,
        token_digest=_reset_token_digest(raw_token),
        expires_at=now + timedelta(seconds=settings.PASSWORD_RESET_TOKEN_TTL_SECONDS),
    ).save()
    reset_url = f'{settings.FRONTEND_URL}/reset-password?token={raw_token}'
    try:
        sent = send_mail(
            subject='Đặt lại mật khẩu EduTutor',
            message=(
                f'Xin chào {user.username},\n\n'
                'Nhấn vào liên kết dưới đây để đặt mật khẩu mới:\n'
                f'{reset_url}\n\n'
                'Liên kết chỉ có hiệu lực trong 5 phút và chỉ sử dụng được một lần.\n'
                'Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
            connection=get_connection(timeout=min(settings.EMAIL_TIMEOUT, 8)),
        )
        if sent != 1:
            raise RuntimeError('Email backend did not accept the reset email.')
    except Exception:
        # Keep the attempt for the hourly quota. Never invalidate a previously
        # delivered link just because this email failed to send.
        reset_token.update(set__is_used=True, set__used_at=now)
        raise
    UserPasswordResetToken.objects(user=user, is_used=False, id__ne=reset_token.id).update(
        set__is_used=True, set__used_at=now,
    )
    return True


def reset_user_password(*, raw_token, new_password):
    """Atomically claim a reset token, change bcrypt password, and revoke old JWTs."""
    now = datetime.now(timezone.utc)
    available_token = UserPasswordResetToken.objects(
        token_digest=_reset_token_digest(raw_token),
        is_used=False,
        expires_at__gt=now,
    ).first()
    if available_token is None:
        raise PasswordResetTokenError('Liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng.')
    user = available_token.user
    if user.check_password(new_password):
        raise PasswordResetTokenError('Mật khẩu mới phải khác mật khẩu hiện tại.')
    expected_version = available_token.token_version or 1
    if expected_version != (user.token_version or 1):
        raise PasswordResetTokenError('Liên kết không còn hiệu lực. Vui lòng yêu cầu liên kết mới.')
    user.set_password(new_password)
    now = datetime.now(timezone.utc)
    reset_token = UserPasswordResetToken.objects(
        id=available_token.id, is_used=False, expires_at__gt=now,
    ).modify(new=True, set__is_used=True, set__used_at=now)
    if reset_token is None:
        raise PasswordResetTokenError('Liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng.')
    version_query = Q(token_version=expected_version)
    if expected_version == 1:
        version_query |= Q(token_version__exists=False)
    updated = User.objects(version_query, id=user.id).update_one(
        set__password_hash=user.password_hash, set__token_version=expected_version + 1,
    )
    if not updated:
        raise PasswordResetTokenError('Mật khẩu vừa được thay đổi. Vui lòng yêu cầu liên kết mới.')
    user.token_version = expected_version + 1
    UserPasswordResetToken.objects(user=user, is_used=False).update(
        set__is_used=True, set__used_at=now,
    )
    return user


def register_user(*, username, email, password, account_type=None, display_name=''):
    email = email.strip().lower()
    try:
        assert_email_available(email)
    except ValueError as error:
        raise SocialTokenError(str(error)) from error
    if User.objects(username=username).first() is not None:
        raise SocialTokenError('Username này đã được sử dụng.')
    user = User(
        username=username,
        display_name=(display_name or username).strip(),
        email=email,
        oauth_provider='local',
        # A sign-up creates only a website User.  Do not make the person a
        # student/parent until they use a learning feature.
        account_type=None,
    )
    user.set_password(password)
    try:
        user.save()
    except NotUniqueError as error:
        raise SocialTokenError('Email hoặc username này đã được sử dụng.') from error
    return user


def login_user(*, email, password):
    user = User.objects(email=email.strip().lower()).first()
    if user is None or not user.check_password(password):
        raise SocialTokenError('Email hoặc mật khẩu không chính xác.')
    return user


def social_login(*, provider, identity, requested_username=''):
    uid = identity['uid']
    email = identity['email']
    user = User.objects(oauth_provider=provider, oauth_uid=uid).first()
    if user is not None:
        return user, False

    # A verified provider email may be linked to an existing local account.
    # This avoids duplicate accounts while never trusting a UID sent by client.
    user = User.objects(email=email).first()
    if user is not None:
        conflicting = [owner for owner in email_owners(email) if owner['kind'] in {'tutor', 'admin'}]
        if conflicting:
            raise SocialTokenError('Email này đang thuộc một loại tài khoản khác trong EduTutor.')
        if user.oauth_uid and (user.oauth_provider != provider or user.oauth_uid != uid):
            raise SocialTokenError('Email này đã liên kết với tài khoản mạng xã hội khác.')
        user.oauth_provider = provider
        user.oauth_uid = uid
        if not user.display_name and identity.get('name'):
            user.display_name = identity['name']
        user.save()
        return user, False

    try:
        assert_email_available(email)
    except ValueError as error:
        raise SocialTokenError(str(error)) from error
    username = unique_username(requested_username or identity.get('name') or email.split('@', 1)[0])
    user = User(
        username=username, display_name=identity.get('name') or username,
        email=email, oauth_provider=provider, oauth_uid=uid,
        account_type=None,
    )
    # Password is intentionally random: social accounts can only sign in with
    # the verified provider until a password-reset flow is explicitly added.
    user.set_password(secrets.token_urlsafe(48))
    try:
        user.save()
    except NotUniqueError as error:
        raise SocialTokenError('Không thể tạo tài khoản. Vui lòng thử lại.') from error
    return user, True
