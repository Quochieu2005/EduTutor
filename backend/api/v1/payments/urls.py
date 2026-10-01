from django.urls import path

from .views import (
    MyPaymentDetailView, MyPaymentListView, PaymentTransactionCreateView, PaymentWebhookView,
    TutorEarningsView, TutorPayoutListView,
)

urlpatterns = [
    path('me/', MyPaymentListView.as_view(), name='api-my-payments'),
    path('me/<int:payment_id>/', MyPaymentDetailView.as_view(), name='api-my-payment-detail'),
    path('me/<int:payment_id>/pay/', PaymentTransactionCreateView.as_view(), name='api-payment-start'),
    path('webhooks/receipt/', PaymentWebhookView.as_view(), name='api-payment-webhook'),
    path('tutor/earnings/', TutorEarningsView.as_view(), name='api-tutor-earnings'),
    path('tutor/payouts/', TutorPayoutListView.as_view(), name='api-tutor-payouts'),
]
