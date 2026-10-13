"""Cross-collection email ownership rules for authenticatable accounts."""


ACCOUNT_LABELS = {
    'user': 'người dùng',
    'student': 'học viên',
    'parent': 'phụ huynh',
    'tutor': 'gia sư',
    'admin': 'quản trị viên',
}


def normalize_email(email):
    return (email or '').strip().lower()


def email_owners(email, *, exclude_kind=None, exclude_id=None):
    """Return login identities owning an email across Mongo collections.

    A Student/Parent row sharing the email of its User is that user's profile,
    not a second login identity. Orphan profiles are still reported so a new
    account cannot silently claim an email already present in application data.
    """
    from accounts.documents import Admin, Parent, Student, User
    from tutors.documents import Tutor

    email = normalize_email(email)
    if not email:
        return []

    owners = []

    def add(kind, document):
        if document is None:
            return
        document_id = getattr(document, 'id', None)
        if exclude_kind == kind and str(document_id) == str(exclude_id):
            return
        owners.append({'kind': kind, 'id': str(document_id), 'document': document})

    user = User.objects(email=email).only(
        'email', 'username', 'display_name', 'phone', 'avatar',
        'password_hash', 'account_type', 'oauth_provider', 'token_version',
        'created_at',
    ).first()
    if user is not None:
        account_type = getattr(user, 'account_type', None)
        kind = account_type if account_type in {'student', 'parent'} else 'user'
        add(kind, user)
    else:
        # These normally mirror a User. Treat a row without User as reserved.
        add('student', Student.objects(email=email).only('id').first())
        add('parent', Parent.objects(email=email).only('id').first())

    # Login only needs the credential/status fields and the small token
    # payload. In particular, do not hydrate Admin.profile_image (which may
    # contain a multi-megabyte binary) just to check whether an email exists.
    add('tutor', Tutor.objects(email=email).only(
        'slug', 'name', 'email', 'avatar', 'status', 'password_hash',
        'token_version', 'must_change_password',
    ).first())
    add('admin', Admin.objects(email=email).only(
        'name', 'email', 'profile_image_url', 'role', 'status',
        'password_hash', 'session_version',
    ).first())
    return owners


def assert_email_available(email, *, exclude_kind=None, exclude_id=None):
    owners = email_owners(email, exclude_kind=exclude_kind, exclude_id=exclude_id)
    if not owners:
        return
    labels = ', '.join(ACCOUNT_LABELS[item['kind']] for item in owners)
    raise ValueError(f'Email này đã thuộc tài khoản {labels}.')
