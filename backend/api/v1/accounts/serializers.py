"""Validation and OpenAPI contracts for user authentication."""

from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    username = serializers.RegexField(r'^[A-Za-z0-9_]{3,50}$')
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=72, write_only=True)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(max_length=72, write_only=True)


class SocialLoginSerializer(serializers.Serializer):
    # Google must receive a Google ID token. Facebook receives a Facebook user
    # access token. Both are verified remotely by the backend.
    token = serializers.CharField(trim_whitespace=True, max_length=10000)
    username = serializers.RegexField(
        r'^[A-Za-z0-9_]{3,50}$', required=False, allow_blank=False
    )


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(max_length=5000)


class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    email = serializers.EmailField()
    oauth_provider = serializers.CharField()
    created_at = serializers.DateTimeField()


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField()
    user = UserSerializer()


class SocialLoginResponseSerializer(TokenPairSerializer):
    created = serializers.BooleanField()
