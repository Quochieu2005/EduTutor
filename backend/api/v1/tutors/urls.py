from django.urls import path

from .views import (
    ClassApplicationCreateView, MyTutorAvailabilityView, RecruitmentJobDetailView,
    RecruitmentJobListView, TutorApplicationCreateView, TutorAvailabilityView,
    TutorChangePasswordView, TutorLoginView, TutorMeView, TutorRefreshView,
    TutorProfileView,
    PublicTutorDetailView, PublicTutorListView, TutorRequestCreateView,
)

urlpatterns = [
    path('auth/login/', TutorLoginView.as_view(), name='api-tutor-login'),
    path('auth/refresh/', TutorRefreshView.as_view(), name='api-tutor-refresh'),
    path('auth/me/', TutorMeView.as_view(), name='api-tutor-me'),
    path('auth/profile/', TutorProfileView.as_view(), name='api-tutor-profile'),
    path('auth/change-password/', TutorChangePasswordView.as_view(), name='api-tutor-change-password'),
    path('jobs/', RecruitmentJobListView.as_view(), name='api-recruitment-job-list'),
    path('jobs/<slug:slug>/', RecruitmentJobDetailView.as_view(), name='api-recruitment-job-detail'),
    path('jobs/<slug:slug>/apply/', ClassApplicationCreateView.as_view(), name='api-class-application-create'),
    path('requests/', TutorRequestCreateView.as_view(), name='api-tutor-request-create'),
    path('applications/', TutorApplicationCreateView.as_view(), name='api-tutor-application-create'),
    path('', PublicTutorListView.as_view(), name='api-public-tutor-list'),
    path('<slug:slug>/', PublicTutorDetailView.as_view(), name='api-public-tutor-detail'),
    path('me/availability/', MyTutorAvailabilityView.as_view(), name='api-my-tutor-availability'),
    path('<slug:slug>/availability/', TutorAvailabilityView.as_view(), name='api-tutor-availability'),
]
