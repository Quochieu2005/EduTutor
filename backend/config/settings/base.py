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
connect(db=MONGO_DB_NAME, host=MONGO_URI, serverSelectionTimeoutMS=5000)

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
    'core.apps.CoreConfig',
    'accounts',
    'lessons',
    'tutors',
    'templates.apps.TemplatesConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
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

REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'api.exception_handlers.api_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
}
