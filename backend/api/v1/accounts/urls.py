from django.urls import path

from .views import (
    AccountProfileView, FacebookLoginView, ForgotPasswordView, GoogleLoginView, LoginView, MeView,
    RefreshView, RegisterView, ResetPasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api-register'),
    path('login/', LoginView.as_view(), name='api-login'),
    path('password/forgot/', ForgotPasswordView.as_view(), name='api-forgot-password'),
    path('password/reset/', ResetPasswordView.as_view(), name='api-reset-password'),
    path('google/', GoogleLoginView.as_view(), name='api-login-google'),
    path('facebook/', FacebookLoginView.as_view(), name='api-login-facebook'),
    path('refresh/', RefreshView.as_view(), name='api-refresh'),
    path('me/', MeView.as_view(), name='api-me'),
    path('profile/', AccountProfileView.as_view(), name='api-account-profile'),
]
