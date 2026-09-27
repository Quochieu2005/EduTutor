"""Migrate legacy numeric administrator statuses to the schema enum."""

from django.core.management.base import BaseCommand
from mongoengine.connection import get_db


class Command(BaseCommand):
    help = 'Convert legacy admins.status values 1/0 to active/inactive.'

    def handle(self, *args, **options):
        admins = get_db()['admins']
        activated = admins.update_many({'status': 1}, {'$set': {'status': 'active'}})
        deactivated = admins.update_many({'status': 0}, {'$set': {'status': 'inactive'}})
        self.stdout.write(self.style.SUCCESS(
            'Migrated admin statuses: '
            f'{activated.modified_count} active, {deactivated.modified_count} inactive.'
        ))
