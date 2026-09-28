from django.urls import path

from .views import ProvinceAreaDetailView, ProvinceListView, ProvinceWardListView, WardAreaDetailView

urlpatterns = [
    path('provinces/', ProvinceListView.as_view(), name='api-province-list'),
    path('provinces/<slug:province_slug>/wards/', ProvinceWardListView.as_view(), name='api-province-wards'),
    path('areas/<slug:province_slug>/', ProvinceAreaDetailView.as_view(), name='api-province-area-detail'),
    path('areas/<slug:province_slug>/<slug:ward_slug>/', WardAreaDetailView.as_view(), name='api-ward-area-detail'),
]
