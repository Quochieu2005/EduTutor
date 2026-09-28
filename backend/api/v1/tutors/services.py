"""Business logic for tutor authentication and profile APIs."""

from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

from tutors.documents import Tutor, TutorSubject, TutorTeachingArea


class TutorAuthError(ValueError):
    """Tutor credentials or tokens cannot be trusted."""


def tutor_payload(tutor):
    return {
        'id': int(tutor.id),
        'slug': tutor.slug,
        'name': tutor.name,
        'email': tutor.email,
        'avatar': tutor.avatar,
        'status': tutor.status,
        'must_change_password': bool(tutor.must_change_password),
    }


def tutor_profile_payload(tutor):
    payload = {
        **tutor_payload(tutor),
        'phone': tutor.phone,
        'headline': tutor.headline,
        'bio': tutor.bio,
        'education_level': tutor.education_level,
        'experience_years': tutor.experience_years,
        'hourly_rate_min': tutor.hourly_rate_min,
        'hourly_rate_max': tutor.hourly_rate_max,
        'teaching_mode': tutor.teaching_mode,
        'is_verified': tutor.is_verified,
        'rating_avg': float(tutor.rating_avg or 0),
        'rating_count': tutor.rating_count,
    }
    payload['subjects'] = [{
        'id': int(link.subject.id), 'slug': link.subject.slug, 'name': link.subject.name,
        'level': link.level, 'price_per_hour': link.price_per_hour,
    } for link in TutorSubject.objects(tutor=tutor).select_related()]
    payload['teaching_areas'] = [{
        'province': {
            'id': int(link.province.id), 'slug': link.province.slug, 'name': link.province.name,
        },
        'ward': ({
            'id': int(link.ward.id), 'slug': link.ward.slug, 'name': link.ward.name,
            'type': link.ward.type,
        } if link.ward else None),
    } for link in TutorTeachingArea.objects(tutor=tutor).select_related()]
    return payload


def tutor_token_pair(tutor):
    now = datetime.now(timezone.utc)
    access_expires = now + timedelta(minutes=settings.API_JWT_ACCESS_TTL_MINUTES)
    refresh_expires = now + timedelta(days=settings.API_JWT_REFRESH_TTL_DAYS)
    common = {
        'sub': str(tutor.id),
        'email': tutor.email,
        'actor': 'tutor',
        'iss': 'edututor-api',
        'iat': now,
        'ver': tutor.token_version or 1,
    }
    access = jwt.encode(
        {**common, 'token_type': 'access', 'exp': access_expires},
        settings.SECRET_KEY,
        algorithm='HS256',
    )
    refresh = jwt.encode(
        {**common, 'token_type': 'refresh', 'exp': refresh_expires},
        settings.SECRET_KEY,
        algorithm='HS256',
    )
    return {
        'access': access,
        'refresh': refresh,
        'token_type': 'Bearer',
        'expires_in': int((access_expires - now).total_seconds()),
        'tutor': tutor_payload(tutor),
    }


def login_tutor(*, email, password):
    tutor = Tutor.objects(email=email.strip().lower()).first()
    if tutor is None or not tutor.check_password(password):
        raise TutorAuthError('Email hoặc mật khẩu không chính xác.')
    if tutor.status != Tutor.STATUS_ACTIVE:
        raise TutorAuthError('Tài khoản gia sư đã bị vô hiệu hóa.')
    return tutor


def refresh_tutor_token_pair(raw_token):
    try:
        payload = jwt.decode(
            raw_token,
            settings.SECRET_KEY,
            algorithms=['HS256'],
            issuer='edututor-api',
            options={'require': ['exp', 'iat', 'sub']},
        )
    except jwt.ExpiredSignatureError as error:
        raise TutorAuthError('Refresh token đã hết hạn.') from error
    except jwt.PyJWTError as error:
        raise TutorAuthError('Refresh token không hợp lệ.') from error
    if payload.get('token_type') != 'refresh' or payload.get('actor') != 'tutor':
        raise TutorAuthError('Refresh token không hợp lệ.')
    try:
        tutor_id = int(payload['sub'])
    except (TypeError, ValueError):
        raise TutorAuthError('Refresh token không hợp lệ.')
    tutor = Tutor.objects(id=tutor_id, status=Tutor.STATUS_ACTIVE).first()
    if tutor is None:
        raise TutorAuthError('Tài khoản gia sư không còn hoạt động.')
    if payload.get('ver', 1) != (tutor.token_version or 1):
        raise TutorAuthError('Phiên đăng nhập không còn hiệu lực.')
    return tutor_token_pair(tutor)


def change_tutor_password(tutor, *, current_password, new_password):
    if not tutor.check_password(current_password):
        raise TutorAuthError('Mật khẩu hiện tại không chính xác.')
    if tutor.check_password(new_password):
        raise TutorAuthError('Mật khẩu mới phải khác mật khẩu hiện tại.')
    tutor.set_password(new_password)
    tutor.must_change_password = False
    tutor.token_version = (tutor.token_version or 1) + 1
    tutor.save()
    return tutor
