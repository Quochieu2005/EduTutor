"""Moderation and email-reply workflow for reviews and user complaints."""

from datetime import datetime, timezone

from django.conf import settings
from django.contrib import messages
from django.core.mail import send_mail
from django.shortcuts import redirect
from mongoengine import ValidationError

from core.admin_audit import record_admin_activity
from core.documents import Complaint
from lessons.documents import Review, TutorQuestion


REVIEW_STATUS_LABELS = {'visible': 'Hiển thị', 'hidden': 'Đã ẩn'}
COMPLAINT_STATUS_LABELS = {
    'new': 'Mới',
    'processing': 'Đang xử lý',
    'resolved': 'Đã giải quyết',
    'rejected': 'Từ chối',
}
QUESTION_STATUS_LABELS = {
    'pending': 'Chờ duyệt',
    'visible': 'Hiển thị',
    'hidden': 'Đã ẩn',
}


def _name(reference, fallback='—'):
    try:
        return reference.name if reference else fallback
    except Exception:
        return fallback


def _email(reference):
    try:
        return reference.email or ''
    except Exception:
        return ''


def _format_date(value):
    try:
        return value.strftime('%d/%m/%Y') if value else '—'
    except (AttributeError, ValueError):
        return '—'


def reviews_complaints_page_config():
    """Combine reviews, tutor questions and complaints into one moderation inbox."""
    records = []
    for review in Review.objects:
        records.append({
            'key': f'review-{review.id}',
            'kind': 'review',
            'record': review,
            'sender': _name(review.student),
            'sender_email': _email(review.student),
            'target': _name(review.tutor),
            'type': 'Đánh giá',
            'content': f'{review.rating}/5 — {review.comment or "Không có nhận xét"}',
            'submitted': _format_date(getattr(review, 'created_at', None)),
            'status': REVIEW_STATUS_LABELS.get(getattr(review, 'status', 'visible'), 'Hiển thị'),
        })
    for question in TutorQuestion.objects.order_by('-created_at').select_related():
        records.append({
            'key': f'question-{question.id}',
            'kind': 'question',
            'record': question,
            'sender': _name(question.student),
            'sender_email': _email(question.student),
            'target': _name(question.tutor),
            'type': 'Hỏi đáp',
            'content': question.content,
            'submitted': _format_date(getattr(question, 'created_at', None)),
            'status': QUESTION_STATUS_LABELS.get(getattr(question, 'status', 'pending'), 'Chờ duyệt'),
        })
    for complaint in Complaint.objects.order_by('-created_at'):
        records.append({
            'key': f'complaint-{complaint.id}',
            'kind': 'complaint',
            'record': complaint,
            'sender': complaint.sender_name,
            'sender_email': complaint.sender_email,
            'target': complaint.target_label,
            'type': 'Khiếu nại',
            'content': complaint.content,
            'submitted': _format_date(complaint.created_at),
            'status': COMPLAINT_STATUS_LABELS.get(complaint.status, complaint.status),
        })
    records.sort(
        key=lambda item: getattr(item['record'], 'created_at', None) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return {
        'title': 'Đánh giá & Khiếu nại',
        'group': 'Vận hành',
        'singular': 'phản hồi',
        'description': 'Kiểm duyệt đánh giá và xử lý tranh chấp giữa người dùng.',
        'columns': [
            ('sender', 'Người gửi'), ('email', 'Email người gửi'), ('target', 'Đối tượng'), ('type', 'Loại'),
            ('content', 'Nội dung'), ('submitted', 'Ngày gửi'), ('status', 'Trạng thái'),
        ],
        'statuses': [
            *COMPLAINT_STATUS_LABELS.values(),
            *REVIEW_STATUS_LABELS.values(),
            *QUESTION_STATUS_LABELS.values(),
        ],
        'records': records,
        'rows': [
            (item['sender'], item['sender_email'], item['target'], item['type'], item['content'], item['submitted'], item['status'])
            for item in records
        ],
    }


def _record_from_key(record_key):
    try:
        kind, raw_id = record_key.split('-', 1)
        record_id = int(raw_id)
    except (AttributeError, TypeError, ValueError):
        return None, None
    if kind == 'review':
        return kind, Review.objects(id=record_id).first()
    if kind == 'question':
        return kind, TutorQuestion.objects(id=record_id).first()
    if kind == 'complaint':
        return kind, Complaint.objects(id=record_id).first()
    return None, None


def _reply_email(*, recipient, sender_name, item_type, response):
    if not recipient:
        raise ValueError('Không có email của người gửi để phản hồi.')
    send_mail(
        subject=f'EduTutor phản hồi {item_type.lower()} của bạn',
        message=(
            f'Xin chào {sender_name},\n\n'
            f'Đội ngũ EduTutor đã phản hồi {item_type.lower()} của bạn:\n\n'
            f'{response}\n\n'
            'Trân trọng,\nEduTutor'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )


def review_complaint_update(request, record_key):
    if request.method != 'POST':
        return redirect('management-page', module='reviews-complaints')
    kind, record = _record_from_key(record_key)
    if record is None:
        messages.error(request, 'Không tìm thấy đánh giá hoặc khiếu nại.')
        return redirect('management-page', module='reviews-complaints')

    status = request.POST.get('status', '').strip().lower()
    response = request.POST.get('response_message', '').strip()
    try:
        if len(response) > 3000:
            raise ValueError('Nội dung phản hồi không được vượt quá 3.000 ký tự.')
        if kind == 'review':
            if status not in REVIEW_STATUS_LABELS:
                raise ValueError('Trạng thái kiểm duyệt đánh giá không hợp lệ.')
            recipient = _email(record.student)
            sender_name = _name(record.student, 'bạn')
            item_type = 'đánh giá'
        elif kind == 'question':
            if status not in QUESTION_STATUS_LABELS:
                raise ValueError('Trạng thái câu hỏi không hợp lệ.')
            recipient = _email(record.student)
            sender_name = _name(record.student, 'bạn')
            item_type = 'câu hỏi'
        else:
            if status not in COMPLAINT_STATUS_LABELS:
                raise ValueError('Trạng thái khiếu nại không hợp lệ.')
            recipient = record.sender_email
            sender_name = record.sender_name
            item_type = 'khiếu nại'

        if response:
            _reply_email(
                recipient=recipient,
                sender_name=sender_name,
                item_type=item_type,
                response=response,
            )

        if kind == 'review':
            record.status = status
            record.admin_reply = response or record.admin_reply
            record.moderated_at = datetime.now(timezone.utc)
        elif kind == 'question':
            record.status = status
            if response:
                record.answer = response
                record.answered_at = datetime.now(timezone.utc)
        else:
            record.status = status
            if response:
                record.response_message = response
                record.response_sent_at = datetime.now(timezone.utc)
            record.handled_by = request.admin_account
        record.save()
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật phản hồi.')
    except Exception:
        messages.error(request, 'Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP rồi thử lại.')
    else:
        record_admin_activity(request, 'update', record)
        messages.success(
            request,
            'Đã cập nhật phản hồi và gửi email cho người gửi.' if response else 'Đã cập nhật trạng thái phản hồi.',
        )
    return redirect('management-page', module='reviews-complaints')
