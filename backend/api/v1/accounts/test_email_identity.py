from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory
from unittest.mock import patch

from accounts.documents import Admin, Parent, Student, User
from tutors.documents import Tutor

from .services import SocialTokenError, ensure_student_profile, register_user
from .views import ClerkExchangeView, UnifiedLoginView


class CrossCollectionEmailIdentityTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        for document in (User, Student, Parent, Tutor, Admin):
            document.drop_collection()

    def tearDown(self):
        for document in (User, Student, Parent, Tutor, Admin):
            document.drop_collection()

    def test_tutor_email_cannot_be_registered_as_website_user(self):
        tutor = Tutor(slug='gia-su-a', name='Gia sư A', email='same@example.com', teaching_mode='online')
        tutor.set_password('mat-khau-123')
        tutor.save()

        with self.assertRaisesMessage(SocialTokenError, 'gia sư'):
            register_user(username='hoc_vien_a', email='SAME@example.com', password='mat-khau-123')

    def test_admin_can_login_to_public_site_with_database_password(self):
        admin = Admin(name='Admin A', slug='admin-a', email='admin@example.com')
        admin.set_password('mat-khau-123')
        admin.save()

        response = UnifiedLoginView.as_view()(self.factory.post(
            '/api/v1/accounts/login/unified/',
            {'email': 'admin@example.com', 'password': 'mat-khau-123'}, format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['actor_type'], 'admin')
        self.assertEqual(response.data['account']['email'], 'admin@example.com')

    def test_user_becomes_student_only_after_starting_a_learning_flow(self):
        user = register_user(
            username='hoc_vien_a', display_name='Học viên A',
            email='student@example.com', password='mat-khau-123',
        )

        self.assertIsNone(Student.objects(email='student@example.com').first())
        ensure_student_profile(user)

        response = UnifiedLoginView.as_view()(self.factory.post(
            '/api/v1/accounts/login/unified/',
            {'email': 'student@example.com', 'password': 'mat-khau-123'}, format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['actor_type'], 'student')
        self.assertEqual(response.data['account']['display_name'], 'Học viên A')

    def test_legacy_duplicate_email_prefers_tutor_over_student(self):
        user = User(username='legacy_user', display_name='Legacy Student', email='legacy@example.com', account_type='student')
        user.set_password('student-pass-123')
        user.save()
        tutor = Tutor(slug='legacy-tutor', name='Legacy Tutor', email='legacy@example.com', teaching_mode='online')
        tutor.set_password('tutor-pass-123')
        tutor.save()

        response = UnifiedLoginView.as_view()(self.factory.post(
            '/api/v1/accounts/login/unified/',
            {'email': 'legacy@example.com', 'password': 'tutor-pass-123'}, format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['actor_type'], 'tutor')

    @patch('api.v1.accounts.views.verify_clerk_session_token')
    def test_clerk_exchange_prefers_admin_issued_tutor_account(self, verify_token):
        verify_token.return_value = {'sub': 'clerk-user-id', 'email': 'tutor@example.com'}
        tutor = Tutor(slug='gia-su-clerk', name='Gia sư Clerk', email='tutor@example.com', teaching_mode='online')
        tutor.set_password('mat-khau-123')
        tutor.save()

        response = ClerkExchangeView.as_view()(self.factory.post(
            '/api/v1/accounts/clerk/exchange/',
            {
                'clerk_token': 'x' * 30,
                'email': 'tutor@example.com',
                'display_name': 'Tên từ Clerk',
            },
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['actor_type'], 'tutor')
        self.assertEqual(response.data['account']['email'], 'tutor@example.com')
        self.assertNotIn('user', response.data)

    @patch('api.v1.accounts.views.verify_clerk_session_token')
    def test_admin_can_exchange_clerk_session_for_public_site(self, verify_token):
        verify_token.return_value = {'sub': 'clerk-admin-id', 'email': 'admin@example.com'}
        admin = Admin(name='Admin Website', slug='admin-website', email='admin@example.com')
        admin.set_password('mat-khau-123')
        admin.save()

        response = ClerkExchangeView.as_view()(self.factory.post(
            '/api/v1/accounts/clerk/exchange/',
            {'clerk_token': 'x' * 30, 'email': 'admin@example.com'}, format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['actor_type'], 'admin')
        self.assertEqual(response.data['account']['role'], 'admin')
