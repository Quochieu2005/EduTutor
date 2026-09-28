"""Run API tests safely, without loading the real MongoDB connection URI."""
import os
import sys

os.environ['MONGODB_URI'] = 'mongodb://localhost:27017'
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    execute_from_command_line([sys.argv[0], 'test', 'api', 'accounts.test_passwords', *sys.argv[1:]])
