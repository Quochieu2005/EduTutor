"""Database-backed admin contact inbox."""
import logging

from django.conf import settings
from django.contrib import messages
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponseBadRequest, HttpResponseForbidden, HttpResponseNotFound
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from mongoengine import DoesNotExist
from pymongo.errors import PyMongoError

from accounts.documents import Admin
from core.admin_audit import record_admin_activity
from core.documents import Contact

logger = logging.getLogger(__name__)
STATUSES = {'new': 'Mới', 'contacted': 'Đã liên hệ', 'closed': 'Đã xử lý'}
TONES = {'new': 'info', 'contacted': 'warning', 'closed': 'success'}


def contact_notifications(request):
    admin = getattr(request, 'admin_account', None)
    if admin is None or admin.status != Admin.STATUS_ACTIVE:
        return {}
    try:
        return {'new_contact_count': Contact.objects(status='new').count()}
    except PyMongoError:
        logger.exception('Could not count new contacts')
        return {}


@require_http_methods(['GET', 'HEAD', 'POST'])
def contacts(request):
    admin = getattr(request, 'admin_account', None)
    if admin is None:
        return redirect('login')
    if admin.status != Admin.STATUS_ACTIVE:
        return HttpResponseForbidden('Tài khoản quản trị không hoạt động.')
    if request.method == 'POST':
        action = request.POST.get('action')
        status = request.POST.get('status')
        if action == 'reply':
            recipient_email = request.POST.get('recipient_email', '').strip()
            subject = request.POST.get('subject', '').strip()
            message = request.POST.get('message', '').strip()
            try:
                validate_email(recipient_email)
            except DjangoValidationError:
                return HttpResponseBadRequest('Email người nhận không hợp lệ.')
            if not subject or len(subject) > 250 or not message or len(message) > 10000:
                return HttpResponseBadRequest('Tiêu đề hoặc nội dung phản hồi không hợp lệ.')
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient_email], fail_silently=False)
            except Exception:
                logger.exception('Could not send contact reply: recipient=%s', recipient_email)
                messages.error(request, 'Không thể gửi email phản hồi. Vui lòng thử lại.')
                return redirect('management-page', module='contacts')
            messages.success(request, f'Đã gửi email phản hồi đến {recipient_email}.')
            return redirect('management-page', module='contacts')
        if status not in STATUSES:
            return HttpResponseBadRequest('Trạng thái không hợp lệ.')
        try:
            contact_id = int(request.POST.get('contact_id', ''))
        except (ValueError, TypeError):
            return HttpResponseBadRequest('Liên hệ không hợp lệ.')
        contact = Contact.objects(id=contact_id).first()
        if contact is None:
            return HttpResponseNotFound('Không tìm thấy liên hệ.')
        if contact.status != status:
            contact.update(set__status=status, set__updated_at=timezone.now())
            record_admin_activity(request, 'toggle_status', contact)
        messages.success(request, 'Đã cập nhật trạng thái liên hệ.')
        return redirect('management-page', module='contacts')

    columns = [('name', 'Người gửi'), ('phone', 'Số điện thoại'), ('email', 'Email'),
               ('subject', 'Môn học'), ('message', 'Nội dung'), ('time', 'Ngày gửi'), ('status', 'Trạng thái')]
    rows = []
    for contact in Contact.objects.order_by('-created_at', '-id'):
        try:
            subject = contact.subject.name if contact.subject else '—'
        except DoesNotExist:
            subject = '—'
        created = contact.created_at
        if created and timezone.is_naive(created):
            created = timezone.make_aware(created, timezone.get_fixed_timezone(0))
        values = [contact.parent_name, contact.phone, contact.email or '—', subject,
                  contact.needs_description or '—',
                  timezone.localtime(created).strftime('%d/%m/%Y') if created else '—',
                  STATUSES[contact.status]]
        rows.append({'id': contact.id, 'status_code': contact.status, 'cells': [
            {'field': key, 'value': value, 'tone': TONES[contact.status] if key == 'status' else ''}
            for (key, _), value in zip(columns, values)
        ]})
    return render(request, 'admin/contacts/contacts.html', {'page': {
        'key': 'contacts', 'title': 'Phản hồi liên hệ', 'singular': 'liên hệ',
        'description': 'Tiếp nhận thông báo liên hệ từ người dùng và cập nhật trạng thái xử lý.',
        'can_manage': False, 'can_create': False, 'statuses': list(STATUSES.values()),
        'columns': [{'key': key, 'label': label} for key, label in columns], 'rows': rows,
    }, 'contact_status_choices': STATUSES.items()})
