from datetime import datetime, timezone

from accounts.documents import Parent, Student
from core.documents import NotificationDelivery, SystemNotification
from mongoengine.dereference import DeReference


class NotificationInboxError(ValueError):
    pass


def user_recipient_identities(user):
    """Resolve only profiles owned by the authenticated website account."""
    email = user.email.strip().lower()
    identities = []
    student = Student.objects(email=email, status='active').only('id').first()
    if student is not None:
        identities.append(('student', int(student.id)))
    parent = Parent.objects(email=email).only('id').first()
    if parent is not None:
        identities.append(('parent', int(parent.id)))
    if not identities:
        raise NotificationInboxError('Tài khoản chưa có hồ sơ học viên hoặc phụ huynh để nhận thông báo.')
    return identities


def delivery_payload(delivery):
    notification = delivery.notification
    return {
        'id': int(delivery.id),
        'title': notification.title,
        'message': notification.message,
        'audience': notification.audience,
        'delivered_at': delivery.delivered_at,
        'sent_at': notification.sent_at,
        'read_at': delivery.read_at,
        'is_read': delivery.read_at is not None,
    }


def inbox_response(*, request, deliveries, pagination_class):
    # Count unread rows in MongoDB and only hydrate the current page.  The
    # previous implementation materialized the entire inbox before applying
    # pagination, so the notification bell became slower on every new event.
    unread_count = deliveries.filter(read_at=None).count()
    paginator = pagination_class()
    page = paginator.paginate_queryset(deliveries, request)
    page = DeReference()(list(page or []), max_depth=1)
    response = paginator.get_paginated_response([delivery_payload(delivery) for delivery in page])
    response.data['unread_count'] = unread_count
    return response


def mark_delivery_read(delivery):
    if delivery.read_at is None:
        delivery.read_at = datetime.now(timezone.utc)
        delivery.save()
    return delivery


def mark_all_deliveries_read(deliveries):
    now = datetime.now(timezone.utc)
    result = deliveries.filter(read_at=None).update(set__read_at=now)
    return int(result or 0), now
