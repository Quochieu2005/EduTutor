"""Unit tests for subject and specialization management without MongoDB writes."""
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, SimpleTestCase

from core.admin_subjects import subject_delete, subject_is_active, subject_page_config, subject_toggle_status
from templates.views import _active_subject_choices, _required_active_subject


class AdminSubjectTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @patch('core.admin_subjects.TutorSubject')
    @patch('core.admin_subjects.Subject')
    def test_list_uses_subject_records_and_usage_count(self, subjects, tutor_subjects):
        subject = SimpleNamespace(
            id=7, name='Toán học', level='THCS, THPT', category='Khoa học tự nhiên', status=1,
        )
        subjects.objects.order_by.return_value = [subject]
        tutor_subjects._fields = {'subject': SimpleNamespace(db_field='subject_id')}
        tutor_subjects.objects.order_by.return_value.aggregate.return_value = [{'_id': 7, 'count': 3}]

        page = subject_page_config()
        tutor_subjects.objects.order_by.return_value.aggregate.assert_called_once()
        tutor_subjects.objects.assert_not_called()

        self.assertEqual(page['rows'][0], (
            'Toán học', 'THCS, THPT', '3', 'Khoa học tự nhiên', 'Active',
        ))
        self.assertTrue(subject_is_active(SimpleNamespace(status=1)))
        self.assertFalse(subject_is_active(SimpleNamespace(status=0)))
        self.assertTrue(subject_is_active(SimpleNamespace()))

    @patch('core.admin_subjects.record_admin_activity')
    @patch('core.admin_subjects.JobPosting.objects')
    @patch('core.admin_subjects.TutorSubject.objects')
    @patch('core.admin_subjects.Subject.objects')
    def test_delete_refuses_subject_used_by_tutor_or_job(self, subjects, tutor_subjects, jobs, audit):
        subject = MagicMock()
        subjects.return_value.first.return_value = subject
        tutor_subjects.return_value.count.return_value = 2
        jobs.return_value.count.return_value = 1

        response = subject_delete(self.factory.post('/admin/management/subjects/toan/delete/'), 'toan')

        self.assertEqual(response.status_code, 409)
        self.assertIn('2 gia sư', json.loads(response.content)['message'])
        subject.delete.assert_not_called()
        audit.assert_not_called()

    @patch('core.admin_subjects.record_admin_activity')
    @patch('core.admin_subjects.Subject.objects')
    def test_status_toggle_returns_active_or_inactive(self, subjects, audit):
        subject = SimpleNamespace(status=1, save=MagicMock())
        subjects.return_value.first.return_value = subject
        request = self.factory.post('/admin/management/subjects/toan/toggle-status/')
        request.admin_account = SimpleNamespace(id=1, name='Admin', email='admin@example.com')

        response = subject_toggle_status(request, 'toan')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)['status'], 'Inactive')
        self.assertEqual(subject.status, 0)
        subject.save.assert_called_once()
        audit.assert_called_once_with(request, 'toggle_status', subject)

    @patch('templates.views.Subject.objects')
    def test_only_active_subjects_are_available_to_other_admin_forms(self, subjects):
        active = SimpleNamespace(id=4, name='Toán học', category='Khoa học tự nhiên', status=1)
        inactive = SimpleNamespace(id=5, name='Hóa học', category='Khoa học tự nhiên', status=0)
        subjects.order_by.return_value = [active, inactive]

        self.assertEqual(_active_subject_choices(), [{
            'value': '4', 'label': 'Toán học — Khoa học tự nhiên',
        }])

    @patch('templates.views.Subject.objects')
    def test_requested_subject_must_exist_in_the_central_catalogue(self, subjects):
        active = SimpleNamespace(id=4, name='Toán học', status=1)
        subjects.return_value.first.return_value = active

        self.assertIs(
            _required_active_subject(self.factory.post('/admin/tutors/', {'subject_id': '4'})),
            active,
        )

        with self.assertRaisesMessage(ValueError, 'Vui lòng chọn môn học'):
            _required_active_subject(self.factory.post('/admin/tutors/', {'subject_name': 'Môn tự nhập'}))

        subjects.assert_called_once_with(id=4)
