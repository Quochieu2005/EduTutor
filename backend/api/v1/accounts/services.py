"""Business logic for local and provider-verified OAuth authentication."""

from datetime import datetime, timedelta, timezone
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

from accounts.documents import User, UserPasswordResetToken


class SocialTokenError(ValueError):
    """A token supplied by a social provider could not be trusted."""


class PasswordResetTokenError(ValueError):
    """A password-reset link is invalid, expired, or already consumed."""


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


def user_payload(user):
    return {
        'id': str(user.id),
        'username': user.username,
        'display_name': getattr(user, 'display_name', None) or user.username,
        'email': user.email,
        'avatar': getattr(user, 'avatar', None),
        'oauth_provider': user.oauth_provider or 'local',
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


def refresh_token_pair(refresh_token):
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=['HS256'], issuer='edututor-api',
                             options={'require': ['exp', 'iat', 'sub']})
    except jwt.ExpiredSignatureError as error:
        raise SocialTokenError('Refresh token đã hết hạn.') from error
    except jwt.PyJWTError as error:
        raise SocialTokenError('Refresh token không hợp lệ.') from error
    if payload.get('token_type') != 'refresh' or not ObjectId.is_valid(payload.get('sub', '')):
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


def register_user(*, username, email, password):
    email = email.strip().lower()
    if User.objects(email=email).first() is not None:
        raise SocialTokenError('Email này đã được đăng ký.')
    if User.objects(username=username).first() is not None:
        raise SocialTokenError('Username này đã được sử dụng.')
    user = User(username=username, display_name=username, email=email, oauth_provider='local')
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
        if user.oauth_uid and (user.oauth_provider != provider or user.oauth_uid != uid):
            raise SocialTokenError('Email này đã liên kết với tài khoản mạng xã hội khác.')
        user.oauth_provider = provider
        user.oauth_uid = uid
        if not user.display_name and identity.get('name'):
            user.display_name = identity['name']
        user.save()
        return user, False

    username = unique_username(requested_username or identity.get('name') or email.split('@', 1)[0])
    user = User(
        username=username, display_name=identity.get('name') or username,
        email=email, oauth_provider=provider, oauth_uid=uid,
    )
    # Password is intentionally random: social accounts can only sign in with
    # the verified provider until a password-reset flow is explicitly added.
    user.set_password(secrets.token_urlsafe(48))
    try:
        user.save()
    except NotUniqueError as error:
        raise SocialTokenError('Không thể tạo tài khoản. Vui lòng thử lại.') from error
    return user, True
