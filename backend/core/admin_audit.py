"""Admin audit writes and a read-only activity log."""

import logging
from datetime import datetime, time, timedelta
from ipaddress import ip_address
from urllib.parse import urlencode

from django.core.paginator import Paginator
from django.http import HttpResponseForbidden
from django.shortcuts import redirect, render
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_safe
from mongoengine import Q

from accounts.documents import Admin
from core.documents import AuditLog

logger = logging.getLogger(__name__)
ACTION_LABELS = {
    'login': 'Đăng nhập', 'logout': 'Đăng xuất',
    'logout_all': 'Đăng xuất tất cả thiết bị',
    'create': 'Thêm mới', 'update': 'Cập nhật', 'delete': 'Xóa',
    'toggle_status': 'Đổi trạng thái', 'change_password': 'Đổi mật khẩu',
    'reset_password': 'Đặt lại mật khẩu', 'update_email': 'Đổi email',
    'update_profile': 'Cập nhật hồ sơ',
}
TARGET_LABELS = {
    'admins': 'Quản trị viên', 'banners': 'Slides', 'blog_posts': 'Bài viết',
    'blog_categories': 'Danh mục Blog', 'job_postings': 'Tin tuyển gia sư',
    'contacts': 'Liên hệ',
}


def record_admin_activity(request, action, target, *, actor=None):
    """Log confirmed writes without secrets; do not trust forwarded IP headers.

    Failure is reported to operational logging, not returned as a failure of an
    already committed business operation.
    """
    actor = actor if actor is not None else getattr(request, 'admin_account', None)
    if actor is None or actor.id is None:
        return
    try:
        try:
            address = str(ip_address(request.META.get('REMOTE_ADDR', '')))
        except ValueError:
            address = None
        target_type = target._get_collection_name()
        label = str(getattr(target, 'name', None) or getattr(target, 'title', None) or target.id)[:250]
        return AuditLog(
            actor_type='admin', actor_id=int(actor.id), action=action,
            target_type=target_type, target_id=int(target.id),
            description=f'{ACTION_LABELS.get(action, action)} — {TARGET_LABELS.get(target_type, target_type)}: {label}',
            metadata={'actor_name': actor.name, 'actor_email': actor.email, 'target_label': label},
            ip_address=address,
        ).save(force_insert=True)
    except Exception:
        logger.exception('Could not persist admin audit event: action=%s actor_id=%s', action, actor.id)


@require_safe
def activity_logs(request):
    admin = getattr(request, 'admin_account', None)
    if admin is None:
        return redirect('login')
    if admin.status != Admin.STATUS_ACTIVE:
        return HttpResponseForbidden('Tài khoản quản trị không hoạt động.')
    filters = {key: request.GET.get(key, '').strip() for key in ('q', 'action', 'start', 'end')}
    filters['q'] = filters['q'][:200]
    records = AuditLog.objects(actor_type='admin')
    is_super_admin = admin.role == Admin.ROLE_SUPER_ADMIN
    if not is_super_admin:
        records = records.filter(actor_id=int(admin.id))
    if filters['q']:
        query = filters['q']
        records = records.filter(
            Q(description__icontains=query) | Q(metadata__actor_name__icontains=query)
            | Q(metadata__actor_email__icontains=query) | Q(ip_address__icontains=query)
        )
    errors = []
    if filters['action']:
        if filters['action'] not in ACTION_LABELS:
            errors.append('Hành động không hợp lệ.')
        else:
            records = records.filter(action=filters['action'])
    dates = {}
    for key, label in (('start', 'Từ ngày'), ('end', 'Đến ngày')):
        if not filters[key]:
            continue
        try:
            value = parse_date(filters[key])
            if value is None or value.year >= 9999:
                raise ValueError
            dates[key] = value
        except ValueError:
            errors.append(f'{label} không hợp lệ (YYYY-MM-DD).')
    if 'start' in dates and 'end' in dates and dates['start'] > dates['end']:
        errors.append('Từ ngày không được sau đến ngày.')
    if 'start' in dates:
        records = records.filter(created_at__gte=timezone.make_aware(datetime.combine(dates['start'], time.min)))
    if 'end' in dates:
        records = records.filter(created_at__lt=timezone.make_aware(datetime.combine(dates['end'] + timedelta(days=1), time.min)))
    if errors:
        records = records.none()
    result = Paginator(records.order_by('-created_at', '-id'), 20).get_page(request.GET.get('page'))
    rows = []
    for entry in records.order_by('-created_at', '-id'):
        metadata = entry.metadata or {}
        created_at = entry.created_at
        if created_at and timezone.is_naive(created_at):
            created_at = timezone.make_aware(created_at, timezone.get_fixed_timezone(0))
        rows.append({
            'id': entry.id, 'actor': metadata.get('actor_name') or f'Admin #{entry.actor_id}',
            'email': metadata.get('actor_email', ''),
            'action': ACTION_LABELS.get(entry.action, entry.action),
            'module': TARGET_LABELS.get(entry.target_type, entry.target_type or '—'),
            'target_id': entry.target_id, 'description': entry.description or '—',
            'created_at': created_at, 'ip': entry.ip_address or '—',
        })
    return render(request, 'admin/activity_logs/activity_logs.html', {
        'page': {
            'title': 'Nhật ký hoạt động', 'key': 'activity-logs', 'singular': 'nhật ký',
            'description': 'Theo dõi thao tác quản trị và các thay đổi quan trọng.',
            'can_manage': False, 'can_create': False, 'statuses': [],
            'columns': [{'key': key, 'label': label} for key, label in (
                ('admin', 'Quản trị viên'), ('action', 'Hành động'), ('module', 'Phân hệ'),
                ('time', 'Thời gian'), ('ip', 'Địa chỉ IP'),
            )],
            'rows': [{'id': row['id'], 'cells': [
                {'field': 'admin', 'value': row['actor']},
                {'field': 'action', 'value': row['description']},
                {'field': 'module', 'value': row['module']},
                {'field': 'time', 'value': timezone.localtime(row['created_at']).strftime('%d/%m/%Y') if row['created_at'] else '—'},
                {'field': 'ip', 'value': row['ip']},
            ]} for row in rows],
        },
        'entries': rows, 'pagination': result, 'filters': filters,
        'filter_query': urlencode({k: v for k, v in filters.items() if v}),
        'action_choices': ACTION_LABELS.items(), 'filter_errors': errors,
        'is_super_admin': is_super_admin,
    }, status=400 if errors else 200)
