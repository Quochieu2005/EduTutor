from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.accounts.authentication import MongoJWTAuthentication
from api.v1.payments.services import PaymentApiError, student_for_user
from core.documents import Invoice

from .serializers import InvoiceSerializer
from .services import invoice_payload, invoices_for_student


class MyInvoiceListView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Hóa đơn'], responses={200: InvoiceSerializer(many=True)})
    def get(self, request):
        try:
            student = student_for_user(request.user.user)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        invoices, counts = invoices_for_student(student)
        return Response([
            invoice_payload(invoice, lesson_count=counts.get(invoice.payment.id, 0) if invoice.payment else 0)
            for invoice in invoices
        ])


class MyInvoiceDetailView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Hóa đơn'], responses={200: InvoiceSerializer})
    def get(self, request, invoice_no):
        try:
            student = student_for_user(request.user.user)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        invoice = Invoice.objects(invoice_no=invoice_no.upper(), student=student).first()
        if invoice is None:
            return Response({'detail': 'Không tìm thấy hóa đơn.'}, status=404)
        return Response(invoice_payload(invoice, detail=True))
