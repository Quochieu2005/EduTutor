"""JWT authentication for MongoEngine ``accounts.User`` documents."""

from dataclasses import dataclass

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from drf_spectacular.extensions import OpenApiAuthenticationExtension

from accounts.documents import User


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


class MongoJWTAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header:
            return None
        if len(header) != 2 or header[0].decode('utf-8').lower() != self.keyword.lower():
            raise exceptions.AuthenticationFailed('Authorization phải có dạng Bearer <access_token>.')

        try:
            payload = jwt.decode(
                header[1], settings.SECRET_KEY, algorithms=['HS256'], issuer='edututor-api'
            )
        except jwt.ExpiredSignatureError as error:
            raise exceptions.AuthenticationFailed('Access token đã hết hạn.') from error
        except jwt.PyJWTError as error:
            raise exceptions.AuthenticationFailed('Access token không hợp lệ.') from error

        if payload.get('token_type') != 'access' or not payload.get('sub'):
            raise exceptions.AuthenticationFailed('Access token không hợp lệ.')

        user = User.objects(id=payload['sub']).first()
        if user is None:
            raise exceptions.AuthenticationFailed('Tài khoản không còn tồn tại.')
        return MongoUserPrincipal(user), payload


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
