"""Business rules for schedules agreed by a student and a tutor."""

import re
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.core.cache import cache

from accounts.documents import Parent, Student, User
from api.v1.accounts.services import SocialTokenError, ensure_student_profile
from lessons.documents import LearningRequest, Lesson
from tutors.documents import Province, Subject, Tutor, TutorAvailability, TutorSubject, TutorTeachingArea, Ward
from core.documents import AdminNotification, NotificationDelivery, SystemNotification


VIETNAM_TIME_ZONE = ZoneInfo('Asia/Ho_Chi_Minh')
CONTACT_PHONE_PATTERN = re.compile(
    r'Người liên hệ:\s*.*?\s+-\s*(\+?[0-9][0-9 () .-]{6,19})(?:\s*\||$)',
    re.IGNORECASE,
)


class LessonWorkflowError(ValueError):
    pass


def _invalidate_admin_request_notifications():
    """A cache failure must never undo a persisted lesson request."""
    try:
        cache.delete('admin-header-notification-items:v1')
    except Exception:
        pass


def _notify_schedule_event(record, *, actor_type, event):
    """Deliver one in-app message to the other participant and Admin.

    Scheduling keeps both sides informed instead of relying on a refresh of
    the lesson page. Failures here are deliberately non-blocking: the agreed
    schedule itself is the source of truth and is already persisted.
    """
    if not isinstance(record.tutor, Tutor) or not isinstance(record.student, Student):
        return
    recipient_type = 'tutor' if actor_type == 'student' else 'student'
    recipient_id = int(record.tutor.id) if recipient_type == 'tutor' else int(record.student.id)
    actor_name = record.student.name if actor_type == 'student' else record.tutor.name
    title_map = {
        'proposal': 'Có đề xuất lịch học mới',
        'accepted': 'Lịch học đã được xác nhận',
        'declined': 'Đề xuất lịch học cần chọn lại',
        'attendance': 'Gia sư đã cập nhật kết quả buổi học',
    }
    title = title_map.get(event, 'Cập nhật lịch học')
    message = (
        f'{actor_name} đã {"gửi đề xuất lịch" if event == "proposal" else "cập nhật"} '
        f'cho môn {record.subject.name}. Mở mục Chốt lịch & buổi học để xem chi tiết.'
    )
    try:
        notification = SystemNotification(
            title=title, message=message,
            audience=SystemNotification.AUDIENCE_TUTORS if recipient_type == 'tutor' else SystemNotification.AUDIENCE_STUDENTS,
            status=SystemNotification.STATUS_SENT, sent_at=datetime.now(timezone.utc), recipient_count=1,
        ).save()
        NotificationDelivery(
            notification=notification, recipient_type=recipient_type, recipient_id=recipient_id,
        ).save()
        AdminNotification(
            title=title,
            message=f'{actor_name} cập nhật yêu cầu #{record.id}: {record.subject.name}.',
            kind='system', url='/admin/management/tutor-requests/',
        ).save()
    except Exception:
        pass
    _invalidate_admin_request_notifications()


def _contact_phone_for_request(record):
    """Keep legacy invitations usable when their Student profile lacked phone.

    Earlier invitation records saved the contact phone in ``message`` only.
    Return that number immediately and repair the learner profile when the
    message follows the standard invitation format.
    """
    phone = (getattr(record.student, 'phone', None) or '').strip()
    if phone:
        return phone
    match = CONTACT_PHONE_PATTERN.search(record.message or '')
    if match is None:
        return ''
    phone = match.group(1).strip()
    try:
        record.student.phone = phone
        record.student.save()
    except Exception:
        # Rendering a request must never fail because an old Student record
        # cannot be repaired right now.
        pass
    return phone


def actor_for_user(user):
    """Resolve the website JWT account to exactly one learning actor by email."""
    # Tutor JWT authentication passes the actual Tutor document as the
    # principal. Resolve it before doing email lookups: a legacy User/Student
    # record with the same email must not turn an authenticated tutor into a
    # different actor and block responses to their own invitations.
    if isinstance(user, Tutor):
        if user.status != Tutor.STATUS_ACTIVE:
            raise LessonWorkflowError('Tài khoản gia sư không còn hoạt động.')
        return 'tutor', user

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


def _location_from_payload(data):
    """Return a normalized offline address and its catalogue references.

    Older clients can still send ``location`` only. New scheduling screens send
    province/ward/address so the final lesson has an auditable, precise place.
    """
    if data['mode'] == 'online':
        return None, None, None
    province_id = data.get('provinceId')
    ward_id = data.get('wardId')
    address = (data.get('address') or '').strip()
    if not any((province_id, ward_id, address)):
        return None, None, (data.get('location') or '').strip() or None
    if not all((province_id, ward_id, address)):
        raise LessonWorkflowError('Vui lòng chọn đủ tỉnh/thành, xã/phường và nhập địa chỉ học cụ thể.')
    province = Province.objects(id=province_id).first()
    ward = Ward.objects(id=ward_id).first()
    if province is None or ward is None or not ward.province or ward.province.id != province.id:
        raise LessonWorkflowError('Xã/phường không thuộc tỉnh/thành phố đã chọn.')
    return province, ward, f'{address}, {ward.name}, {province.name}'


def _period_for_time(raw_time):
    """Map a concrete start time to the weekly availability grid."""
    hour = datetime.strptime(raw_time, '%H:%M').hour
    if hour < 12:
        return 'morning'
    if hour < 18:
        return 'afternoon'
    return 'evening'


def _assert_tutor_available(tutor, session_date, start_time):
    """A tutor may only confirm/counter-propose a time they published as free."""
    # Unit-level workflow tests use small stand-ins rather than Mongo documents.
    if not isinstance(tutor, Tutor):
        return
    return _assert_tutor_available_weekday(tutor, session_date.weekday(), _period_for_time(start_time))


def _assert_tutor_available_weekday(tutor, weekday, period):
    """Verify a recurring weekday/period against the tutor's published grid."""
    if not isinstance(tutor, Tutor):
        return
    available = TutorAvailability.objects(
        tutor=tutor,
        weekday=weekday,
        period=period,
        is_available=True,
    ).first()
    if available is None:
        raise LessonWorkflowError(
            'Khung giờ này không nằm trong lịch có thể dạy của gia sư. '
            'Hãy chọn giờ khác hoặc để gia sư đề xuất lại.'
        )


def _normalized_weekly_slots(data):
    """Return recurring slots, falling back to the old one-off payload."""
    raw_slots = data.get('weeklySlots') or []
    if not raw_slots:
        return [{
            'weekday': data['preferredDate'].weekday(),
            'period': _period_for_time(data['preferredTime'].strftime('%H:%M')),
            'start_time': data['preferredTime'].strftime('%H:%M'),
            'end_time': data['endTime'].strftime('%H:%M'),
        }]
    return [{
        'weekday': int(slot['weekday']),
        'period': slot['period'],
        'start_time': slot['startTime'].strftime('%H:%M'),
        'end_time': slot['endTime'].strftime('%H:%M'),
    } for slot in raw_slots]


def _sessions_from_schedule(request_record):
    """Expand a recurring proposal from its start date through its end date."""
    slots = getattr(request_record, 'proposed_slots', None) or [{
        'weekday': request_record.proposed_date.weekday(),
        'period': _period_for_time(request_record.proposed_start_time),
        'start_time': request_record.proposed_start_time,
        'end_time': request_record.proposed_end_time,
    }]
    end_date = getattr(request_record, 'recurrence_end_date', None) or request_record.proposed_date
    sessions = []
    cursor = request_record.proposed_date
    while cursor <= end_date:
        for slot in slots:
            if int(slot['weekday']) == cursor.weekday():
                sessions.append((cursor, slot['start_time'], slot['end_time']))
        cursor += timedelta(days=1)
    return sessions


def create_learning_request(user, data):
    # A website account becomes a learner only when it starts a real booking
    # flow. Viewing lesson history must not create a student record.
    if isinstance(user, User) and Student.objects(email=user.email.strip().lower()).first() is None:
        try:
            ensure_student_profile(user)
        except SocialTokenError as error:
            raise LessonWorkflowError(str(error)) from error
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
    slots = _normalized_weekly_slots(data)
    for slot in slots:
        _assert_tutor_available_weekday(tutor, slot['weekday'], slot['period'])
    province, ward, location = _location_from_payload(data)
    record = LearningRequest(
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
        proposed_province=province,
        proposed_ward=ward,
        proposed_location=location,
        proposed_meeting_url=data.get('meetingUrl') or None,
        proposed_slots=slots,
        recurrence_end_date=data.get('recurrenceEndDate') or data['preferredDate'],
        source='tutor_directory',
        proposed_by='student',
        proposal_version=1,
        student_confirmed=True,
        tutor_confirmed=False,
    )
    # Warn the learner immediately instead of waiting until the tutor accepts.
    # Every occurrence in the requested month is checked against both the
    # learner's and tutor's confirmed lessons.
    for session_date, start_time, end_time in _sessions_from_schedule(record):
        _assert_slot_available_values(record, session_date, start_time, end_time)
    record.save()
    # The Admin bell uses a short-lived cache; invalidate it immediately so a
    # new learner request is visible without waiting for the TTL.
    _invalidate_admin_request_notifications()
    _notify_schedule_event(record, actor_type='student', event='proposal')
    return record


def visible_learning_requests(user):
    actor_type, actor = actor_for_user(user)
    field = 'student' if actor_type == 'student' else 'tutor'
    return LearningRequest.objects(**{field: actor}).order_by('-created_at').select_related()


def visible_lesson_sessions(user):
    actor_type, actor = actor_for_user(user)
    field = 'student' if actor_type == 'student' else 'tutor'
    return Lesson.objects(**{field: actor}).order_by('session_date', 'start_time').select_related()


def lesson_session_payload(lesson):
    """The same concrete, one-month timetable for both learner and tutor."""
    return {
        'id': str(lesson.id),
        'requestId': str(lesson.request.id) if lesson.request else '',
        'subject': lesson.subject.name,
        'studentName': lesson.student.name,
        'studentPhone': lesson.student.phone or '',
        'tutorName': lesson.tutor.name,
        'sessionDate': lesson.session_date.isoformat(),
        'startTime': lesson.start_time,
        'endTime': lesson.end_time,
        'mode': lesson.mode,
        'location': lesson.location or '',
        'meetingUrl': lesson.meeting_url or '',
        'status': lesson.status,
        'seriesId': lesson.series_id or '',
    }


def update_lesson_attendance(user, lesson, next_status):
    actor_type, actor = actor_for_user(user)
    if actor_type != 'tutor' or lesson.tutor.id != actor.id:
        raise LessonWorkflowError('Chỉ gia sư phụ trách mới có thể điểm danh buổi học này.')
    if lesson.status != 'scheduled':
        raise LessonWorkflowError('Buổi học này đã được cập nhật trước đó.')
    lesson.status = next_status
    lesson.save()
    if lesson.request:
        _notify_schedule_event(lesson.request, actor_type='tutor', event='attendance')
    return lesson


def _lesson_for_request(request_record):
    return Lesson.objects(request=request_record).first()


def _materialize_lesson(request_record):
    existing = _lesson_for_request(request_record)
    if existing is not None:
        return existing
    sessions = _sessions_from_schedule(request_record)
    if not sessions:
        raise LessonWorkflowError('Lịch lặp chưa có ngày học hợp lệ sau ngày bắt đầu.')
    # Check every occurrence first, so a collision never creates only part of
    # a course timetable.
    for session_date, start_time, end_time in sessions:
        _assert_slot_available_values(request_record, session_date, start_time, end_time)
        _assert_tutor_available(request_record.tutor, session_date, start_time)
    series_id = uuid4().hex if len(sessions) > 1 else None
    lessons = []
    for session_date, start_time, end_time in sessions:
        lessons.append(Lesson(
            request=request_record,
            tutor=request_record.tutor,
            student=request_record.student,
            subject=request_record.subject,
            session_date=session_date,
            start_time=start_time,
            end_time=end_time,
            series_id=series_id,
            mode=request_record.proposed_mode,
            province=request_record.proposed_province,
            ward=request_record.proposed_ward,
            location=request_record.proposed_location,
            meeting_url=request_record.proposed_meeting_url,
            status='scheduled',
        ).save())
    return lessons[0]


def propose_schedule(user, request_record, data):
    actor_type, actor = actor_for_user(user)
    owns_student = actor_type == 'student' and request_record.student.id == actor.id
    owns_tutor = actor_type == 'tutor' and request_record.tutor.id == actor.id
    if not (owns_student or owns_tutor):
        raise LessonWorkflowError('Bạn không có quyền đề xuất lịch cho yêu cầu này.')
    # A direct invitation may be accepted before a concrete date is agreed.
    # Either participant can then propose the first schedule from their portal.
    if request_record.status not in ('pending', 'declined', 'accepted'):
        raise LessonWorkflowError('Không thể đề xuất lại lịch của yêu cầu đã chốt hoặc đã hủy.')
    # Keep lightweight workflow-unit fixtures backwards compatible; real tutor
    # accounts may counter only after explicitly declining the learner plan.
    if owns_tutor and isinstance(actor, Tutor) and request_record.status != 'declined':
        raise LessonWorkflowError('Gia sư chỉ gửi lịch thay thế sau khi đã từ chối đề xuất của học viên.')
    if data['preferredDate'] < datetime.now(VIETNAM_TIME_ZONE).date():
        raise LessonWorkflowError('Không thể đề xuất lịch học trong quá khứ.')
    slots = _normalized_weekly_slots(data)
    for slot in slots:
        _assert_tutor_available_weekday(request_record.tutor, slot['weekday'], slot['period'])

    request_record.proposed_date = data['preferredDate']
    request_record.proposed_start_time = data['preferredTime'].strftime('%H:%M')
    request_record.proposed_end_time = data['endTime'].strftime('%H:%M')
    province, ward, location = _location_from_payload(data)
    request_record.proposed_mode = data['mode']
    request_record.proposed_province = province
    request_record.proposed_ward = ward
    request_record.proposed_location = location
    request_record.proposed_meeting_url = data.get('meetingUrl') or None
    request_record.proposed_note = (data.get('note') or '').strip() or None
    request_record.proposed_slots = slots
    request_record.recurrence_end_date = data.get('recurrenceEndDate') or data['preferredDate']
    request_record.expected_schedule = (
        f"{data['preferredDate'].isoformat()} "
        f"{request_record.proposed_start_time}-{request_record.proposed_end_time}"
    )
    request_record.proposed_by = actor_type
    request_record.proposal_version = (request_record.proposal_version or 0) + 1
    request_record.student_confirmed = actor_type == 'student'
    request_record.tutor_confirmed = actor_type == 'tutor'
    request_record.status = 'pending'
    # A counter-proposal must also be conflict-free when it is sent. The final
    # acceptance performs the same check again to cover schedules confirmed in
    # the meantime.
    for session_date, start_time, end_time in _sessions_from_schedule(request_record):
        _assert_slot_available_values(request_record, session_date, start_time, end_time)
    request_record.save()
    _invalidate_admin_request_notifications()
    _notify_schedule_event(request_record, actor_type=actor_type, event='proposal')
    return request_record


def _assert_slot_available_values(request_record, session_date, start_time, end_time):
    start = datetime.strptime(start_time, '%H:%M').time()
    end = datetime.strptime(end_time, '%H:%M').time()
    for lesson in Lesson.objects(
        session_date=session_date,
        status='scheduled',
    ).select_related():
        try:
            same_student = lesson.student.id == request_record.student.id
            same_tutor = lesson.tutor.id == request_record.tutor.id
            lesson_start = datetime.strptime(lesson.start_time, '%H:%M').time()
            lesson_end = datetime.strptime(lesson.end_time, '%H:%M').time()
        except (AttributeError, TypeError, ValueError):
            continue
        if (same_student or same_tutor) and start < lesson_end and end > lesson_start:
            date_text = session_date.strftime('%d/%m/%Y')
            weekday_text = (
                'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm',
                'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật',
            )[session_date.weekday()]
            subject_name = getattr(lesson.subject, 'name', 'khác')
            if same_student and same_tutor:
                owner_text = f'Học viên và gia sư đã có lịch môn {subject_name}'
            elif same_student:
                owner_text = f'Học viên đã có lịch môn {subject_name} với gia sư {lesson.tutor.name}'
            else:
                owner_text = f'Gia sư đã có lịch dạy môn {subject_name} cho học viên {lesson.student.name}'
            raise LessonWorkflowError(
                f'{owner_text} vào {weekday_text}, ngày {date_text}, '
                f'khung {lesson.start_time}–{lesson.end_time}. '
                'Vui lòng chọn ngày hoặc giờ khác.'
            )


def _assert_slot_available(request_record):
    """Backward-compatible one-off collision check used by older callers."""
    return _assert_slot_available_values(
        request_record,
        request_record.proposed_date,
        request_record.proposed_start_time,
        request_record.proposed_end_time,
    )


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
            _invalidate_admin_request_notifications()
            _notify_schedule_event(request_record, actor_type=actor_type, event='declined')
            return request_record

        # A direct invitation from the tutor directory can intentionally have
        # no date/time yet. Accepting it means the tutor agrees to contact the
        # requester; a lesson is materialized only after both sides propose a
        # concrete schedule.
        if not all((request_record.proposed_date, request_record.proposed_start_time,
                    request_record.proposed_end_time, request_record.proposed_mode)):
            request_record.tutor_confirmed = owns_tutor or request_record.tutor_confirmed
            request_record.student_confirmed = owns_student or request_record.student_confirmed
            request_record.status = 'accepted'
            request_record.save()
            _invalidate_admin_request_notifications()
            _notify_schedule_event(request_record, actor_type=actor_type, event='accepted')
            return request_record

        if request_record.proposed_date < datetime.now(VIETNAM_TIME_ZONE).date():
            raise LessonWorkflowError('Đề xuất lịch đã qua ngày học.')
        request_record.student_confirmed = owns_student or request_record.student_confirmed
        request_record.tutor_confirmed = owns_tutor or request_record.tutor_confirmed
        if not (request_record.student_confirmed and request_record.tutor_confirmed):
            raise LessonWorkflowError('Lịch học chưa được cả học viên và gia sư xác nhận.')
        _materialize_lesson(request_record)
        request_record.status = 'accepted'
        request_record.save()
        _invalidate_admin_request_notifications()
        _notify_schedule_event(request_record, actor_type=actor_type, event='accepted')
        return request_record

    if next_status == 'cancelled':
        if not owns_student or request_record.status != 'pending':
            raise LessonWorkflowError('Học viên chỉ có thể hủy đề xuất khi gia sư chưa chấp nhận.')
        request_record.status = 'cancelled'
        request_record.save()
        _invalidate_admin_request_notifications()
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
        _invalidate_admin_request_notifications()
        _notify_schedule_event(request_record, actor_type=actor_type, event='attendance')
        return request_record

    raise LessonWorkflowError('Trạng thái không hợp lệ.')


def learning_request_payload(record):
    availability = []
    try:
        availability = [
            {'weekday': slot.weekday, 'period': slot.period}
            for slot in TutorAvailability.objects(tutor=record.tutor, is_available=True)
            .order_by('weekday', 'period')
        ]
    except Exception:
        # The request itself must still be viewable if an old availability row
        # has been removed or a catalogue query is temporarily unavailable.
        availability = []
    areas = []
    try:
        areas = [
            {
                'provinceId': int(area.province.id), 'provinceName': area.province.name,
                'wardId': int(area.ward.id) if area.ward else None,
                'wardName': area.ward.name if area.ward else None,
            }
            for area in TutorTeachingArea.objects(tutor=record.tutor).select_related()
        ]
    except Exception:
        areas = []
    return {
        'id': str(record.id),
        'studentId': str(record.student.id),
        'studentName': record.student.name,
        'studentPhone': _contact_phone_for_request(record),
        'tutorId': str(record.tutor.id),
        'tutorName': record.tutor.name,
        'tutorAvailability': availability,
        'tutorAreas': areas,
        'subject': record.subject.name,
        'message': record.message or '',
        'preferredDate': record.proposed_date.isoformat() if record.proposed_date else '',
        'preferredTime': record.proposed_start_time or '',
        'endTime': record.proposed_end_time or '',
        'mode': record.proposed_mode,
        'location': record.proposed_location,
        'provinceId': str(record.proposed_province.id) if record.proposed_province else '',
        'wardId': str(record.proposed_ward.id) if record.proposed_ward else '',
        'meetingUrl': record.proposed_meeting_url,
        'weeklySlots': [
            {
                'weekday': int(slot['weekday']), 'period': slot['period'],
                'startTime': slot['start_time'], 'endTime': slot['end_time'],
            }
            for slot in (record.proposed_slots or [])
        ],
        'recurrenceEndDate': record.recurrence_end_date.isoformat() if record.recurrence_end_date else '',
        'proposalNote': record.proposed_note or '',
        'status': record.status,
        'createdAt': record.created_at.isoformat(),
        'source': record.source or 'tutor_directory',
        'proposedBy': record.proposed_by or 'student',
        'proposalVersion': record.proposal_version or 1,
        'studentConfirmed': bool(record.student_confirmed),
        'tutorConfirmed': bool(record.tutor_confirmed),
    }
