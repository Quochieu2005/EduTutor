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
    administrator_avatar,
    administrator_create,
    administrator_delete,
    administrator_edit,
    appearance_settings,
    chats,
    dashboard,
    display_settings,
    forgot_password,
    management_page,
    security_settings,
    otp,
    page_not_found,
    profile,
    reset_password,
    sign_in,
    sign_out,
    students,
    users,
)

handler404 = page_not_found

urlpatterns = [
    path('', RedirectView.as_view(pattern_name='login', permanent=False)),
    path('api/', include('api.urls')),
    path('admin/dashboard', dashboard, name='dashboard'),
    path('admin/dashboard/', dashboard, name='dashboard-slash'),
    path('admin/chats/', chats, name='chats'),
    path('admin/students/', students, name='students'),
    path('admin/users/', users, name='users'),
    path('admin/management/administrators/create/', administrator_create, name='administrator-create'),
    path('admin/management/administrators/<slug:slug>/edit/', administrator_edit, name='administrator-edit'),
    path('admin/management/administrators/<slug:slug>/delete/', administrator_delete, name='administrator-delete'),
    path('admin/management/administrators/<slug:slug>/avatar/', administrator_avatar, name='administrator-avatar'),
    path('admin/management/<slug:module>/', management_page, name='management-page'),
    path('admin/profile/', profile, name='profile'),
    path('admin/setting/account/', account_settings, name='account-settings'),
    path('admin/setting/appearance/', appearance_settings, name='appearance-settings'),
    path('admin/setting/security/', security_settings, name='security-settings'),
    path(
        'admin/setting/notifications/',
        RedirectView.as_view(pattern_name='security-settings', permanent=False),
        name='notification-settings',
    ),
    path('admin/setting/display/', display_settings, name='display-settings'),
    path('admin/sign-in', sign_in, name='sign-in'),
    path('admin/login', sign_in, name='login'),
    path('admin/logout', sign_out, name='logout'),
    path('admin/forgot-password', forgot_password, name='forgot-password'),
    path('admin/otp', otp, name='otp'),
    path('admin/reset-password', reset_password, name='reset-password'),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()

urlpatterns += [path('<path:unmatched_path>', page_not_found)]
