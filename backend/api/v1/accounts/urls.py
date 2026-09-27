from django.urls import path

from .views import FacebookLoginView, GoogleLoginView, LoginView, MeView, RefreshView, RegisterView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api-register'),
    path('login/', LoginView.as_view(), name='api-login'),
    path('google/', GoogleLoginView.as_view(), name='api-login-google'),
    path('facebook/', FacebookLoginView.as_view(), name='api-login-facebook'),
    path('refresh/', RefreshView.as_view(), name='api-refresh'),
    path('me/', MeView.as_view(), name='api-me'),
]
