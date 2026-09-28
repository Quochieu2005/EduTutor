"""Isolated API tests: run with MONGODB_URI=mongodb://localhost:27017.

No application data or real email is touched. Requires requirements-test.txt.
"""
from .dev import *  # noqa: F403
import mongomock
from mongoengine import connect, disconnect

disconnect()
connect('edututor_api_tests', host='mongodb://localhost:27017',
        mongo_client_class=mongomock.MongoClient, tz_aware=True)
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
SECRET_KEY = 'isolated-test-key-not-used-for-production-at-all'
