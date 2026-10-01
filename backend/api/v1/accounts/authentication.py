"""JWT authentication for MongoEngine ``accounts.User`` documents."""

from dataclasses import dataclass

import jwt
from bson import ObjectId
from django.conf import settings
from rest_framework import authentication, exceptions
from drf_spectacular.extensions import OpenApiAuthenticationExtension

from accounts.documents import Admin, User
from tutors.documents import Tutor


@dataclass
class MongoUserPrincipal:
    """Small authenticated-user adapter required by Django REST Framework."""

    user: User

    @property
    def is_authenticated(self):
        return True

    @property
    def id(self):
        return str(self.user.id)

    @property
    def pk(self):
        """DRF throttles identify authenticated callers through ``user.pk``."""
        return self.id


class MongoJWTAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header:
            return None
        if len(header) != 2 or header[0].lower() != b'bearer':
            raise exceptions.AuthenticationFailed('Authorization phải có dạng Bearer <access_token>.')

        try:
            payload = jwt.decode(
                header[1], settings.SECRET_KEY, algorithms=['HS256'], issuer='edututor-api',
                options={'require': ['exp', 'iat', 'sub']},
            )
        except jwt.ExpiredSignatureError as error:
            raise exceptions.AuthenticationFailed('Access token đã hết hạn.') from error
        except jwt.PyJWTError as error:
            raise exceptions.AuthenticationFailed('Access token không hợp lệ.') from error

        if payload.get('token_type') != 'access':
            raise exceptions.AuthenticationFailed('Access token không hợp lệ.')

        if payload.get('actor') == 'admin':
            try:
                admin_id = int(payload.get('sub', ''))
            except (TypeError, ValueError) as error:
                raise exceptions.AuthenticationFailed('Access token không hợp lệ.') from error
            admin = Admin.objects(id=admin_id, status=Admin.STATUS_ACTIVE).first()
            if admin is None:
                raise exceptions.AuthenticationFailed('Tài khoản quản trị viên không còn hoạt động.')
            if payload.get('ver', 1) != (admin.session_version or 1):
                raise exceptions.AuthenticationFailed('Phiên đăng nhập không còn hiệu lực.')
            return MongoUserPrincipal(admin), payload

        # The lessons workflow is shared by students and tutors. Unified
        # login issues tutor tokens whose subject is the numeric tutor id,
        # so accept that actor here instead of treating it as a User ObjectId.
        if payload.get('actor') == 'tutor':
            try:
                tutor_id = int(payload.get('sub', ''))
            except (TypeError, ValueError) as error:
                raise exceptions.AuthenticationFailed('Access token gia sư không hợp lệ.') from error
            tutor = Tutor.objects(id=tutor_id).first()
            if tutor is None:
                raise exceptions.AuthenticationFailed('Tài khoản gia sư không còn tồn tại.')
            if tutor.status != Tutor.STATUS_ACTIVE:
                raise exceptions.AuthenticationFailed('Tài khoản gia sư đã bị vô hiệu hóa.')
            if payload.get('ver', 1) != (tutor.token_version or 1):
                raise exceptions.AuthenticationFailed('Phiên đăng nhập không còn hiệu lực.')
            return MongoUserPrincipal(tutor), payload

        if not ObjectId.is_valid(payload.get('sub', '')):
            raise exceptions.AuthenticationFailed('Access token không hợp lệ.')

        user = User.objects(id=payload['sub']).first()
        if user is None:
            raise exceptions.AuthenticationFailed('Tài khoản không còn tồn tại.')
        if payload.get('ver', 1) != (user.token_version or 1):
            raise exceptions.AuthenticationFailed('Phiên đăng nhập không còn hiệu lực.')
        return MongoUserPrincipal(user), payload

    def authenticate_header(self, request):
        return self.keyword


class MongoJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    """Expose the MongoDB user JWT in Swagger's Authorize dialog."""

    target_class = 'api.v1.accounts.authentication.MongoJWTAuthentication'
    name = 'MongoUserBearerAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
            'description': 'Dán access token trả về từ API đăng nhập.',
        }
