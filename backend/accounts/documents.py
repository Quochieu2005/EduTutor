from datetime import datetime, timezone

import bcrypt
from bson.int64 import Int64
from django.contrib.auth.hashers import check_password as check_legacy_password
from django.utils.text import slugify
from mongoengine import (
    BinaryField,
    BooleanField,
    NULLIFY,
    DateTimeField,
    Document,
    EmailField,
    IntField,
    ListField,
    LongField,
    ReferenceField,
    SequenceField,
    StringField,
    URLField,
    ValidationError,
)


def _make_bcrypt_password(raw_password):
    if not raw_password:
        raise ValueError('Password must not be empty.')
    if len(raw_password.encode('utf-8')) > 72:
        raise ValueError('Password must not exceed 72 bytes for bcrypt.')
    return bcrypt.hashpw(
        raw_password.encode('utf-8'),
        bcrypt.gensalt(rounds=12),
    ).decode('utf-8')


def _check_bcrypt_password(raw_password, encoded_password):
    if not raw_password or not encoded_password:
        return False
    try:
        return bcrypt.checkpw(
            raw_password.encode('utf-8'),
            encoded_password.encode('utf-8'),
        )
    except (TypeError, ValueError):
        return False


class User(Document):
    username = StringField(required=True, unique=True, max_length=50)
    email = EmailField(required=True, unique=True)
    password_hash = StringField(required=True)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {'collection': 'users'}

    def set_password(self, raw_password):
        self.password_hash = _make_bcrypt_password(raw_password)

    def check_password(self, raw_password):
        if self.password_hash.startswith(('$2a$', '$2b$', '$2y$')):
            return _check_bcrypt_password(raw_password, self.password_hash)

        # Nâng cấp tài khoản cũ từ PBKDF2 sang bcrypt ngay khi đăng nhập đúng.
        if check_legacy_password(raw_password, self.password_hash):
            self.set_password(raw_password)
            self.save()
            return True
        return False


class AccountDocument(Document):
    """Shared fields for the separate student and parent collections."""

    meta = {'abstract': True}

    id = SequenceField(primary_key=True, value_decorator=Int64)
    slug = StringField(required=True, unique=True, max_length=180)
    name = StringField(required=True, max_length=150)
    email = EmailField(null=True, unique=True, sparse=True, max_length=254)
    password_hash = StringField(null=True, db_field='password')
    phone = StringField(max_length=20, null=True)
    avatar = StringField(max_length=1000, null=True)
    oauth_provider = StringField(choices=('local', 'google', 'facebook'), null=True)
    oauth_uid = StringField(max_length=255, null=True)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    updated_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    def save(self, *args, **kwargs):
        self.updated_at = datetime.now(timezone.utc)
        return super().save(*args, **kwargs)

    def set_password(self, raw_password):
        self.password_hash = _make_bcrypt_password(raw_password)

    def check_password(self, raw_password):
        if not self.password_hash:
            return False
        if self.password_hash.startswith(('$2a$', '$2b$', '$2y$')):
            return _check_bcrypt_password(raw_password, self.password_hash)
        if check_legacy_password(raw_password, self.password_hash):
            self.set_password(raw_password)
            self.save()
            return True
        return False


class Parent(AccountDocument):
    email = EmailField(required=True, unique=True, max_length=254)
    meta = {
        'collection': 'parents',
        'indexes': [
            {'fields': ['oauth_provider', 'oauth_uid'], 'unique': True, 'sparse': True},
            '-created_at',
        ],
    }


class Student(AccountDocument):
    parent = ReferenceField('Parent', null=True, db_field='parent_id')
    status = StringField(choices=('active', 'inactive', 'banned'), default='active', required=True)

    meta = {
        'collection': 'students',
        'indexes': [
            {'fields': ['oauth_provider', 'oauth_uid'], 'unique': True, 'sparse': True},
            'parent', 'status', '-created_at',
        ],
    }


class AuthToken(Document):
    id = SequenceField(primary_key=True, value_decorator=Int64)
    user_type = StringField(required=True, choices=('student', 'parent', 'tutor', 'admin'))
    user_id = LongField(required=True, min_value=1)
    token = StringField(required=True, unique=True, max_length=64)
    purpose = StringField(required=True, choices=('password_reset', 'access'))
    is_used = BooleanField(default=False)
    expires_at = DateTimeField(null=True)
    last_used_at = DateTimeField(null=True)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {
        'collection': 'tokens',
        'indexes': [
            'user_type', 'user_id', 'purpose',
            {'fields': ['expires_at'], 'expireAfterSeconds': 0},
        ],
    }

    def is_expired(self, now=None):
        if self.expires_at is None:
            return False
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return (now or datetime.now(timezone.utc)) >= expires_at


class Admin(Document):
    """Administrative account stored in the MongoDB ``admins`` collection."""

    ROLE_SUPER_ADMIN = 'super_admin'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = (ROLE_SUPER_ADMIN, ROLE_ADMIN)

    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES = (STATUS_ACTIVE, STATUS_INACTIVE)

    id = SequenceField(
        primary_key=True,
        sequence_name='admins.id',
        value_decorator=Int64,
    )
    name = StringField(required=True, max_length=150)
    slug = StringField(required=True, unique=True, max_length=180)
    email = EmailField(required=True, unique=True, max_length=254)
    password_hash = StringField(required=True, db_field='password')
    profile_image = BinaryField(max_bytes=2 * 1024 * 1024, null=True, default=None)
    profile_image_name = StringField(max_length=255, default='')
    profile_image_content_type = StringField(max_length=100, default='')
    # Empty is valid for existing accounts that do not have an avatar yet.
    profile_image_url = StringField(max_length=1000, default='')
    profile_image_public_id = StringField(max_length=500, default='')
    bio = StringField(default='', max_length=1000)
    urls = ListField(URLField(max_length=500), default=list)
    role = StringField(
        required=True,
        choices=ROLE_CHOICES,
        default=ROLE_ADMIN,
    )
    permissions = ListField(
        StringField(max_length=100),
        null=True,
        default=None,
    )
    managed_by = ReferenceField(
        'Admin',
        null=True,
        default=None,
        reverse_delete_rule=NULLIFY,
    )
    status = StringField(
        required=True,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    session_version = IntField(default=1, min_value=1)
    last_login = DateTimeField(null=True, default=None)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    updated_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {
        'collection': 'admins',
        'indexes': ['role', 'status', 'managed_by', '-created_at'],
    }

    def _make_unique_slug(self):
        base = slugify(self.name) or slugify(self.email.split('@', 1)[0]) or 'admin'
        candidate = base
        suffix = 2
        while True:
            query = self.__class__.objects(slug=candidate)
            if self.pk is not None:
                query = query.filter(id__ne=self.pk)
            if query.first() is None:
                return candidate
            candidate = f'{base}-{suffix}'
            suffix += 1

    def clean(self):
        self.name = self.name.strip()
        self.email = self.email.strip().lower()
        if not self.slug:
            self.slug = self._make_unique_slug()
        self.bio = self.bio.strip()
        self.urls = list(dict.fromkeys(
            url.strip() for url in self.urls if url and url.strip()
        ))

        if self.role == self.ROLE_SUPER_ADMIN:
            self.permissions = None
        elif self.permissions is not None:
            self.permissions = list(dict.fromkeys(
                permission.strip()
                for permission in self.permissions
                if permission and permission.strip()
            ))

        if self.managed_by:
            if self.pk is not None and self.managed_by.pk == self.pk:
                raise ValidationError('Admin cannot manage itself.')
            if self.managed_by.role != self.ROLE_SUPER_ADMIN:
                raise ValidationError('managed_by must reference a super_admin.')

    def save(self, *args, **kwargs):
        self.updated_at = datetime.now(timezone.utc)
        return super().save(*args, **kwargs)

    def set_password(self, raw_password):
        self.password_hash = _make_bcrypt_password(raw_password)

    def check_password(self, raw_password):
        return _check_bcrypt_password(raw_password, self.password_hash)

    def has_permission(self, permission):
        if self.status != self.STATUS_ACTIVE:
            return False
        if self.role == self.ROLE_SUPER_ADMIN:
            return True
        return permission in (self.permissions or [])

    @property
    def initials(self):
        words = [word for word in self.name.split() if word]
        return ''.join(word[0] for word in words[-2:]).upper() or 'AD'

    def to_safe_dict(self):
        return {
            'id': int(self.id) if self.id is not None else None,
            'name': self.name,
            'slug': self.slug,
            'email': self.email,
            'bio': self.bio,
            'urls': self.urls,
            'role': self.role,
            'permissions': self.permissions,
            'managed_by': int(self.managed_by.id) if self.managed_by else None,
            'status': self.status,
            'last_login': self.last_login,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
