from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.template.loader import render_to_string
from django.test import RequestFactory, SimpleTestCase

from accounts.documents import Admin
from core.admin_contacts import contacts, contact_notifications


class AdminContactTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = SimpleNamespace(id=1, status=Admin.STATUS_ACTIVE)

    def request(self, method='get', data=None):
        request = getattr(self.factory, method)('/admin/contacts/', data or {})
        request.admin_account = self.admin
        return request

    @patch('core.admin_contacts.Contact.objects')
    @patch('core.admin_contacts.render')
    def test_listing_uses_real_records_and_existing_table(self, render, objects):
        objects.order_by.return_value = [SimpleNamespace(
            id=17, parent_name='<script>alert(1)</script>', phone='0901234567', email='parent@example.com',
            subject=None, needs_description='Tư vấn học Toán', status='new',
            created_at=datetime(2026, 9, 17, tzinfo=timezone.utc),
        )]
        contacts(self.request())
        context = render.call_args.args[2]
        self.assertEqual(context['page']['rows'][0]['id'], 17)
        self.assertFalse(context['page']['can_create'])
        html = render_to_string('resource/resource-list.html', context)
        for marker in ('data-resource-search', 'data-resource-view', 'data-resource-page-size',
                       'name="contact_id" value="17"', 'name="status"', '0901234567'):
            self.assertIn(marker, html)
        self.assertIn('parent@example.com', html)
        self.assertIn('data-field="email"', html)
        self.assertNotIn('data-field="grade"', html)
        self.assertNotIn('<script>alert', html)
        self.assertNotIn('data-resource-delete-selected', html)

    @patch('core.admin_contacts.messages.success')
    @patch('core.admin_contacts.record_admin_activity')
    @patch('core.admin_contacts.Contact.objects')
    def test_updates_status_and_records_audit(self, objects, audit, success):
        contact = MagicMock(status='new')
        objects.return_value.first.return_value = contact
        response = contacts(self.request('post', {'contact_id': '17', 'status': 'closed'}))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(contact.update.call_args.kwargs['set__status'], 'closed')
        audit.assert_called_once()

    @patch('core.admin_contacts.messages.success')
    @patch('core.admin_contacts.send_mail')
    @patch('core.admin_contacts.Contact.objects')
    def test_sends_email_reply_to_entered_recipient(self, objects, send, success):
        response = contacts(self.request('post', {
            'action': 'reply', 'recipient_email': 'recipient@example.com',
            'subject': 'EduTutor phản hồi', 'message': 'Nội dung phản hồi',
        }))
        self.assertEqual(response.status_code, 302)
        send.assert_called_once()
        self.assertEqual(send.call_args.args[3], ['recipient@example.com'])
        objects.assert_not_called()

    @patch('core.admin_contacts.Contact.objects')
    def test_rejects_invalid_input_and_missing_contact(self, objects):
        for payload in ({'contact_id': 'x', 'status': 'closed'},
                        {'contact_id': '1', 'status': 'invalid'}):
            self.assertEqual(contacts(self.request('post', payload)).status_code, 400)
        objects.assert_not_called()
        objects.return_value.first.return_value = None
        self.assertEqual(contacts(self.request('post', {'contact_id': '17', 'status': 'closed'})).status_code, 404)

    @patch('core.admin_contacts.Contact.objects')
    def test_access_and_method_guards(self, objects):
        request = self.request()
        request.admin_account = None
        self.assertEqual(contacts(request).status_code, 302)
        self.admin.status = -1
        self.assertEqual(contacts(self.request()).status_code, 403)
        self.assertEqual(contacts(self.request('delete')).status_code, 405)
        objects.assert_not_called()

    @patch('core.admin_contacts.Contact.objects')
    def test_notification_count_only_for_active_admin(self, objects):
        objects.return_value.count.return_value = 3
        self.assertEqual(contact_notifications(self.request()), {'new_contact_count': 3})
        objects.assert_called_once_with(status='new')
        objects.reset_mock()
        request = self.request()
        request.admin_account = None
        self.assertEqual(contact_notifications(request), {})
        objects.assert_not_called()
