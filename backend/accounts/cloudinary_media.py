"""Cloudinary storage helpers for admin-uploaded images."""

from datetime import date
from uuid import uuid4

from django.conf import settings


def _cloudinary_folder(*parts):
    """Build a Cloudinary path below the single project media root."""
    return '/'.join((settings.CLOUDINARY_ROOT_FOLDER, *parts))


_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}


def _validate_image_upload(upload, label='Ảnh'):
    """Reject oversized or non-image uploads before sending bytes to Cloudinary."""
    if upload is None or getattr(upload, 'content_type', '') not in _IMAGE_TYPES:
        raise ValueError(f'{label} phải là JPG, PNG, WEBP hoặc GIF.')
    if getattr(upload, 'size', 0) > 5 * 1024 * 1024:
        raise ValueError(f'{label} không được vượt quá 5 MB.')


def upload_admin_avatar(upload, slug):
    """Upload an administrator avatar and return its delivery details."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')
    _validate_image_upload(upload, 'Ảnh đại diện')

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    image_name = f'{slug}-{date.today().isoformat()}'
    try:
        return cloudinary.uploader.upload(
            upload,
            folder=_cloudinary_folder('admin'),
            public_id=image_name,
            overwrite=True,
            resource_type='image',
        )
    except Exception as exc:
        raise ValueError(
            'Cloudinary không cho phép tải ảnh. Hãy kiểm tra API key/secret có quyền Upload/Create assets.'
        ) from exc


def upload_blog_thumbnail(upload, slug):
    """Upload a blog cover below Edututor/blog/<slug>/<year>/<month>/<day>."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')
    _validate_image_upload(upload, 'Ảnh bìa')

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    today = date.today()
    folder = _cloudinary_folder('blog', slug, str(today.year), f'{today.month:02d}', f'{today.day:02d}')
    try:
        return cloudinary.uploader.upload(
            upload,
            folder=folder,
            resource_type='image',
            use_filename=True,
            unique_filename=True,
        )
    except Exception as exc:
        raise ValueError('Không thể tải ảnh bìa lên Cloudinary. Vui lòng thử lại.') from exc


def upload_tutor_avatar(upload, slug):
    """Upload a tutor portrait below Edututor/tutors/<slug>/<year>/<month>/<day>."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')
    _validate_image_upload(upload, 'Ảnh đại diện')

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    today = date.today()
    try:
        return cloudinary.uploader.upload(
            upload,
            folder=_cloudinary_folder('tutors', slug, str(today.year), f'{today.month:02d}', f'{today.day:02d}'),
            resource_type='image',
            use_filename=True,
            unique_filename=True,
        )
    except Exception as exc:
        raise ValueError('Không thể tải ảnh đại diện lên Cloudinary. Vui lòng thử lại.') from exc


def upload_user_avatar(upload, slug):
    """Upload a website account portrait below Edututor/users/<slug>/<date>."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')
    _validate_image_upload(upload, 'Ảnh đại diện')

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    today = date.today()
    try:
        return cloudinary.uploader.upload(
            upload,
            folder=_cloudinary_folder('users', slug, str(today.year), f'{today.month:02d}', f'{today.day:02d}'),
            resource_type='image', use_filename=True, unique_filename=True,
        )
    except Exception as exc:
        raise ValueError('Không thể tải ảnh đại diện lên Cloudinary. Vui lòng thử lại.') from exc


def upload_tutor_application_document(upload, applicant_slug, document_type):
    """Upload a validated recruitment document below the project root."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')
    allowed_types = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png', 'image/webp',
    }
    if upload.content_type not in allowed_types:
        raise ValueError('Tài liệu phải là PDF, DOCX, JPG, PNG hoặc WEBP.')
    if upload.size > 5 * 1024 * 1024:
        raise ValueError('Mỗi tài liệu không được vượt quá 5 MB.')

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    today = date.today()
    try:
        return cloudinary.uploader.upload(
            upload,
            folder=_cloudinary_folder(
                'tutor-applications', applicant_slug, str(today.year),
                f'{today.month:02d}', f'{today.day:02d}',
            ),
            public_id=f'{document_type}-{uuid4().hex}',
            resource_type='auto',
            overwrite=False,
            unique_filename=True,
            timeout=10,
        )
    except Exception as exc:
        raise ValueError('Không thể tải tài liệu ứng tuyển lên Cloudinary.') from exc


def upload_banner_image(upload, slug):
    """Upload a slideshow banner below Edututor/banners/<slug>/<date>."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')
    if upload is None or getattr(upload, 'content_type', '') not in _IMAGE_TYPES:
        raise ValueError('Ảnh banner phải là JPG, PNG, WEBP hoặc GIF.')
    if getattr(upload, 'size', 0) > 8 * 1024 * 1024:
        raise ValueError('Ảnh banner không được vượt quá 8 MB.')

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    today = date.today()
    try:
        return cloudinary.uploader.upload(
            upload,
            folder=_cloudinary_folder('banners', slug, str(today.year), f'{today.month:02d}', f'{today.day:02d}'),
            resource_type='image',
            use_filename=True,
            unique_filename=True,
        )
    except Exception as exc:
        raise ValueError('Không thể tải ảnh banner lên Cloudinary. Vui lòng thử lại.') from exc


def delete_asset(public_id):
    """Delete a previously stored image. Missing assets are harmless."""
    if not public_id or not settings.CLOUDINARY_ENABLED:
        return

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    try:
        cloudinary.uploader.destroy(public_id, resource_type='image', invalidate=True)
    except Exception:
        # A failed cleanup must not prevent saving the administrator record.
        return
