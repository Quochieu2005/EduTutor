"""Unit tests for system-notification management without MongoDB writes."""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from core.admin_notifications import _dispatch_notification, notification_page_config
from core.documents import SystemNotification


class AdminNotificationTests(SimpleTestCase):
    @patch('core.admin_notifications.SystemNotification.objects')
    def test_list_displays_sent_time_in_vietnam(self, objects):
        objects.order_by.return_value = [SimpleNamespace(
            title='Nhắc lịch học', audience='students', recipient_count=4,
            status='sent', sent_at=datetime(2026, 9, 22, 6, 45, 12, tzinfo=timezone.utc),
        )]

        page = notification_page_config()

        self.assertEqual(page['rows'][0], (
            'Nhắc lịch học', 'Học viên', '4', '22/09/2026 13:45:12', 'Đã gửi',
        ))
        self.assertEqual(page['columns'][3], ('sent_at', 'Thời gian gửi (GMT+7)'))

    @patch('core.admin_notifications.NotificationDelivery.objects')
    def test_dispatch_creates_one_delivery_for_each_recipient(self, deliveries):
        student_source = MagicMock()
        student_source.objects.only.return_value = [SimpleNamespace(id=10), SimpleNamespace(id=11)]
        tutor_source = MagicMock()
        tutor_source.objects.only.return_value = [SimpleNamespace(id=20)]
        notification = MagicMock()
        notification.audience = SystemNotification.AUDIENCE_ALL
        notification.sent_at = None

        with patch(
            'core.admin_notifications._recipient_sources',
            return_value=(('student', student_source), ('tutor', tutor_source)),
        ):
            _dispatch_notification(notification)

        deliveries.insert.assert_called_once()
        created = deliveries.insert.call_args.args[0]
        self.assertEqual(len(created), 3)
        self.assertEqual(notification.status, SystemNotification.STATUS_SENT)
        self.assertEqual(notification.recipient_count, 3)
        notification.save.assert_called_once()
