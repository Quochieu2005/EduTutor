"""Isolated audit tests: no writes to the configured MongoDB database."""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, SimpleTestCase

from accounts.documents import Admin
from core.admin_audit import activity_logs, record_admin_activity
from core.documents import AuditLog
from templates.views import management_page, blog_post_delete


class AdminAuditTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = SimpleNamespace(id=7, name='Admin Test', email='admin@example.com',
                                     role=Admin.ROLE_SUPER_ADMIN, status=Admin.STATUS_ACTIVE)
        self.target = SimpleNamespace(id=12, title='Test post',
                                      _get_collection_name=lambda: 'blog_posts')

    def request(self, method='get', data=None):
        request = getattr(self.factory, method)('/admin/management/activity-logs/', data or {})
        request.admin_account = self.admin
        return request

    def test_writer_excludes_secrets_and_ignores_forwarded_ip(self):
        request = self.request('post', {'password': 'secret', 'token': 'private'})
        request.META['HTTP_X_FORWARDED_FOR'] = '8.8.8.8'
        with patch.object(AuditLog, 'save', autospec=True) as save:
            record_admin_activity(request, 'create', self.target)
        entry = save.call_args.args[0]
        entry.validate()
        self.assertEqual(entry.actor_id, 7)
        self.assertEqual(entry.target_id, 12)
        self.assertEqual(entry.ip_address, '127.0.0.1')
        self.assertEqual(set(entry.metadata), {'actor_name', 'actor_email', 'target_label'})
        self.assertNotIn('secret', str(entry.to_mongo()))
        self.assertTrue(save.call_args.kwargs['force_insert'])

    def test_failure_is_reported_without_reversing_business_success(self):
        with patch.object(AuditLog, 'save', side_effect=RuntimeError('offline')):
            with self.assertLogs('core.admin_audit', level='ERROR'):
                self.assertIsNone(record_admin_activity(self.request(), 'create', self.target))

    def test_anonymous_and_inactive_are_rejected(self):
        request = self.request()
        request.admin_account = None
        self.assertEqual(activity_logs(request).status_code, 302)
        self.admin.status = Admin.STATUS_INACTIVE
        self.assertEqual(activity_logs(self.request()).status_code, 403)

    def test_management_route_rejects_writes(self):
        for method in ('post', 'put', 'patch', 'delete'):
            self.assertEqual(management_page(self.request(method), 'activity-logs').status_code, 405)

    def listing(self, data=None):
        manager = MagicMock()
        query = manager.return_value
        query.filter.return_value = query
        query.none.return_value = query
        query.order_by.return_value = []
        with patch('core.admin_audit.AuditLog.objects', manager), patch('core.admin_audit.render') as render:
            activity_logs(self.request(data=data))
        return manager, query, render.call_args

    def test_super_admin_sees_admin_events_only(self):
        manager, query, rendered = self.listing()
        manager.assert_called_once_with(actor_type='admin')
        query.filter.assert_not_called()
        self.assertEqual(rendered.args[2]['pagination'].paginator.count, 0)

    def test_regular_admin_scope_cannot_be_overridden(self):
        self.admin.role = 'admin'
        _, query, _ = self.listing({'actor_id': '999'})
        query.filter.assert_called_once_with(actor_id=7)

    def test_invalid_filters_are_reported(self):
        for data in ({'start': '2026-02-30'}, {'start': '2026-09-02', 'end': '2026-09-01'}, {'action': 'unknown'}):
            _, query, rendered = self.listing(data)
            query.none.assert_called_once()
            self.assertEqual(rendered.kwargs['status'], 400)

    def test_date_range_includes_entire_end_day_in_vietnam(self):
        from datetime import datetime, timezone
        _, query, rendered = self.listing({'start': '2026-09-17', 'end': '2026-09-17'})
        lower = query.filter.call_args_list[0].kwargs['created_at__gte']
        upper = query.filter.call_args_list[1].kwargs['created_at__lt']
        self.assertEqual(lower.astimezone(timezone.utc), datetime(2026, 9, 16, 17, tzinfo=timezone.utc))
        self.assertEqual(upper.astimezone(timezone.utc), datetime(2026, 9, 17, 17, tzinfo=timezone.utc))
        self.assertEqual(rendered.kwargs['status'], 200)

    def test_date_filter_accepts_single_boundary_and_keeps_admin_scope(self):
        self.admin.role = 'admin'
        for key, lookup in (('start', 'created_at__gte'), ('end', 'created_at__lt')):
            _, query, rendered = self.listing({key: '2026-01-01'})
            self.assertEqual(query.filter.call_args_list[0].kwargs, {'actor_id': 7})
            self.assertIn(lookup, query.filter.call_args_list[1].kwargs)
            self.assertEqual(rendered.kwargs['status'], 200)

    def test_date_filter_template_preserves_values_and_shows_errors(self):
        from django.template.loader import render_to_string
        html = render_to_string('activity_logs/activity_logs-list.html', {
            'page': {'key': 'activity-logs'},
            'filters': {'start': '2026-09-17', 'end': '2026-09-16'},
            'filter_errors': ['Từ ngày không được sau đến ngày.'],
        })
        self.assertIn('value="2026-09-17"', html)
        self.assertIn('value="2026-09-16"', html)
        self.assertIn('role="alert"', html)
        self.assertIn('data-resource-search', html)
        self.assertIn('data-resource-view', html)
        self.assertIn('data-resource-page-size', html)

    def test_pagination_and_filter_preservation(self):
        manager = MagicMock()
        query = manager.return_value
        query.filter.return_value = query
        entry = SimpleNamespace(id=1, metadata={}, actor_id=7, action='create', target_type='blog_posts',
                                target_id=12, description='Created', created_at=None, ip_address=None)
        query.order_by.return_value = [entry] * 25
        with patch('core.admin_audit.AuditLog.objects', manager), patch('core.admin_audit.render') as render:
            activity_logs(self.request(data={'page': '2', 'action': 'create'}))
        context = render.call_args.args[2]
        self.assertEqual(len(context['page']['rows']), 25)
        self.assertEqual(context['filter_query'], 'action=create')

    def test_template_renders_read_only_and_escapes_content(self):
        from django.core.paginator import Paginator
        from django.template.loader import render_to_string
        from django.test import override_settings
        with override_settings(STORAGES={'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}):
            html = render_to_string('admin/activity_logs/activity_logs.html', {
                'page': {'title': 'Nhật ký hoạt động', 'key': 'activity-logs',
                         'columns': [{'key': 'admin', 'label': 'Quản trị viên'}],
                         'rows': [{'id': 1, 'cells': [{'field': 'admin', 'value': '<script>alert(1)</script>'}]}]},
                'entries': [{'actor': '<script>alert(1)</script>', 'description': 'Test'}],
                'pagination': Paginator([1], 20).get_page(1),
            }, request=self.request())
        self.assertIn('&lt;script&gt;', html)
        self.assertNotIn('data-resource-add', html)
        self.assertNotIn('data-resource-delete-selected', html)
        self.assertNotIn('data-resource-modal', html)

    def test_delete_logs_only_after_success(self):
        target = MagicMock()
        with patch('templates.views.BlogPost.objects') as objects, patch('templates.views.messages.success'), patch('templates.views.record_admin_activity') as write:
            objects.return_value.first.return_value = target
            self.assertEqual(blog_post_delete(self.request('post'), 'test').status_code, 200)
            target.delete.assert_called_once()
            write.assert_called_once_with(write.call_args.args[0], 'delete', target)
            write.reset_mock()
            objects.return_value.first.return_value = None
            self.assertEqual(blog_post_delete(self.request('post'), 'missing').status_code, 404)
            write.assert_not_called()
