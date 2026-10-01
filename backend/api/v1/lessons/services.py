"""Business rules for schedules agreed by a student and a tutor."""

from datetime import datetime
from zoneinfo import ZoneInfo

from accounts.documents import Parent, Student
from lessons.documents import LearningRequest, Lesson
from tutors.documents import Subject, Tutor, TutorSubject


VIETNAM_TIME_ZONE = ZoneInfo('Asia/Ho_Chi_Minh')


class LessonWorkflowError(ValueError):
    pass


def actor_for_user(user):
    """Resolve the website JWT account to exactly one learning actor by email."""
    email = user.email.strip().lower()
    student = Student.objects(email=email, status='active').first()
    tutor = Tutor.objects(email=email, status=Tutor.STATUS_ACTIVE).first()
    if student and tutor:
        raise LessonWorkflowError('Email đang liên kết với cả học viên và gia sư.')
    if student:
        return 'student', student
    parent = Parent.objects(email=email).first()
    if parent:
        child = Student.objects(parent=parent, status='active').first()
        if child:
            return 'student', child
    if tutor:
        return 'tutor', tutor
    raise LessonWorkflowError('Tài khoản chưa có hồ sơ học viên hoặc gia sư đang hoạt động.')


def _subject_from_payload(data):
    if data.get('subjectId'):
        subject = Subject.objects(id=data['subjectId'], status=1).first()
    else:
        subject = Subject.objects(name__iexact=data.get('subject', '').strip(), status=1).first()
    if subject is None:
        raise LessonWorkflowError('Môn học không tồn tại hoặc đang Inactive.')
    return subject


def create_learning_request(user, data):
    actor_type, student = actor_for_user(user)
    if actor_type != 'student':
        raise LessonWorkflowError('Chỉ học viên mới có thể gửi đề xuất lịch học.')
    tutor = Tutor.objects(id=data['tutorId'], status=Tutor.STATUS_ACTIVE).first()
    if tutor is None:
        raise LessonWorkflowError('Gia sư không tồn tại hoặc đang Inactive.')
    subject = _subject_from_payload(data)
    if TutorSubject.objects(tutor=tutor, subject=subject).first() is None:
        raise LessonWorkflowError('Gia sư chưa được phân công dạy môn học này.')
    if data['preferredDate'] < datetime.now(VIETNAM_TIME_ZONE).date():
        raise LessonWorkflowError('Không thể đề xuất lịch học trong quá khứ.')
    return LearningRequest(
        student=student,
        requested_by_type='student',
        requested_by_id=int(student.id),
        tutor=tutor,
        subject=subject,
        message=data.get('message') or None,
        expected_schedule=(
            f"{data['preferredDate'].isoformat()} "
            f"{data['preferredTime'].strftime('%H:%M')}-{data['endTime'].strftime('%H:%M')}"
        ),
        proposed_date=data['preferredDate'],
        proposed_start_time=data['preferredTime'].strftime('%H:%M'),
        proposed_end_time=data['endTime'].strftime('%H:%M'),
        proposed_mode=data['mode'],
        proposed_location=data.get('location') or None,
        proposed_meeting_url=data.get('meetingUrl') or None,
        source='tutor_directory',
        proposed_by='student',
        proposal_version=1,
        student_confirmed=True,
        tutor_confirmed=False,
    ).save()


def visible_learning_requests(user):
    actor_type, actor = actor_for_user(user)
    field = 'student' if actor_type == 'student' else 'tutor'
    return LearningRequest.objects(**{field: actor}).order_by('-created_at').select_related()


def _lesson_for_request(request_record):
    return Lesson.objects(request=request_record).first()


def _materialize_lesson(request_record):
    existing = _lesson_for_request(request_record)
    if existing is not None:
        return existing
    _assert_slot_available(request_record)
    return Lesson(
        request=request_record,
        tutor=request_record.tutor,
        student=request_record.student,
        subject=request_record.subject,
        session_date=request_record.proposed_date,
        start_time=request_record.proposed_start_time,
        end_time=request_record.proposed_end_time,
        mode=request_record.proposed_mode,
        location=request_record.proposed_location,
        meeting_url=request_record.proposed_meeting_url,
        status='scheduled',
    ).save()


def propose_schedule(user, request_record, data):
    actor_type, actor = actor_for_user(user)
    owns_student = actor_type == 'student' and request_record.student.id == actor.id
    owns_tutor = actor_type == 'tutor' and request_record.tutor.id == actor.id
    if not (owns_student or owns_tutor):
        raise LessonWorkflowError('Bạn không có quyền đề xuất lịch cho yêu cầu này.')
    if request_record.status not in ('pending', 'declined'):
        raise LessonWorkflowError('Không thể đề xuất lại lịch của yêu cầu đã chốt hoặc đã hủy.')
    if data['preferredDate'] < datetime.now(VIETNAM_TIME_ZONE).date():
        raise LessonWorkflowError('Không thể đề xuất lịch học trong quá khứ.')

    request_record.proposed_date = data['preferredDate']
    request_record.proposed_start_time = data['preferredTime'].strftime('%H:%M')
    request_record.proposed_end_time = data['endTime'].strftime('%H:%M')
    request_record.proposed_mode = data['mode']
    request_record.proposed_location = data.get('location') or None
    request_record.proposed_meeting_url = data.get('meetingUrl') or None
    request_record.expected_schedule = (
        f"{data['preferredDate'].isoformat()} "
        f"{request_record.proposed_start_time}-{request_record.proposed_end_time}"
    )
    request_record.proposed_by = actor_type
    request_record.proposal_version = (request_record.proposal_version or 0) + 1
    request_record.student_confirmed = actor_type == 'student'
    request_record.tutor_confirmed = actor_type == 'tutor'
    request_record.status = 'pending'
    request_record.save()
    return request_record


def _assert_slot_available(request_record):
    start = datetime.strptime(request_record.proposed_start_time, '%H:%M').time()
    end = datetime.strptime(request_record.proposed_end_time, '%H:%M').time()
    for lesson in Lesson.objects(
        session_date=request_record.proposed_date,
        status='scheduled',
    ).select_related():
        try:
            same_person = (
                lesson.student.id == request_record.student.id
                or lesson.tutor.id == request_record.tutor.id
            )
            lesson_start = datetime.strptime(lesson.start_time, '%H:%M').time()
            lesson_end = datetime.strptime(lesson.end_time, '%H:%M').time()
        except (AttributeError, TypeError, ValueError):
            continue
        if same_person and start < lesson_end and end > lesson_start:
            raise LessonWorkflowError('Học viên hoặc gia sư đã có lịch trùng khung giờ này.')


def update_learning_request(user, request_record, next_status):
    actor_type, actor = actor_for_user(user)
    owns_student = actor_type == 'student' and request_record.student.id == actor.id
    owns_tutor = actor_type == 'tutor' and request_record.tutor.id == actor.id
    if not (owns_student or owns_tutor):
        raise LessonWorkflowError('Bạn không có quyền thay đổi yêu cầu này.')

    if next_status in ('accepted', 'declined'):
        if request_record.status != 'pending':
            raise LessonWorkflowError('Chỉ có thể phản hồi đề xuất lịch đang chờ.')
        if actor_type == request_record.proposed_by:
            raise LessonWorkflowError('Bên gửi đề xuất không thể tự xác nhận thay bên còn lại.')
        if next_status == 'declined':
            request_record.status = 'declined'
            request_record.save()
            return request_record
        if not all((request_record.proposed_date, request_record.proposed_start_time,
                    request_record.proposed_end_time, request_record.proposed_mode)):
            raise LessonWorkflowError('Đề xuất lịch thiếu thông tin thời gian hoặc hình thức học.')
        if request_record.proposed_date < datetime.now(VIETNAM_TIME_ZONE).date():
            raise LessonWorkflowError('Đề xuất lịch đã qua ngày học.')
        request_record.student_confirmed = owns_student or request_record.student_confirmed
        request_record.tutor_confirmed = owns_tutor or request_record.tutor_confirmed
        if not (request_record.student_confirmed and request_record.tutor_confirmed):
            raise LessonWorkflowError('Lịch học chưa được cả học viên và gia sư xác nhận.')
        _materialize_lesson(request_record)
        request_record.status = 'accepted'
        request_record.save()
        return request_record

    if next_status == 'cancelled':
        if not owns_student or request_record.status != 'pending':
            raise LessonWorkflowError('Học viên chỉ có thể hủy đề xuất khi gia sư chưa chấp nhận.')
        request_record.status = 'cancelled'
        request_record.save()
        return request_record

    if next_status in ('completed', 'no_show'):
        if not owns_tutor or request_record.status != 'accepted':
            raise LessonWorkflowError('Chỉ gia sư được cập nhật kết quả của buổi học đã thống nhất.')
        lesson = _lesson_for_request(request_record)
        if lesson is None:
            raise LessonWorkflowError('Không tìm thấy buổi học đã được tạo từ đề xuất này.')
        lesson.status = next_status
        lesson.save()
        request_record.status = next_status
        request_record.save()
        return request_record

    raise LessonWorkflowError('Trạng thái không hợp lệ.')


def learning_request_payload(record):
    return {
        'id': str(record.id),
        'studentId': str(record.student.id),
        'studentName': record.student.name,
        'studentPhone': record.student.phone,
        'tutorId': str(record.tutor.id),
        'tutorName': record.tutor.name,
        'subject': record.subject.name,
        'message': record.message or '',
        'preferredDate': record.proposed_date.isoformat() if record.proposed_date else '',
        'preferredTime': record.proposed_start_time or '',
        'endTime': record.proposed_end_time or '',
        'mode': record.proposed_mode,
        'location': record.proposed_location,
        'meetingUrl': record.proposed_meeting_url,
        'status': record.status,
        'createdAt': record.created_at.isoformat(),
        'source': record.source or 'tutor_directory',
        'proposedBy': record.proposed_by or 'student',
        'proposalVersion': record.proposal_version or 1,
        'studentConfirmed': bool(record.student_confirmed),
        'tutorConfirmed': bool(record.tutor_confirmed),
    }
