import re

from rest_framework.views import exception_handler
from rest_framework.response import Response
from pymongo.errors import ConnectionFailure, ExecutionTimeout
import logging

logger = logging.getLogger(__name__)


_DEFAULT_ERROR_MESSAGES = {
    'This field is required.': 'Trường này là bắt buộc.',
    'This field may not be blank.': 'Trường này không được để trống.',
    'This field may not be null.': 'Trường này không được để trống.',
    'Enter a valid email address.': 'Vui lòng nhập địa chỉ email hợp lệ.',
    'Enter a valid URL.': 'Vui lòng nhập đường liên kết hợp lệ.',
    'A valid integer is required.': 'Vui lòng nhập một số nguyên hợp lệ.',
    'A valid number is required.': 'Vui lòng nhập một số hợp lệ.',
    'A valid boolean is required.': 'Vui lòng nhập giá trị đúng hoặc sai hợp lệ.',
    'Not a valid choice.': 'Giá trị lựa chọn không hợp lệ.',
    'Invalid token.': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
    'Authentication credentials were not provided.': 'Vui lòng đăng nhập để thực hiện thao tác này.',
    'You do not have permission to perform this action.': 'Bạn không có quyền thực hiện thao tác này.',
    'Not found.': 'Không tìm thấy dữ liệu yêu cầu.',
    'JSON parse error - Expecting value: line 1 column 1 (char 0)': 'Dữ liệu gửi lên không đúng định dạng JSON.',
}


def _translate_error(value):
    """Translate DRF's generic English validation text without touching custom messages."""
    if isinstance(value, dict):
        return {key: _translate_error(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_translate_error(item) for item in value]
    if not isinstance(value, str):
        return value
    if value in _DEFAULT_ERROR_MESSAGES:
        return _DEFAULT_ERROR_MESSAGES[value]
    if value.startswith('JSON parse error'):
        return 'Dữ liệu gửi lên không đúng định dạng JSON.'
    patterns = (
        (r'^Ensure this value has at least (\d+) characters?\.$', r'Giá trị phải có ít nhất \1 ký tự.'),
        (r'^Ensure this value has at most (\d+) characters?\.$', r'Giá trị không được vượt quá \1 ký tự.'),
        (r'^Ensure this field has no more than (\d+) characters?\.$', r'Trường này không được vượt quá \1 ký tự.'),
        (r'^Ensure this value is greater than or equal to (.+)\.$', r'Giá trị phải lớn hơn hoặc bằng \1.'),
        (r'^Ensure this value is less than or equal to (.+)\.$', r'Giá trị phải nhỏ hơn hoặc bằng \1.'),
        (r'^Date has wrong format\..*$', 'Ngày không đúng định dạng. Vui lòng dùng YYYY-MM-DD.'),
        (r'^Datetime has wrong format\..*$', 'Thời gian không đúng định dạng. Vui lòng dùng định dạng hợp lệ.'),
        (r'^Time has wrong format\..*$', 'Giờ không đúng định dạng. Vui lòng dùng HH:MM.'),
    )
    for pattern, replacement in patterns:
        if re.match(pattern, value):
            return re.sub(pattern, replacement, value)
    return value


def api_exception_handler(exc, context):
    """Keep a predictable error envelope while preserving DRF status codes."""
    response = exception_handler(exc, context)
    if response is None and isinstance(exc, (ConnectionFailure, ExecutionTimeout)):
        logger.error('API database unavailable (%s)', type(exc).__name__)
        response = Response({'detail': 'Dịch vụ dữ liệu đang bận. Vui lòng thử lại sau ít phút.'},
                            status=503, headers={'Retry-After': '5'})
    if response is not None:
        response.data = {
            'detail': _translate_error(response.data),
            'status_code': response.status_code,
        }
    return response
