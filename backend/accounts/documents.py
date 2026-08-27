from datetime import datetime, timezone

from django.contrib.auth.hashers import check_password, make_password
from mongoengine import DateTimeField, Document, EmailField, StringField


class User(Document):
    username = StringField(required=True, unique=True, max_length=50)
    email = EmailField(required=True, unique=True)
    password_hash = StringField(required=True)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))

    meta = {'collection': 'users'}

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)
