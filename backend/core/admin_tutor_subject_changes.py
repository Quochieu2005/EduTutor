"""Admin review workflow for tutor teaching-subject change requests."""

from datetime import timezone as datetime_timezone
from zoneinfo import ZoneInfo

from django.contrib import messages
from django.core.cache import cache
from django.http import HttpResponseBadRequest, HttpResponseForbidden, HttpResponseNotFound
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from mongoengine.queryset.visitor import Q

from accounts.documents import Admin
from core.admin_audit import record_admin_activity
from core.documents import NotificationDelivery, SystemNotification
from tutors.documents import Subject, TutorSubject, TutorSubjectChangeRequest


ADMIN_NOTIFICATION_CACHE_KEY = 'admin-header-notification-items:v1'
STATUS_LABELS = {
    'pending': 'Chờ duyệt',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối',
}
VIETNAM_TIME_ZONE = ZoneInfo('Asia/Ho_Chi_Minh')


def _format_vietnam_time(value):
    """Format old MongoDB naive UTC datetimes as well as aware values safely."""
    if value is None:
        return '—'
    if timezone.is_naive(value):
        value = timezone.make_aware(value, datetime_timezone.utc)
    return timezone.localtime(value, VIETNAM_TIME_ZONE).strftime('%d/%m/%Y %H:%M')


def _active_admin_or_response(request):
    admin = getattr(request, 'admin_account', None)
    if admin is None:
        return None, redirect('login')
    if admin.status != Admin.STATUS_ACTIVE:
        return None, HttpResponseForbidden('Tài khoản quản trị không hoạt động.')
    return admin, None


def _notify_tutor(change, approved):
    """Create one in-app notification for the affected tutor after review."""
    verb = 'đã được duyệt' if approved else 'đã bị từ chối'
    message = f'Yêu cầu {"thêm" if change.action == "add" else "gỡ"} môn {change.subject.name} {verb}.'
    notification = SystemNotification(
        title='Cập nhật môn dạy', message=message,
        audience=SystemNotification.AUDIENCE_TUTORS,
        status=SystemNotification.STATUS_SENT,
        recipient_count=1, sent_at=timezone.now(),
    ).save()
    NotificationDelivery(
        notification=notification, recipient_type='tutor', recipient_id=int(change.tutor.id),
    ).save()


@require_http_methods(['GET'])
def tutor_subject_change_requests(request):
    admin, response = _active_admin_or_response(request)
    if response is not None:
        return response

    requested_status = request.GET.get('status', 'pending')
    if requested_status not in STATUS_LABELS:
        requested_status = 'pending'
    changes = TutorSubjectChangeRequest.objects(status=requested_status).order_by('-created_at', '-id').select_related()
    rows = []
    for change in changes:
        rows.append({
            'change': change,
            'action_label': 'Thêm môn' if change.action == 'add' else 'Gỡ môn',
            'created_at': _format_vietnam_time(change.created_at),
        })
    return render(request, 'admin/tutor_subject_changes/index.html', {
        'page': {
            'key': 'tutor-subject-requests', 'title': 'Duyệt môn dạy gia sư',
            'singular': 'yêu cầu môn dạy',
            'description': 'Xem xét các môn gia sư yêu cầu thêm hoặc gỡ khỏi hồ sơ công khai.',
            'can_manage': True, 'can_create': False, 'statuses': [],
        },
        'rows': rows,
        'active_status': requested_status,
        'status_labels': STATUS_LABELS,
        'admin': admin,
    })


@require_http_methods(['POST'])
def tutor_subject_change_review(request, change_id):
    admin, response = _active_admin_or_response(request)
    if response is not None:
        return response
    decision = request.POST.get('decision')
    if decision not in ('approve', 'reject'):
        return HttpResponseBadRequest('Quyết định duyệt không hợp lệ.')
    # MongoEngine's select_related() materializes a list, so chaining first()
    # causes an AttributeError. Reference fields are loaded lazily here.
    change = TutorSubjectChangeRequest.objects(id=change_id).first()
    if change is None:
        return HttpResponseNotFound('Không tìm thấy yêu cầu cập nhật môn dạy.')
    if change.status != TutorSubjectChangeRequest.STATUS_PENDING:
        messages.info(request, 'Yêu cầu này đã được xử lý trước đó.')
        return redirect('admin-tutor-subject-changes')

    review_note = (request.POST.get('review_note') or '').strip()[:1000] or None
    approved = decision == 'approve'
    if approved:
        if change.action == TutorSubjectChangeRequest.ACTION_ADD:
            # Keep the Admin review rule consistent with both the public
            # subject catalogue and the tutor request endpoint. Older subject
            # records legitimately have no persisted status and are active.
            subject = Subject.objects(
                Q(id=change.subject.id) & (Q(status=1) | Q(status__exists=False)),
            ).first()
            if subject is None:
                messages.error(request, 'Môn học đã bị xóa hoặc ngưng hoạt động; không thể duyệt.')
                return redirect('admin-tutor-subject-changes')
            if TutorSubject.objects(tutor=change.tutor, subject=subject).first() is None:
                TutorSubject(
                    tutor=change.tutor, subject=subject, level=change.level,
                    price_per_hour=change.price_per_hour,
                ).save()
        else:
            TutorSubject.objects(tutor=change.tutor, subject=change.subject).delete()
        change.status = TutorSubjectChangeRequest.STATUS_APPROVED
    else:
        change.status = TutorSubjectChangeRequest.STATUS_REJECTED
    change.reviewed_by = admin
    change.reviewed_at = timezone.now()
    change.review_note = review_note
    change.save()
    _notify_tutor(change, approved)
    cache.delete(ADMIN_NOTIFICATION_CACHE_KEY)
    record_admin_activity(request, 'update', change)
    messages.success(request, 'Đã duyệt yêu cầu môn dạy.' if approved else 'Đã từ chối yêu cầu môn dạy.')
    return redirect('admin-tutor-subject-changes')
