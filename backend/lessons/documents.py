"""MongoEngine documents for learning requests, lessons, reviews and chat."""

from datetime import datetime, timezone

from bson.int64 import Int64
from mongoengine import BooleanField, DateField, DateTimeField, Document, IntField, LongField, ReferenceField, SequenceField, StringField


class BigIntDocument(Document):
    meta = {'abstract': True}
    id = SequenceField(primary_key=True, value_decorator=Int64)


class TimestampedDocument(BigIntDocument):
    meta = {'abstract': True}
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    updated_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    def save(self, *args, **kwargs):
        self.updated_at = datetime.now(timezone.utc)
        return super().save(*args, **kwargs)


class LearningRequest(TimestampedDocument):
    student = ReferenceField('Student', required=True, db_field='student_id')
    requested_by_type = StringField(required=True, choices=('student', 'parent'))
    requested_by_id = LongField(required=True, min_value=1)
    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    subject = ReferenceField('Subject', required=True, db_field='subject_id')
    message = StringField(null=True)
    expected_schedule = StringField(null=True)
    status = StringField(required=True, choices=('pending', 'accepted', 'declined', 'cancelled'), default='pending')
    meta = {'collection': 'learning_requests', 'indexes': ['student', 'tutor', 'subject', 'status', '-created_at']}


class Lesson(TimestampedDocument):
    request = ReferenceField(LearningRequest, null=True, db_field='request_id')
    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    student = ReferenceField('Student', required=True, db_field='student_id')
    subject = ReferenceField('Subject', required=True, db_field='subject_id')
    session_date = DateField(required=True)
    start_time = StringField(required=True, max_length=8)
    end_time = StringField(required=True, max_length=8)
    mode = StringField(required=True, choices=('online', 'offline'))
    location = StringField(max_length=500, null=True)
    meeting_url = StringField(max_length=1000, null=True)
    price = IntField(null=True, min_value=0)
    status = StringField(required=True, choices=('scheduled', 'completed', 'cancelled', 'no_show'), default='scheduled')
    payment_status = StringField(required=True, choices=('unpaid', 'paid'), default='unpaid')
    note = StringField(null=True)
    meta = {'collection': 'lessons', 'indexes': ['request', 'tutor', 'student', 'subject', 'session_date', 'status', 'payment_status']}

    def clean(self):
        if self.mode == 'online' and not self.meeting_url:
            raise ValueError('Online lessons require a meeting_url.')
        if self.mode == 'offline' and not self.location:
            raise ValueError('Offline lessons require a location.')


class Review(BigIntDocument):
    lesson = ReferenceField(Lesson, required=True, unique=True, db_field='lesson_id')
    student = ReferenceField('Student', required=True, db_field='student_id')
    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    rating = IntField(required=True, min_value=1, max_value=5)
    comment = StringField(null=True)
    meta = {'collection': 'reviews', 'indexes': ['tutor', 'student', '-rating']}


class Message(BigIntDocument):
    request = ReferenceField(LearningRequest, null=True, db_field='request_id')
    student = ReferenceField('Student', required=True, db_field='student_id')
    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    sender_type = StringField(required=True, choices=('student', 'parent', 'tutor'))
    sender_id = LongField(required=True, min_value=1)
    content = StringField(required=True)
    is_read = BooleanField(default=False)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    meta = {'collection': 'messages', 'indexes': ['request', 'student', 'tutor', 'is_read', '-created_at']}
