"""JWT authentication backed directly by the MongoDB tutors collection."""

from dataclasses import dataclass

import jwt
from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import authentication, exceptions

from tutors.documents import Tutor


@dataclass
class TutorPrincipal:
    tutor: Tutor

    @property
    def is_authenticated(self):
        return True

    @property
    def id(self):
        return int(self.tutor.id)

    @property
    def pk(self):
        return self.id


class TutorJWTAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header:
            return None
        if len(header) != 2 or header[0].lower() != b'bearer':
            raise exceptions.AuthenticationFailed('Authorization phải có dạng Bearer <access_token>.')
        try:
            payload = jwt.decode(
                header[1],
                settings.SECRET_KEY,
                algorithms=['HS256'],
                issuer='edututor-api',
                options={'require': ['exp', 'iat', 'sub']},
            )
        except jwt.ExpiredSignatureError as error:
            raise exceptions.AuthenticationFailed('Access token đã hết hạn.') from error
        except jwt.PyJWTError as error:
            raise exceptions.AuthenticationFailed('Access token không hợp lệ.') from error
        if payload.get('token_type') != 'access' or payload.get('actor') != 'tutor':
            raise exceptions.AuthenticationFailed('Access token gia sư không hợp lệ.')
        try:
            tutor_id = int(payload['sub'])
        except (TypeError, ValueError):
            raise exceptions.AuthenticationFailed('Access token gia sư không hợp lệ.')
        tutor = Tutor.objects(id=tutor_id).first()
        if tutor is None:
            raise exceptions.AuthenticationFailed('Tài khoản gia sư không còn tồn tại.')
        if tutor.status != Tutor.STATUS_ACTIVE:
            raise exceptions.AuthenticationFailed('Tài khoản gia sư đã bị vô hiệu hóa.')
        if payload.get('ver', 1) != (tutor.token_version or 1):
            raise exceptions.AuthenticationFailed('Phiên đăng nhập không còn hiệu lực.')
        return TutorPrincipal(tutor), payload

    def authenticate_header(self, request):
        return self.keyword


class TutorJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'api.v1.tutors.authentication.TutorJWTAuthentication'
    name = 'TutorBearerAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
            'description': 'Access token trả về từ API đăng nhập gia sư.',
        }
