from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import jwt
from django.conf import settings
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory

from .serializers import ResetPasswordSerializer
from .services import (
    PasswordResetTokenError, request_user_password_reset, reset_user_password,
    token_pair_for,
)
from .views import ForgotPasswordView, ResetPasswordView
from accounts.documents import User, UserPasswordResetToken


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class PasswordResetApiTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

    def test_confirmation_must_match(self):
        serializer = ResetPasswordSerializer(data={
            'token': 'a' * 43,
            'new_password': 'mat-khau-moi',
            'confirm_password': 'khong-trung-khop',
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('confirm_password', serializer.errors)

    @patch('api.v1.accounts.views.request_user_password_reset')
    def test_forgot_password_always_returns_generic_message(self, request_reset):
        request_reset.side_effect = RuntimeError('SMTP unavailable')
        with self.assertLogs('api.v1.accounts.views', level='ERROR'):
            response = ForgotPasswordView.as_view()(self.factory.post(
                '/api/v1/accounts/password/forgot/', {'email': 'unknown@example.com'}, format='json',
            ))
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('unknown@example.com', response.data['message'])

    @patch('api.v1.accounts.views.request_user_password_reset')
    def test_forgot_password_is_limited_per_ip(self, request_reset):
        for _ in range(5):
            response = ForgotPasswordView.as_view()(self.factory.post(
                '/api/v1/accounts/password/forgot/', {'email': 'user@example.com'}, format='json',
            ))
            self.assertEqual(response.status_code, 200)
        response = ForgotPasswordView.as_view()(self.factory.post(
            '/api/v1/accounts/password/forgot/', {'email': 'user@example.com'}, format='json',
        ))
        self.assertEqual(response.status_code, 429)
        self.assertEqual(request_reset.call_count, 5)

    @patch('api.v1.accounts.views.reset_user_password')
    def test_expired_token_returns_clear_error(self, reset_password):
        reset_password.side_effect = PasswordResetTokenError('Liên kết đã hết hạn.')
        response = ResetPasswordView.as_view()(self.factory.post(
            '/api/v1/accounts/password/reset/', {
                'token': 'a' * 43,
                'new_password': 'mat-khau-moi',
                'confirm_password': 'mat-khau-moi',
            }, format='json',
        ))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'Liên kết đã hết hạn.')


@override_settings(
    FRONTEND_URL='http://localhost:3000',
    PASSWORD_RESET_TOKEN_TTL_SECONDS=300,
    PASSWORD_RESET_RESEND_SECONDS=60,
    PASSWORD_RESET_EMAILS_PER_HOUR=3,
)
class PasswordResetServiceTests(SimpleTestCase):
    def test_password_storage_remains_bcrypt_and_rate_records_outlive_token(self):
        user = User(username='user', email='user@example.com', oauth_provider='local')
        user.set_password('mat-khau-moi')
        self.assertTrue(user.password_hash.startswith(('$2a$', '$2b$', '$2y$')))
        self.assertTrue(user.check_password('mat-khau-moi'))
        ttl_index = UserPasswordResetToken._meta['indexes'][-1]
        self.assertEqual(ttl_index['expireAfterSeconds'], 3600)

    @patch('api.v1.accounts.services.send_mail')
    @patch('api.v1.accounts.services.UserPasswordResetToken')
    @patch('api.v1.accounts.services.User')
    def test_email_contains_raw_link_but_database_only_stores_digest(self, users, tokens, send_mail):
        user = SimpleNamespace(id='abc', username='minhanh', email='minhanh@example.com', token_version=1)
        users.objects.return_value.first.return_value = user
        hourly_query, active_query = MagicMock(), MagicMock()
        hourly_query.count.return_value = 0
        tokens.objects.side_effect = [hourly_query, active_query]
        send_mail.return_value = 1
        record = MagicMock()
        tokens.return_value.save.return_value = record

        self.assertTrue(request_user_password_reset(' MINHANH@example.com '))

        self.assertEqual(users.objects.call_args_list[0].kwargs, {'email': 'minhanh@example.com'})
        stored = tokens.call_args.kwargs
        self.assertEqual(len(stored['token_digest']), 64)
        lifetime = (stored['expires_at'] - datetime.now(timezone.utc)).total_seconds()
        self.assertGreater(lifetime, 295)
        self.assertLessEqual(lifetime, 300)
        message = send_mail.call_args.kwargs['message']
        self.assertIn('http://localhost:3000/reset-password?token=', message)
        self.assertNotIn(stored['token_digest'], message)

    @patch('api.v1.accounts.services.UserPasswordResetToken')
    @patch('api.v1.accounts.services.User')
    def test_resend_cooldown_does_not_create_another_token(self, users, tokens):
        users.objects.return_value.first.return_value = SimpleNamespace(id='abc')
        users.objects.return_value.modify.return_value = None
        self.assertFalse(request_user_password_reset('user@example.com'))
        tokens.assert_not_called()

    @patch('api.v1.accounts.services.User')
    @patch('api.v1.accounts.services.UserPasswordResetToken')
    def test_reset_claims_token_once_hashes_password_and_revokes_jwts(self, tokens, users):
        user = MagicMock(token_version=1)
        user.check_password.return_value = False
        available = SimpleNamespace(id=9, user=user, token_version=1)
        lookup, claim, invalidate = MagicMock(), MagicMock(), MagicMock()
        lookup.first.return_value = available
        claim.modify.return_value = available
        tokens.objects.side_effect = [lookup, claim, invalidate]

        self.assertIs(reset_user_password(raw_token='a' * 43, new_password='mat-khau-moi'), user)

        claim.modify.assert_called_once()
        user.set_password.assert_called_once_with('mat-khau-moi')
        self.assertEqual(user.token_version, 2)
        user.save.assert_not_called()
        users.objects.return_value.update_one.assert_called_once()
        invalidate.update.assert_called_once()

    def test_new_jwt_carries_account_token_version(self):
        now = datetime.now(timezone.utc)
        user = SimpleNamespace(
            id='abc', email='user@example.com', username='user', oauth_provider='local',
            token_version=4, created_at=now,
        )
        encoded = token_pair_for(user)['access']
        payload = jwt.decode(encoded, settings.SECRET_KEY, algorithms=['HS256'], issuer='edututor-api')
        self.assertEqual(payload['ver'], 4)
