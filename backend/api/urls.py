"""Điểm khai báo tập trung cho toàn bộ API và tài liệu API của EduTutor.

Mọi URL trong file này được gắn dưới tiền tố ``/api/`` tại config/urls.py.
API nghiệp vụ phiên bản 1 được chia tiếp theo từng nhóm trong api/v1/urls.py.
"""
from django.conf import settings
from django.http import HttpResponseNotFound
from django.views.decorators.cache import never_cache
from functools import wraps
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from accounts.documents import Admin
from accounts.session import admin_session_is_valid


def _active_admin_for_docs(request):
    """Chỉ cho admin đang hoạt động xem tài liệu API trên production."""
    admin_id = request.session.get('admin_id')
    if admin_id is None or not admin_session_is_valid(request.session):
        return None
    admin = Admin.objects(id=admin_id, status=Admin.STATUS_ACTIVE).first()
    if admin is None or request.session.get('admin_session_version') != admin.session_version:
        return None
    return admin


def private_api_docs(view):
    """Swagger được mở ở local và được bảo vệ bằng phiên admin trên production."""
    @wraps(view)
    @never_cache
    def wrapped(request, *args, **kwargs):
        if not settings.DEBUG and _active_admin_for_docs(request) is None:
            return HttpResponseNotFound('Không tìm thấy trang này.')
        return view(request, *args, **kwargs)
    return wrapped


urlpatterns = [
    # Tài liệu API (URL đầy đủ: /api/docs/).
    path('docs/schema/', private_api_docs(SpectacularAPIView.as_view()), name='api-schema'),
    path(
        'docs/',
        private_api_docs(SpectacularSwaggerView.as_view(url_name='api-schema')),
        name='api-docs',
    ),

    # Toàn bộ API nghiệp vụ (URL đầy đủ bắt đầu bằng /api/v1/).
    path('v1/', include('api.v1.urls')),
]
