from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.core.cache import cache
from rest_framework.test import APIRequestFactory

from .views import (
    RecruitmentJobDetailView, RecruitmentJobListView, TutorApplicationCreateView,
    open_recruitment_jobs,
)


class RecruitmentApiTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

    @patch('api.v1.tutors.views.JobPosting')
    @patch('api.v1.tutors.views.Subject')
    def test_public_query_only_uses_open_jobs_and_active_subjects(self, subjects, jobs):
        subjects.objects.return_value.scalar.return_value = [2, 4]
        ordered = jobs.objects.return_value.order_by.return_value
        self.assertIs(open_recruitment_jobs(), ordered)
        # Older subjects without an explicit status remain publicly visible.
        subjects.objects.assert_called_once()
        jobs.objects.assert_called_once_with(status='open', subject__in=[2, 4])
        jobs.objects.return_value.order_by.assert_called_once_with('-created_at', '-id')

    @patch('api.v1.tutors.views.JobPosting')
    @patch('api.v1.tutors.views.Subject')
    def test_requester_board_includes_parent_and_student_posts(self, subjects, jobs):
        subjects.objects.return_value.scalar.return_value = [2]
        open_recruitment_jobs('requester')
        jobs.objects.assert_called_once_with(
            status='open', subject__in=[2], posted_by_type__in=('parent', 'student'),
        )

    @patch('api.v1.tutors.views.open_recruitment_jobs', return_value=[])
    def test_list_is_public_and_paginated(self, open_jobs):
        response = RecruitmentJobListView.as_view()(
            self.factory.get('/api/v1/tutors/jobs/')
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])
        open_jobs.assert_called_once()

    @patch('api.v1.tutors.views.open_recruitment_jobs')
    def test_closed_or_missing_job_is_not_exposed(self, open_jobs):
        open_jobs.return_value.filter.return_value.first.return_value = None
        response = RecruitmentJobDetailView.as_view()(
            self.factory.get('/api/v1/tutors/jobs/closed-job/'), slug='closed-job',
        )
        self.assertEqual(response.status_code, 404)

    @patch('api.v1.tutors.views.open_recruitment_jobs')
    def test_detail_uses_admin_job_fields(self, open_jobs):
        subject = SimpleNamespace(id=1, slug='toan', name='Toán')
        province = SimpleNamespace(id=2, slug='ho-chi-minh', name='Hồ Chí Minh')
        ward = SimpleNamespace(id=3, slug='tan-dong-hiep', name='Tân Đông Hiệp', type='ward')
        now = datetime.now(timezone.utc)
        job = SimpleNamespace(
            slug='gia-su-toan-12', posted_by_type='admin', title='Gia sư Toán lớp 12', subject=subject,
            province=province, district=None, ward=ward, grade='Lớp 12',
            description='Ôn thi tốt nghiệp', budget_min=200000, budget_max=250000,
            schedule_expect='Tối thứ 2, 4, 6', teaching_mode='both', status='open', created_at=now, updated_at=now,
        )
        open_jobs.return_value.filter.return_value.first.return_value = job
        response = RecruitmentJobDetailView.as_view()(
            self.factory.get('/api/v1/tutors/jobs/gia-su-toan-12/'), slug=job.slug,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['slug'], job.slug)
        self.assertEqual(response.data['subject']['name'], 'Toán')
        self.assertEqual(response.data['ward']['name'], 'Tân Đông Hiệp')
        self.assertNotIn('posted_by_id', response.data)

    @patch('api.v1.tutors.views.open_recruitment_jobs', return_value=[])
    def test_list_rejects_unsupported_long_search(self, open_jobs):
        response = RecruitmentJobListView.as_view()(
            self.factory.get('/api/v1/tutors/jobs/', {'search': 'x' * 151})
        )
        self.assertEqual(response.status_code, 400)
        open_jobs.assert_not_called()

    @patch('api.v1.tutors.views.TutorApplication')
    def test_application_is_saved_for_admin_review(self, applications):
        applications.objects.return_value.first.return_value = None
        saved = SimpleNamespace(id=12, status='pending')
        applications.return_value.save.return_value = saved
        response = TutorApplicationCreateView.as_view()(self.factory.post(
            '/api/v1/tutors/applications/', {
                'name': 'Nguyễn Minh Anh', 'email': 'MINHANH@example.com',
                'phone': '0901234567', 'cover_letter': 'Tôi muốn ứng tuyển.',
            }, format='multipart',
        ))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['id'], 12)
        applications.assert_called_once_with(
            name='Nguyễn Minh Anh', email='minhanh@example.com', phone='0901234567',
            cover_letter='Tôi muốn ứng tuyển.', status='pending',
        )

    @patch('api.v1.tutors.views.TutorApplication')
    def test_duplicate_active_application_is_rejected(self, applications):
        applications.objects.return_value.first.return_value = MagicMock()
        response = TutorApplicationCreateView.as_view()(self.factory.post(
            '/api/v1/tutors/applications/', {
                'name': 'Nguyễn Minh Anh', 'email': 'minhanh@example.com',
                'phone': '0901234567',
            }, format='multipart',
        ))
        self.assertEqual(response.status_code, 409)
        applications.assert_not_called()

    @patch('api.v1.tutors.views.TutorApplication')
    def test_application_submission_is_rate_limited(self, applications):
        applications.objects.return_value.first.return_value = None
        applications.return_value.save.return_value = SimpleNamespace(id=1, status='pending')
        payload = {'name': 'Ứng viên', 'email': 'candidate@example.com', 'phone': '0901234567'}
        for _ in range(3):
            response = TutorApplicationCreateView.as_view()(
                self.factory.post('/api/v1/tutors/applications/', payload, format='multipart')
            )
            self.assertEqual(response.status_code, 201)
        response = TutorApplicationCreateView.as_view()(
            self.factory.post('/api/v1/tutors/applications/', payload, format='multipart')
        )
        self.assertEqual(response.status_code, 429)
        self.assertEqual(applications.return_value.save.call_count, 3)

    @patch('api.v1.tutors.views.upload_tutor_application_document')
    @patch('api.v1.tutors.views.TutorApplication')
    def test_invalid_document_returns_validation_error(self, applications, upload_document):
        from django.core.files.uploadedfile import SimpleUploadedFile

        applications.objects.return_value.first.return_value = None
        upload_document.side_effect = ValueError('Tài liệu không hợp lệ.')
        response = TutorApplicationCreateView.as_view()(self.factory.post(
            '/api/v1/tutors/applications/', {
                'name': 'Ứng viên', 'email': 'candidate@example.com', 'phone': '0901234567',
                'cv_file': SimpleUploadedFile('cv.exe', b'bad', content_type='application/octet-stream'),
            }, format='multipart',
        ))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'Tài liệu không hợp lệ.')
        applications.assert_not_called()
