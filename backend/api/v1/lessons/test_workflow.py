from datetime import date, time, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from .services import (
    LessonWorkflowError, create_learning_request, propose_schedule,
    update_learning_request,
)


class LessonAgreementWorkflowTests(SimpleTestCase):
    @patch('api.v1.lessons.services.actor_for_user')
    def test_tutor_cannot_create_a_student_proposal(self, actor_for_user):
        actor_for_user.return_value = ('tutor', SimpleNamespace(id=2))
        with self.assertRaisesMessage(LessonWorkflowError, 'Chỉ học viên'):
            create_learning_request(SimpleNamespace(), {})

    @patch('api.v1.lessons.services._materialize_lesson')
    @patch('api.v1.lessons.services._assert_slot_available')
    @patch('api.v1.lessons.services.actor_for_user')
    def test_tutor_acceptance_materializes_the_official_lesson(
        self, actor_for_user, assert_slot_available, materialize_lesson,
    ):
        tutor = SimpleNamespace(id=2)
        actor_for_user.return_value = ('tutor', tutor)
        request_record = SimpleNamespace(
            id=8,
            student=SimpleNamespace(id=1),
            tutor=tutor,
            subject=SimpleNamespace(id=3),
            status='pending',
            proposed_date=date.today() + timedelta(days=1),
            proposed_start_time='18:00',
            proposed_end_time='19:30',
            proposed_mode='online',
            proposed_location=None,
            proposed_meeting_url='https://meet.google.com/example',
            proposed_by='student',
            student_confirmed=True,
            tutor_confirmed=False,
            save=MagicMock(),
        )

        result = update_learning_request(SimpleNamespace(), request_record, 'accepted')

        self.assertIs(result, request_record)
        materialize_lesson.assert_called_once_with(request_record)
        self.assertEqual(request_record.status, 'accepted')
        self.assertTrue(request_record.student_confirmed)
        self.assertTrue(request_record.tutor_confirmed)
        request_record.save.assert_called_once()

    @patch('api.v1.lessons.services.actor_for_user')
    def test_student_cannot_accept_own_proposal(self, actor_for_user):
        student = SimpleNamespace(id=1)
        actor_for_user.return_value = ('student', student)
        request_record = SimpleNamespace(
            student=student, tutor=SimpleNamespace(id=2), status='pending',
            proposed_by='student',
        )
        with self.assertRaisesMessage(LessonWorkflowError, 'không thể tự xác nhận'):
            update_learning_request(SimpleNamespace(), request_record, 'accepted')

    @patch('api.v1.lessons.services.actor_for_user')
    def test_counter_proposal_resets_the_other_side_confirmation(self, actor_for_user):
        tutor = SimpleNamespace(id=2)
        actor_for_user.return_value = ('tutor', tutor)
        request_record = SimpleNamespace(
            student=SimpleNamespace(id=1), tutor=tutor, status='pending',
            proposal_version=1, save=MagicMock(),
        )
        result = propose_schedule(SimpleNamespace(), request_record, {
            'preferredDate': date.today() + timedelta(days=2),
            'preferredTime': time(19, 0),
            'endTime': time(20, 30),
            'mode': 'online',
            'meetingUrl': 'https://meet.google.com/new',
        })
        self.assertIs(result, request_record)
        self.assertEqual(request_record.proposed_by, 'tutor')
        self.assertFalse(request_record.student_confirmed)
        self.assertTrue(request_record.tutor_confirmed)
        self.assertEqual(request_record.proposal_version, 2)
