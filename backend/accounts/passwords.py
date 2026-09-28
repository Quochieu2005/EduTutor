"""Shared bcrypt-only password helpers for every EduTutor account type."""

import bcrypt
from django.contrib.auth.hashers import (
    BCryptSHA256PasswordHasher, PBKDF2PasswordHasher, PBKDF2SHA1PasswordHasher,
)


def make_bcrypt_password(raw_password):
    if not raw_password:
        raise ValueError('Password must not be empty.')
    if len(raw_password.encode('utf-8')) > 72:
        raise ValueError('Password must not exceed 72 bytes for bcrypt.')
    return bcrypt.hashpw(
        raw_password.encode('utf-8'),
        bcrypt.gensalt(rounds=12),
    ).decode('utf-8')


def check_bcrypt_password(raw_password, encoded_password):
    if not raw_password or not encoded_password:
        return False
    try:
        return bcrypt.checkpw(
            raw_password.encode('utf-8'),
            encoded_password.encode('utf-8'),
        )
    except (TypeError, ValueError):
        return False


def is_bcrypt_password(encoded_password):
    return bool(encoded_password) and encoded_password.startswith(('$2a$', '$2b$', '$2y$'))


def check_previous_password_format(raw_password, encoded_password):
    """Verify a legacy Django hash solely so it can be upgraded to bcrypt."""
    if not raw_password or not encoded_password:
        return False
    # Verification-only compatibility; all newly saved passwords use bcrypt.
    for hasher in (BCryptSHA256PasswordHasher(), PBKDF2PasswordHasher(), PBKDF2SHA1PasswordHasher()):
        if encoded_password.startswith(hasher.algorithm + '$'):
            try:
                return hasher.verify(raw_password, encoded_password)
            except (ValueError, TypeError):
                return False
    return False
