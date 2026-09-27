"""Monthly tuition invoice and tutor-payout workflow for the admin."""

from calendar import monthrange
from datetime import date, datetime, timezone

from django.contrib import messages
from django.shortcuts import redirect
from mongoengine import ValidationError

from core.admin_audit import record_admin_activity
from core.admin_query_stats import reference_counts
from core.documents import Invoice, Payment, PaymentItem
from lessons.documents import Lesson


DEFAULT_COMMISSION_RATE = 15
PAYMENT_STATUS_LABELS = {
    'pending': 'Chờ thanh toán',
    'paid': 'Đã thanh toán',
    'failed': 'Thanh toán thất bại',
    'refunded': 'Đã hoàn tiền',
}
PAYOUT_STATUS_LABELS = {'pending': 'Chưa chi trả', 'paid': 'Đã chi trả'}


def _ref_name(reference, fallback='—'):
    try:
        return reference.name if reference else fallback
    except Exception:
        return fallback


def _money(value):
    return f'{value or 0:,.0f} VNĐ'.replace(',', '.')


def _payment_code(payment):
    month = (payment.billing_month or payment.created_at.strftime('%Y-%m')).replace('-', '')
    return f'HP-{month}-{int(payment.id):05d}'


def _payment_items(payment):
    return list(PaymentItem.objects(payment=payment).select_related())


def payment_page_config():
    payments = list(Payment.objects.order_by('-created_at').select_related())
    item_counts = reference_counts(PaymentItem, 'payment') if payments else {}
    rows = []
    for payment in payments:
        payout_status = (
            PAYOUT_STATUS_LABELS.get(payment.tutor_payout_status, 'Chưa chi trả')
            if payment.status == 'paid' else 'Chờ học viên thanh toán'
        )
        rows.append((
            _payment_code(payment),
            payment.billing_month or 'Chưa phân kỳ',
            _ref_name(payment.student),
            _ref_name(payment.tutor),
            str(item_counts.get(payment.id, 0)),
            _money(payment.total_amount),
            _money(payment.commission_amount),
            _money(payment.tutor_payout_amount),
            PAYMENT_STATUS_LABELS.get(payment.status, payment.status),
            payout_status,
        ))
    return {
        'title': 'Thanh toán & Hoa hồng',
        'group': 'Vận hành',
        'singular': 'hóa đơn học phí',
        'description': 'Lập hóa đơn theo buổi đã hoàn thành, xác nhận học phí và chi trả gia sư.',
        'columns': [
            ('code', 'Mã hóa đơn'), ('period', 'Kỳ học phí'),
            ('student', 'Học viên'), ('tutor', 'Gia sư'), ('lessons', 'Buổi học'),
            ('total', 'Học phí'), ('commission', 'Hoa hồng'),
            ('payout', 'Chi trả gia sư'), ('status', 'Thanh toán học phí'),
            ('payout_status', 'Trạng thái chi trả'),
        ],
        'statuses': list(PAYMENT_STATUS_LABELS.values()),
        'records': payments,
        'rows': rows,
    }


def _billing_period(value):
    try:
        year, month = (int(part) for part in value.split('-', 1))
        if not 2020 <= year <= 2100 or not 1 <= month <= 12:
            raise ValueError
    except (AttributeError, TypeError, ValueError) as exc:
        raise ValueError('Kỳ học phí phải có dạng tháng/năm hợp lệ.') from exc
    return year, month


def _commission_rate(value):
    try:
        rate = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError('Tỷ lệ hoa hồng phải là số nguyên từ 0 đến 100.') from exc
    if not 0 <= rate <= 100:
        raise ValueError('Tỷ lệ hoa hồng phải trong khoảng 0–100%.')
    return rate


def payment_generate(request):
    if request.method != 'POST':
        return redirect('management-page', module='payments')
    try:
        period = request.POST.get('billing_month', '').strip()
        year, month = _billing_period(period)
        rate = _commission_rate(request.POST.get('commission_rate', DEFAULT_COMMISSION_RATE))
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])
        lessons = Lesson.objects(
            status='completed', payment_status='unpaid',
            session_date__gte=start_date, session_date__lte=end_date,
        ).select_related()
        groups = {}
        for lesson in lessons:
            if lesson.price is None or lesson.price <= 0:
                continue
            if PaymentItem.objects(lesson=lesson).first() is not None:
                continue
            try:
                key = (int(lesson.student.id), int(lesson.tutor.id))
            except Exception:
                continue
            groups.setdefault(key, []).append(lesson)
        if not groups:
            raise ValueError('Không có buổi học hoàn thành chưa được lập hóa đơn trong kỳ này.')

        created = []
        for group_lessons in groups.values():
            first = group_lessons[0]
            total = sum(lesson.price for lesson in group_lessons)
            commission = total * rate // 100
            payment = Payment(
                payer_type='student', payer_id=int(first.student.id), student=first.student,
                tutor=first.tutor, payment_type='package', total_amount=total,
                billing_month=period, commission_rate=rate,
                commission_amount=commission, tutor_payout_amount=total - commission,
            ).save()
            PaymentItem.objects.insert([
                PaymentItem(payment=payment, lesson=lesson, amount=lesson.price)
                for lesson in group_lessons
            ], load_bulk=False)
            Invoice(
                invoice_no=_payment_code(payment), payment=payment,
                student=first.student, tutor=first.tutor, payer_type='student',
                payer_id=int(first.student.id), payer_name=_ref_name(first.student),
                total_amount=total, issued_at=datetime.now(timezone.utc),
            ).save()
            created.append(payment)
    except (ValueError, ValidationError) as exc:
        messages.error(request, str(exc) or 'Không thể lập hóa đơn học phí.')
    else:
        for payment in created:
            record_admin_activity(request, 'create', payment)
        messages.success(request, f'Đã lập {len(created)} hóa đơn học phí cho kỳ {period}.')
    return redirect('management-page', module='payments')


def payment_mark_paid(request, payment_id):
    if request.method != 'POST':
        return redirect('management-page', module='payments')
    payment = Payment.objects(id=payment_id).first()
    if payment is None:
        messages.error(request, 'Không tìm thấy hóa đơn học phí.')
    elif payment.status != 'pending':
        messages.error(request, 'Hóa đơn này không còn ở trạng thái chờ thanh toán.')
    else:
        payment.status = 'paid'
        payment.paid_at = datetime.now(timezone.utc)
        payment.save()
        for item in _payment_items(payment):
            item.lesson.payment_status = 'paid'
            item.lesson.save()
        record_admin_activity(request, 'mark_paid', payment)
        messages.success(request, 'Đã xác nhận học viên thanh toán học phí.')
    return redirect('management-page', module='payments')


def payment_mark_tutor_paid(request, payment_id):
    if request.method != 'POST':
        return redirect('management-page', module='payments')
    payment = Payment.objects(id=payment_id).first()
    if payment is None:
        messages.error(request, 'Không tìm thấy hóa đơn học phí.')
    elif payment.status != 'paid':
        messages.error(request, 'Chỉ được chi trả gia sư sau khi học viên đã thanh toán.')
    elif payment.tutor_payout_status == 'paid':
        messages.error(request, 'Khoản chi trả này đã được xác nhận.')
    else:
        payment.tutor_payout_status = 'paid'
        payment.tutor_paid_at = datetime.now(timezone.utc)
        payment.save()
        record_admin_activity(request, 'mark_tutor_paid', payment)
        messages.success(request, 'Đã xác nhận chi trả cho gia sư.')
    return redirect('management-page', module='payments')
