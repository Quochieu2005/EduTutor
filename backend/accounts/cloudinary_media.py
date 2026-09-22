"""Cloudinary storage helpers for admin-uploaded images."""

from datetime import date

from django.conf import settings


def _cloudinary_folder(*parts):
    """Build a Cloudinary path below the single project media root."""
    return '/'.join((settings.CLOUDINARY_ROOT_FOLDER, *parts))


def upload_admin_avatar(upload, slug):
    """Upload an administrator avatar and return its delivery details."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')

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
    if upload.content_type not in {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}:
        raise ValueError('Ảnh bìa phải là JPG, PNG, WEBP hoặc GIF.')
    if upload.size > 5 * 1024 * 1024:
        raise ValueError('Ảnh bìa không được vượt quá 5 MB.')

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
    if upload.content_type not in {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}:
        raise ValueError('Ảnh đại diện phải là JPG, PNG, WEBP hoặc GIF.')
    if upload.size > 5 * 1024 * 1024:
        raise ValueError('Ảnh đại diện không được vượt quá 5 MB.')

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


def upload_banner_image(upload, slug):
    """Upload a slideshow banner below Edututor/banners/<slug>/<date>."""
    if not settings.CLOUDINARY_ENABLED:
        raise ValueError('Cloudinary chưa được cấu hình. Vui lòng kiểm tra file .env.')
    if upload.content_type not in {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}:
        raise ValueError('Ảnh banner phải là JPG, PNG, WEBP hoặc GIF.')
    if upload.size > 8 * 1024 * 1024:
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
