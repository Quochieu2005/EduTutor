"""Database-backed student administration for the EduTutor admin portal."""

import json

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from mongoengine import ValidationError

from accounts.documents import Student
from core.admin_audit import record_admin_activity


STATUS_LABELS = {
    Student.STATUS_ACTIVE if hasattr(Student, 'STATUS_ACTIVE') else 'active': 'Active',
    'inactive': 'Inactive',
    'banned': 'Banned',
}


def _status_label(status):
    return STATUS_LABELS.get(status, 'Inactive')


def student_page():
    """Return the view model used by the students resource page."""
    students = list(Student.objects.order_by('-created_at'))
    rows = []
    for student in students:
        status = student.status or 'inactive'
        rows.append({
            'id': student.slug,
            'slug': student.slug,
            'avatar_url': student.avatar or '',
            'edit_url': reverse('student-edit', kwargs={'slug': student.slug}),
            'delete_url': reverse('student-delete', kwargs={'slug': student.slug}),
            'status_toggle_url': reverse('student-toggle-status', kwargs={'slug': student.slug}),
            'status_code': status,
            'can_edit': True,
            'can_delete': True,
            'form_values': json.dumps({
                'name': student.name,
                'email': student.email or '',
                'phone': student.phone or '',
                'status': status,
            }),
            'cells': [
                {'field': 'avatar', 'value': student.name, 'tone': ''},
                {'field': 'name', 'value': student.name, 'tone': ''},
                {'field': 'email', 'value': student.email or 'Chưa cập nhật', 'tone': ''},
                {'field': 'phone', 'value': student.phone or 'Chưa cập nhật', 'tone': ''},
                {'field': 'oauth_uid', 'value': student.oauth_uid or 'Chưa liên kết', 'tone': ''},
                {
                    'field': 'status', 'value': _status_label(status),
                    'tone': 'success' if status == 'active' else 'neutral',
                },
            ],
        })
    return {
        'key': 'students',
        'title': 'Học viên',
        'singular': 'học viên',
        'description': 'Theo dõi thông tin đăng ký và trạng thái tài khoản học viên.',
        'columns': [
            {'key': 'avatar', 'label': 'Ảnh đại diện'},
            {'key': 'name', 'label': 'Họ và tên'},
            {'key': 'email', 'label': 'Email'},
            {'key': 'phone', 'label': 'Số điện thoại'},
            {'key': 'oauth_uid', 'label': 'OAuth UID'},
            {'key': 'status', 'label': 'Trạng thái'},
        ],
        'statuses': ['Active', 'Inactive'],
        'rows': rows,
        'can_manage': True,
        # Student accounts come from the public registration flow, not from
        # manual admin creation or invitation.
        'can_create': False,
        'server_submit': True,
        'action_label': 'Thêm học viên',
        'form_fields': [
            {'name': 'name', 'label': 'Họ và tên', 'type': 'text', 'placeholder': 'Họ và tên học viên'},
            {'name': 'email', 'label': 'Email đăng nhập', 'type': 'email', 'placeholder': 'email@example.com', 'required': False},
            {'name': 'phone', 'label': 'Số điện thoại', 'type': 'tel', 'placeholder': 'Không bắt buộc', 'required': False},
            {'name': 'status', 'label': 'Trạng thái', 'type': 'select', 'options': ['active', 'inactive']},
        ],
    }


def _student_or_error(slug):
    return Student.objects(slug=slug).first()


def _student_redirect(request, message, *, error=False):
    (messages.error if error else messages.success)(request, message)
    return redirect('students')


def student_edit(request, slug):
    if request.method != 'POST':
        return _student_redirect(request, 'Yêu cầu không hợp lệ.', error=True)
    student = _student_or_error(slug)
    if student is None:
        return _student_redirect(request, 'Không tìm thấy học viên.', error=True)

    name = request.POST.get('name', '').strip()
    email = request.POST.get('email', '').strip().lower() or None
    phone = request.POST.get('phone', '').strip() or None
    status = request.POST.get('status', '').strip()
    if not name:
        return _student_redirect(request, 'Họ và tên không được để trống.', error=True)
    if status not in ('active', 'inactive'):
        return _student_redirect(request, 'Trạng thái học viên không hợp lệ.', error=True)
    duplicate = Student.objects(email=email, slug__ne=slug).first() if email else None
    if duplicate is not None:
        return _student_redirect(request, 'Email này đã thuộc về một học viên khác.', error=True)

    student.name = name
    student.email = email
    student.phone = phone
    student.status = status
    try:
        student.save()
    except ValidationError:
        return _student_redirect(request, 'Thông tin học viên không hợp lệ.', error=True)
    record_admin_activity(request, 'update', student)
    return _student_redirect(request, 'Đã cập nhật thông tin học viên.')


def student_delete(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Yêu cầu không hợp lệ.'}, status=405)
    student = _student_or_error(slug)
    if student is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy học viên.'}, status=404)

    # Preserve lessons and invoices: a historical account is safely archived
    # instead of leaving broken references throughout the system.
    from core.documents import Payment
    from lessons.documents import Lesson

    if Lesson.objects(student=student).first() or Payment.objects(student=student).first():
        student.status = 'inactive'
        student.save()
        record_admin_activity(request, 'archive', student)
        return JsonResponse({
            'ok': True,
            'deleted': False,
            'status': 'Inactive',
            'status_code': 'inactive',
            'message': 'Học viên có lịch sử học hoặc hóa đơn nên đã được chuyển sang Inactive thay vì xóa.',
        })

    record_admin_activity(request, 'delete', student)
    student.delete()
    return JsonResponse({'ok': True, 'deleted': True, 'message': 'Đã xóa học viên.'})


def student_toggle_status(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Yêu cầu không hợp lệ.'}, status=405)
    student = _student_or_error(slug)
    if student is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy học viên.'}, status=404)
    student.status = 'inactive' if student.status == 'active' else 'active'
    student.save()
    record_admin_activity(request, 'toggle_status', student)
    return JsonResponse({
        'ok': True,
        'status': _status_label(student.status),
        'status_code': student.status,
        'message': 'Đã mở lại tài khoản học viên.' if student.status == 'active' else 'Đã tạm ngưng tài khoản học viên.',
    })
