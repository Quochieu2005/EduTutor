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
    administrator_toggle_status,
    appearance_settings,
    banner_create,
    banner_delete,
    banner_edit,
    banner_toggle_status,
    blog_category_create,
    blog_category_delete,
    blog_category_edit,
    blog_category_toggle_status,
    blog_post_create,
    blog_post_delete,
    blog_post_edit,
    blog_post_toggle_status,
    chats,
    dashboard,
    display_settings,
    request_password_reset,
    management_page,
    otp,
    security_settings,
    page_not_found,
    profile,
    reset_password_with_token,
    sign_in,
    sign_out,
    students,
    tutor_job_create,
    tutor_job_delete,
    tutor_job_edit,
    tutor_job_toggle_status,
    tutor_create,
    tutor_extract_cv,
    tutor_edit,
    tutor_delete,
    tutor_send_credentials,

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
    path('admin/management/administrators/<slug:slug>/toggle-status/', administrator_toggle_status, name='administrator-toggle-status'),
    path('admin/management/administrators/<slug:slug>/avatar/', administrator_avatar, name='administrator-avatar'),
    path('admin/management/blog/create/', blog_post_create, name='blog-post-create'),
    path('admin/management/blog/categories/create/', blog_category_create, name='blog-category-create'),
    path('admin/management/blog/categories/<slug:slug>/edit/', blog_category_edit, name='blog-category-edit'),
    path('admin/management/blog/categories/<slug:slug>/delete/', blog_category_delete, name='blog-category-delete'),
    path('admin/management/blog/categories/<slug:slug>/toggle-status/', blog_category_toggle_status, name='blog-category-toggle-status'),
    path('admin/management/blog/<slug:slug>/edit/', blog_post_edit, name='blog-post-edit'),
    path('admin/management/blog/<slug:slug>/delete/', blog_post_delete, name='blog-post-delete'),
    path('admin/management/blog/<slug:slug>/toggle-status/', blog_post_toggle_status, name='blog-post-toggle-status'),
    path('admin/management/slides/create/', banner_create, name='banner-create'),
    path('admin/management/slides/<int:banner_id>/edit/', banner_edit, name='banner-edit'),
    path('admin/management/slides/<int:banner_id>/delete/', banner_delete, name='banner-delete'),
    path('admin/management/slides/<int:banner_id>/toggle-status/', banner_toggle_status, name='banner-toggle-status'),
    path('admin/management/tutor-jobs/create/', tutor_job_create, name='tutor-job-create'),
    path('admin/management/tutor-jobs/<slug:slug>/edit/', tutor_job_edit, name='tutor-job-edit'),
    path('admin/management/tutor-jobs/<slug:slug>/delete/', tutor_job_delete, name='tutor-job-delete'),
    path('admin/management/tutor-jobs/<slug:slug>/toggle-status/', tutor_job_toggle_status, name='tutor-job-toggle-status'),
    path('admin/management/tutors/extract-cv/', tutor_extract_cv, name='tutor-extract-cv'),
    path('admin/management/tutors/create/', tutor_create, name='tutor-create'),
    path('admin/management/tutors/<slug:slug>/edit/', tutor_edit, name='tutor-edit'),
    path('admin/management/tutors/<slug:slug>/delete/', tutor_delete, name='tutor-delete'),
    path('admin/management/tutors/send-credentials/', tutor_send_credentials, name='tutor-send-credentials'),
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
    path('admin/forgot-password', request_password_reset, name='forgot-password'),
    path('admin/otp', otp, name='otp'),
    path('admin/reset-password', reset_password_with_token, name='reset-password'),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()

urlpatterns += [path('<path:unmatched_path>', page_not_found)]
