from django.urls import include, path

urlpatterns = [
    path('accounts/', include('api.v1.accounts.urls')),
    path('lessons/', include('api.v1.lessons.urls')),
    path('tutors/', include('api.v1.tutors.urls')),
]
