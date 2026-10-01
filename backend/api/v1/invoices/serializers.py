from rest_framework import serializers


class InvoiceItemSerializer(serializers.Serializer):
    lesson_id = serializers.IntegerField()
    session_date = serializers.DateField()
    subject = serializers.CharField()
    amount = serializers.IntegerField()


class InvoiceSerializer(serializers.Serializer):
    invoice_no = serializers.CharField()
    billing_month = serializers.CharField(allow_null=True)
    issued_at = serializers.DateTimeField()
    status = serializers.CharField()
    payment_status = serializers.CharField()
    paid_at = serializers.DateTimeField(allow_null=True)
    student = serializers.CharField()
    tutor = serializers.CharField()
    payer_name = serializers.CharField()
    total_amount = serializers.IntegerField()
    lesson_count = serializers.IntegerField()
    payment_reference = serializers.CharField()
    pdf_url = serializers.CharField(allow_null=True)
    items = InvoiceItemSerializer(many=True, required=False)
