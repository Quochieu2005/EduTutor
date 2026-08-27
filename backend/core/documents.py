from datetime import datetime, timezone

from mongoengine import DateTimeField, Document


class BaseDocument(Document):
    """Abstract MongoEngine document with audit timestamps."""

    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    updated_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {'abstract': True}
