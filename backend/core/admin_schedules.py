"""MongoDB-backed lesson scheduling for the EduTutor admin."""

from datetime import date, datetime, timedelta
from urllib.parse import urlparse
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect
from mongoengine import ValidationError

from accounts.documents import Student
from core.admin_audit import record_admin_activity
from core.admin_subjects import subject_is_active
from core.documents import PaymentItem
from lessons.documents import Lesson, Review
from tutors.documents import Province, Subject, Tutor, TutorSubject, Ward


VIETNAM_TIME_ZONE = ZoneInfo('Asia/Ho_Chi_Minh')
LESSON_STATUS_LABELS = {
    'scheduled': 'Đã lên lịch',
    'completed': 'Đã hoàn thành',
    'cancelled': 'Đã hủy',
    'no_show': 'Vắng mặt',
}
# Admin is responsible only for arranging a lesson.  Once scheduled, every
# attendance outcome is supplied by the tutor, never selected in this form.
ADMIN_MANAGED_LESSON_STATUSES = ('scheduled',)
PAYMENT_STATUS_LABELS = {'unpaid': 'Chưa thanh toán', 'paid': 'Đã thanh toán'}
MODE_LABELS = {'online': 'Trực tuyến', 'offline': 'Trực tiếp'}


def _reference_label(reference, fallback='—'):
    """Read names safely even if an old MongoDB reference no longer exists."""
    try:
        return reference.name if reference else fallback
    except Exception:
        return fallback


def _reference_id(reference):
    try:
        return str(reference.id) if reference else ''
    except Exception:
        return ''


def _lesson_place(lesson):
    if lesson.mode == 'online':
        return lesson.meeting_url or 'Chưa có liên kết'
    try:
        if lesson.ward and lesson.province:
            return f'{lesson.ward.name}, {lesson.province.name}'
    except Exception:
        # A location may have been removed from an old catalogue; fall back to
        # the snapshot stored on the lesson instead of breaking the schedule.
        pass
    return lesson.location or 'Chưa cập nhật'


def _format_money(value):
    return f'{value:,.0f} VNĐ'.replace(',', '.') if value is not None else 'Chưa cập nhật'


def schedule_page_config():
    """Build the schedule table directly from the lessons collection."""
    lessons = list(
        Lesson.objects.order_by('-session_date', 'start_time').select_related()
    )
    return {
        'title': 'Lịch học & Lịch biểu',
        'group': 'Quản lý',
        'singular': 'buổi học',
        'description': 'Sắp lịch, tránh trùng giờ và theo dõi trạng thái từng buổi học.',
        'columns': [
            ('date', 'Ngày học'), ('time', 'Thời gian'), ('student', 'Học viên'),
            ('tutor', 'Gia sư'), ('subject', 'Môn học'), ('mode', 'Hình thức'),
            ('place', 'Địa điểm / liên kết'), ('price', 'Học phí'),
            ('payment', 'Thanh toán'), ('status', 'Trạng thái'),
        ],
        'statuses': list(LESSON_STATUS_LABELS.values()),
        'records': lessons,
        'rows': [
            (
                lesson.session_date.strftime('%d/%m/%Y'),
                f'{lesson.start_time} - {lesson.end_time}',
                _reference_label(lesson.student),
                _reference_label(lesson.tutor),
                _reference_label(lesson.subject),
                MODE_LABELS.get(lesson.mode, lesson.mode),
                _lesson_place(lesson),
                _format_money(lesson.price),
                PAYMENT_STATUS_LABELS.get(lesson.payment_status, lesson.payment_status),
                LESSON_STATUS_LABELS.get(lesson.status, lesson.status),
            )
            for lesson in lessons
        ],
    }


def schedule_form_choices():
    """Return only active, centrally managed records for the lesson form."""
    subjects = [
        subject for subject in Subject.objects.order_by('category', 'name')
        if subject_is_active(subject)
    ]
    return {
        'students': [
            {'value': str(student.id), 'label': student.name}
            for student in Student.objects(status='active').order_by('name')
        ],
        'tutors': [
            {'value': str(tutor.id), 'label': tutor.name}
            for tutor in Tutor.objects(status=Tutor.STATUS_ACTIVE).order_by('name')
        ],
        'subjects': [
            {
                'value': str(subject.id),
                'label': f'{subject.name} — {subject.category}' if subject.category else subject.name,
            }
            for subject in subjects
        ],
        'provinces': [
            {'value': str(province.id), 'label': province.name}
            for province in Province.objects.order_by('name')
        ],
        'wards': [
            {
                'value': str(ward.id),
                'label': f'{ward.name} — {ward.province.name}',
                'province_id': str(ward.province.id),
            }
            for ward in Ward.objects.order_by('province', 'name').select_related()
        ],
    }


def _required_reference(request, field_name, document_class, label):
    raw_id = request.POST.get(field_name, '').strip()
    if not raw_id:
        raise ValueError(f'Vui lòng chọn {label}.')
    try:
        identifier = int(raw_id)
    except (TypeError, ValueError) as exc:
        raise ValueError(f'{label.capitalize()} được chọn không hợp lệ.') from exc
    record = document_class.objects(id=identifier).first()
    if record is None:
        raise ValueError(f'{label.capitalize()} không tồn tại trong hệ thống.')
    return record


def _offline_location(request):
    """Resolve an offline lesson location from the official admin catalogue."""
    province = _required_reference(request, 'province_id', Province, 'tỉnh/thành phố')
    ward = _required_reference(request, 'ward_id', Ward, 'xã/phường/đặc khu')
    if _reference_id(ward.province) != str(province.id):
        raise ValueError('Xã/phường/đặc khu không thuộc tỉnh/thành phố đã chọn.')
    return province, ward, f'{ward.name}, {province.name}'


def _required_date(raw_value):
    try:
        return date.fromisoformat(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError('Ngày học không hợp lệ.') from exc


def _recurrence_dates(request):
    """Materialize a weekly recurring timetable into individual lesson dates."""
    session_date = _required_date(request.POST.get('session_date', '').strip())
    raw_weekdays = request.POST.getlist('recurrence_days')
    if not raw_weekdays:
        return [session_date]
    try:
        weekdays = {int(value) for value in raw_weekdays}
    except (TypeError, ValueError) as exc:
        raise ValueError('Thứ học lặp không hợp lệ.') from exc
    if not weekdays or not weekdays.issubset(set(range(7))):
        raise ValueError('Vui lòng chọn các thứ học hợp lệ.')

    end_date = _required_date(request.POST.get('recurrence_end_date', '').strip())
    if end_date < session_date:
        raise ValueError('Ngày kết thúc lịch lặp không được trước ngày bắt đầu.')
    dates = []
    current_date = session_date
    while current_date <= end_date:
        if current_date.weekday() in weekdays:
            dates.append(current_date)
        current_date += timedelta(days=1)
    if not dates:
        raise ValueError('Khoảng ngày này không có buổi nào khớp với các thứ đã chọn.')
    if len(dates) > 120:
        raise ValueError('Một lần tạo lịch lặp chỉ được tối đa 120 buổi.')
    return dates


def _mode_for_session(request, session_date):
    """Use the per-weekday mode for a recurring timetable when supplied."""
    mode = ''
    if request.POST.getlist('recurrence_days'):
        mode = request.POST.get(f'weekday_mode_{session_date.weekday()}', '').strip()
    return (mode or request.POST.get('mode', '')).strip().lower()


def _required_time(raw_value, label):
    try:
        return datetime.strptime(raw_value, '%H:%M').strftime('%H:%M')
    except (TypeError, ValueError) as exc:
        raise ValueError(f'{label} phải có dạng HH:MM.') from exc


def _optional_price(raw_value):
    raw_value = raw_value.strip()
    if not raw_value:
        return None
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError('Học phí phải là số nguyên không âm.') from exc
    if value < 0:
        raise ValueError('Học phí không được âm.')
    return value


def _valid_http_url(value):
    parsed = urlparse(value)
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)


def _times_overlap(start_one, end_one, start_two, end_two):
    return start_one < end_two and end_one > start_two


def _assert_no_schedule_conflict(*, lesson, tutor, student, session_date, start_time, end_time):
    """Prevent one tutor or learner from having overlapping scheduled lessons."""
    proposed_start = datetime.strptime(start_time, '%H:%M').time()
    proposed_end = datetime.strptime(end_time, '%H:%M').time()
    for scheduled in Lesson.objects(session_date=session_date, status='scheduled').select_related():
        if lesson is not None and scheduled.id == lesson.id:
            continue
        try:
            shares_person = scheduled.tutor.id == tutor.id or scheduled.student.id == student.id
            existing_start = datetime.strptime(scheduled.start_time, '%H:%M').time()
            existing_end = datetime.strptime(scheduled.end_time, '%H:%M').time()
        except (AttributeError, TypeError, ValueError):
            continue
        if shares_person and _times_overlap(proposed_start, proposed_end, existing_start, existing_end):
            raise ValueError('Gia sư hoặc học viên đã có một buổi học trùng khung giờ này.')


def _lesson_values(request, lesson=None, session_date=None, mode_override=None):
    tutor = _required_reference(request, 'tutor_id', Tutor, 'gia sư')
    student = _required_reference(request, 'student_id', Student, 'học viên')
    subject = _required_reference(request, 'subject_id', Subject, 'môn học')
    if tutor.status != Tutor.STATUS_ACTIVE:
        raise ValueError('Gia sư này đang Inactive.')
    if student.status != 'active':
        raise ValueError('Học viên này không ở trạng thái Active.')
    if not subject_is_active(subject):
        raise ValueError('Môn học này đang Inactive.')
    if TutorSubject.objects(tutor=tutor, subject=subject).first() is None:
        raise ValueError('Gia sư chưa được phân công dạy môn học này.')

    session_date = session_date or _required_date(request.POST.get('session_date', '').strip())
    start_time = _required_time(request.POST.get('start_time', '').strip(), 'Giờ bắt đầu')
    end_time = _required_time(request.POST.get('end_time', '').strip(), 'Giờ kết thúc')
    if start_time >= end_time:
        raise ValueError('Giờ kết thúc phải sau giờ bắt đầu.')

    mode = mode_override if mode_override is not None else request.POST.get('mode', '').strip().lower()
    requested_status = request.POST.get('status', 'scheduled').strip().lower()
    payment_status = request.POST.get('payment_status', 'unpaid').strip().lower()
    if mode not in MODE_LABELS:
        raise ValueError('Hình thức học không hợp lệ.')
    if requested_status not in ADMIN_MANAGED_LESSON_STATUSES:
        if requested_status in LESSON_STATUS_LABELS:
            raise ValueError('Chỉ gia sư mới có thể cập nhật trạng thái buổi học.')
        raise ValueError('Trạng thái buổi học không hợp lệ.')
    # Editing a lesson after its tutor has reported an outcome must not silently
    # turn it back into a scheduled lesson because the admin form only submits
    # the admin-owned status.
    status = lesson.status if lesson is not None and lesson.status != 'scheduled' else requested_status
    if payment_status not in PAYMENT_STATUS_LABELS:
        raise ValueError('Trạng thái thanh toán không hợp lệ.')
    if status == 'scheduled' and session_date < datetime.now(VIETNAM_TIME_ZONE).date():
        raise ValueError('Không thể đặt buổi học đã lên lịch vào ngày đã qua.')

    meeting_url = request.POST.get('meeting_url', '').strip()
    if mode == 'online':
        if not _valid_http_url(meeting_url):
            raise ValueError('Buổi học trực tuyến cần liên kết họp hợp lệ (http/https).')
        province = None
        ward = None
        location = None
    else:
        province, ward, location = _offline_location(request)
        meeting_url = None

    price = _optional_price(request.POST.get('price', ''))
    if payment_status == 'paid' and price is None:
        raise ValueError('Cần nhập học phí trước khi đánh dấu đã thanh toán.')
    if status == 'scheduled':
        _assert_no_schedule_conflict(
            lesson=lesson, tutor=tutor, student=student, session_date=session_date,
            start_time=start_time, end_time=end_time,
        )

    return {
        'tutor': tutor,
        'student': student,
        'subject': subject,
        'session_date': session_date,
        'start_time': start_time,
        'end_time': end_time,
        'mode': mode,
        'province': province,
        'ward': ward,
        'location': location,
        'meeting_url': meeting_url,
        'price': price,
        'status': status,
        'payment_status': payment_status,
        'note': request.POST.get('note', '').strip() or None,
    }


def schedule_create(request):
    if request.method != 'POST':
        return redirect('management-page', module='schedules')
    try:
        session_dates = _recurrence_dates(request)
        series_id = uuid4().hex if len(session_dates) > 1 else None
        lesson_values = []
        for session_date in session_dates:
            values = _lesson_values(
                request,
                session_date=session_date,
                mode_override=_mode_for_session(request, session_date),
            )
            if series_id:
                values['series_id'] = series_id
            lesson_values.append(values)
        lessons = [Lesson(**values).save() for values in lesson_values]
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể tạo buổi học.')
    else:
        for lesson in lessons:
            record_admin_activity(request, 'create', lesson)
        if len(lessons) == 1:
            messages.success(request, 'Đã tạo lịch học thành công.')
        else:
            messages.success(request, f'Đã tạo {len(lessons)} buổi học theo lịch lặp.')
    return redirect('management-page', module='schedules')


def schedule_edit(request, lesson_id):
    if request.method != 'POST':
        return redirect('management-page', module='schedules')
    lesson = Lesson.objects(id=lesson_id).first()
    if lesson is None:
        messages.error(request, 'Không tìm thấy buổi học.')
        return redirect('management-page', module='schedules')
    try:
        scope = request.POST.get('edit_scope', 'one').strip().lower()
        if scope not in ('one', 'future', 'series'):
            raise ValueError('Phạm vi cập nhật lịch học không hợp lệ.')

        if scope == 'one' or not lesson.series_id:
            updates = [(lesson, _lesson_values(request, lesson=lesson))]
        else:
            requested_date = _required_date(request.POST.get('session_date', '').strip())
            if requested_date != lesson.session_date:
                raise ValueError('Khi cập nhật nhiều buổi, ngày học của từng buổi được giữ nguyên.')
            lessons = Lesson.objects(series_id=lesson.series_id)
            if scope == 'future':
                lessons = lessons.filter(session_date__gte=lesson.session_date)
            updates = [
                (
                    target,
                    _lesson_values(
                        request,
                        lesson=target,
                        session_date=target.session_date,
                        mode_override=request.POST.get('mode', '').strip().lower(),
                    ),
                )
                for target in lessons.order_by('session_date', 'start_time')
            ]
            if not updates:
                raise ValueError('Không tìm thấy các buổi học trong lịch lặp này.')

        for target, values in updates:
            for field, value in values.items():
                setattr(target, field, value)
        for target, _ in updates:
            target.save()
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật buổi học.')
    else:
        for target, _ in updates:
            record_admin_activity(request, 'update', target)
        if len(updates) == 1:
            messages.success(request, 'Đã cập nhật lịch học thành công.')
        else:
            messages.success(request, f'Đã cập nhật {len(updates)} buổi trong lịch lặp.')
    return redirect('management-page', module='schedules')


def schedule_delete(request, lesson_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    lesson = Lesson.objects(id=lesson_id).first()
    if lesson is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy buổi học.'}, status=404)
    review_count = Review.objects(lesson=lesson).count()
    payment_item_count = PaymentItem.objects(lesson=lesson).count()
    if review_count or payment_item_count:
        linked = []
        if review_count:
            linked.append('đánh giá')
        if payment_item_count:
            linked.append('dòng thanh toán')
        return JsonResponse({
            'ok': False,
            'message': f"Không thể xóa buổi học đã có {' và '.join(linked)}.",
        }, status=409)
    lesson.delete()
    record_admin_activity(request, 'delete', lesson)
    return JsonResponse({'ok': True, 'message': 'Đã xóa buổi học.'})
