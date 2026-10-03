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
    mark_admin_notifications_read,
    review_complaint_update,
    notification_create,
    notification_delete,
    notification_edit,
    otp,
    security_settings,
    page_not_found,
    profile,
    reset_password_with_token,
    sign_in,
    sign_out,
    students,
    student_delete,
    student_edit,
    student_toggle_status,
    tutor_job_create,
    tutor_job_delete,
    tutor_job_edit,
    tutor_job_toggle_status,
    tutor_request_create,
    tutor_request_delete,
    tutor_request_edit,
    tutor_create,
    tutor_extract_cv,
    tutor_edit,
    tutor_delete,
    tutor_toggle_status,
    tutor_send_credentials,
    subject_create,
    subject_delete,
    subject_edit,
    subject_toggle_status,
    schedule_create,
    schedule_edit,
    schedule_delete,
    payment_generate,
    payment_mark_paid,
    payment_mark_tutor_paid,

    users,
)
from core.admin_contacts import contact_delete
from core.admin_tutor_subject_changes import tutor_subject_change_requests, tutor_subject_change_review

handler404 = page_not_found

urlpatterns = [
    path('', RedirectView.as_view(pattern_name='login', permanent=False)),
    # Tất cả API và Swagger được quản lý riêng trong api/urls.py.
    path('api/', include('api.urls')),
    path('admin/dashboard', dashboard, name='dashboard'),
    path('admin/dashboard/', dashboard, name='dashboard-slash'),
    path('admin/chats/', chats, name='chats'),
    path('admin/notifications/mark-read/', mark_admin_notifications_read, name='admin-notifications-mark-read'),
    path('admin/management/reviews-complaints/<str:record_key>/update/', review_complaint_update, name='review-complaint-update'),
    path('admin/students/', students, name='students'),
    path('admin/students/<slug:slug>/edit/', student_edit, name='student-edit'),
    path('admin/students/<slug:slug>/delete/', student_delete, name='student-delete'),
    path('admin/students/<slug:slug>/toggle-status/', student_toggle_status, name='student-toggle-status'),
    path('admin/users/', users, name='users'),
    path('admin/management/contacts/<int:contact_id>/delete/', contact_delete, name='contact-delete'),
    path('admin/management/tutor-subject-requests/', tutor_subject_change_requests, name='admin-tutor-subject-changes'),
    path('admin/management/tutor-subject-requests/<int:change_id>/review/', tutor_subject_change_review, name='admin-tutor-subject-change-review'),
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
    path('admin/management/notifications/create/', notification_create, name='notification-create'),
    path('admin/management/notifications/<int:notification_id>/edit/', notification_edit, name='notification-edit'),
    path('admin/management/notifications/<int:notification_id>/delete/', notification_delete, name='notification-delete'),
    path('admin/management/subjects/create/', subject_create, name='subject-create'),
    path('admin/management/subjects/<slug:slug>/edit/', subject_edit, name='subject-edit'),
    path('admin/management/subjects/<slug:slug>/delete/', subject_delete, name='subject-delete'),
    path('admin/management/subjects/<slug:slug>/toggle-status/', subject_toggle_status, name='subject-toggle-status'),
    path('admin/management/schedules/create/', schedule_create, name='schedule-create'),
    path('admin/management/schedules/<int:lesson_id>/edit/', schedule_edit, name='schedule-edit'),
    path('admin/management/schedules/<int:lesson_id>/delete/', schedule_delete, name='schedule-delete'),
    path('admin/management/payments/generate/', payment_generate, name='payment-generate'),
    path('admin/management/payments/<int:payment_id>/mark-paid/', payment_mark_paid, name='payment-mark-paid'),
    path('admin/management/payments/<int:payment_id>/mark-tutor-paid/', payment_mark_tutor_paid, name='payment-mark-tutor-paid'),
    path('admin/management/tutor-jobs/create/', tutor_job_create, name='tutor-job-create'),
    path('admin/management/tutor-jobs/<slug:slug>/edit/', tutor_job_edit, name='tutor-job-edit'),
    path('admin/management/tutor-jobs/<slug:slug>/delete/', tutor_job_delete, name='tutor-job-delete'),
    path('admin/management/tutor-jobs/<slug:slug>/toggle-status/', tutor_job_toggle_status, name='tutor-job-toggle-status'),
    path('admin/management/tutor-requests/create/', tutor_request_create, name='tutor-request-create'),
    path('admin/management/tutor-requests/<int:request_id>/edit/', tutor_request_edit, name='tutor-request-edit'),
    path('admin/management/tutor-requests/<int:request_id>/delete/', tutor_request_delete, name='tutor-request-delete'),
    path('admin/management/tutors/extract-cv/', tutor_extract_cv, name='tutor-extract-cv'),
    path('admin/management/tutors/create/', tutor_create, name='tutor-create'),
    path('admin/management/tutors/<slug:slug>/edit/', tutor_edit, name='tutor-edit'),
    path('admin/management/tutors/<slug:slug>/delete/', tutor_delete, name='tutor-delete'),
    path('admin/management/tutors/<slug:slug>/toggle-status/', tutor_toggle_status, name='tutor-toggle-status'),
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
