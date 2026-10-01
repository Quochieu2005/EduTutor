import hashlib
import hmac
import json
from datetime import date, datetime, timezone

import mongomock
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from mongoengine.connection import get_connection, get_db
from rest_framework.test import APIClient

from accounts.documents import Admin, Student, User
from api.v1.accounts.services import token_pair_for
from api.v1.tutors.services import tutor_token_pair
from core.documents import (
    AdminNotification, AuditLog, Invoice, NotificationDelivery, Payment, PaymentItem,
    SystemNotification, Transaction,
)
from api.v1.payments.services import payment_code
from lessons.documents import Lesson, Review
from tutors.documents import Province, Subject, Tutor, TutorSubject, TutorTeachingArea, Ward


class OperationsApiTests(SimpleTestCase):
    def setUp(self):
        self.assertIsInstance(get_connection(), mongomock.MongoClient)
        for name in get_db().list_collection_names():
            get_db()[name].delete_many({})
        cache.clear()
        self.client = APIClient()
        self.user = User(username='student', email='student@example.com')
        self.user.set_password('student-password')
        self.user.save()
        self.student = Student(
            slug='student', name='Student', email=self.user.email, status='active',
        ).save()
        self.admin = Admin(
            name='Admin', slug='admin', email='admin@example.com', role='admin',
            password_hash='unused-test-password',
        ).save()
        self.tutor = Tutor(
            slug='tutor', name='Tutor', email='tutor@example.com', teaching_mode='both',
            status='active', is_verified=True, must_change_password=False,
        )
        self.tutor.set_password('tutor-password')
        self.tutor.save()
        self.subject = Subject(slug='math', name='Math').save()
        self.province = Province(slug='hcm', name='HCM', code='79').save()
        self.ward = Ward(
            slug='ward-one', code='00001', province=self.province, name='Ward One', type='ward',
        ).save()
        TutorSubject(
            tutor=self.tutor, subject=self.subject, level='Lớp 12', price_per_hour=300000,
        ).save()
        TutorTeachingArea(tutor=self.tutor, province=self.province, ward=self.ward).save()
        self.lesson = Lesson(
            tutor=self.tutor, student=self.student, subject=self.subject,
            session_date=date(2026, 9, 10), start_time='18:00', end_time='20:00',
            mode='offline', province=self.province, ward=self.ward, location='Ward One',
            price=300000, status='completed', payment_status='unpaid',
        ).save()

    def authenticate_student(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token_pair_for(self.user)['access'])

    def authenticate_tutor(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tutor_token_pair(self.tutor)['access'])

    def test_student_payment_and_pending_transaction(self):
        payment = Payment(
            payer_type='student', payer_id=int(self.student.id), tutor=self.tutor,
            student=self.student, payment_type='package', total_amount=300000,
            billing_month='2026-09', commission_amount=45000,
            tutor_payout_amount=255000,
        ).save()
        PaymentItem(payment=payment, lesson=self.lesson, amount=300000).save()
        self.authenticate_student()
        response = self.client.get('/api/v1/payments/me/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data[0]['lesson_count'], 1)
        response = self.client.post(
            f'/api/v1/payments/me/{int(payment.id)}/pay/', {'method': 'bank_transfer'}, format='json',
            HTTP_IDEMPOTENCY_KEY='student-payment-attempt-0001',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(Transaction.objects.count(), 1)
        self.assertEqual(payment.reload().status, 'pending')
        self.assertEqual(response.data['payment_reference'], payment_code(payment))
        retry = self.client.post(
            f'/api/v1/payments/me/{int(payment.id)}/pay/', {'method': 'bank_transfer'}, format='json',
            HTTP_IDEMPOTENCY_KEY='student-payment-attempt-0001',
        )
        self.assertEqual(retry.status_code, 200, retry.data)
        self.assertTrue(retry.data['reused'])
        self.assertEqual(retry.data['id'], response.data['id'])

    def test_tutor_earnings_uses_completed_lessons_and_invoice_payout(self):
        payment = Payment(
            payer_type='student', payer_id=int(self.student.id), tutor=self.tutor,
            student=self.student, payment_type='package', total_amount=300000,
            billing_month='2026-09', commission_amount=45000,
            tutor_payout_amount=255000, status='paid', tutor_payout_status='pending',
        ).save()
        PaymentItem(payment=payment, lesson=self.lesson, amount=300000).save()
        self.authenticate_tutor()
        response = self.client.get('/api/v1/payments/tutor/earnings/?month=2026-09')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['completed_lesson_count'], 1)
        self.assertEqual(response.data['student_count'], 1)
        self.assertEqual(response.data['agreed_tuition'], 300000)
        self.assertEqual(response.data['payable_salary'], 255000)

    def test_student_can_read_only_own_invoices(self):
        payment = Payment(
            payer_type='student', payer_id=int(self.student.id), tutor=self.tutor,
            student=self.student, payment_type='package', total_amount=300000,
            billing_month='2026-09', commission_amount=45000,
            tutor_payout_amount=255000,
        ).save()
        PaymentItem(payment=payment, lesson=self.lesson, amount=300000).save()
        invoice = Invoice(
            invoice_no=payment_code(payment), payment=payment, student=self.student,
            tutor=self.tutor, payer_type='student', payer_id=int(self.student.id),
            payer_name=self.student.name, total_amount=300000,
            issued_at=datetime.now(timezone.utc),
        ).save()
        self.authenticate_student()
        response = self.client.get('/api/v1/invoices/me/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data[0]['invoice_no'], invoice.invoice_no)
        self.assertEqual(response.data[0]['lesson_count'], 1)
        response = self.client.get(f'/api/v1/invoices/me/{invoice.invoice_no}/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['items'][0]['lesson_id'], int(self.lesson.id))

    @override_settings(PAYMENT_WEBHOOK_SECRET='test-payment-webhook-secret')
    def test_signed_webhook_reconciles_exact_invoice_and_notifies_admin(self):
        payment = Payment(
            payer_type='student', payer_id=int(self.student.id), tutor=self.tutor,
            student=self.student, payment_type='package', total_amount=300000,
            billing_month='2026-09', commission_amount=45000,
            tutor_payout_amount=255000,
        ).save()
        PaymentItem(payment=payment, lesson=self.lesson, amount=300000).save()
        invoice = Invoice(
            invoice_no=payment_code(payment), payment=payment, student=self.student,
            tutor=self.tutor, payer_type='student', payer_id=int(self.student.id),
            payer_name=self.student.name, total_amount=300000,
            issued_at=datetime.now(timezone.utc),
        ).save()
        payload = {
            'event': 'payment.succeeded', 'transaction_id': 'bank-receipt-001',
            'reference': invoice.invoice_no, 'amount': 300000, 'method': 'bank_transfer',
        }
        # The student may already have initiated payment before the bank sends
        # its callback. Reconciliation must update that intent, not append a
        # second monetary transaction.
        self.authenticate_student()
        intent = self.client.post(
            f'/api/v1/payments/me/{int(payment.id)}/pay/', {'method': 'bank_transfer'}, format='json',
            HTTP_IDEMPOTENCY_KEY='webhook-existing-intent-0001',
        )
        self.assertEqual(intent.status_code, 201, intent.data)
        body = json.dumps(payload).encode('utf-8')
        signature = hmac.new(
            b'test-payment-webhook-secret', body, hashlib.sha256,
        ).hexdigest()
        response = self.client.generic(
            'POST', '/api/v1/payments/webhooks/receipt/', body,
            content_type='application/json', HTTP_X_PAYMENT_SIGNATURE=signature,
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['reconciled'])
        self.assertEqual(payment.reload().status, 'paid')
        self.assertEqual(self.lesson.reload().payment_status, 'paid')
        self.assertEqual(AdminNotification.objects.count(), 1)
        self.assertEqual(AuditLog.objects(action='reconcile_payment').count(), 1)
        self.assertEqual(Transaction.objects.first().payment_reference, invoice.invoice_no)
        self.assertEqual(Transaction.objects.count(), 1)
        self.assertEqual(Transaction.objects.first().gateway_transaction_id, 'bank-receipt-001')

        # Providers retry callbacks. A duplicate receipt must not credit twice.
        response = self.client.generic(
            'POST', '/api/v1/payments/webhooks/receipt/', body,
            content_type='application/json', HTTP_X_PAYMENT_SIGNATURE=signature,
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data['reconciled'])
        self.assertEqual(Transaction.objects.count(), 1)

    @override_settings(PAYMENT_WEBHOOK_SECRET='test-payment-webhook-secret')
    def test_webhook_never_credits_wrong_amount_or_invalid_signature(self):
        payment = Payment(
            payer_type='student', payer_id=int(self.student.id), tutor=self.tutor,
            student=self.student, payment_type='package', total_amount=300000,
            billing_month='2026-09', commission_amount=45000,
            tutor_payout_amount=255000,
        ).save()
        invoice = Invoice(
            invoice_no=payment_code(payment), payment=payment, student=self.student,
            tutor=self.tutor, payer_type='student', payer_id=int(self.student.id),
            payer_name=self.student.name, total_amount=300000,
            issued_at=datetime.now(timezone.utc),
        ).save()
        payload = {
            'event': 'payment.succeeded', 'transaction_id': 'bank-receipt-wrong-amount',
            'reference': invoice.invoice_no, 'amount': 299999, 'method': 'bank_transfer',
        }
        body = json.dumps(payload).encode('utf-8')
        signature = hmac.new(
            b'test-payment-webhook-secret', body, hashlib.sha256,
        ).hexdigest()
        response = self.client.generic(
            'POST', '/api/v1/payments/webhooks/receipt/', body,
            content_type='application/json', HTTP_X_PAYMENT_SIGNATURE=signature,
        )
        self.assertEqual(response.status_code, 422, response.data)
        self.assertEqual(payment.reload().status, 'pending')
        self.assertEqual(Transaction.objects.count(), 0)

        payload['amount'] = 300000
        body = json.dumps(payload).encode('utf-8')
        response = self.client.generic(
            'POST', '/api/v1/payments/webhooks/receipt/', body,
            content_type='application/json', HTTP_X_PAYMENT_SIGNATURE='not-a-real-signature',
        )
        self.assertEqual(response.status_code, 403, response.data)
        self.assertEqual(payment.reload().status, 'pending')
        self.assertEqual(Transaction.objects.count(), 0)

    def test_review_and_complaint_workflows(self):
        self.authenticate_student()
        response = self.client.post('/api/v1/feedback/reviews/', {
            'lesson_id': int(self.lesson.id), 'rating': 5, 'comment': 'Very good tutor',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Review.objects.count(), 1)
        response = self.client.post('/api/v1/feedback/complaints/me/', {
            'target_type': 'lesson', 'target_id': int(self.lesson.id),
            'target_label': 'Lesson 1', 'content': 'I need support for this lesson.',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['status'], 'new')

    def test_geography_returns_available_tutor(self):
        response = self.client.get('/api/v1/geography/areas/hcm/ward-one/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['tutors'][0]['slug'], 'tutor')
        self.assertEqual(response.data['ward']['slug'], 'ward-one')

    def test_account_profile_supports_student_and_social_accounts(self):
        self.authenticate_student()
        response = self.client.get('/api/v1/accounts/profile/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['role'], 'student')
        self.assertEqual(response.data['student']['id'], int(self.student.id))
        response = self.client.patch('/api/v1/accounts/profile/', {
            'display_name': 'Student Updated', 'phone': '0901234567',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.student.reload().name, 'Student Updated')

        social = User(
            username='google_user', display_name='Google User',
            email='google@example.com', oauth_provider='google', oauth_uid='google-uid',
        )
        social.set_password('unused-social-password')
        social.save()
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token_pair_for(social)['access'])
        response = self.client.get('/api/v1/accounts/profile/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['role'], 'user')
        self.assertEqual(response.data['account']['oauth_provider'], 'google')
        self.assertIsNone(response.data['student'])

    def test_tutor_profile_uses_tutor_token_and_updates_safe_fields(self):
        self.authenticate_tutor()
        response = self.client.get('/api/v1/tutors/auth/profile/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['email'], self.tutor.email)
        response = self.client.patch('/api/v1/tutors/auth/profile/', {
            'headline': 'Math tutor', 'experience_years': 5,
            'hourly_rate_min': 200000, 'hourly_rate_max': 300000,
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.tutor.reload().headline, 'Math tutor')
        self.assertEqual(response.data['experience_years'], 5)

    def test_subject_catalogue_exposes_only_active_subjects_and_active_tutors(self):
        inactive = Subject(slug='hidden-subject', name='Hidden', status=0).save()
        response = self.client.get('/api/v1/subjects/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([item['slug'] for item in response.data['results']], ['math'])
        self.assertEqual(response.data['results'][0]['tutor_count'], 1)

        response = self.client.get('/api/v1/subjects/math/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['category'], None)

        response = self.client.get('/api/v1/subjects/math/tutors/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['results'][0]['slug'], 'tutor')
        self.assertEqual(response.data['results'][0]['level'], 'Lớp 12')

        response = self.client.get('/api/v1/subjects/hidden-subject/')
        self.assertEqual(response.status_code, 404)

    def test_system_notifications_follow_admin_delivery_records(self):
        notification = SystemNotification(
            title='Lịch học thay đổi', message='Buổi học chuyển sang 19:00.',
            audience='students', status='sent', created_by=self.admin,
            recipient_count=1,
        ).save()
        student_delivery = NotificationDelivery(
            notification=notification, recipient_type='student', recipient_id=int(self.student.id),
        ).save()
        tutor_delivery = NotificationDelivery(
            notification=notification, recipient_type='tutor', recipient_id=int(self.tutor.id),
        ).save()

        self.authenticate_student()
        response = self.client.get('/api/v1/notifications/me/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['unread_count'], 1)
        self.assertEqual([item['id'] for item in response.data['results']], [int(student_delivery.id)])
        response = self.client.post(f'/api/v1/notifications/me/{int(student_delivery.id)}/read/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNotNone(student_delivery.reload().read_at)
        response = self.client.post('/api/v1/notifications/me/read-all/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['updated_count'], 0)

        self.authenticate_tutor()
        response = self.client.get('/api/v1/notifications/tutor/me/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([item['id'] for item in response.data['results']], [int(tutor_delivery.id)])
