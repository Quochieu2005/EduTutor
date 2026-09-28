from calendar import monthrange
from datetime import date

from accounts.documents import Student
from core.documents import PaymentItem
from lessons.documents import Lesson


class PaymentApiError(ValueError):
    pass


def student_for_user(user):
    student = Student.objects(email=user.email.strip().lower()).first()
    if student is None:
        raise PaymentApiError('Tài khoản chưa có hồ sơ học viên.')
    if student.status != 'active':
        raise PaymentApiError('Tài khoản học viên không hoạt động.')
    return student


def payment_code(payment):
    month = (payment.billing_month or payment.created_at.strftime('%Y-%m')).replace('-', '')
    return f'HP-{month}-{int(payment.id):05d}'


def reference_name(reference, fallback='—'):
    try:
        return reference.name if reference else fallback
    except Exception:
        return fallback


def payment_payload(payment, *, detail=False, lesson_count=None):
    items = list(PaymentItem.objects(payment=payment).select_related()) if detail else []
    payload = {
        'id': int(payment.id), 'code': payment_code(payment),
        'billing_month': payment.billing_month, 'student': reference_name(payment.student),
        'tutor': reference_name(payment.tutor),
        'lesson_count': len(items) if detail else (lesson_count or 0),
        'total_amount': payment.total_amount, 'status': payment.status,
        'paid_at': payment.paid_at,
    }
    if detail:
        payload['items'] = [{
            'lesson_id': int(item.lesson.id), 'session_date': item.lesson.session_date,
            'subject': reference_name(item.lesson.subject), 'amount': item.amount,
        } for item in items]
        payload['transactions'] = [{
            'id': int(transaction.id), 'method': transaction.method,
            'amount': transaction.amount, 'status': transaction.status,
            'gateway_transaction_id': transaction.gateway_transaction_id,
            'created_at': transaction.created_at,
        } for transaction in payment.transaction_set.order_by('-created_at')] if hasattr(payment, 'transaction_set') else []
    return payload


def parse_month(value):
    try:
        year, month = (int(part) for part in value.split('-', 1))
        if not 2020 <= year <= 2100 or not 1 <= month <= 12:
            raise ValueError
    except (AttributeError, TypeError, ValueError) as error:
        raise PaymentApiError('Tháng phải có định dạng YYYY-MM.') from error
    return year, month


def tutor_earnings_payload(tutor, month):
    year, month_number = parse_month(month)
    start = date(year, month_number, 1)
    end = date(year, month_number, monthrange(year, month_number)[1])
    lessons = list(Lesson.objects(
        tutor=tutor, status='completed', session_date__gte=start, session_date__lte=end,
    ).select_related())
    students = {int(lesson.student.id) for lesson in lessons}
    classes = {
        ('request', int(lesson.request.id)) if lesson.request else
        ('series', lesson.series_id) if lesson.series_id else
        ('student-subject', int(lesson.student.id), int(lesson.subject.id))
        for lesson in lessons
    }
    agreed = sum(lesson.price or 0 for lesson in lessons)
    item_by_lesson = {
        int(item.lesson.id): item
        for item in PaymentItem.objects(lesson__in=[lesson.id for lesson in lessons]).select_related()
    } if lessons else {}
    commission = payable = paid = 0
    seen_payments = set()
    for item in item_by_lesson.values():
        payment = item.payment
        if int(payment.id) in seen_payments:
            continue
        seen_payments.add(int(payment.id))
        commission += payment.commission_amount or 0
        payable += payment.tutor_payout_amount or 0
        if payment.tutor_payout_status == 'paid':
            paid += payment.tutor_payout_amount or 0
    # Uninvoiced completed lessons still show the negotiated gross amount but
    # are not considered payable until the monthly invoice is generated.
    return {
        'billing_month': month, 'class_count': len(classes),
        'student_count': len(students), 'completed_lesson_count': len(lessons),
        'agreed_tuition': agreed, 'commission_amount': commission,
        'payable_salary': payable, 'paid_salary': paid,
        'pending_salary': max(payable - paid, 0),
    }
