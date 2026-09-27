"""MongoDB-backed administration for subjects and tutor specializations."""

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils.text import slugify
from mongoengine import NotUniqueError, ValidationError

from core.admin_audit import record_admin_activity
from tutors.documents import JobPosting, Subject, TutorSubject


def subject_is_active(subject):
    """Legacy subject records without a status field remain available."""
    return subject is not None and getattr(subject, 'status', 1) != 0


def _subject_status_label(subject):
    return 'Active' if subject_is_active(subject) else 'Inactive'


def subject_page_config():
    subjects = list(Subject.objects.order_by('category', 'name'))
    return {
        'title': 'Môn học & Chuyên môn',
        'group': 'Quản lý',
        'singular': 'môn học',
        'description': 'Quản lý danh mục môn học, chuyên môn và gia sư phụ trách.',
        'columns': [
            ('name', 'Môn học'),
            ('level', 'Cấp độ'),
            ('tutors', 'Gia sư phụ trách'),
            ('category', 'Nhóm chuyên môn'),
            ('status', 'Trạng thái'),
        ],
        'statuses': ['Active', 'Inactive'],
        'records': subjects,
        'rows': [
            (
                subject.name,
                subject.level or 'Chưa cập nhật',
                str(TutorSubject.objects(subject=subject).count()),
                subject.category or 'Chưa phân loại',
                _subject_status_label(subject),
            )
            for subject in subjects
        ],
    }


def _subject_values(request):
    name = request.POST.get('name', '').strip()
    category = request.POST.get('category', '').strip()
    level = request.POST.get('level', '').strip()
    status = request.POST.get('status', '1').strip()
    if not name:
        raise ValueError('Tên môn học không được để trống.')
    if not category:
        raise ValueError('Nhóm chuyên môn không được để trống.')
    if status not in ('0', '1'):
        raise ValueError('Trạng thái môn học chỉ có thể là Active hoặc Inactive.')
    return {
        'name': name,
        'category': category,
        'level': level or None,
        'status': int(status),
    }


def _subject_slug(name):
    base = slugify(name)[:150] or 'subject'
    candidate = base
    suffix = 2
    while Subject.objects(slug=candidate).first() is not None:
        candidate = f'{base[:140]}-{suffix}'
        suffix += 1
    return candidate


def subject_create(request):
    if request.method != 'POST':
        return redirect('management-page', module='subjects')
    try:
        values = _subject_values(request)
        if Subject.objects(name__iexact=values['name']).first() is not None:
            raise ValueError('Môn học này đã tồn tại.')
        subject = Subject(slug=_subject_slug(values['name']), **values).save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể tạo môn học.')
    else:
        record_admin_activity(request, 'create', subject)
        messages.success(request, 'Đã thêm môn học thành công.')
    return redirect('management-page', module='subjects')


def subject_edit(request, slug):
    if request.method != 'POST':
        return redirect('management-page', module='subjects')
    subject = Subject.objects(slug=slug).first()
    if subject is None:
        messages.error(request, 'Không tìm thấy môn học.')
        return redirect('management-page', module='subjects')
    try:
        values = _subject_values(request)
        duplicate = Subject.objects(name__iexact=values['name'], slug__ne=slug).first()
        if duplicate is not None:
            raise ValueError('Môn học này đã tồn tại.')
        for field, value in values.items():
            setattr(subject, field, value)
        subject.save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật môn học.')
    else:
        record_admin_activity(request, 'update', subject)
        messages.success(request, 'Đã cập nhật môn học thành công.')
    return redirect('management-page', module='subjects')


def subject_toggle_status(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    subject = Subject.objects(slug=slug).first()
    if subject is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy môn học.'}, status=404)

    subject.status = 0 if subject_is_active(subject) else 1
    subject.save()
    record_admin_activity(request, 'toggle_status', subject)
    status = _subject_status_label(subject)
    return JsonResponse({
        'ok': True,
        'status': status,
        'status_code': subject.status,
        'message': f'Đã chuyển môn học sang {status}.',
    })


def subject_delete(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    subject = Subject.objects(slug=slug).first()
    if subject is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy môn học.'}, status=404)

    tutor_count = TutorSubject.objects(subject=subject).count()
    job_count = JobPosting.objects(subject=subject).count()
    if tutor_count or job_count:
        details = []
        if tutor_count:
            details.append(f'{tutor_count} gia sư')
        if job_count:
            details.append(f'{job_count} tin tuyển dụng')
        return JsonResponse({
            'ok': False,
            'message': f"Không thể xóa môn học đang được sử dụng bởi {', '.join(details)}.",
        }, status=409)

    subject.delete()
    record_admin_activity(request, 'delete', subject)
    return JsonResponse({'ok': True, 'message': 'Đã xóa môn học.'})
