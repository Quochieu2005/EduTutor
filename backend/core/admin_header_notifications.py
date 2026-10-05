"""Live, per-admin notification menu for the back-office header."""

from datetime import datetime, timezone

from django.core.cache import cache
from django.http import JsonResponse
from django.urls import reverse
from django.utils import timezone as django_timezone
from pymongo.errors import PyMongoError

from accounts.documents import Admin
from core.documents import AdminNotification, Contact
from lessons.documents import LearningRequest, Message
from tutors.documents import TutorApplication


# The header is rendered on every admin page.  Caching the database-backed
# source list briefly removes several Atlas round trips on page navigation,
# while keeping notifications fresh enough for an admin dashboard.
NOTIFICATION_CACHE_KEY = 'admin-header-notification-items:v1'
NOTIFICATION_CACHE_SECONDS = 10
NOTIFICATION_ITEM_LIMIT = 12


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


def _notification_items(*, load_if_missing=True):
    """Build small actionable inbox entries from the system's source tables."""
    cached_items = cache.get(NOTIFICATION_CACHE_KEY)
    if cached_items is not None:
        # ``admin_header_notifications`` adds request-specific fields below;
        # never mutate the cached dictionaries themselves.
        return [dict(item) for item in cached_items]
    if not load_if_missing:
        return None

    entries = []
    for item in TutorApplication.objects(status='pending').order_by('-created_at')[:3]:
        entries.append({
            'title': 'Gia sư mới chờ duyệt',
            'message': f'{item.name} vừa gửi hồ sơ đăng ký.',
            'created_at': item.created_at,
            'url': reverse('management-page', kwargs={'module': 'tutor-approvals'}),
            'icon': 'approval',
        })
    learning_requests = list(
        LearningRequest.objects(status='pending')
        .order_by('-created_at')
        .limit(3)
        .select_related(max_depth=1)
    )
    for item in learning_requests:
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
    for item in AdminNotification.objects.order_by('-created_at')[:4]:
        entries.append({
            'title': item.title,
            'message': item.message,
            'created_at': item.created_at,
            'url': item.url or reverse('management-page', kwargs={'module': 'notifications'}),
            'icon': 'payment' if item.kind == 'payment' else 'message',
        })
    items = sorted(
        entries,
        key=lambda item: _as_utc(item['created_at']) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )[:NOTIFICATION_ITEM_LIMIT]
    cache.set(NOTIFICATION_CACHE_KEY, items, NOTIFICATION_CACHE_SECONDS)
    return [dict(item) for item in items]


def admin_header_notifications(request, *, load_if_missing=False):
    """Context processor used by every authenticated Admin page."""
    admin = getattr(request, 'admin_account', None)
    if admin is None or admin.status != Admin.STATUS_ACTIVE:
        return {'admin_notifications': [], 'admin_unread_notification_count': 0}
    try:
        now = datetime.now(timezone.utc)
        read_at = _as_utc(getattr(admin, 'notifications_read_at', None))
        items = _notification_items(load_if_missing=load_if_missing)
        if items is None:
            # Never hold up the first HTML response with notification queries.
            # dashboard.js requests the live payload immediately after paint.
            return {
                'admin_notifications': [],
                'admin_unread_notification_count': 0,
                'admin_unread_notification_label': '0',
            }
        for item in items:
            item['relative_time'] = _relative_time(item['created_at'], now)
            item['is_unread'] = read_at is None or (_as_utc(item['created_at']) or now) > read_at
        unread_count = _unread_notification_count(read_at)
        return {
            'admin_notifications': items,
            'admin_unread_notification_count': unread_count,
            'admin_unread_notification_label': '99+' if unread_count > 99 else str(unread_count),
        }
    except PyMongoError:
        return {'admin_notifications': [], 'admin_unread_notification_count': 0}


def _unread_notification_count(read_at):
    """Count every new actionable record, not only the menu preview rows."""
    created_filter = {'created_at__gt': read_at} if read_at is not None else {}
    return sum((
        TutorApplication.objects(status='pending', **created_filter).count(),
        LearningRequest.objects(status='pending', **created_filter).count(),
        Contact.objects(status='new', **created_filter).count(),
        Message.objects(is_read=False, **created_filter).count(),
        AdminNotification.objects(**created_filter).count(),
    ))


def admin_notifications_live(request):
    """Small polling payload used by every Admin page without a full reload."""
    if request.method != 'GET':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    context = admin_header_notifications(request, load_if_missing=True)
    admin = getattr(request, 'admin_account', None)
    if admin is None or admin.status != Admin.STATUS_ACTIVE:
        return JsonResponse({'ok': False, 'message': 'Phiên đăng nhập không hợp lệ.'}, status=403)
    count = context['admin_unread_notification_count']
    return JsonResponse({
        'ok': True,
        'count': count,
        'count_label': '99+' if count > 99 else str(count),
        'summary': f'Bạn có {"99+" if count > 99 else count} thông báo mới' if count else 'Bạn không có thông báo mới',
        'new_contact_count': Contact.objects(status='new').count(),
        'items': [{
            'title': item['title'],
            'message': item['message'],
            'relative_time': item['relative_time'],
            'url': item['url'],
            'icon': item['icon'],
            'is_unread': item['is_unread'],
        } for item in context['admin_notifications']],
    })


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
