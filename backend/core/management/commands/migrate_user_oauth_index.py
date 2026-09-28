"""Replace the old sparse index which incorrectly allows only one local User."""
from django.core.management.base import BaseCommand
from mongoengine.connection import get_db


class Command(BaseCommand):
    help = 'Inspect OAuth uniqueness index; pass --apply to replace the legacy index without modifying users.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        collection = get_db()['users']  # Do not trigger model auto-index creation.
        keys = [('oauth_provider', 1), ('oauth_uid', 1)]
        old_indexes = [
            name for name, spec in collection.index_information().items()
            if spec.get('key') == keys and spec.get('unique')
            and spec.get('sparse') and not spec.get('partialFilterExpression')
        ]
        self.stdout.write(f'Legacy OAuth indexes to replace: {len(old_indexes)}. No user records will change.')
        if not options['apply']:
            self.stdout.write('Dry run. Use --apply during deployment to perform the index migration.')
            return
        # Establish the correct uniqueness guarantee BEFORE dropping the old
        # index. If existing data is inconsistent, create_index fails safely.
        collection.create_index(keys, name='unique_oauth_identity_v2', unique=True,
                                partialFilterExpression={'oauth_uid': {'$type': 'string'}})
        for name in old_indexes:
            collection.drop_index(name)
        self.stdout.write(self.style.SUCCESS('OAuth index migrated; email and username uniqueness unchanged.'))
