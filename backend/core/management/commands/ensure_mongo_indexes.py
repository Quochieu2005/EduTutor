"""Create and verify MongoDB indexes for the EduTutor domain schema."""

from django.core.management.base import BaseCommand, CommandError
from mongoengine.connection import get_db
from pymongo.errors import CollectionInvalid


def domain_documents():
    """Import every domain document so MongoEngine can resolve references."""
    from accounts.documents import Admin, AuthToken, Parent, Student
    from core.documents import (
        AuditLog, Banner, BlogCategory, BlogPost, Contact, Invoice, Payment,
        PaymentItem, Transaction,
    )
    from lessons.documents import LearningRequest, Lesson, Message, Review
    from tutors.documents import (
        District, JobApplication, JobPosting, Province, Subject, Tutor, Ward,
        TutorApplication, TutorSubject, TutorTeachingArea,
    )

    return (
        Student, Parent, Tutor, Admin, Subject, Province, District, Ward,
        TutorSubject, TutorTeachingArea, LearningRequest, Lesson, Review,
        Message, Payment, PaymentItem, BlogCategory, BlogPost, Contact, Banner,
        TutorApplication, JobPosting, JobApplication, AuthToken, Transaction,
        Invoice, AuditLog,
    )


class Command(BaseCommand):
    help = 'Create the indexes for all 26 EduTutor MongoDB collections.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verify', action='store_true',
            help='Ping the configured MongoDB database before creating indexes.',
        )

    def handle(self, *args, **options):
        database = get_db()
        if options['verify']:
            try:
                database.client.admin.command('ping')
            except Exception as error:
                raise CommandError(f'Cannot connect to MongoDB: {error}') from error
            self.stdout.write(self.style.SUCCESS('MongoDB connection: OK'))

        documents = domain_documents()
        existing_collections = set(database.list_collection_names())
        for document in documents:
            collection_name = document._meta['collection']
            if collection_name not in existing_collections:
                try:
                    database.create_collection(collection_name)
                    self.stdout.write(f'Created {collection_name}')
                except CollectionInvalid:
                    # Another process created it between the list and create calls.
                    pass
            if collection_name == 'tokens':
                # Upgrade the former ordinary expires_at index to a TTL index.
                expires_index = database[collection_name].index_information().get('expires_at_1')
                if expires_index and expires_index.get('expireAfterSeconds') != 0:
                    database[collection_name].drop_index('expires_at_1')
                    self.stdout.write('Upgraded tokens.expires_at index to TTL')
            document.ensure_indexes()
            self.stdout.write(f'Indexed {collection_name}')

        self.stdout.write(self.style.SUCCESS(
            f'Created or verified indexes for {len(documents)} EduTutor collections.'
        ))
