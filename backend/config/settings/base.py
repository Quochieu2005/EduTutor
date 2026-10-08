"""Shared Django settings for every environment."""

import os
from pathlib import Path

from mongoengine import connect

try:
    from dotenv import dotenv_values, load_dotenv
except ImportError:
    load_dotenv = None
    dotenv_values = None


BASE_DIR = Path(__file__).resolve().parent.parent.parent

if load_dotenv:
    load_dotenv(BASE_DIR / '.env')

# ``load_dotenv`` intentionally does not overwrite process variables.  A blank
# variable injected by a shell or IDE must not hide the non-blank local setting.
_env_file_values = dotenv_values(BASE_DIR / '.env') if dotenv_values else {}


def _configured_value(name, default=''):
    return os.getenv(name) or _env_file_values.get(name) or default

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-local-development-key')
ALLOWED_HOSTS = [host for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if host]
RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

MONGO_URI = (
    _configured_value('MONGODB_URI')
    or _configured_value('MONGO_URI')
    or 'mongodb://localhost:27017'
)
MONGO_DB_NAME = _configured_value('MONGO_DB_NAME', 'edututor')
connect(
    db=MONGO_DB_NAME,
    host=MONGO_URI,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=15000,
    maxPoolSize=int(os.getenv('MONGO_MAX_POOL_SIZE', '100')),
    # Keep one warm Atlas socket per worker so the first request does not pay
    # the connection handshake after an idle period. Deployments can still
    # override this to 0 when MongoDB connection limits are very tight.
    minPoolSize=int(os.getenv('MONGO_MIN_POOL_SIZE', '1')),
    waitQueueTimeoutMS=int(os.getenv('MONGO_WAIT_QUEUE_TIMEOUT_MS', '5000')),
)

# Admin accounts must authenticate again after one hour by default.
ADMIN_SESSION_MAX_AGE = int(os.getenv('ADMIN_SESSION_MAX_AGE', '3600'))

CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET', '')
# Every Cloudinary upload is placed under this one root folder. Keep it as
# ``Edututor`` so Cloudinary never creates feature folders at its top level.
CLOUDINARY_ROOT_FOLDER = os.getenv('CLOUDINARY_ROOT_FOLDER', 'Edututor').strip('/') or 'Edututor'
CLOUDINARY_ENABLED = all((
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
))

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'core.apps.CoreConfig',
    'accounts',
    'lessons',
    'tutors',
    'templates.apps.TemplatesConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'accounts.middleware.AdminSessionMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates', BASE_DIR / 'templates' / 'components'],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
        'core.admin_contacts.contact_notifications',
        'core.admin_header_notifications.admin_header_notifications',
    ]},
}]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

LANGUAGE_CODE = 'vi'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Render can run more than one Gunicorn worker. When REDIS_URL is configured,
# use one shared cache for dashboard data, notifications and API throttling.
# Without it the project keeps Django's local-memory cache, so local work and
# existing deployments continue to function unchanged.
REDIS_URL = _configured_value('REDIS_URL')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                # Cache outages must never block sign-in or business actions.
                'IGNORE_EXCEPTIONS': True,
                'SOCKET_CONNECT_TIMEOUT': 2,
                'SOCKET_TIMEOUT': 2,
            },
        },
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'edututor-admin-local-cache',
        },
    }

EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv(
    'DEFAULT_FROM_EMAIL',
    EMAIL_HOST_USER or 'EduTutor <no-reply@edututor.local>',
)
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', '15'))
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000').rstrip('/')
# Only the configured website may call public APIs from another origin.
# This is not authentication; private endpoints still require their JWT.
CORS_ALLOWED_ORIGINS = [
    origin.strip().rstrip('/')
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', FRONTEND_URL).split(',')
    if origin.strip()
]
# Local Django binds to IPv4 while browsers may open the frontend with either
# hostname. Allow both development origins; production remains explicit-only.
if os.getenv('DJANGO_ENV') != 'production':
    for local_origin in ('http://localhost:3000', 'http://127.0.0.1:3000'):
        if local_origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(local_origin)
# Keep the configured production Vercel origin working even when an older
# Render service has not yet synchronized the new render.yaml env vars.
if os.getenv('DJANGO_ENV') == 'production' and 'https://edututor-xi.vercel.app' not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append('https://edututor-xi.vercel.app')
CORS_URLS_REGEX = r'^/api/v1/'
CORS_ALLOW_CREDENTIALS = False
PASSWORD_RESET_TOKEN_TTL_SECONDS = 300
PASSWORD_RESET_RESEND_SECONDS = 60
PASSWORD_RESET_EMAILS_PER_HOUR = 3

# Social login credentials are server-side only. Configure them in ``.env``
# locally and as environment variables on Render; never commit their values.
GOOGLE_OAUTH_CLIENT_ID = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')
FACEBOOK_APP_ID = os.getenv('FACEBOOK_APP_ID', '')
FACEBOOK_APP_SECRET = os.getenv('FACEBOOK_APP_SECRET', '')
API_JWT_ACCESS_TTL_MINUTES = int(os.getenv('API_JWT_ACCESS_TTL_MINUTES', '15'))
API_JWT_REFRESH_TTL_DAYS = int(os.getenv('API_JWT_REFRESH_TTL_DAYS', '30'))

# Clerk session issuer, for exchanging a verified Clerk browser session for the
# short-lived Django API JWT used by Mongo-backed endpoints.
CLERK_JWT_ISSUER = _configured_value('CLERK_JWT_ISSUER').rstrip('/')
CLERK_JWT_AUDIENCE = _configured_value('CLERK_JWT_AUDIENCE').strip()
# Required in every non-local environment before accepting payment-provider
# callbacks. A missing value means the webhook is disabled, never public.
PAYMENT_WEBHOOK_SECRET = _configured_value('PAYMENT_WEBHOOK_SECRET')
PAYMENT_RECONCILIATION_LOCK_SECONDS = int(
    _configured_value('PAYMENT_RECONCILIATION_LOCK_SECONDS', '300')
)

REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'api.exception_handlers.api_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # APIs are private by default.  Login/registration endpoints must opt in
    # explicitly with AllowAny; every other endpoint requires a valid JWT.
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Protect public auth routes from bursts without affecting normal clients.
    # The cache backend can be promoted to Redis later without changing APIs.
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '240/minute',
        'tutor_login': '10/minute',
        'tutor_application': '3/day',
        'tutor_request': '5/hour',
        # A gateway can retry a receipt, but sustained unauthenticated traffic
        # should still be bounded before reaching reconciliation code.
        'payment_webhook': '300/minute',
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'EduTutor API',
    'DESCRIPTION': (
        'Tài liệu API chính thức cho nền tảng kết nối học viên, phụ huynh, gia sư và quản trị viên. '
        'Mỗi endpoint mới có serializer và schema sẽ tự xuất hiện tại đây.'
    ),
    'VERSION': 'v1',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': False,
    },
    'TAGS': [
        {'name': 'Tài khoản', 'description': 'Đăng ký, đăng nhập và hồ sơ tài khoản.'},
        {'name': 'Gia sư', 'description': 'Hồ sơ, chuyên môn và trạng thái gia sư.'},
        {'name': 'Buổi học', 'description': 'Lịch học, xác nhận giảng dạy và tiến độ.'},
        {'name': 'Thanh toán', 'description': 'Học phí, giao dịch và đối soát tự động an toàn.'},
        {'name': 'Hóa đơn', 'description': 'Hóa đơn học phí của học viên đang đăng nhập.'},
    ],
}
