from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from .serializers import TutorChangePasswordSerializer
from .services import TutorAuthError, login_tutor, tutor_token_pair
from .views import TutorChangePasswordView, TutorLoginView


@override_settings(
    SECRET_KEY='test-secret-that-is-at-least-32-bytes-long', API_JWT_ACCESS_TTL_MINUTES=15,
    API_JWT_REFRESH_TTL_DAYS=7,
)
class TutorAuthenticationTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch('api.v1.tutors.services.Tutor')
    def test_admin_issued_password_can_login_and_requests_password_change(self, tutor_model):
        tutor = SimpleNamespace(
            id=7, slug='minh-anh', name='Minh Anh', email='tutor@example.com',
            avatar=None, status='active', must_change_password=True, token_version=1,
            check_password=MagicMock(return_value=True),
        )
        tutor_model.STATUS_ACTIVE = 'active'
        tutor_model.objects.return_value.first.return_value = tutor
        logged_in = login_tutor(email='TUTOR@example.com', password='123456789')
        self.assertIs(logged_in, tutor)
        self.assertTrue(tutor_token_pair(tutor)['tutor']['must_change_password'])
        tutor_model.objects.assert_called_once_with(email='tutor@example.com')

    @patch('api.v1.tutors.views.login_tutor')
    @patch('api.v1.tutors.views.tutor_token_pair')
    def test_login_endpoint_returns_tutor_tokens(self, token_pair, login):
        tutor = MagicMock()
        login.return_value = tutor
        token_pair.return_value = {
            'access': 'access', 'refresh': 'refresh', 'token_type': 'Bearer',
            'expires_in': 900, 'tutor': {
                'id': 1, 'slug': 'tutor', 'name': 'Tutor', 'email': 'tutor@example.com',
                'avatar': None, 'status': 'active', 'must_change_password': True,
            },
        }
        response = TutorLoginView.as_view()(self.factory.post(
            '/api/v1/tutors/auth/login/',
            {'email': 'tutor@example.com', 'password': '123456789'}, format='json',
        ))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['tutor']['must_change_password'])

    def test_change_password_requires_matching_confirmation(self):
        serializer = TutorChangePasswordSerializer(data={
            'current_password': '123456789',
            'new_password': 'new-password-123',
            'confirm_password': 'different-password',
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('confirm_password', serializer.errors)

    @patch('api.v1.tutors.views.change_tutor_password')
    def test_changed_password_clears_first_login_flag(self, change_password):
        tutor = MagicMock()
        principal = SimpleNamespace(tutor=tutor, is_authenticated=True, pk=1)
        request = self.factory.post('/api/v1/tutors/auth/change-password/', {
            'current_password': '123456789',
            'new_password': 'new-password-123',
            'confirm_password': 'new-password-123',
        }, format='json')
        force_authenticate(request, user=principal)
        response = TutorChangePasswordView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['must_change_password'])
        change_password.assert_called_once_with(
            tutor, current_password='123456789', new_password='new-password-123',
        )

    @patch('api.v1.tutors.services.Tutor')
    def test_inactive_tutor_cannot_login(self, tutor_model):
        tutor = SimpleNamespace(status='inactive', check_password=MagicMock(return_value=True))
        tutor_model.STATUS_ACTIVE = 'active'
        tutor_model.objects.return_value.first.return_value = tutor
        with self.assertRaises(TutorAuthError):
            login_tutor(email='tutor@example.com', password='correct-password')
