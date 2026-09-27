"""MongoDB-backed system notification management for the admin interface."""

from datetime import datetime, timezone as datetime_timezone
from zoneinfo import ZoneInfo

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from mongoengine import ValidationError

from accounts.documents import Parent, Student
from core.admin_audit import record_admin_activity
from core.documents import NotificationDelivery, SystemNotification
from tutors.documents import Tutor


VIETNAM_TIME_ZONE = ZoneInfo('Asia/Ho_Chi_Minh')
AUDIENCE_LABELS = {
    SystemNotification.AUDIENCE_ALL: 'Tất cả người dùng',
    SystemNotification.AUDIENCE_STUDENTS: 'Học viên',
    SystemNotification.AUDIENCE_PARENTS: 'Phụ huynh',
    SystemNotification.AUDIENCE_TUTORS: 'Gia sư',
}
STATUS_LABELS = {
    SystemNotification.STATUS_DRAFT: 'Lưu nháp',
    SystemNotification.STATUS_SENT: 'Đã gửi',
}


def _as_vietnam_time(value):
    if value is None:
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value, datetime_timezone.utc)
    return timezone.localtime(value, VIETNAM_TIME_ZONE)


def _format_vietnam_time(value):
    value = _as_vietnam_time(value)
    return value.strftime('%d/%m/%Y %H:%M:%S') if value else '—'


def notification_page_config():
    notifications = list(SystemNotification.objects.order_by('-created_at'))
    return {
        'title': 'Thông báo hệ thống',
        'group': 'Vận hành',
        'singular': 'thông báo',
        'description': 'Tạo và gửi thông báo đến từng nhóm người dùng.',
        'columns': [
            ('title', 'Tiêu đề'),
            ('audience', 'Người nhận'),
            ('recipients', 'Số người nhận'),
            ('sent_at', 'Thời gian gửi (GMT+7)'),
            ('status', 'Trạng thái'),
        ],
        'statuses': [STATUS_LABELS[SystemNotification.STATUS_DRAFT], STATUS_LABELS[SystemNotification.STATUS_SENT]],
        'records': notifications,
        'rows': [
            (
                notification.title,
                AUDIENCE_LABELS[notification.audience],
                str(notification.recipient_count),
                _format_vietnam_time(notification.sent_at),
                STATUS_LABELS[notification.status],
            )
            for notification in notifications
        ],
    }


def _notification_values(request):
    title = request.POST.get('title', '').strip()
    message = request.POST.get('message', '').strip()
    audience = request.POST.get('audience', '').strip().lower()
    status = request.POST.get('status', SystemNotification.STATUS_DRAFT).strip().lower()

    if not title:
        raise ValueError('Tiêu đề thông báo không được để trống.')
    if not message:
        raise ValueError('Nội dung thông báo không được để trống.')
    if audience not in SystemNotification.AUDIENCE_CHOICES:
        raise ValueError('Nhóm người nhận không hợp lệ.')
    if status not in SystemNotification.STATUS_CHOICES:
        raise ValueError('Thao tác gửi thông báo không hợp lệ.')
    return {'title': title, 'message': message, 'audience': audience, 'status': status}


def _recipient_sources(audience):
    all_sources = (
        ('student', Student),
        ('parent', Parent),
        ('tutor', Tutor),
    )
    if audience == SystemNotification.AUDIENCE_ALL:
        return all_sources
    recipient_type = audience[:-1]  # students -> student, parents -> parent, tutors -> tutor
    return tuple(source for source in all_sources if source[0] == recipient_type)


def _dispatch_notification(notification):
    """Create immutable delivery records, then mark the broadcast as sent."""
    if notification.sent_at is not None:
        return

    deliveries = []
    for recipient_type, document_class in _recipient_sources(notification.audience):
        for account in document_class.objects.only('id'):
            deliveries.append(NotificationDelivery(
                notification=notification,
                recipient_type=recipient_type,
                recipient_id=int(account.id),
            ))
    if deliveries:
        NotificationDelivery.objects.insert(deliveries, load_bulk=False)

    notification.status = SystemNotification.STATUS_SENT
    notification.sent_at = datetime.now(datetime_timezone.utc)
    notification.recipient_count = len(deliveries)
    notification.updated_at = notification.sent_at
    notification.save()


def notification_create(request):
    if request.method != 'POST':
        return redirect('management-page', module='notifications')
    try:
        values = _notification_values(request)
        requested_status = values.pop('status')
        notification = SystemNotification(
            **values,
            status=SystemNotification.STATUS_DRAFT,
            created_by=request.admin_account,
        ).save()
        if requested_status == SystemNotification.STATUS_SENT:
            _dispatch_notification(notification)
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể tạo thông báo.')
    else:
        record_admin_activity(request, 'create', notification)
        if notification.status == SystemNotification.STATUS_SENT:
            messages.success(request, f'Đã gửi thông báo đến {notification.recipient_count} người nhận.')
        else:
            messages.success(request, 'Đã lưu thông báo ở trạng thái nháp.')
    return redirect('management-page', module='notifications')


def notification_edit(request, notification_id):
    if request.method != 'POST':
        return redirect('management-page', module='notifications')
    notification = SystemNotification.objects(id=notification_id).first()
    if notification is None:
        messages.error(request, 'Không tìm thấy thông báo.')
        return redirect('management-page', module='notifications')
    if notification.status == SystemNotification.STATUS_SENT:
        messages.error(request, 'Thông báo đã gửi không thể chỉnh sửa nội dung.')
        return redirect('management-page', module='notifications')

    try:
        values = _notification_values(request)
        requested_status = values.pop('status')
        for field, value in values.items():
            setattr(notification, field, value)
        notification.updated_at = datetime.now(datetime_timezone.utc)
        notification.save()
        if requested_status == SystemNotification.STATUS_SENT:
            _dispatch_notification(notification)
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật thông báo.')
    else:
        record_admin_activity(request, 'update', notification)
        if notification.status == SystemNotification.STATUS_SENT:
            messages.success(request, f'Đã gửi thông báo đến {notification.recipient_count} người nhận.')
        else:
            messages.success(request, 'Đã cập nhật bản nháp thông báo.')
    return redirect('management-page', module='notifications')


def notification_delete(request, notification_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    notification = SystemNotification.objects(id=notification_id).first()
    if notification is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy thông báo.'}, status=404)

    NotificationDelivery.objects(notification=notification).delete()
    notification.delete()
    record_admin_activity(request, 'delete', notification)
    return JsonResponse({'ok': True, 'message': 'Đã xóa thông báo.'})
