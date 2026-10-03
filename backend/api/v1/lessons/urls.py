from django.urls import path

from .views import LessonAttendanceView, LessonSessionListView, LearningRequestListCreateView, LearningRequestStatusView, ScheduleProposalView, TutorInvitationCreateView

urlpatterns = [
    path('', LearningRequestListCreateView.as_view(), name='api-learning-request-list-create'),
    path('invite/<slug:tutor_slug>/', TutorInvitationCreateView.as_view(), name='api-tutor-invitation-create'),
    path('sessions/', LessonSessionListView.as_view(), name='api-lesson-session-list'),
    path('sessions/<int:lesson_id>/attendance/', LessonAttendanceView.as_view(), name='api-lesson-attendance'),
    path('<int:request_id>/', LearningRequestStatusView.as_view(), name='api-learning-request-status'),
    path('<int:request_id>/proposal/', ScheduleProposalView.as_view(), name='api-learning-request-proposal'),
]
