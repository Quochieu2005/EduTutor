"""Safely upgrade the legacy Tutor OAuth compound index."""

from django.core.management.base import BaseCommand, CommandError
from mongoengine.connection import get_db
from pymongo.errors import PyMongoError


class Command(BaseCommand):
    help = (
        'Inspect Tutor OAuth indexes; pass --apply to replace the legacy '
        'unique null-colliding index without modifying tutor records.'
    )

    INDEX_NAME = 'unique_tutor_oauth_identity_v2'
    INDEX_KEYS = [('oauth_provider', 1), ('oauth_uid', 1)]
    PARTIAL_FILTER = {'oauth_uid': {'$type': 'string'}}

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        collection = get_db()['tutors']
        try:
            indexes = collection.index_information()
        except PyMongoError as error:
            raise CommandError(f'Không thể đọc index tutors: {error}') from error

        desired = indexes.get(self.INDEX_NAME)
        desired_is_correct = bool(
            desired
            and desired.get('key') == self.INDEX_KEYS
            and desired.get('unique')
            and desired.get('partialFilterExpression') == self.PARTIAL_FILTER
        )
        legacy_indexes = [
            name for name, spec in indexes.items()
            if spec.get('key') == self.INDEX_KEYS and spec.get('unique')
            and name != self.INDEX_NAME
        ]
        self.stdout.write(
            'Tutor OAuth indexes: '
            f'correct={"yes" if desired_is_correct else "no"}; '
            f'legacy={", ".join(legacy_indexes) or "none"}. '
            'No tutor record will be changed.'
        )
        if not options['apply']:
            self.stdout.write('Dry run. Use --apply to perform the index migration.')
            return

        try:
            # The expected legacy index normally has the automatic default
            # name. Build the correct partial index first so uniqueness for
            # genuine OAuth identities remains protected throughout the swap.
            if not desired_is_correct:
                if desired is not None:
                    collection.drop_index(self.INDEX_NAME)
                collection.create_index(
                    self.INDEX_KEYS,
                    name=self.INDEX_NAME,
                    unique=True,
                    partialFilterExpression=self.PARTIAL_FILTER,
                )
            for name in legacy_indexes:
                collection.drop_index(name)
        except PyMongoError as error:
            raise CommandError(
                'Không thể thay index OAuth của tutors. Không có dữ liệu gia sư nào bị xóa. '
                f'Chi tiết: {error}'
            ) from error

        # Keep the terminal message ASCII-only: Windows cmd may still use
        # cp1252, and an encoding exception must never obscure a completed
        # database migration.
        self.stdout.write(self.style.SUCCESS(
            'Tutor OAuth index migrated. Password-based tutor accounts can now coexist.'
        ))
