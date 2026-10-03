"""Admin workflow for matching a learner request with a suitable tutor."""

from django.contrib import messages
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import redirect
from mongoengine import ValidationError

from accounts.documents import Parent, Student
from core.admin_audit import record_admin_activity
from core.admin_subjects import subject_is_active
from lessons.documents import LearningRequest, Lesson, Message
from tutors.documents import JobPosting, Subject, Tutor, TutorSubject


REQUEST_STATUS_LABELS = {
    'pending': 'Chờ phản hồi',
    'accepted': 'Đã ghép',
    'declined': 'Từ chối',
    'cancelled': 'Đã hủy',
}
ADMIN_HEADER_NOTIFICATION_CACHE_KEY = 'admin-header-notification-items:v1'


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


def _job_teaching_mode_label(value):
    return {
        'online': 'Trực tuyến',
        'offline': 'Trực tiếp',
        'both': 'Online & trực tiếp',
    }.get(value, 'Online & trực tiếp')


def _class_posting_page_config():
    """Show public class postings alongside, but separately from, direct invites."""
    records = list(JobPosting.objects(
        posted_by_type__in=('parent', 'student'),
    ).order_by('-created_at').select_related())
    student_ids = [job.posted_by_id for job in records if job.posted_by_type == 'student']
    parent_ids = [job.posted_by_id for job in records if job.posted_by_type == 'parent']
    students = {int(item.id): item.name for item in Student.objects(id__in=student_ids).only('id', 'name')}
    parents = {int(item.id): item.name for item in Parent.objects(id__in=parent_ids).only('id', 'name')}

    def requester_name(job):
        names = students if job.posted_by_type == 'student' else parents
        role = 'Học viên' if job.posted_by_type == 'student' else 'Phụ huynh'
        return f"{names.get(int(job.posted_by_id), role)} ({role})"

    def area(job):
        pieces = [_reference_name(job.ward, ''), _reference_name(job.province, '')]
        return ', '.join(piece for piece in pieces if piece) or '—'

    return {
        'kind': 'class-postings',
        'tab': 'class-postings',
        'title': 'Yêu cầu tìm gia sư',
        'group': 'Quản lý',
        'singular': 'yêu cầu đăng lớp',
        'description': 'Các nhu cầu tìm gia sư được phụ huynh và học viên đăng công khai.',
        'columns': [
            ('title', 'Tiêu đề lớp'), ('requester', 'Người đăng'), ('subject', 'Môn học'),
            ('area', 'Khu vực'), ('schedule', 'Lịch mong muốn'), ('teaching_mode', 'Hình thức học'),
            ('created', 'Ngày đăng'), ('status', 'Trạng thái'),
        ],
        'statuses': ['Đang mở', 'Đã đóng'],
        'records': records,
        'requester_labels': {job.slug: requester_name(job) for job in records},
        'rows': [
            (
                job.title, requester_name(job), _reference_name(job.subject), area(job),
                job.schedule_expect or 'Chưa cập nhật',
                _job_teaching_mode_label(getattr(job, 'teaching_mode', 'both')),
                _request_date(job.created_at), 'Đang mở' if job.status == 'open' else 'Đã đóng',
            )
            for job in records
        ],
    }


def _direct_request_page_config():
    records = list(LearningRequest.objects.order_by('-created_at').select_related())
    return {
        'kind': 'direct-requests',
        'tab': 'direct-requests',
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


def _all_requests_page_config():
    """A read-only, chronological overview of both request flows."""
    public_config = _class_posting_page_config()
    direct_config = _direct_request_page_config()
    rows = []

    for job in public_config['records']:
        if job.budget_min and job.budget_max:
            budget = f'{job.budget_min:,.0f}–{job.budget_max:,.0f} VNĐ/tháng'
        elif job.budget_min:
            budget = f'Từ {job.budget_min:,.0f} VNĐ/tháng'
        elif job.budget_max:
            budget = f'Đến {job.budget_max:,.0f} VNĐ/tháng'
        else:
            budget = 'Thỏa thuận'
        rows.append({
            'created_at': job.created_at,
            'values': (
                'Đăng lớp công khai',
                public_config['requester_labels'][job.slug],
                _reference_name(job.subject),
                'Chưa chọn gia sư',
                budget,
                job.schedule_expect or 'Chưa cập nhật',
                job.description or '—',
                _request_date(job.created_at),
                'Đang mở' if job.status == 'open' else 'Đã đóng',
            ),
        })
    for request in direct_config['records']:
        rows.append({
            'created_at': request.created_at,
            'values': (
                'Mời dạy trực tiếp', _reference_name(request.student),
                _reference_name(request.subject), _reference_name(request.tutor),
                'Thỏa thuận',
                request.expected_schedule or 'Chưa cập nhật', request.message or '—',
                _request_date(request.created_at),
                REQUEST_STATUS_LABELS.get(request.status, request.status),
            ),
        })
    rows.sort(key=lambda item: item['created_at'].timestamp() if item['created_at'] else 0, reverse=True)

    return {
        'kind': 'all-requests',
        'tab': 'all',
        'title': 'Yêu cầu tìm gia sư',
        'group': 'Quản lý',
        'singular': 'yêu cầu',
        'description': 'Theo dõi nhu cầu đăng lớp công khai và lời mời dạy trực tiếp tới gia sư.',
        'columns': [
            ('type', 'Loại yêu cầu'), ('learner', 'Học viên / người liên hệ'),
            ('subject', 'Môn học'), ('tutor', 'Gia sư'), ('budget', 'Học phí/tháng'), ('schedule', 'Lịch mong muốn'),
            ('message', 'Nội dung'), ('created', 'Ngày gửi'), ('status', 'Trạng thái'),
        ],
        'statuses': ['Đang mở', 'Đã đóng', *REQUEST_STATUS_LABELS.values()],
        'records': [],
        'rows': [item['values'] for item in rows],
    }


def tutor_request_page_config(tab='all'):
    """Render all requests, class postings, or direct tutor invitations for Admin."""
    if tab == 'class-postings':
        return _class_posting_page_config()
    if tab == 'direct-requests':
        return _direct_request_page_config()
    return _all_requests_page_config()


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
        cache.delete(ADMIN_HEADER_NOTIFICATION_CACHE_KEY)
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
        cache.delete(ADMIN_HEADER_NOTIFICATION_CACHE_KEY)
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
    cache.delete(ADMIN_HEADER_NOTIFICATION_CACHE_KEY)
    record_admin_activity(request, 'delete', record)
    return JsonResponse({'ok': True, 'message': 'Đã xóa yêu cầu tìm gia sư.'})
