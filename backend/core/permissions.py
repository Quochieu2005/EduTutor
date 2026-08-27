from rest_framework.permissions import IsAuthenticated


class IsAuthenticatedWithJWT(IsAuthenticated):
    """Shared authentication permission for protected API endpoints."""
