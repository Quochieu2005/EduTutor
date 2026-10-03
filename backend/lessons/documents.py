"""MongoEngine documents for learning requests, lessons, reviews and chat."""

from datetime import datetime, timezone

from bson.int64 import Int64
from mongoengine import BooleanField, DateField, DateTimeField, DictField, Document, IntField, ListField, LongField, ReferenceField, SequenceField, StringField


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
    proposed_date = DateField(null=True)
    proposed_start_time = StringField(max_length=8, null=True)
    proposed_end_time = StringField(max_length=8, null=True)
    proposed_mode = StringField(choices=('online', 'offline'), null=True)
    proposed_province = ReferenceField('Province', null=True, db_field='proposed_province_id')
    proposed_ward = ReferenceField('Ward', null=True, db_field='proposed_ward_id')
    proposed_location = StringField(max_length=500, null=True)
    proposed_meeting_url = StringField(max_length=1000, null=True)
    proposed_note = StringField(max_length=2000, null=True)
    # The learner chooses one or more recurring weekly slots.  The start date
    # is deliberately separate: it is the date from which this timetable is
    # applied, not an availability restriction for that date itself.
    proposed_slots = ListField(DictField(), default=list)
    recurrence_end_date = DateField(null=True)
    # Both entry points converge here: a learner can invite a tutor from the
    # tutor directory, or a tutor can apply to a class from the class board.
    source = StringField(
        choices=('tutor_directory', 'class_board'), default='tutor_directory',
    )
    job_posting = ReferenceField('JobPosting', null=True, db_field='job_posting_id')
    proposed_by = StringField(choices=('student', 'tutor'), default='student')
    proposal_version = IntField(default=1, min_value=1)
    student_confirmed = BooleanField(default=True)
    tutor_confirmed = BooleanField(default=False)
    status = StringField(
        required=True,
        choices=('pending', 'accepted', 'declined', 'cancelled', 'completed', 'no_show'),
        default='pending',
    )
    meta = {'collection': 'learning_requests', 'indexes': ['student', 'tutor', 'subject', 'status', '-created_at']}


class Lesson(TimestampedDocument):
    request = ReferenceField(LearningRequest, null=True, db_field='request_id')
    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    student = ReferenceField('Student', required=True, db_field='student_id')
    subject = ReferenceField('Subject', required=True, db_field='subject_id')
    session_date = DateField(required=True)
    start_time = StringField(required=True, max_length=8)
    end_time = StringField(required=True, max_length=8)
    # Lessons created from the same recurring timetable share this id. It is
    # intentionally nullable so legacy and one-off lessons remain unchanged.
    series_id = StringField(max_length=40, null=True)
    mode = StringField(required=True, choices=('online', 'offline'))
    # An offline lesson is attached to the shared administrative catalogue.
    # ``location`` stays as a display snapshot so legacy lesson records remain
    # readable while new records no longer rely on free-text addresses.
    province = ReferenceField('Province', null=True, db_field='province_id')
    ward = ReferenceField('Ward', null=True, db_field='ward_id')
    location = StringField(max_length=500, null=True)
    meeting_url = StringField(max_length=1000, null=True)
    price = IntField(null=True, min_value=0)
    status = StringField(required=True, choices=('scheduled', 'completed', 'cancelled', 'no_show'), default='scheduled')
    payment_status = StringField(required=True, choices=('unpaid', 'paid'), default='unpaid')
    note = StringField(null=True)
    meta = {
        'collection': 'lessons',
        'indexes': [
            'request', 'tutor', 'student', 'subject', 'series_id', 'province', 'ward',
            'session_date', 'status', 'payment_status',
        ],
    }

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
    status = StringField(required=True, choices=('visible', 'hidden'), default='visible')
    admin_reply = StringField(null=True, max_length=3000)
    moderated_at = DateTimeField(null=True)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    meta = {'collection': 'reviews', 'indexes': ['tutor', 'student', 'status', '-rating', '-created_at']}


class TutorQuestion(BigIntDocument):
    """Questions submitted by learners on a public tutor profile."""

    tutor = ReferenceField('Tutor', required=True, db_field='tutor_id')
    student = ReferenceField('Student', required=True, db_field='student_id')
    content = StringField(required=True, max_length=3000)
    answer = StringField(null=True, max_length=3000)
    status = StringField(required=True, choices=('pending', 'visible', 'hidden'), default='visible')
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    answered_at = DateTimeField(null=True)
    meta = {'collection': 'tutor_questions', 'indexes': ['tutor', 'student', 'status', '-created_at']}


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
