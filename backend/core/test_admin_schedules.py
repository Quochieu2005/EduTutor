"""Isolated tests for MongoDB-backed lesson scheduling."""

from datetime import date
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, SimpleTestCase

from core.admin_schedules import (
    _assert_no_schedule_conflict,
    _offline_location,
    _recurrence_dates,
    _required_reference,
    schedule_delete,
    schedule_form_choices,
    schedule_page_config,
)


class AdminScheduleTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @patch('core.admin_schedules.Lesson.objects')
    def test_schedule_list_reads_the_lessons_collection(self, lessons):
        lesson = SimpleNamespace(
            session_date=date(2026, 10, 3), start_time='18:00', end_time='19:30',
            student=SimpleNamespace(name='Học viên A'), tutor=SimpleNamespace(name='Gia sư B'),
            subject=SimpleNamespace(name='Toán học'), mode='online',
            meeting_url='https://meet.google.com/example', location=None, price=200000,
            payment_status='unpaid', status='scheduled',
        )
        lessons.order_by.return_value.select_related.return_value = [lesson]

        page = schedule_page_config()

        self.assertEqual(page['rows'][0], (
            '03/10/2026', '18:00 - 19:30', 'Học viên A', 'Gia sư B', 'Toán học',
            'Trực tuyến', 'https://meet.google.com/example', '200.000 VNĐ',
            'Chưa thanh toán', 'Đã lên lịch',
        ))

    @patch('core.admin_schedules.Ward.objects')
    @patch('core.admin_schedules.Province.objects')
    @patch('core.admin_schedules.Tutor.objects')
    @patch('core.admin_schedules.Student.objects')
    @patch('core.admin_schedules.Subject.objects')
    def test_form_only_lists_active_catalogue_records(
        self, subjects, students, tutors, provinces, wards,
    ):
        subjects.order_by.return_value = [
            SimpleNamespace(id=1, name='Toán', category='Tự nhiên', status=1),
            SimpleNamespace(id=2, name='Hóa', category='Tự nhiên', status=0),
        ]
        students.return_value.order_by.return_value = [SimpleNamespace(id=3, name='Học viên A')]
        tutors.return_value.order_by.return_value = [SimpleNamespace(id=4, name='Gia sư B')]
        provinces.order_by.return_value = [SimpleNamespace(id=5, name='Hồ Chí Minh')]
        wards.order_by.return_value.select_related.return_value = [
            SimpleNamespace(
                id=6,
                name='Tân Đông Hiệp',
                province=SimpleNamespace(id=5, name='Hồ Chí Minh'),
            ),
        ]

        choices = schedule_form_choices()

        self.assertEqual(choices['subjects'], [{'value': '1', 'label': 'Toán — Tự nhiên'}])
        self.assertEqual(choices['students'], [{'value': '3', 'label': 'Học viên A'}])
        self.assertEqual(choices['tutors'], [{'value': '4', 'label': 'Gia sư B'}])
        self.assertEqual(choices['provinces'], [{'value': '5', 'label': 'Hồ Chí Minh'}])
        self.assertEqual(choices['wards'], [{
            'value': '6', 'label': 'Tân Đông Hiệp — Hồ Chí Minh', 'province_id': '5',
        }])

    @patch('core.admin_schedules.Ward.objects')
    @patch('core.admin_schedules.Province.objects')
    def test_offline_location_must_be_a_ward_of_the_selected_province(self, provinces, wards):
        province = SimpleNamespace(id=5, name='Hồ Chí Minh')
        ward = SimpleNamespace(id=6, name='Tân Đông Hiệp', province=province)
        provinces.return_value.first.return_value = province
        wards.return_value.first.return_value = ward
        request = self.factory.post('/admin/management/schedules/create/', {
            'province_id': '5', 'ward_id': '6', 'location_detail': '12 Đường Số 1',
        })

        selected_province, selected_ward, label = _offline_location(request)

        self.assertIs(selected_province, province)
        self.assertIs(selected_ward, ward)
        self.assertEqual(label, '12 Đường Số 1, Tân Đông Hiệp, Hồ Chí Minh')

    def test_reference_id_must_be_provided(self):
        request = self.factory.post('/admin/management/schedules/create/', {})
        with self.assertRaisesMessage(ValueError, 'Vui lòng chọn học viên.'):
            _required_reference(request, 'student_id', MagicMock(), 'học viên')

    def test_recurring_days_materialize_individual_lesson_dates(self):
        request = self.factory.post('/admin/management/schedules/create/', {
            'session_date': '2026-10-05',
            'recurrence_days': ['0', '2', '4'],
            'recurrence_end_date': '2026-10-09',
        })

        self.assertEqual(_recurrence_dates(request), [
            date(2026, 10, 5), date(2026, 10, 7), date(2026, 10, 9),
        ])

    @patch('core.admin_schedules.Lesson.objects')
    def test_prevents_overlapping_lessons_for_the_same_tutor_or_student(self, lessons):
        tutor = SimpleNamespace(id=1)
        student = SimpleNamespace(id=2)
        scheduled = SimpleNamespace(
            id=8, tutor=SimpleNamespace(id=1), student=SimpleNamespace(id=7),
            start_time='18:00', end_time='19:30',
        )
        lessons.return_value.select_related.return_value = [scheduled]

        with self.assertRaisesMessage(ValueError, 'trùng khung giờ'):
            _assert_no_schedule_conflict(
                lesson=None, tutor=tutor, student=student, session_date=date(2026, 10, 3),
                start_time='19:00', end_time='20:00',
            )

    def test_admin_cannot_delete_a_schedule_agreed_by_both_sides(self):
        response = schedule_delete(
            self.factory.post('/admin/management/schedules/5/delete/'), 5,
        )
        self.assertEqual(response.status_code, 403)
