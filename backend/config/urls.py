"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic import RedirectView
from django.urls import include, path

from templates.views import (
    account_settings,
    appearance_settings,
    dashboard,
    display_settings,
    forgot_password,
    notification_settings,
    otp,
    page_not_found,
    profile,
    sign_in,
    users,
)

handler404 = page_not_found

urlpatterns = [
    path('', RedirectView.as_view(pattern_name='login', permanent=False)),
    path('api/', include('api.urls')),
    path('admin/dashboard', dashboard, name='dashboard'),
    path('admin/dashboard/', dashboard, name='dashboard-slash'),
    path('admin/users/', users, name='users'),
    path('admin/profile/', profile, name='profile'),
    path('admin/setting/account/', account_settings, name='account-settings'),
    path('admin/setting/appearance/', appearance_settings, name='appearance-settings'),
    path('admin/setting/notifications/', notification_settings, name='notification-settings'),
    path('admin/setting/display/', display_settings, name='display-settings'),
    path('admin/sign-in', sign_in, name='sign-in'),
    path('admin/login', sign_in, name='login'),
    path('admin/forgot-password', forgot_password, name='forgot-password'),
    path('admin/otp', otp, name='otp'),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()

urlpatterns += [path('<path:unmatched_path>', page_not_found)]
