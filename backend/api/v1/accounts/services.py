"""Business logic for local and provider-verified OAuth authentication."""

from datetime import datetime, timedelta, timezone
import json
import re
import secrets
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import jwt
from django.conf import settings
from mongoengine.errors import NotUniqueError

from accounts.documents import User


class SocialTokenError(ValueError):
    """A token supplied by a social provider could not be trusted."""


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
        'email': user.email,
        'oauth_provider': user.oauth_provider or 'local',
        'created_at': user.created_at,
    }


def token_pair_for(user):
    now = datetime.now(timezone.utc)
    access_expires = now + timedelta(minutes=settings.API_JWT_ACCESS_TTL_MINUTES)
    refresh_expires = now + timedelta(days=settings.API_JWT_REFRESH_TTL_DAYS)
    common = {'sub': str(user.id), 'email': user.email, 'iss': 'edututor-api', 'iat': now}
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
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=['HS256'], issuer='edututor-api')
    except jwt.ExpiredSignatureError as error:
        raise SocialTokenError('Refresh token đã hết hạn.') from error
    except jwt.PyJWTError as error:
        raise SocialTokenError('Refresh token không hợp lệ.') from error
    if payload.get('token_type') != 'refresh' or not payload.get('sub'):
        raise SocialTokenError('Refresh token không hợp lệ.')
    user = User.objects(id=payload['sub']).first()
    if user is None:
        raise SocialTokenError('Tài khoản không còn tồn tại.')
    return token_pair_for(user)


def register_user(*, username, email, password):
    email = email.strip().lower()
    if User.objects(email=email).first() is not None:
        raise SocialTokenError('Email này đã được đăng ký.')
    if User.objects(username=username).first() is not None:
        raise SocialTokenError('Username này đã được sử dụng.')
    user = User(username=username, email=email, oauth_provider='local')
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
        user.save()
        return user, False

    username = unique_username(requested_username or identity.get('name') or email.split('@', 1)[0])
    user = User(username=username, email=email, oauth_provider=provider, oauth_uid=uid)
    # Password is intentionally random: social accounts can only sign in with
    # the verified provider until a password-reset flow is explicitly added.
    user.set_password(secrets.token_urlsafe(48))
    try:
        user.save()
    except NotUniqueError as error:
        raise SocialTokenError('Không thể tạo tài khoản. Vui lòng thử lại.') from error
    return user, True
