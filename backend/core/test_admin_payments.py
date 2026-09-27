"""Tests for the admin monthly tuition workflow."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from core.admin_payments import _billing_period, payment_page_config


class AdminPaymentTests(SimpleTestCase):
    def test_billing_period_requires_a_real_month(self):
        self.assertEqual(_billing_period('2026-10'), (2026, 10))
        with self.assertRaisesMessage(ValueError, 'Kỳ học phí'):
            _billing_period('2026-13')

    @patch('core.admin_payments.PaymentItem.objects')
    @patch('core.admin_payments.Payment.objects')
    def test_payment_list_shows_tuition_commission_and_tutor_payout(self, payments, items):
        payment = SimpleNamespace(
            id=12, billing_month='2026-10', total_amount=1600000,
            commission_amount=240000, tutor_payout_amount=1360000,
            status='paid', tutor_payout_status='pending',
            student=SimpleNamespace(name='Học viên A'),
            tutor=SimpleNamespace(name='Gia sư B'),
            created_at=datetime(2026, 10, 31, tzinfo=timezone.utc),
        )
        payments.order_by.return_value.select_related.return_value = [payment]
        items.return_value.select_related.return_value = [SimpleNamespace(), SimpleNamespace()]

        page = payment_page_config()

        self.assertEqual(page['rows'][0], (
            'HP-202610-00012', '2026-10', 'Học viên A', 'Gia sư B', '2',
            '1.600.000 VNĐ', '240.000 VNĐ', '1.360.000 VNĐ',
            'Đã thanh toán', 'Chưa chi trả',
        ))
