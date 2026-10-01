"""Safe, idempotent reconciliation of confirmed tuition receipts."""

from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.core.cache import cache
from mongoengine import NotUniqueError

from core.documents import AdminNotification, Invoice, Payment, PaymentItem, Transaction
from core.admin_audit import record_system_payment_reconciliation


class ReconciliationError(ValueError):
    """Raised when an incoming receipt cannot be safely applied."""


class ReconciliationInProgress(ReconciliationError):
    """The same verified receipt is currently being finalized elsewhere."""


def _invoice_reference(value):
    return (value or '').strip().upper()


def _safe_raw_payload(payload):
    """Keep only business fields; never persist webhook secrets/headers."""
    allowed = ('event', 'transaction_id', 'reference', 'amount', 'method', 'paid_at')
    return {key: payload[key] for key in allowed if key in payload}


def _mark_lessons_paid(payment):
    for item in PaymentItem.objects(payment=payment).select_related():
        item.lesson.payment_status = 'paid'
        item.lesson.save()


def _finish_reconciliation(*, payment, invoice, transaction, paid_at):
    """Atomically complete a receipt already claimed for ``payment``."""
    finished = Payment.objects(
        id=payment.id,
        status='pending',
        reconciliation_receipt_id=transaction.gateway_transaction_id,
    ).modify(
        new=True,
        set__status='paid',
        set__paid_at=paid_at,
        set__reconciled_at=datetime.now(timezone.utc),
    )
    if finished is None:
        return payment.reload(), False

    _mark_lessons_paid(finished)
    AdminNotification(
        title='Đã nhận học phí tự động',
        message=(
            f'{invoice.payer_name} đã thanh toán {finished.total_amount:,.0f} VNĐ '
            f'cho hóa đơn {invoice.invoice_no}.'
        ).replace(',', '.'),
        kind='payment',
        url='/admin/management/payments/',
        payment=finished,
    ).save()
    record_system_payment_reconciliation(finished, invoice, transaction)
    # The header cache is shared by every admin page. Invalidate only on a
    # real money event, not on ordinary page rendering.
    cache.delete('admin-header-notification-items:v1')
    return finished, True


def reconcile_paid_receipt(*, reference, amount, transaction_id, method='bank_transfer', raw_payload=None, paid_at=None):
    """Match an external receipt to one exact invoice and mark it paid.

    The operation is idempotent by ``transaction_id``.  A receipt is accepted
    only when its invoice code and integer amount match an issued, pending
    invoice exactly; this avoids accidental reconciliation of a different
    student's transfer.
    """
    reference = _invoice_reference(reference)
    transaction_id = (transaction_id or '').strip()
    if not reference or not transaction_id:
        raise ReconciliationError('Thiếu mã hóa đơn hoặc mã giao dịch từ cổng thanh toán.')
    try:
        amount = int(amount)
    except (TypeError, ValueError) as exc:
        raise ReconciliationError('Số tiền giao dịch không hợp lệ.') from exc
    if amount <= 0:
        raise ReconciliationError('Số tiền giao dịch phải lớn hơn 0.')

    existing = Transaction.objects(gateway_transaction_id=transaction_id).first()
    if existing is not None:
        if existing.status != 'success':
            raise ReconciliationError('Mã giao dịch đang được xử lý, vui lòng gửi lại callback sau.')
        # A callback can be retried after a process interruption between
        # persisting the receipt and finalizing the payment state.
        invoice = Invoice.objects(payment=existing.payment).first()
        if invoice is not None and existing.payment.status == 'pending':
            _finish_reconciliation(
                payment=existing.payment, invoice=invoice, transaction=existing,
                paid_at=existing.received_at or datetime.now(timezone.utc),
            )
        return existing, False

    invoice = Invoice.objects(invoice_no=reference, status='issued').first()
    if invoice is None:
        raise ReconciliationError('Không tìm thấy hóa đơn đang phát hành cho mã chuyển khoản này.')
    payment = invoice.payment
    if payment is None or payment.status != 'pending':
        raise ReconciliationError('Hóa đơn này không còn ở trạng thái chờ thanh toán.')
    if payment.total_amount != amount or invoice.total_amount != amount:
        raise ReconciliationError('Số tiền nhận được không khớp với tổng tiền của hóa đơn.')
    now = paid_at or datetime.now(timezone.utc)
    if getattr(now, 'tzinfo', None) is None:
        now = now.replace(tzinfo=timezone.utc)

    # Claiming the payment is an atomic compare-and-set: simultaneous callbacks
    # for the same invoice cannot both become money events.
    reconciliation_started = datetime.now(timezone.utc)
    claimed = Payment.objects(
        id=payment.id, status='pending', reconciliation_receipt_id=None,
    ).modify(
        new=True,
        set__reconciliation_receipt_id=transaction_id,
        set__reconciliation_started_at=reconciliation_started,
    )
    if claimed is None:
        payment.reload()
        if payment.reconciliation_receipt_id != transaction_id:
            raise ReconciliationError('Hóa đơn đang được đối soát bởi một giao dịch khác.')
        existing = Transaction.objects(gateway_transaction_id=transaction_id).first()
        if existing is not None:
            _finish_reconciliation(
                payment=payment, invoice=invoice, transaction=existing,
                paid_at=existing.received_at or now,
            )
            return existing, False
        started_at = payment.reconciliation_started_at
        if started_at and getattr(started_at, 'tzinfo', None) is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        lock_expired = (
            started_at is None
            or started_at <= reconciliation_started - timedelta(
                seconds=settings.PAYMENT_RECONCILIATION_LOCK_SECONDS,
            )
        )
        if not lock_expired:
            raise ReconciliationInProgress('Giao dịch đang được đối soát. Cổng thanh toán sẽ tự thử lại.')
        # A worker may have terminated after claiming the payment but before
        # writing its transaction. Only the same receipt may recover the lock.
        claimed = Payment.objects(
            id=payment.id, status='pending', reconciliation_receipt_id=transaction_id,
        ).modify(new=True, set__reconciliation_started_at=reconciliation_started)
        if claimed is None:
            raise ReconciliationInProgress('Giao dịch đang được đối soát. Cổng thanh toán sẽ tự thử lại.')

    # Reuse the learner's pending payment intent when it exists. This provides
    # one clear audit trail from their click through the bank confirmation.
    transaction = Transaction.objects(payment=claimed, status='pending').order_by('-created_at').first()
    try:
        if transaction is None:
            transaction = Transaction(
                payment=claimed,
                method=method if method in ('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay') else 'bank_transfer',
                amount=amount, status='success', gateway_transaction_id=transaction_id,
                payment_reference=reference, raw_response=_safe_raw_payload(raw_payload or {}),
                received_at=now, reconciled_at=datetime.now(timezone.utc),
            ).save()
        else:
            transaction.method = method if method in ('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay') else 'bank_transfer'
            transaction.amount = amount
            transaction.status = 'success'
            transaction.gateway_transaction_id = transaction_id
            transaction.payment_reference = reference
            transaction.raw_response = _safe_raw_payload(raw_payload or {})
            transaction.received_at = now
            transaction.reconciled_at = datetime.now(timezone.utc)
            transaction.save()
    except NotUniqueError:
        # A concurrent retry won the unique external-receipt index. Re-read it
        # rather than crediting a second time.
        transaction = Transaction.objects(gateway_transaction_id=transaction_id).first()
        if transaction is None or transaction.payment.id != claimed.id:
            raise ReconciliationError('Mã giao dịch này đã được dùng cho một hóa đơn khác.')

    _, reconciled = _finish_reconciliation(
        payment=claimed, invoice=invoice, transaction=transaction, paid_at=now,
    )
    return transaction, reconciled
