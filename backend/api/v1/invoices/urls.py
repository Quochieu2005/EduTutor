from django.urls import path

from .views import MyInvoiceDetailView, MyInvoiceListView

urlpatterns = [
    path('me/', MyInvoiceListView.as_view(), name='api-my-invoices'),
    path('me/<str:invoice_no>/', MyInvoiceDetailView.as_view(), name='api-my-invoice-detail'),
]
