"""Helpers for the admin authentication session."""

from time import time

from django.conf import settings


def admin_session_is_valid(session):
    """Return whether an admin session is within its absolute lifetime."""
    logged_in_at = session.get('admin_logged_in_at')
    if isinstance(logged_in_at, bool) or not isinstance(logged_in_at, (int, float)):
        return False

    elapsed_seconds = time() - logged_in_at
    return 0 <= elapsed_seconds < settings.ADMIN_SESSION_MAX_AGE


def clear_admin_session(session):
    """Remove only the values used to authenticate an admin."""
    session.pop('admin_id', None)
    session.pop('admin_session_version', None)
    session.pop('admin_logged_in_at', None)
