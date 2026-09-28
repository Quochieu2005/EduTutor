from rest_framework.views import exception_handler
from rest_framework.response import Response
from pymongo.errors import ConnectionFailure, ExecutionTimeout
import logging

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    """Keep a predictable error envelope while preserving DRF status codes."""
    response = exception_handler(exc, context)
    if response is None and isinstance(exc, (ConnectionFailure, ExecutionTimeout)):
        logger.error('API database unavailable (%s)', type(exc).__name__)
        response = Response({'detail': 'Dịch vụ dữ liệu đang bận. Vui lòng thử lại sau ít phút.'},
                            status=503, headers={'Retry-After': '5'})
    if response is not None:
        response.data = {'detail': response.data, 'status_code': response.status_code}
    return response
