from rest_framework import serializers


class PaymentTransactionCreateSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay'))


class PaymentTransactionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    method = serializers.CharField()
    amount = serializers.IntegerField()
    status = serializers.CharField()
    gateway_transaction_id = serializers.CharField(allow_null=True)
    payment_reference = serializers.CharField(allow_null=True, required=False)
    created_at = serializers.DateTimeField()
    reused = serializers.BooleanField(required=False)


class PaymentItemSerializer(serializers.Serializer):
    lesson_id = serializers.IntegerField()
    session_date = serializers.DateField()
    subject = serializers.CharField()
    amount = serializers.IntegerField()


class PaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    billing_month = serializers.CharField(allow_null=True)
    student = serializers.CharField()
    tutor = serializers.CharField()
    lesson_count = serializers.IntegerField()
    total_amount = serializers.IntegerField()
    status = serializers.CharField()
    paid_at = serializers.DateTimeField(allow_null=True)
    items = PaymentItemSerializer(many=True, required=False)
    transactions = PaymentTransactionSerializer(many=True, required=False)


class TutorEarningsSerializer(serializers.Serializer):
    billing_month = serializers.CharField()
    class_count = serializers.IntegerField()
    student_count = serializers.IntegerField()
    completed_lesson_count = serializers.IntegerField()
    agreed_tuition = serializers.IntegerField()
    commission_amount = serializers.IntegerField()
    payable_salary = serializers.IntegerField()
    paid_salary = serializers.IntegerField()
    pending_salary = serializers.IntegerField()


class TutorPayoutSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField()
    code = serializers.CharField()
    billing_month = serializers.CharField(allow_null=True)
    student = serializers.CharField()
    lesson_count = serializers.IntegerField()
    agreed_tuition = serializers.IntegerField()
    commission_amount = serializers.IntegerField()
    payout_amount = serializers.IntegerField()
    tuition_status = serializers.CharField()
    payout_status = serializers.CharField()
    paid_at = serializers.DateTimeField(allow_null=True)


class PaymentWebhookSerializer(serializers.Serializer):
    """Normalized payload accepted from a payment-gateway adapter."""

    event = serializers.CharField(max_length=80, required=False, default='payment.succeeded')
    transaction_id = serializers.CharField(max_length=255)
    reference = serializers.CharField(max_length=80)
    amount = serializers.IntegerField(min_value=1)
    method = serializers.ChoiceField(
        choices=('bank_transfer', 'momo', 'zalopay', 'vnpay'),
        required=False,
        default='bank_transfer',
    )
    paid_at = serializers.DateTimeField(required=False)
