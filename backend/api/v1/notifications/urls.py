from django.urls import path

from .views import (
    TutorNotificationInboxView, TutorNotificationReadAllView, TutorNotificationReadView,
    UserNotificationInboxView, UserNotificationReadAllView, UserNotificationReadView,
)

urlpatterns = [
    path('me/', UserNotificationInboxView.as_view(), name='api-user-notification-inbox'),
    path('me/read-all/', UserNotificationReadAllView.as_view(), name='api-user-notification-read-all'),
    path('me/<int:delivery_id>/read/', UserNotificationReadView.as_view(), name='api-user-notification-read'),
    path('tutor/me/', TutorNotificationInboxView.as_view(), name='api-tutor-notification-inbox'),
    path('tutor/me/read-all/', TutorNotificationReadAllView.as_view(), name='api-tutor-notification-read-all'),
    path('tutor/me/<int:delivery_id>/read/', TutorNotificationReadView.as_view(), name='api-tutor-notification-read'),
]
