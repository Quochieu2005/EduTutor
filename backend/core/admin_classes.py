"""Read-only class management view derived from the lessons collection.

EduTutor does not keep a second, manually maintained ``classes`` collection.
A class is the schedule series (or the original learning request) that joins a
student, tutor and subject.  Keeping it derived prevents progress from getting
out of sync with the actual lesson and payment records.
"""

from collections import OrderedDict
from datetime import datetime
from zoneinfo import ZoneInfo

from lessons.documents import Lesson


STATUS_SCHEDULED = 'Đã lên lịch'
STATUS_COMPLETED = 'Đã hoàn thành'
STATUS_CANCELLED = 'Đã hủy'
VIETNAM_TIME_ZONE = ZoneInfo('Asia/Ho_Chi_Minh')


def _label(reference, fallback='—'):
    try:
        return reference.name if reference else fallback
    except Exception:
        return fallback


def _identifier(reference):
    try:
        return str(reference.id)
    except Exception:
        return ''


def _group_key(lesson):
    if lesson.series_id:
        return f'series:{lesson.series_id}'
    request_id = _identifier(lesson.request)
    if request_id:
        return f'request:{request_id}'
    return f'lesson:{lesson.id}'


def _class_code(key, first_lesson):
    prefix, _, value = key.partition(':')
    if prefix == 'series':
        return f'LỚP-{value[:12].upper()}'
    if prefix == 'request':
        return f'LỚP-YC{value}'
    return f'LỚP-{first_lesson.id}'


def _class_status(lessons):
    if any(lesson.status == 'scheduled' for lesson in lessons):
        return STATUS_SCHEDULED
    if any(lesson.status == 'completed' for lesson in lessons):
        return STATUS_COMPLETED
    return STATUS_CANCELLED


def classes_page_config():
    """Create summary rows from real lessons, grouped into learning classes."""
    groups = OrderedDict()
    lessons = list(Lesson.objects.order_by('session_date', 'start_time').select_related())
    for lesson in lessons:
        groups.setdefault(_group_key(lesson), []).append(lesson)

    rows = []
    today = datetime.now(VIETNAM_TIME_ZONE).date()
    for key, class_lessons in groups.items():
        first = class_lessons[0]
        completed = sum(lesson.status == 'completed' for lesson in class_lessons)
        upcoming = [
            lesson for lesson in class_lessons
            if lesson.status == 'scheduled' and lesson.session_date >= today
        ]
        next_lesson = min(upcoming, key=lambda lesson: (lesson.session_date, lesson.start_time), default=None)
        rows.append((
            _class_code(key, first),
            _label(first.subject),
            _label(first.tutor),
            _label(first.student),
            f'{completed}/{len(class_lessons)} buổi',
            (
                f'{next_lesson.session_date.strftime("%d/%m/%Y")} · '
                f'{next_lesson.start_time}–{next_lesson.end_time}'
                if next_lesson else 'Chưa có buổi sắp tới'
            ),
            _class_status(class_lessons),
        ))

    return {
        'title': 'Quản lý lớp học',
        'group': 'Quản lý',
        'singular': 'lớp học',
        'description': 'Quản lý lớp, gia sư, học viên và tiến độ học tập.',
        'columns': [
            ('code', 'Mã lớp'), ('subject', 'Môn học'), ('tutor', 'Gia sư'),
            ('student', 'Học viên'), ('progress', 'Tiến độ'),
            ('next_lesson', 'Buổi học tới'), ('status', 'Trạng thái'),
        ],
        'statuses': [STATUS_SCHEDULED, STATUS_COMPLETED, STATUS_CANCELLED],
        'rows': rows,
        'records': [],
    }
