from django.urls import path

from .views import (
    StudentComplaintListCreateView, StudentReviewCreateView,
    TutorComplaintListCreateView, TutorReviewListView,
)

urlpatterns = [
    path('reviews/', StudentReviewCreateView.as_view(), name='api-review-create'),
    path('reviews/tutors/<slug:slug>/', TutorReviewListView.as_view(), name='api-tutor-review-list'),
    path('complaints/me/', StudentComplaintListCreateView.as_view(), name='api-student-complaints'),
    path('complaints/tutor/me/', TutorComplaintListCreateView.as_view(), name='api-tutor-complaints'),
]
