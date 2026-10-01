from core.admin_query_stats import reference_counts
from core.documents import Invoice, PaymentItem


class InvoiceApiError(ValueError):
    pass


def _reference_name(item):
    try:
        return item.name or '—'
    except Exception:
        return '—'


def invoice_payload(invoice, *, detail=False, lesson_count=0):
    payment = invoice.payment
    payload = {
        'invoice_no': invoice.invoice_no,
        'billing_month': payment.billing_month if payment else None,
        'issued_at': invoice.issued_at,
        'status': invoice.status,
        'payment_status': payment.status if payment else 'unknown',
        'paid_at': payment.paid_at if payment else None,
        'student': _reference_name(invoice.student),
        'tutor': _reference_name(invoice.tutor),
        'payer_name': invoice.payer_name,
        'total_amount': invoice.total_amount,
        'lesson_count': lesson_count,
        'payment_reference': invoice.invoice_no,
        'pdf_url': invoice.pdf_file,
    }
    if detail and payment:
        items = list(PaymentItem.objects(payment=payment).select_related())
        payload['items'] = [{
            'lesson_id': int(item.lesson.id),
            'session_date': item.lesson.session_date,
            'subject': _reference_name(item.lesson.subject),
            'amount': item.amount,
        } for item in items]
    return payload


def invoices_for_student(student):
    invoices = list(Invoice.objects(student=student).order_by('-issued_at').select_related())
    payments = [invoice.payment for invoice in invoices if invoice.payment]
    counts = reference_counts(PaymentItem, 'payment') if payments else {}
    return invoices, counts
