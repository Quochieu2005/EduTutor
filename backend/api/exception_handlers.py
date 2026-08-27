from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Keep a predictable error envelope while preserving DRF status codes."""
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {'detail': response.data, 'status_code': response.status_code}
    return response
