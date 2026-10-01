from django.http import Http404
from drf_spectacular.utils import extend_schema
from mongoengine.queryset.visitor import Q
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.accounts.authentication import MongoJWTAuthentication
from api.v1.tutors.authentication import TutorJWTAuthentication
from core.documents import NotificationDelivery
from core.pagination import StandardResultsSetPagination

from .serializers import (
    NotificationInboxSerializer, NotificationReadAllSerializer, NotificationReadSerializer,
)
from .services import (
    NotificationInboxError, inbox_response, mark_all_deliveries_read,
    mark_delivery_read, user_recipient_identities,
)


class RecipientNotificationView(APIView):
    pagination_class = StandardResultsSetPagination

    def _deliveries(self, request):
        raise NotImplementedError

    def _owned_delivery(self, request, delivery_id):
        delivery = self._deliveries(request).filter(id=delivery_id).first()
        if delivery is None:
            raise Http404
        return delivery

    @extend_schema(tags=['Thông báo hệ thống'], responses={200: NotificationInboxSerializer})
    def get(self, request):
        try:
            return inbox_response(
                request=request, deliveries=self._deliveries(request),
                pagination_class=self.pagination_class,
            )
        except NotificationInboxError as error:
            return Response({'detail': str(error)}, status=403)


class UserNotificationInboxView(RecipientNotificationView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _deliveries(self, request):
        identities = user_recipient_identities(request.user.user)
        query = Q()
        for recipient_type, recipient_id in identities:
            query |= Q(recipient_type=recipient_type, recipient_id=recipient_id)
        return NotificationDelivery.objects(
            query,
        ).order_by('-delivered_at')


class TutorNotificationInboxView(RecipientNotificationView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _deliveries(self, request):
        return NotificationDelivery.objects(
            recipient_type='tutor', recipient_id=int(request.user.tutor.id),
        ).order_by('-delivered_at')


class NotificationReadView(RecipientNotificationView):
    @extend_schema(tags=['Thông báo hệ thống'], responses={200: NotificationReadSerializer})
    def post(self, request, delivery_id):
        try:
            delivery = self._owned_delivery(request, delivery_id)
        except NotificationInboxError as error:
            return Response({'detail': str(error)}, status=403)
        delivery = mark_delivery_read(delivery)
        return Response({'id': int(delivery.id), 'read_at': delivery.read_at})


class UserNotificationReadView(NotificationReadView, UserNotificationInboxView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationReadSerializer

    @extend_schema(tags=['Thông báo hệ thống'], responses={200: NotificationReadSerializer})
    def post(self, request, delivery_id):
        return super().post(request, delivery_id)


class TutorNotificationReadView(NotificationReadView, TutorNotificationInboxView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationReadSerializer

    @extend_schema(tags=['Thông báo hệ thống'], responses={200: NotificationReadSerializer})
    def post(self, request, delivery_id):
        return super().post(request, delivery_id)


class NotificationReadAllView(RecipientNotificationView):
    @extend_schema(tags=['Thông báo hệ thống'], responses={200: NotificationReadAllSerializer})
    def post(self, request):
        try:
            updated_count, read_at = mark_all_deliveries_read(self._deliveries(request))
        except NotificationInboxError as error:
            return Response({'detail': str(error)}, status=403)
        return Response({'updated_count': updated_count, 'read_at': read_at})


class UserNotificationReadAllView(NotificationReadAllView, UserNotificationInboxView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationReadAllSerializer

    @extend_schema(tags=['Thông báo hệ thống'], responses={200: NotificationReadAllSerializer})
    def post(self, request):
        return super().post(request)


class TutorNotificationReadAllView(NotificationReadAllView, TutorNotificationInboxView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationReadAllSerializer

    @extend_schema(tags=['Thông báo hệ thống'], responses={200: NotificationReadAllSerializer})
    def post(self, request):
        return super().post(request)
