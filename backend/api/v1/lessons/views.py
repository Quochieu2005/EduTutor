"""Student/tutor lesson negotiation endpoints."""

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.accounts.authentication import MongoJWTAuthentication
from lessons.documents import LearningRequest

from .serializers import (
    LearningRequestCreateSerializer, LearningRequestResponseSerializer,
    LearningRequestStatusSerializer, ScheduleProposalSerializer,
)
from .services import (
    LessonWorkflowError, create_learning_request, learning_request_payload,
    propose_schedule, update_learning_request, visible_learning_requests,
)


class LearningRequestListCreateView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    serializer_class = LearningRequestCreateSerializer

    @extend_schema(tags=['Buổi học'], responses={200: LearningRequestResponseSerializer(many=True)})
    def get(self, request):
        try:
            records = visible_learning_requests(request.user.user)
            return Response([learning_request_payload(item) for item in records])
        except LessonWorkflowError as error:
            return Response({'detail': str(error)}, status=status.HTTP_403_FORBIDDEN)

    @extend_schema(
        tags=['Buổi học'], request=LearningRequestCreateSerializer,
        responses={201: LearningRequestResponseSerializer},
    )
    def post(self, request):
        serializer = LearningRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            record = create_learning_request(request.user.user, serializer.validated_data)
        except LessonWorkflowError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(learning_request_payload(record), status=status.HTTP_201_CREATED)


class LearningRequestStatusView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    serializer_class = LearningRequestStatusSerializer

    @extend_schema(
        tags=['Buổi học'], request=LearningRequestStatusSerializer,
        responses={200: LearningRequestResponseSerializer},
    )
    def patch(self, request, request_id):
        serializer = LearningRequestStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = LearningRequest.objects(id=request_id).first()
        if record is None:
            return Response({'detail': 'Không tìm thấy yêu cầu học.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            record = update_learning_request(
                request.user.user, record, serializer.validated_data['status']
            )
        except LessonWorkflowError as error:
            return Response({'detail': str(error)}, status=status.HTTP_403_FORBIDDEN)
        return Response(learning_request_payload(record))


class ScheduleProposalView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ScheduleProposalSerializer

    @extend_schema(
        tags=['Buổi học'], request=ScheduleProposalSerializer,
        responses={200: LearningRequestResponseSerializer},
    )
    def put(self, request, request_id):
        serializer = ScheduleProposalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = LearningRequest.objects(id=request_id).first()
        if record is None:
            return Response({'detail': 'Không tìm thấy yêu cầu học.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            record = propose_schedule(request.user.user, record, serializer.validated_data)
        except LessonWorkflowError as error:
            return Response({'detail': str(error)}, status=status.HTTP_403_FORBIDDEN)
        return Response(learning_request_payload(record))
