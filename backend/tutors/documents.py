"""MongoEngine documents for tutor profiles, catalogues and recruitment."""

from datetime import datetime, timezone

from bson.int64 import Int64
from mongoengine import (
    BooleanField, DateTimeField, DecimalField, Document, EmailField, IntField, LongField,
    ReferenceField, SequenceField, StringField, URLField,
)

from accounts.passwords import (
    check_bcrypt_password, check_previous_password_format, is_bcrypt_password,
    make_bcrypt_password,
)


class BigIntDocument(Document):
    """MongoDB document with a collection-local signed 64-bit primary key."""

    meta = {'abstract': True}
    id = SequenceField(primary_key=True, value_decorator=Int64)


class TimestampedDocument(BigIntDocument):
    meta = {'abstract': True}

    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    updated_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    def save(self, *args, **kwargs):
        self.updated_at = datetime.now(timezone.utc)
        return super().save(*args, **kwargs)


class Subject(BigIntDocument):
    slug = StringField(required=True, unique=True, max_length=180)
    name = StringField(required=True, max_length=150)
    category = StringField(max_length=150, null=True)
    level = StringField(max_length=250, null=True)
    # 1 = active, 0 = inactive. Existing records without this field stay active.
    status = IntField(required=True, choices=(0, 1), default=1)
    meta = {'collection': 'subjects', 'indexes': ['category', 'name', 'status']}


class Province(BigIntDocument):
    slug = StringField(required=True, unique=True, max_length=180)
    name = StringField(required=True, max_length=150)
    code = StringField(max_length=10, null=True)
    meta = {'collection': 'provinces', 'indexes': ['code', 'name']}


class District(BigIntDocument):
    """Legacy cấp huyện collection, kept only to read existing records."""
    slug = StringField(required=True, unique=True, max_length=180)
    province = ReferenceField(Province, required=True, db_field='province_id')
    name = StringField(required=True, max_length=150)
    meta = {'collection': 'districts', 'indexes': ['province', 'name']}


class Ward(BigIntDocument):
    """Đơn vị hành chính cấp xã after the 2025 two-tier reform."""

    TYPE_WARD = 'ward'
    TYPE_COMMUNE = 'commune'
    TYPE_SPECIAL_ZONE = 'special_zone'
    TYPE_CHOICES = (TYPE_WARD, TYPE_COMMUNE, TYPE_SPECIAL_ZONE)

    slug = StringField(required=True, unique=True, max_length=180)
    code = StringField(required=True, unique=True, max_length=10)
    province = ReferenceField(Province, required=True, db_field='province_id')
    name = StringField(required=True, max_length=150)
    type = StringField(required=True, choices=TYPE_CHOICES, default=TYPE_COMMUNE)
    meta = {
        'collection': 'wards',
        'indexes': ['province', 'type', {'fields': ['province', 'name'], 'unique': True}],
    }


class Tutor(TimestampedDocument):
    """A tutor account created by an administrator or an approved recruitment flow."""

    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES = (STATUS_ACTIVE, STATUS_INACTIVE)

    slug = StringField(required=True, unique=True, max_length=180)
    name = StringField(required=True, max_length=150)
    email = EmailField(required=True, unique=True, max_length=254)
    # Nullable only for legacy applicant records; admin-created tutors must pass
    # the create-form validation, which always supplies a password.
    password_hash = StringField(null=True, db_field='password')
    phone = StringField(max_length=20, null=True)
    avatar = StringField(max_length=1000, null=True)
    avatar_public_id = StringField(max_length=1000, null=True)
    headline = StringField(max_length=250, null=True)
    bio = StringField(null=True)
    education_level = StringField(max_length=150, null=True)
    experience_years = IntField(default=0, min_value=0)
    hourly_rate_min = IntField(null=True, min_value=0)
    hourly_rate_max = IntField(null=True, min_value=0)
    teaching_mode = StringField(required=True, choices=('online', 'offline', 'both'))
    video_url = URLField(max_length=1000, null=True)
    is_verified = BooleanField(default=False)
    status = StringField(required=True, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    rating_avg = DecimalField(precision=2, default=0, min_value=0, max_value=5)
    rating_count = IntField(default=0, min_value=0)
    oauth_provider = StringField(choices=('local', 'google', 'facebook'), null=True)
    oauth_uid = StringField(max_length=255, null=True)
    # Admin-issued credentials require a password change after the first login.
    # The temporary password remains valid until the tutor explicitly changes it.
    must_change_password = BooleanField(default=True)
    # Incrementing this value revokes all previously issued tutor JWTs.
    token_version = IntField(default=1, min_value=1)
    meta = {'collection': 'tutors', 'indexes': [
        {'fields': ['oauth_provider', 'oauth_uid'], 'unique': True, 'sparse': True},
        'status', 'teaching_mode', 'is_verified', '-rating_avg',
    ]}

    def set_password(self, raw_password):
        self.password_hash = make_bcrypt_password(raw_password)

    def check_password(self, raw_password):
        if is_bcrypt_password(self.password_hash):
            return check_bcrypt_password(raw_password, self.password_hash)
        if check_previous_password_format(raw_password, self.password_hash):
            self.set_password(raw_password)
            self.save()
            return True
        return False

    def clean(self):
        if (
            self.hourly_rate_min is not None
            and self.hourly_rate_max is not None
            and self.hourly_rate_min > self.hourly_rate_max
        ):
            raise ValueError('hourly_rate_min must not exceed hourly_rate_max.')


class TutorSubject(BigIntDocument):
    tutor = ReferenceField(Tutor, required=True, db_field='tutor_id')
    subject = ReferenceField(Subject, required=True, db_field='subject_id')
    level = StringField(max_length=150, null=True)
    price_per_hour = IntField(null=True, min_value=0)
    meta = {'collection': 'tutor_subjects', 'indexes': [{'fields': ['tutor', 'subject', 'level'], 'unique': True}]}


class TutorTeachingArea(BigIntDocument):
    tutor = ReferenceField(Tutor, required=True, db_field='tutor_id')
    province = ReferenceField(Province, required=True, db_field='province_id')
    district = ReferenceField(District, null=True, db_field='district_id')
    ward = ReferenceField(Ward, null=True, db_field='ward_id')
    meta = {'collection': 'tutor_teaching_areas', 'indexes': ['tutor', 'province', 'district', 'ward']}


class TutorAvailability(BigIntDocument):
    """A recurring weekly time window explicitly published by a tutor."""

    tutor = ReferenceField(Tutor, required=True, db_field='tutor_id')
    weekday = IntField(required=True, min_value=0, max_value=6)
    period = StringField(required=True, choices=('morning', 'afternoon', 'evening'))
    is_available = BooleanField(default=True)
    meta = {
        'collection': 'tutor_availability',
        'indexes': [
            {'fields': ['tutor', 'weekday', 'period'], 'unique': True},
            'tutor', 'weekday', 'is_available',
        ],
    }


class TutorApplication(TimestampedDocument):
    name = StringField(required=True, max_length=150)
    email = EmailField(required=True, max_length=254)
    phone = StringField(required=True, max_length=20)
    cv_file = StringField(max_length=1000, null=True)
    id_card_file = StringField(max_length=1000, null=True)
    education_proof_file = StringField(max_length=1000, null=True)
    cover_letter = StringField(null=True)
    status = StringField(required=True, choices=('pending', 'reviewing', 'approved', 'rejected'), default='pending')
    rejected_reason = StringField(null=True)
    reviewed_by = ReferenceField('Admin', null=True, db_field='reviewed_by')
    reviewed_at = DateTimeField(null=True)
    meta = {'collection': 'tutor_applications', 'indexes': ['status', 'email', 'reviewed_by', '-created_at']}


class JobPosting(TimestampedDocument):
    slug = StringField(required=True, unique=True, max_length=180)
    posted_by_type = StringField(required=True, choices=('admin', 'parent'))
    posted_by_id = LongField(required=True, min_value=1)
    subject = ReferenceField(Subject, required=True, db_field='subject_id')
    province = ReferenceField(Province, required=True, db_field='province_id')
    district = ReferenceField(District, null=True, db_field='district_id')
    ward = ReferenceField(Ward, null=True, db_field='ward_id')
    grade = StringField(max_length=100, null=True)
    title = StringField(required=True, max_length=250)
    description = StringField(required=True)
    budget_min = IntField(null=True, min_value=0)
    budget_max = IntField(null=True, min_value=0)
    schedule_expect = StringField(null=True)
    status = StringField(required=True, choices=('open', 'closed'), default='open')
    meta = {'collection': 'job_postings', 'indexes': ['status', 'subject', 'province', 'district', 'ward', '-created_at']}

    def clean(self):
        if (
            self.budget_min is not None
            and self.budget_max is not None
            and self.budget_min > self.budget_max
        ):
            raise ValueError('budget_min must not exceed budget_max.')


class JobApplication(TimestampedDocument):
    job_posting = ReferenceField(JobPosting, required=True, db_field='job_posting_id')
    tutor = ReferenceField(Tutor, required=True, db_field='tutor_id')
    cover_letter = StringField(null=True)
    status = StringField(required=True, choices=('pending', 'accepted', 'rejected'), default='pending')
    meta = {'collection': 'job_applications', 'indexes': [{'fields': ['job_posting', 'tutor'], 'unique': True}, 'status']}
