import hashlib
import hmac
import json
import re
import secrets
from datetime import datetime, timezone

from django.conf import settings
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from api.v1.accounts.authentication import MongoJWTAuthentication
from api.v1.tutors.authentication import TutorJWTAuthentication
from core.documents import Payment, PaymentItem, Transaction
from core.admin_query_stats import reference_counts
from core.payment_reconciliation import (
    ReconciliationError, ReconciliationInProgress, reconcile_paid_receipt,
)

from .serializers import (
    PaymentSerializer, PaymentTransactionCreateSerializer, PaymentTransactionSerializer,
    PaymentWebhookSerializer, TutorEarningsSerializer, TutorPayoutSerializer,
)
from .services import (
    PaymentApiError, payment_code, payment_payload, reference_name, student_for_user,
    tutor_earnings_payload,
)


class MyPaymentListView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Thanh toán'], responses={200: PaymentSerializer(many=True)})
    def get(self, request):
        try:
            student = student_for_user(request.user.user)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        payments = Payment.objects(student=student).order_by('-created_at').select_related()
        counts = reference_counts(PaymentItem, 'payment') if payments else {}
        return Response([
            payment_payload(payment, lesson_count=counts.get(payment.id, 0))
            for payment in payments
        ])


class MyPaymentDetailView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _payment(self, request, payment_id):
        student = student_for_user(request.user.user)
        return Payment.objects(id=payment_id, student=student).first()

    @extend_schema(tags=['Thanh toán'], responses={200: PaymentSerializer})
    def get(self, request, payment_id):
        try:
            payment = self._payment(request, payment_id)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        if payment is None:
            return Response({'detail': 'Không tìm thấy hóa đơn.'}, status=404)
        payload = payment_payload(payment, detail=True)
        payload['transactions'] = [{
            'id': int(item.id), 'method': item.method, 'amount': item.amount,
            'status': item.status, 'gateway_transaction_id': item.gateway_transaction_id,
            'payment_reference': item.payment_reference,
            'created_at': item.created_at,
        } for item in Transaction.objects(payment=payment).order_by('-created_at')]
        return Response(payload)


class PaymentTransactionCreateView(MyPaymentDetailView):
    @staticmethod
    def _transaction_payload(transaction, *, reused=False):
        return {
            'id': int(transaction.id), 'method': transaction.method,
            'amount': transaction.amount, 'status': transaction.status,
            'gateway_transaction_id': transaction.gateway_transaction_id,
            'payment_reference': transaction.payment_reference,
            'created_at': transaction.created_at, 'reused': reused,
        }

    @extend_schema(
        tags=['Thanh toán'], request=PaymentTransactionCreateSerializer,
        responses={201: PaymentTransactionSerializer},
    )
    def post(self, request, payment_id):
        serializer = PaymentTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        idempotency_key = request.headers.get('Idempotency-Key', '').strip() or None
        if idempotency_key and not re.fullmatch(r'[A-Za-z0-9._-]{16,128}', idempotency_key):
            return Response({
                'detail': 'Idempotency-Key phải dài 16–128 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.',
            }, status=400)
        try:
            payment = self._payment(request, payment_id)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        if payment is None:
            return Response({'detail': 'Không tìm thấy hóa đơn.'}, status=404)
        if payment.status != 'pending':
            return Response({'detail': 'Hóa đơn không còn chờ thanh toán.'}, status=409)
        if idempotency_key:
            existing = Transaction.objects(payment=payment, idempotency_key=idempotency_key).first()
            if existing is not None:
                return Response(self._transaction_payload(existing, reused=True))
        # If the first response was lost then the browser reloads, return the
        # original intent instead of creating a second payment request.
        existing = Transaction.objects(payment=payment, status='pending').order_by('-created_at').first()
        if existing is not None:
            return Response(self._transaction_payload(existing, reused=True))
        transaction = Transaction(
            payment=payment, method=serializer.validated_data['method'],
            amount=payment.total_amount, status='pending',
            gateway_transaction_id=f'EDU-{int(payment.id)}-{secrets.token_hex(6).upper()}',
            payment_reference=payment_code(payment),
            idempotency_key=idempotency_key,
        ).save()
        return Response(self._transaction_payload(transaction), status=status.HTTP_201_CREATED)


class PaymentWebhookView(APIView):
    """Provider-only endpoint that safely reconciles an incoming receipt."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'payment_webhook'

    @staticmethod
    def _signature_is_valid(request):
        secret = settings.PAYMENT_WEBHOOK_SECRET
        received = request.headers.get('X-Payment-Signature', '')
        if not secret or not received:
            return False
        expected = hmac.new(secret.encode('utf-8'), request.body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, received)

    @extend_schema(
        tags=['Thanh toán'], request=PaymentWebhookSerializer,
        responses={200: PaymentTransactionSerializer},
        description='Webhook cổng thanh toán. Bắt buộc HMAC SHA-256 ở header X-Payment-Signature.',
    )
    def post(self, request):
        if not settings.PAYMENT_WEBHOOK_SECRET:
            return Response({'detail': 'Webhook thanh toán chưa được cấu hình.'}, status=503)
        if not self._signature_is_valid(request):
            return Response({'detail': 'Chữ ký webhook không hợp lệ.'}, status=403)
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return Response({'detail': 'Webhook phải là JSON hợp lệ.'}, status=400)
        serializer = PaymentWebhookSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data['event'] != 'payment.succeeded':
            return Response({'detail': 'Sự kiện thanh toán này không được xử lý.'}, status=202)
        try:
            transaction, reconciled = reconcile_paid_receipt(
                reference=data['reference'], amount=data['amount'],
                transaction_id=data['transaction_id'], method=data['method'],
                paid_at=data.get('paid_at'), raw_payload=data,
            )
        except ReconciliationInProgress as error:
            return Response({'detail': str(error)}, status=409)
        except ReconciliationError as error:
            return Response({'detail': str(error)}, status=422)
        return Response({
            'id': int(transaction.id), 'method': transaction.method,
            'amount': transaction.amount, 'status': transaction.status,
            'gateway_transaction_id': transaction.gateway_transaction_id,
            'payment_reference': transaction.payment_reference,
            'created_at': transaction.created_at, 'reconciled': reconciled,
        })


class TutorEarningsView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Lương gia sư'],
        parameters=[OpenApiParameter('month', str, required=False, description='YYYY-MM')],
        responses={200: TutorEarningsSerializer},
    )
    def get(self, request):
        month = request.query_params.get('month') or datetime.now(timezone.utc).strftime('%Y-%m')
        try:
            return Response(tutor_earnings_payload(request.user.tutor, month))
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=400)


class TutorPayoutListView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Lương gia sư'], responses={200: TutorPayoutSerializer(many=True)})
    def get(self, request):
        payments = Payment.objects(tutor=request.user.tutor).order_by('-created_at').select_related()
        counts = reference_counts(PaymentItem, 'payment') if payments else {}
        result = []
        for payment in payments:
            result.append({
                'payment_id': int(payment.id), 'code': payment_code(payment),
                'billing_month': payment.billing_month,
                'student': reference_name(payment.student),
                'lesson_count': counts.get(payment.id, 0),
                'agreed_tuition': payment.total_amount,
                'commission_amount': payment.commission_amount,
                'payout_amount': payment.tutor_payout_amount,
                'tuition_status': payment.status,
                'payout_status': payment.tutor_payout_status,
                'paid_at': payment.tutor_paid_at,
            })
        return Response(result)
