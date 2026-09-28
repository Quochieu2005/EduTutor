from django.test import SimpleTestCase

from accounts.documents import Admin, Parent, Student, User
from tutors.documents import Tutor


class BcryptPasswordTests(SimpleTestCase):
    def test_every_account_type_uses_direct_bcrypt(self):
        accounts = [
            User(username='user', email='user@example.com'),
            Parent(slug='parent', name='Parent', email='parent@example.com'),
            Student(slug='student', name='Student'),
            Tutor(slug='tutor', name='Tutor', email='tutor@example.com', teaching_mode='online'),
            Admin(name='Admin', slug='admin', email='admin@example.com'),
        ]
        for account in accounts:
            with self.subTest(account=account.__class__.__name__):
                account.set_password('mat-khau-bcrypt')
                self.assertTrue(account.password_hash.startswith(('$2a$', '$2b$', '$2y$')))
                self.assertNotIn('mat-khau-bcrypt', account.password_hash)
                self.assertTrue(account.check_password('mat-khau-bcrypt'))
                self.assertFalse(account.check_password('sai-mat-khau'))
