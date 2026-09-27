"""Admin workflow for matching a learner request with a suitable tutor."""

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect
from mongoengine import ValidationError

from accounts.documents import Student
from core.admin_audit import record_admin_activity
from core.admin_subjects import subject_is_active
from lessons.documents import LearningRequest, Lesson, Message
from tutors.documents import Subject, Tutor, TutorSubject


REQUEST_STATUS_LABELS = {
    'pending': 'Chờ phản hồi',
    'accepted': 'Đã ghép',
    'declined': 'Từ chối',
    'cancelled': 'Đã hủy',
}


def _reference_name(reference, fallback='—'):
    try:
        return reference.name if reference else fallback
    except Exception:
        return fallback


def _reference_id(reference):
    try:
        return str(reference.id) if reference else ''
    except Exception:
        return ''


def _request_date(value):
    if value is None:
        return '—'
    try:
        return value.strftime('%d/%m/%Y')
    except (AttributeError, ValueError):
        return '—'


def tutor_request_page_config():
    """Render only persisted learner requests from ``learning_requests``."""
    records = list(LearningRequest.objects.order_by('-created_at').select_related())
    return {
        'title': 'Yêu cầu tìm gia sư',
        'group': 'Quản lý',
        'singular': 'yêu cầu',
        'description': 'Ghép nhu cầu học tập của học viên với gia sư phù hợp.',
        'columns': [
            ('student', 'Học viên'),
            ('subject', 'Môn học'),
            ('tutor', 'Gia sư phù hợp'),
            ('schedule', 'Lịch mong muốn'),
            ('message', 'Lời nhắn'),
            ('created', 'Ngày gửi'),
            ('status', 'Trạng thái'),
        ],
        'statuses': list(REQUEST_STATUS_LABELS.values()),
        'records': records,
        'rows': [
            (
                _reference_name(item.student),
                _reference_name(item.subject),
                _reference_name(item.tutor),
                item.expected_schedule or 'Chưa cập nhật',
                item.message or '—',
                _request_date(item.created_at),
                REQUEST_STATUS_LABELS.get(item.status, item.status),
            )
            for item in records
        ],
    }


def tutor_request_form_choices():
    subjects = [
        subject for subject in Subject.objects.order_by('category', 'name')
        if subject_is_active(subject)
    ]
    tutor_subject_ids = {}
    for assignment in TutorSubject.objects.select_related():
        try:
            tutor_subject_ids.setdefault(str(assignment.tutor.id), []).append(
                str(assignment.subject.id)
            )
        except Exception:
            # Ignore old assignments whose references have been removed.
            continue
    return {
        'students': [
            {'value': str(student.id), 'label': student.name}
            for student in Student.objects(status='active').order_by('name')
        ],
        'subjects': [
            {
                'value': str(subject.id),
                'label': f'{subject.name} — {subject.category}' if subject.category else subject.name,
            }
            for subject in subjects
        ],
        'tutors': [
            {
                'value': str(tutor.id),
                'label': tutor.name,
                'subject_ids': ','.join(tutor_subject_ids.get(str(tutor.id), [])),
            }
            for tutor in Tutor.objects(status=Tutor.STATUS_ACTIVE).order_by('name')
        ],
    }


def _required_record(request, field_name, document_class, label):
    raw_id = request.POST.get(field_name, '').strip()
    if not raw_id:
        raise ValueError(f'Vui lòng chọn {label}.')
    try:
        identifier = int(raw_id)
    except (TypeError, ValueError) as exc:
        raise ValueError(f'{label.capitalize()} không hợp lệ.') from exc
    record = document_class.objects(id=identifier).first()
    if record is None:
        raise ValueError(f'{label.capitalize()} không tồn tại trong hệ thống.')
    return record


def _request_values(request, existing=None):
    student = _required_record(request, 'student_id', Student, 'học viên')
    tutor = _required_record(request, 'tutor_id', Tutor, 'gia sư')
    subject = _required_record(request, 'subject_id', Subject, 'môn học')
    status = request.POST.get('status', 'pending').strip().lower()

    if student.status != 'active':
        raise ValueError('Học viên này đang Inactive.')
    if tutor.status != Tutor.STATUS_ACTIVE:
        raise ValueError('Gia sư này đang Inactive.')
    if not subject_is_active(subject):
        raise ValueError('Môn học này đang Inactive.')
    if TutorSubject.objects(tutor=tutor, subject=subject).first() is None:
        raise ValueError('Gia sư chưa được phân công dạy môn học này.')
    if status not in REQUEST_STATUS_LABELS:
        raise ValueError('Trạng thái yêu cầu không hợp lệ.')

    duplicate = LearningRequest.objects(
        student=student,
        tutor=tutor,
        subject=subject,
        status__in=('pending', 'accepted'),
    )
    if existing is not None:
        duplicate = duplicate.filter(id__ne=existing.id)
    if duplicate.first() is not None:
        raise ValueError('Đã có yêu cầu đang xử lý cho học viên, gia sư và môn học này.')

    return {
        'student': student,
        'tutor': tutor,
        'subject': subject,
        # The request originates from this learner; the Admin only performs
        # the matching work and must not impersonate a parent account.
        'requested_by_type': 'student',
        'requested_by_id': int(student.id),
        'expected_schedule': request.POST.get('expected_schedule', '').strip() or None,
        'message': request.POST.get('message', '').strip() or None,
        'status': status,
    }


def tutor_request_create(request):
    if request.method != 'POST':
        return redirect('management-page', module='tutor-requests')
    try:
        values = _request_values(request)
        record = LearningRequest(**values).save()
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể tạo yêu cầu tìm gia sư.')
    else:
        record_admin_activity(request, 'create', record)
        messages.success(request, 'Đã tạo yêu cầu và ghép gia sư phù hợp.')
    return redirect('management-page', module='tutor-requests')


def tutor_request_edit(request, request_id):
    if request.method != 'POST':
        return redirect('management-page', module='tutor-requests')
    record = LearningRequest.objects(id=request_id).first()
    if record is None:
        messages.error(request, 'Không tìm thấy yêu cầu tìm gia sư.')
        return redirect('management-page', module='tutor-requests')
    try:
        values = _request_values(request, existing=record)
        for field, value in values.items():
            setattr(record, field, value)
        record.save()
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật yêu cầu tìm gia sư.')
    else:
        record_admin_activity(request, 'update', record)
        messages.success(request, 'Đã cập nhật ghép gia sư.')
    return redirect('management-page', module='tutor-requests')


def tutor_request_delete(request, request_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    record = LearningRequest.objects(id=request_id).first()
    if record is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy yêu cầu tìm gia sư.'}, status=404)
    if Lesson.objects(request=record).count() or Message.objects(request=record).count():
        return JsonResponse({
            'ok': False,
            'message': 'Không thể xóa yêu cầu đã có buổi học hoặc tin nhắn liên quan.',
        }, status=409)
    record.delete()
    record_admin_activity(request, 'delete', record)
    return JsonResponse({'ok': True, 'message': 'Đã xóa yêu cầu tìm gia sư.'})
