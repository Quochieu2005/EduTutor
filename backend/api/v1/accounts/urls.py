from django.urls import path

from .views import (
    AccountProfileView, ChangePasswordView, FacebookLoginView, ForgotPasswordView, GoogleLoginView, LoginView, MeView,
    ClerkExchangeView,
    LogoutView, RefreshView, RegisterView, ResetPasswordView,
    UnifiedLoginView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api-register'),
    path('login/', LoginView.as_view(), name='api-login'),
    path('login/unified/', UnifiedLoginView.as_view(), name='api-unified-login'),
    path('clerk/exchange/', ClerkExchangeView.as_view(), name='api-clerk-exchange'),
    path('password/forgot/', ForgotPasswordView.as_view(), name='api-forgot-password'),
    path('password/reset/', ResetPasswordView.as_view(), name='api-reset-password'),
    path('password/change/', ChangePasswordView.as_view(), name='api-change-password'),
    path('google/', GoogleLoginView.as_view(), name='api-login-google'),
    path('facebook/', FacebookLoginView.as_view(), name='api-login-facebook'),
    path('refresh/', RefreshView.as_view(), name='api-refresh'),
    path('logout/', LogoutView.as_view(), name='api-logout'),
    path('me/', MeView.as_view(), name='api-me'),
    path('profile/', AccountProfileView.as_view(), name='api-account-profile'),
]
