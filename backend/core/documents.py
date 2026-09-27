from datetime import datetime, timezone

from bson.int64 import Int64
from mongoengine import (
    DateTimeField, DictField, Document, EmailField, IntField, LongField, ReferenceField, SequenceField, StringField,
)


class BigIntDocument(Document):
    """MongoDB document with a collection-local signed 64-bit primary key."""

    meta = {'abstract': True}
    id = SequenceField(primary_key=True, value_decorator=Int64)


class BaseDocument(BigIntDocument):
    """Abstract MongoEngine document with audit timestamps."""

    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    updated_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {'abstract': True}


class Payment(BaseDocument):
    """An amount due; individual payment attempts belong to Transaction."""

    payer_type = StringField(required=True, choices=('student', 'parent'))
    payer_id = LongField(required=True, min_value=1)
    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    student = ReferenceField('Student', required=True, db_field='student_id')
    payment_type = StringField(required=True, choices=('single', 'package'))
    total_amount = IntField(required=True, min_value=0)
    status = StringField(required=True, choices=('pending', 'paid', 'failed', 'refunded'), default='pending')
    paid_at = DateTimeField(null=True)
    note = StringField(null=True)

    meta = {'collection': 'payments', 'indexes': ['payer_type', 'payer_id', 'tutor', 'student', 'status', '-created_at']}


class PaymentItem(BigIntDocument):
    payment = ReferenceField(Payment, required=True, db_field='payment_id')
    lesson = ReferenceField('Lesson', required=True, db_field='lesson_id')
    amount = IntField(required=True, min_value=0)

    meta = {'collection': 'payment_items', 'indexes': [{'fields': ['payment', 'lesson'], 'unique': True}, 'lesson']}


class Transaction(BaseDocument):
    payment = ReferenceField(Payment, required=True, db_field='payment_id')
    method = StringField(required=True, choices=('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay'))
    gateway_transaction_id = StringField(max_length=255, null=True)
    amount = IntField(required=True, min_value=0)
    status = StringField(required=True, choices=('pending', 'success', 'failed', 'timeout', 'cancelled'), default='pending')
    failure_reason = StringField(max_length=500, null=True)
    raw_response = DictField(null=True)

    meta = {'collection': 'transactions', 'indexes': ['payment', 'method', 'gateway_transaction_id', 'status', '-created_at']}


class Invoice(BaseDocument):
    invoice_no = StringField(required=True, unique=True, max_length=50)
    payment = ReferenceField(Payment, required=True, unique=True, db_field='payment_id')
    student = ReferenceField('Student', required=True, db_field='student_id')
    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    payer_type = StringField(required=True, choices=('student', 'parent'))
    payer_id = LongField(required=True, min_value=1)
    payer_name = StringField(required=True, max_length=150)
    total_amount = IntField(required=True, min_value=0)
    status = StringField(required=True, choices=('issued', 'cancelled'), default='issued')
    pdf_file = StringField(max_length=1000, null=True)
    issued_at = DateTimeField(required=True)

    meta = {'collection': 'invoices', 'indexes': ['student', 'tutor', 'status', '-issued_at']}


class BlogCategory(BaseDocument):
    slug = StringField(required=True, unique=True, max_length=180)
    name = StringField(required=True, max_length=150)
    # 1 = active, 0 = inactive. The UI renders readable labels.
    status = IntField(required=True, choices=(0, 1), default=1)

    meta = {'collection': 'blog_categories', 'indexes': ['name', 'status']}


class BlogPost(BaseDocument):
    slug = StringField(required=True, unique=True, max_length=180)
    category = ReferenceField(BlogCategory, null=True, db_field='category_id')
    admin = ReferenceField('Admin', required=True, db_field='admin_id')
    title = StringField(required=True, max_length=250)
    excerpt = StringField(null=True)
    content = StringField(required=True)
    thumbnail = StringField(max_length=1000, null=True)
    status = StringField(required=True, choices=('draft', 'published'), default='draft')
    published_at = DateTimeField(null=True)
    views = IntField(default=0, min_value=0)

    meta = {'collection': 'blog_posts', 'indexes': ['category', 'admin', 'status', '-published_at']}


class Contact(BaseDocument):
    parent_name = StringField(required=True, max_length=150)
    email = EmailField(max_length=254, null=True)

    phone = StringField(required=True, max_length=20)
    grade = StringField(max_length=100, null=True)
    subject = ReferenceField('Subject', null=True, db_field='subject_id')
    needs_description = StringField(null=True)
    status = StringField(required=True, choices=('new', 'contacted', 'closed'), default='new')

    meta = {'collection': 'contacts', 'indexes': ['status', 'subject', '-created_at']}


class Banner(BaseDocument):
    title = StringField(max_length=250, null=True)
    slug = StringField(max_length=180, null=True)
    image = StringField(required=True, max_length=1000)
    image_public_id = StringField(max_length=500, null=True)
    link_url = StringField(max_length=1000, null=True)
    sort_order = IntField(default=0, min_value=0)
    status = StringField(required=True, choices=('active', 'inactive'), default='active')
    start_at = DateTimeField(null=True)
    end_at = DateTimeField(null=True)

    meta = {'collection': 'banners', 'indexes': ['status', 'sort_order', 'start_at', 'end_at']}


class AuditLog(BigIntDocument):
    """Append-only business audit log; do not update or delete records."""

    actor_type = StringField(required=True, choices=('student', 'tutor', 'parent', 'admin', 'system'))
    actor_id = LongField(null=True, min_value=1)
    action = StringField(required=True, max_length=150)
    target_type = StringField(max_length=100, null=True)
    target_id = LongField(null=True, min_value=1)
    description = StringField(null=True)
    metadata = DictField(null=True)
    ip_address = StringField(max_length=45, null=True)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {'collection': 'logs', 'indexes': ['actor_type', 'actor_id', 'action', 'target_type', 'target_id', '-created_at']}
