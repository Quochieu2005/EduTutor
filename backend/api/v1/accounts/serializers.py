"""Validation and OpenAPI contracts for user authentication."""

from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    username = serializers.RegexField(r'^[A-Za-z0-9_]{3,50}$')
    display_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=72, trim_whitespace=False, write_only=True)
    def validate_password(self, value):
        if len(value.encode('utf-8')) > 72:
            raise serializers.ValidationError('Mật khẩu không được vượt quá 72 byte.')
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(max_length=72, trim_whitespace=False, write_only=True)

    validate_password = RegisterSerializer.validate_password


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=72, trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(min_length=8, max_length=72, trim_whitespace=False, write_only=True)
    confirm_password = serializers.CharField(min_length=8, max_length=72, trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        RegisterSerializer.validate_password(self, attrs['current_password'])
        RegisterSerializer.validate_password(self, attrs['new_password'])
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Mật khẩu xác nhận không trùng khớp.'})
        if attrs['new_password'] == attrs['current_password']:
            raise serializers.ValidationError({'new_password': 'Mật khẩu mới phải khác mật khẩu hiện tại.'})
        return attrs


class UnifiedLoginSerializer(LoginSerializer):
    """Credentials for the public, shared login screen.

    ``account_type`` only matters when the same email was intentionally used
    for both a website account and a tutor account.  In the usual case the API
    detects the account automatically.
    """

    account_type = serializers.ChoiceField(
        choices=('auto', 'user', 'student', 'parent', 'tutor'),
        default='auto', required=False,
    )


class ClerkExchangeSerializer(serializers.Serializer):
    clerk_token = serializers.CharField(min_length=20, max_length=10000, write_only=True)
    email = serializers.EmailField(max_length=254)
    display_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    avatar = serializers.URLField(max_length=1000, required=False, allow_blank=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(min_length=32, max_length=200, trim_whitespace=True, write_only=True)
    new_password = serializers.CharField(min_length=8, max_length=72, trim_whitespace=False, write_only=True)
    confirm_password = serializers.CharField(min_length=8, max_length=72, trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Mật khẩu xác nhận không trùng khớp.'})
        if len(attrs['new_password'].encode('utf-8')) > 72:
            raise serializers.ValidationError({'new_password': 'Mật khẩu không được vượt quá 72 byte.'})
        return attrs


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()


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
    display_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(allow_null=True)
    avatar = serializers.CharField(allow_null=True)
    oauth_provider = serializers.CharField()
    account_type = serializers.ChoiceField(choices=('student', 'parent'), allow_null=True)
    created_at = serializers.DateTimeField()


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField()
    user = UserSerializer()


class UnifiedLoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField()
    actor_type = serializers.ChoiceField(choices=('user', 'student', 'parent', 'tutor'))
    account = serializers.DictField()


class SocialLoginResponseSerializer(UnifiedLoginResponseSerializer):
    created = serializers.BooleanField()


class AccountProfileUpdateSerializer(serializers.Serializer):
    username = serializers.RegexField(r'^[A-Za-z0-9_]{3,50}$', required=False)
    display_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.RegexField(r'^\+?[0-9 () .-]{7,20}$', max_length=20, required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    def validate_display_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Họ và tên không được để trống.')
        return value


class StudentProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(allow_null=True)
    avatar = serializers.CharField(allow_null=True)
    status = serializers.CharField()


class ParentProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(allow_null=True)
    avatar = serializers.CharField(allow_null=True)


class AccountProfileSerializer(serializers.Serializer):
    account = UserSerializer()
    role = serializers.ChoiceField(choices=('user', 'student', 'parent'))
    student = StudentProfileSerializer(allow_null=True)
    parent = ParentProfileSerializer(allow_null=True)
