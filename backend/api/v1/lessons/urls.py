from django.urls import path

from .views import LearningRequestListCreateView, LearningRequestStatusView, ScheduleProposalView

urlpatterns = [
    path('', LearningRequestListCreateView.as_view(), name='api-learning-request-list-create'),
    path('<int:request_id>/', LearningRequestStatusView.as_view(), name='api-learning-request-status'),
    path('<int:request_id>/proposal/', ScheduleProposalView.as_view(), name='api-learning-request-proposal'),
]
