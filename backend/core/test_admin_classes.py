from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from core.admin_classes import classes_page_config


class AdminClassesTests(SimpleTestCase):
    @patch('core.admin_classes.Lesson.objects')
    def test_series_is_summarised_as_one_class_with_progress(self, objects):
        subject = SimpleNamespace(name='Toán')
        tutor = SimpleNamespace(name='Gia sư A')
        student = SimpleNamespace(name='Học viên B')
        objects.order_by.return_value.select_related.return_value = [
            SimpleNamespace(
                id=11, series_id='toan-246', request=None, subject=subject,
                tutor=tutor, student=student, status='completed',
                session_date=date(2026, 9, 1), start_time='18:00', end_time='19:30',
            ),
            SimpleNamespace(
                id=12, series_id='toan-246', request=None, subject=subject,
                tutor=tutor, student=student, status='completed',
                session_date=date(2026, 9, 3), start_time='18:00', end_time='19:30',
            ),
        ]

        page = classes_page_config()

        self.assertEqual(len(page['rows']), 1)
        self.assertEqual(page['rows'][0], (
            'LỚP-TOAN-246', 'Toán', 'Gia sư A', 'Học viên B',
            '2/2 buổi', 'Chưa có buổi sắp tới', 'Đã hoàn thành',
        ))
