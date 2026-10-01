from django.urls import include, path
from .content import BannerListView, BlogListView, BlogDetailView, CategoryListView, ContactCreateView

urlpatterns = [
    path('banners/', BannerListView.as_view(), name='api-banner-list'),
    path('blog/', BlogListView.as_view(), name='api-blog-list'),
    path('blog/categories/', CategoryListView.as_view(), name='api-blog-categories'),
    path('blog/<slug:slug>/', BlogDetailView.as_view(), name='api-blog-detail'),
    path('contacts/', ContactCreateView.as_view(), name='api-contact-create'),
    path('accounts/', include('api.v1.accounts.urls')),
    path('feedback/', include('api.v1.feedback.urls')),
    path('geography/', include('api.v1.geography.urls')),
    path('invoices/', include('api.v1.invoices.urls')),
    path('lessons/', include('api.v1.lessons.urls')),
    path('notifications/', include('api.v1.notifications.urls')),
    path('payments/', include('api.v1.payments.urls')),
    path('subjects/', include('api.v1.subjects.urls')),
    path('tutors/', include('api.v1.tutors.urls')),
]
