"""Exercise real URL routing, validation, queries and serialization in memory.

Run using config.settings.test; database is asserted to be mongomock before
clearing test data. SMTP / OAuth providers are mocked, not application queries.
"""
import re
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from io import StringIO

import jwt
import mongomock
from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from mongoengine.connection import get_db, get_connection
from rest_framework.test import APIClient

from accounts.documents import Admin, User, UserPasswordResetToken
from api.v1.accounts.services import token_pair_for, request_user_password_reset
from core.documents import Banner, BlogCategory, BlogPost
from tutors.documents import Subject, Province, JobPosting
from drf_spectacular.generators import SchemaGenerator


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ApiIntegrationTests(SimpleTestCase):
    def setUp(self):
        self.assertIsInstance(get_connection(), mongomock.MongoClient,
                              'Use --settings=config.settings.test; NEVER run against Atlas')
        for name in get_db().list_collection_names():
            get_db()[name].delete_many({})
        cache.clear()
        self.addCleanup(cache.clear)
        mail.get_connection()
        mail.outbox.clear()
        self.client = APIClient()

    def user(self, username='testuser'):
        user = User(username=username, email=f'{username}@example.com')
        user.set_password('initial-password')
        return user.save()

    def post(self, path, payload):
        return self.client.post('/api/v1/' + path, payload, format='json')

    def forgot(self, user):
        response = self.post('accounts/password/forgot/', {'email': user.email})
        self.assertEqual(response.status_code, 200)
        return re.search(r'token=([A-Za-z0-9_-]+)', mail.outbox[-1].body)[1]

    def reset(self, token):
        return self.post('accounts/password/reset/', {
            'token': token, 'new_password': 'new-password-123', 'confirm_password': 'new-password-123',
        })

    def test_full_reset_flow_revokes_both_tokens_and_rejects_replay(self):
        user = self.user()
        pair = token_pair_for(user)
        token = self.forgot(user)
        record = UserPasswordResetToken.objects.first()
        self.assertNotEqual(record.token_digest, token)
        self.assertAlmostEqual((record.expires_at - record.created_at).total_seconds(), 300, delta=2)
        self.assertEqual(self.reset(token).status_code, 200)
        self.assertTrue(user.reload().check_password('new-password-123'))
        self.assertEqual(self.reset(token).status_code, 400)
        self.assertEqual(self.post('accounts/refresh/', {'refresh': pair['refresh']}).status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + pair['access'])
        self.assertEqual(self.client.get('/api/v1/accounts/me/').status_code, 401)

    def test_expired_link_does_not_change_password_or_send_again(self):
        user = self.user()
        token = self.forgot(user)
        UserPasswordResetToken.objects.update(set__expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
        self.assertEqual(self.reset(token).status_code, 400)
        self.assertTrue(user.reload().check_password('initial-password'))
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_cooldown_and_new_link(self):
        user = self.user()
        token = self.forgot(user)
        self.forgot(user)
        self.assertEqual(len(mail.outbox), 1)
        user.update(set__password_reset_after=datetime.now(timezone.utc) - timedelta(seconds=1))
        new_token = self.forgot(user)
        self.assertNotEqual(token, new_token)
        self.assertEqual(self.reset(token).status_code, 400)
        self.assertEqual(self.reset(new_token).status_code, 200)

    def test_smtp_failure_retains_previous_link_and_hourly_attempt(self):
        user = self.user()
        token = self.forgot(user)
        user.update(set__password_reset_after=None)
        with patch('api.v1.accounts.services.send_mail', side_effect=TimeoutError), self.assertRaises(TimeoutError):
            request_user_password_reset(user.email)
        self.assertEqual(UserPasswordResetToken.objects.count(), 2)
        self.assertEqual(self.reset(token).status_code, 200)

    def test_mail_backend_zero_delivery_is_a_failure(self):
        user = self.user()
        with patch('api.v1.accounts.services.send_mail', return_value=0), self.assertRaises(RuntimeError):
            request_user_password_reset(user.email)
        self.assertEqual(UserPasswordResetToken.objects(is_used=False).count(), 0)

    def test_unknown_email_receives_same_response_without_mail(self):
        user = self.user()
        missing = self.post('accounts/password/forgot/', {'email': 'missing@example.com'})
        self.assertEqual(len(mail.outbox), 0)
        existing = self.post('accounts/password/forgot/', {'email': user.email})
        self.assertEqual(existing.data, missing.data)

    def test_register_login_me_refresh(self):
        response = self.post('accounts/register/', {'username': 'newuser', 'email': 'new@example.com', 'password': ' password-123 '})
        self.assertEqual(response.status_code, 201, response.data)
        pair = response.data
        response = self.post('accounts/login/', {'email': 'NEW@example.com', 'password': ' password-123 '})
        self.assertEqual(response.status_code, 200, response.data)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + pair['access'])
        response = self.client.get('/api/v1/accounts/me/')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('password_hash', response.data)
        self.assertEqual(self.post('accounts/refresh/', {'refresh': pair['refresh']}).status_code, 200)

    def test_two_local_users_can_register(self):
        self.user('firstuser')
        response = self.post('accounts/register/', {'username': 'seconduser', 'email': 'second@example.com', 'password': 'password-123'})
        self.assertEqual(response.status_code, 201, response.data)

    def test_unicode_password_over_72_bytes_is_validation_error(self):
        response = self.post('accounts/register/', {'username': 'newuser', 'email': 'new@example.com', 'password': 'ế' * 30})
        self.assertEqual(response.status_code, 400)

    def test_invalid_jwt_subject_and_missing_exp_are_401(self):
        for payload in (
            {'sub': 'not-object-id', 'exp': datetime.now(timezone.utc) + timedelta(minutes=1)},
            {'sub': '123456789012345678901234'},
        ):
            payload.update(iss='edututor-api', iat=datetime.now(timezone.utc), token_type='access')
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
            self.assertEqual(self.client.get('/api/v1/accounts/me/').status_code, 401)

    def test_contact_validation_and_privacy(self):
        self.assertEqual(self.post('contacts/', {}).status_code, 400)
        result = self.post('contacts/', {'parent_name': 'Phu huynh', 'email': 'parent@example.com', 'phone': '0901234567', 'needs_description': 'Tim gia su'})
        self.assertEqual(result.status_code, 201, result.data)
        self.assertNotIn('email', result.data)
        self.assertEqual(self.client.get('/api/v1/contacts/').status_code, 405)

    def test_banners_filter_dates_and_status(self):
        Banner(image='https://example.com/a.png', title='visible').save()
        Banner(image='https://example.com/b.png', status='inactive').save()
        Banner(image='https://example.com/c.png', start_at=datetime.now(timezone.utc) + timedelta(days=1)).save()
        result = self.client.get('/api/v1/banners/')
        self.assertEqual(result.status_code, 200)
        self.assertEqual([row['title'] for row in result.data], ['visible'])

    def test_recruitment_filters_closed_and_inactive_subjects(self):
        subject = Subject(slug='math', name='Math').save()
        province = Province(slug='hcm', name='HCM').save()
        for state in ('open', 'closed'):
            JobPosting(slug=state, title=state, description='test', posted_by_type='admin', posted_by_id=1,
                       subject=subject, province=province, status=state).save()
        result = self.client.get('/api/v1/tutors/jobs/')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual([row['slug'] for row in result.data['results']], ['open'])
        subject.update(set__status=0)
        self.assertEqual(self.client.get('/api/v1/tutors/jobs/open/').status_code, 404)

    @override_settings(DEBUG=False)
    def test_docs_and_schema_are_private_in_production(self):
        for path in ('/api/docs/', '/api/docs/schema/'):
            self.assertEqual(self.client.get(path).status_code, 404)

    def test_hourly_quota_even_after_expiry(self):
        user = self.user()
        for _ in range(3):
            user.update(set__password_reset_after=None)
            self.assertTrue(request_user_password_reset(user.email))
        user.update(set__password_reset_after=None)
        UserPasswordResetToken.objects.update(set__expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
        self.assertFalse(request_user_password_reset(user.email))
        self.assertEqual(len(mail.outbox), 3)

    def test_parallel_resends_only_send_one_email(self):
        user = self.user()
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(request_user_password_reset, [user.email] * 4))
        self.assertEqual(sum(results), 1)
        self.assertEqual(UserPasswordResetToken.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_password_change_race_only_one_update_wins(self):
        user = self.user()
        token = self.forgot(user)
        from api.v1.accounts.services import reset_user_password, PasswordResetTokenError
        def attempt(_):
            try:
                reset_user_password(raw_token=token, new_password='parallel-password')
                return True
            except PasswordResetTokenError:
                return False
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sum(pool.map(attempt, range(2))), 1)
        self.assertEqual(user.reload().token_version, 2)

    def test_legacy_password_migrates_to_bcrypt(self):
        from django.contrib.auth.hashers import PBKDF2PasswordHasher
        user = self.user()
        hasher = PBKDF2PasswordHasher()
        user.update(set__password_hash=hasher.encode('legacy-password', hasher.salt()))
        result = self.post('accounts/login/', {'email': user.email, 'password': 'legacy-password'})
        self.assertEqual(result.status_code, 200)
        self.assertTrue(user.reload().password_hash.startswith('$2b$'))

    @override_settings(GOOGLE_OAUTH_CLIENT_ID='expected-client')
    def test_google_create_then_login_and_expired_token(self):
        identity = {'aud': 'expected-client', 'iss': 'https://accounts.google.com',
                    'email_verified': 'true', 'sub': 'google-user', 'email': 'google@example.com',
                    'exp': int(datetime.now(timezone.utc).timestamp()) + 300}
        with patch('api.v1.accounts.services._provider_json', return_value=identity):
            self.assertEqual(self.post('accounts/google/', {'token': 'provider-test-token'}).status_code, 201)
            result = self.post('accounts/google/', {'token': 'provider-test-token'})
            self.assertEqual(result.status_code, 200)
            self.assertFalse(result.data['created'])
            identity['exp'] = 1
            self.assertEqual(self.post('accounts/google/', {'token': 'expired-token'}).status_code, 401)
            identity['exp'] = int(datetime.now(timezone.utc).timestamp()) + 300
            identity['aud'] = 'attacker-client'
            self.assertEqual(self.post('accounts/google/', {'token': 'wrong-audience'}).status_code, 401)

    @override_settings(FACEBOOK_APP_ID='expected-app', FACEBOOK_APP_SECRET='test-secret')
    def test_facebook_create_then_login_and_reject_wrong_app(self):
        debug = {'data': {'is_valid': True, 'app_id': 'expected-app', 'user_id': 'fb-uid',
                          'expires_at': int(datetime.now(timezone.utc).timestamp()) + 300}}
        profile = {'id': 'fb-uid', 'name': 'Facebook User', 'email': 'facebook@example.com'}
        with patch('api.v1.accounts.services._provider_json', side_effect=[debug, profile, debug, profile]):
            self.assertEqual(self.post('accounts/facebook/', {'token': 'fb-token'}).status_code, 201)
            self.assertEqual(self.post('accounts/facebook/', {'token': 'fb-token'}).status_code, 200)
        debug['data']['app_id'] = 'other-app'
        with patch('api.v1.accounts.services._provider_json', return_value=debug):
            self.assertEqual(self.post('accounts/facebook/', {'token': 'other-app-token'}).status_code, 401)

    def test_cors_only_allows_configured_frontend(self):
        with override_settings(CORS_ALLOWED_ORIGINS=['https://frontend.example.com']):
            result = self.client.options('/api/v1/accounts/login/', HTTP_ORIGIN='https://frontend.example.com',
                                         HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
                                         HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type')
            self.assertEqual(result['Access-Control-Allow-Origin'], 'https://frontend.example.com')
            self.assertNotIn('Access-Control-Allow-Credentials', result)
            result = self.client.options('/api/v1/accounts/login/', HTTP_ORIGIN='https://untrusted.example.com',
                                         HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST')
            self.assertNotIn('Access-Control-Allow-Origin', result)

    def test_database_timeout_returns_safe_503(self):
        from pymongo.errors import ServerSelectionTimeoutError
        with patch('api.v1.accounts.views.login_user', side_effect=ServerSelectionTimeoutError('private-db-host')):
            with self.assertLogs('api.exception_handlers', level='ERROR'):
                result = self.post('accounts/login/', {'email': 'test@example.com', 'password': 'test-password'})
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('private-db-host', str(result.data))

    def test_blog_visibility_dates_projection_and_batch_queries(self):
        admin = Admin(name='Admin', slug='admin', email='admin@example.com', password_hash='unused-test-hash').save()
        category = BlogCategory(slug='math', name='Math').save()
        inactive = BlogCategory(slug='hidden', name='Hidden', status=0).save()
        now = datetime.now(timezone.utc)
        for index in range(20):
            BlogPost(slug=f'post-{index}', title=f'Post {index}', content='large content',
                     category=category, admin=admin, status='published', published_at=now).save()
        for slug, state, cat, date in (
            ('draft', 'draft', category, now), ('future', 'published', category, now + timedelta(days=1)),
            ('hidden', 'published', inactive, now),
        ):
            BlogPost(slug=slug, title=slug, content='secret', admin=admin, category=cat, status=state, published_at=date).save()
        collection = BlogCategory._get_collection()
        with patch.object(collection, 'find', wraps=collection.find) as find:
            result = self.client.get('/api/v1/blog/?page_size=20')
            self.assertEqual(result.status_code, 200, result.data)
            self.assertEqual(result.data['count'], 20)
            self.assertEqual(len(result.data['results']), 20)
            self.assertLessEqual(find.call_count, 2)  # active IDs + one bulk reference query, not 21
        self.assertNotIn('content', result.data['results'][0])
        self.assertRegex(result.data['results'][0]['published_at'], r'^\d{4}-\d{2}-\d{2}$')
        for slug in ('draft', 'future', 'hidden'):
            self.assertEqual(self.client.get(f'/api/v1/blog/{slug}/').status_code, 404)
        self.assertEqual(self.client.get('/api/v1/blog/post-0/').data['content'], 'large content')
        self.assertEqual(len(self.client.get('/api/v1/blog/categories/').data), 1)
        self.assertEqual(self.client.get('/api/v1/blog/?page=999').status_code, 404)

    def test_recruitment_references_are_batched_for_entire_page(self):
        subject = Subject(slug='math', name='Math').save()
        province = Province(slug='hcm', name='HCM').save()
        for index in range(20):
            JobPosting(slug=f'job-{index}', title='Tutor', description='test', posted_by_type='admin', posted_by_id=1,
                       subject=subject, province=province).save()
        with ExitStack() as stack:
            calls = [stack.enter_context(patch.object(model._get_collection(), 'find', wraps=model._get_collection().find))
                     for model in (Subject, Province)]
            result = self.client.get('/api/v1/tutors/jobs/')
            self.assertEqual(len(result.data['results']), 20)
            batched = sum(find.call_count for find in calls)
            self.assertLessEqual(batched, 3)
        # Reproduce the previous lazy-reference serialization on identical data.
        with patch('api.v1.tutors.views.DeReference', return_value=lambda page, **kwargs: page), ExitStack() as stack:
            calls = [stack.enter_context(patch.object(model._get_collection(), 'find', wraps=model._get_collection().find))
                     for model in (Subject, Province)]
            baseline = self.client.get('/api/v1/tutors/jobs/')
            lazy = sum(find.call_count for find in calls)
            self.assertEqual(baseline.data, result.data)
            self.assertEqual(lazy, 41)
            self.assertEqual(batched, 3)

    def test_application_create_duplicate_and_reject_status_injection(self):
        payload = {'name': 'Candidate', 'email': 'candidate@example.com', 'phone': '0901234567'}
        result = self.post('tutors/applications/', payload)
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data['status'], 'pending')
        self.assertEqual(self.post('tutors/applications/', payload).status_code, 409)
        self.assertEqual(self.post('tutors/applications/', {**payload, 'status': 'approved'}).status_code, 400)
        cache.clear()  # The POST quota was exhausted; test method permissions independently.
        self.assertEqual(self.client.get('/api/v1/tutors/applications/').status_code, 405)

    def test_schema_includes_existing_endpoints_and_pagination(self):
        schema = SchemaGenerator().get_schema(request=None, public=True)
        for path in ('/api/v1/accounts/password/forgot/', '/api/v1/accounts/password/reset/',
                     '/api/v1/accounts/google/', '/api/v1/accounts/facebook/', '/api/v1/tutors/jobs/',
                     '/api/v1/tutors/applications/', '/api/v1/blog/', '/api/v1/banners/', '/api/v1/contacts/'):
            self.assertIn(path, schema['paths'])
        response = schema['paths']['/api/v1/blog/']['get']['responses']['200']['content']['application/json']['schema']
        self.assertIn('Paginated', response['$ref'])

    def test_oauth_index_migration_is_safe_and_idempotent(self):
        collection = User._get_collection()
        collection.create_index([('oauth_provider', 1), ('oauth_uid', 1)], unique=True, sparse=True)
        out = StringIO()
        call_command('migrate_user_oauth_index', stdout=out)
        self.assertIn('oauth_provider_1_oauth_uid_1', collection.index_information())
        call_command('migrate_user_oauth_index', apply=True, stdout=out)
        call_command('migrate_user_oauth_index', apply=True, stdout=out)
        self.assertNotIn('oauth_provider_1_oauth_uid_1', collection.index_information())
        self.assertIn('unique_oauth_identity_v2', collection.index_information())
