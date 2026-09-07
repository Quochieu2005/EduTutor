from urllib.parse import urlencode

from django.shortcuts import redirect

from .documents import Admin


PUBLIC_ADMIN_PATHS = {
    '/admin/login',
    '/admin/sign-in',
    '/admin/forgot-password',
    '/admin/otp',
    '/admin/reset-password',
}


class AdminSessionMiddleware:
    """Require an active MongoDB admin session for the admin interface."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.admin_account = None

        if request.path.startswith('/admin/') and request.path not in PUBLIC_ADMIN_PATHS:
            admin_id = request.session.get('admin_id')
            if admin_id is not None:
                request.admin_account = Admin.objects(
                    id=admin_id,
                    status=Admin.STATUS_ACTIVE,
                ).first()
                if (
                    request.admin_account is not None
                    and request.session.get('admin_session_version')
                    != request.admin_account.session_version
                ):
                    request.admin_account = None

            if request.admin_account is None:
                request.session.pop('admin_id', None)
                request.session.pop('admin_session_version', None)
                query = urlencode({'next': request.get_full_path()})
                return redirect(f'/admin/login?{query}')

        return self.get_response(request)
