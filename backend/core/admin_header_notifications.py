"""Live, per-admin notification menu for the back-office header."""

from datetime import datetime, timezone

from django.http import JsonResponse
from django.urls import reverse
from django.utils import timezone as django_timezone
from pymongo.errors import PyMongoError

from accounts.documents import Admin
from core.documents import Contact
from lessons.documents import LearningRequest, Message
from tutors.documents import TutorApplication


def _as_utc(value):
    if value is None:
        return None
    if django_timezone.is_naive(value):
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _relative_time(value, now):
    value = _as_utc(value)
    if value is None:
        return 'Vừa xong'
    seconds = max(0, int((now - value).total_seconds()))
    if seconds < 60:
        return 'Vừa xong'
    if seconds < 3600:
        return f'{seconds // 60} phút trước'
    if seconds < 86400:
        return f'{seconds // 3600} giờ trước'
    if seconds < 172800:
        return 'Hôm qua'
    return f'{seconds // 86400} ngày trước'


def _notification_items():
    """Build small actionable inbox entries from the system's source tables."""
    entries = []
    for item in TutorApplication.objects(status='pending').order_by('-created_at')[:3]:
        entries.append({
            'title': 'Gia sư mới chờ duyệt',
            'message': f'{item.name} vừa gửi hồ sơ đăng ký.',
            'created_at': item.created_at,
            'url': reverse('management-page', kwargs={'module': 'tutor-approvals'}),
            'icon': 'approval',
        })
    for item in LearningRequest.objects(status='pending').order_by('-created_at')[:3]:
        try:
            student_name = item.student.name
            subject_name = item.subject.name
        except Exception:
            student_name, subject_name = 'Học viên', 'một môn học'
        entries.append({
            'title': 'Yêu cầu tìm gia sư mới',
            'message': f'{student_name} đang cần gia sư {subject_name}.',
            'created_at': item.created_at,
            'url': reverse('management-page', kwargs={'module': 'tutor-requests'}),
            'icon': 'request',
        })
    for item in Contact.objects(status='new').order_by('-created_at')[:2]:
        entries.append({
            'title': 'Liên hệ mới',
            'message': f'{item.parent_name} cần được tư vấn.',
            'created_at': item.created_at,
            'url': reverse('management-page', kwargs={'module': 'contacts'}),
            'icon': 'message',
        })
    for item in Message.objects(is_read=False).order_by('-created_at')[:2]:
        entries.append({
            'title': 'Tin nhắn mới',
            'message': item.content[:120],
            'created_at': item.created_at,
            'url': reverse('chats'),
            'icon': 'message',
        })
    return sorted(entries, key=lambda item: _as_utc(item['created_at']) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:6]


def admin_header_notifications(request):
    """Context processor used by every authenticated Admin page."""
    admin = getattr(request, 'admin_account', None)
    if admin is None or admin.status != Admin.STATUS_ACTIVE:
        return {'admin_notifications': [], 'admin_unread_notification_count': 0}
    try:
        now = datetime.now(timezone.utc)
        read_at = _as_utc(getattr(admin, 'notifications_read_at', None))
        items = _notification_items()
        for item in items:
            item['relative_time'] = _relative_time(item['created_at'], now)
            item['is_unread'] = read_at is None or (_as_utc(item['created_at']) or now) > read_at
        return {
            'admin_notifications': items,
            'admin_unread_notification_count': sum(item['is_unread'] for item in items),
        }
    except PyMongoError:
        return {'admin_notifications': [], 'admin_unread_notification_count': 0}


def mark_admin_notifications_read(request):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    admin = getattr(request, 'admin_account', None)
    if admin is None or admin.status != Admin.STATUS_ACTIVE:
        return JsonResponse({'ok': False, 'message': 'Phiên đăng nhập không hợp lệ.'}, status=403)
    try:
        admin.notifications_read_at = datetime.now(timezone.utc)
        admin.save()
    except PyMongoError:
        return JsonResponse({'ok': False, 'message': 'Không thể cập nhật thông báo lúc này.'}, status=503)
    return JsonResponse({'ok': True, 'message': 'Đã đánh dấu tất cả thông báo là đã đọc.', 'count': 0})
