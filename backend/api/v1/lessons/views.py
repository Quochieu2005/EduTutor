"""Student/tutor lesson negotiation endpoints."""

import logging
from datetime import datetime, timezone

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import Http404

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.accounts.authentication import MongoJWTAuthentication
from lessons.documents import LearningRequest, Lesson
from accounts.documents import User
from api.v1.accounts.services import SocialTokenError, ensure_student_profile
from tutors.documents import Tutor, TutorSubject
from core.documents import NotificationDelivery, SystemNotification

from .serializers import (
    LearningRequestCreateSerializer, LearningRequestResponseSerializer,
    LearningRequestStatusSerializer, LessonAttendanceSerializer, ScheduleProposalSerializer, TutorInvitationSerializer,
)

logger = logging.getLogger(__name__)


class TutorInvitationCreateView(APIView):
    """Persist a tutor invitation for Admin and notify the selected tutor."""

    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TutorInvitationSerializer

    @extend_schema(tags=['Buổi học'], request=TutorInvitationSerializer)
    def post(self, request, tutor_slug):
        serializer = TutorInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user.user
        if isinstance(user, User):
            try:
                student = ensure_student_profile(user)
            except SocialTokenError as error:
                return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
            requested_by_type = 'student'
            requested_by_id = int(student.id)
        else:
            return Response(
                {'detail': 'Chỉ tài khoản người dùng mới có thể gửi yêu cầu mời dạy.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        tutor = Tutor.objects(slug=tutor_slug, status=Tutor.STATUS_ACTIVE).first()
        if tutor is None:
            raise Http404
        assignments = list(TutorSubject.objects(tutor=tutor).select_related())
        wanted = serializer.validated_data.get('grade_subject', '').strip().lower()
        assignment = next((item for item in assignments if item.subject.name.lower() in wanted), None)
        assignment = assignment or (assignments[0] if assignments else None)
        if assignment is None:
            return Response({'detail': 'Gia sư chưa được phân công môn học để nhận yêu cầu.'}, status=400)

        values = serializer.validated_data
        # The invitation form is often the first place a new website account
        # supplies a contact number. Persist it on the learner profile so the
        # tutor sees the same number in every subsequent request.
        contact_phone = values['contact_phone'].strip()
        if student.phone != contact_phone:
            student.phone = contact_phone
            student.save()
        detail = ' | '.join(filter(None, [
            f"Người liên hệ: {values['contact_name'].strip()} - {contact_phone}",
            f"Học sinh: {values.get('student_name', '').strip()}" if values.get('student_name', '').strip() else '',
            f"Lớp/Môn: {values.get('grade_subject', '').strip()}" if values.get('grade_subject', '').strip() else '',
            values.get('message', '').strip(),
        ]))
        record = LearningRequest(
            student=student, requested_by_type=requested_by_type,
            requested_by_id=requested_by_id, tutor=tutor, subject=assignment.subject,
            message=detail, expected_schedule='Chờ hai bên thống nhất',
            source='tutor_directory', proposed_by='student', status='pending',
        ).save()
        try:
            cache.delete('admin-header-notification-items:v1')
        except Exception:
            logger.warning('Could not invalidate admin request notifications', exc_info=True)

        notification = SystemNotification(
            title='Bạn có yêu cầu mời dạy mới',
            message=(
                f'{values["contact_name"].strip()} đã gửi yêu cầu mời bạn dạy '
                f'{assignment.subject.name}. Mã yêu cầu #{record.id}. '
                'Mở mục Lịch học & yêu cầu để xem chi tiết và phản hồi.'
            ),
            audience=SystemNotification.AUDIENCE_TUTORS,
            status=SystemNotification.STATUS_SENT,
            sent_at=datetime.now(timezone.utc), recipient_count=1,
        ).save()
        NotificationDelivery(
            notification=notification, recipient_type='tutor',
            recipient_id=int(tutor.id),
        ).save()

        email_sent = False
        try:
            email_sent = send_mail(
                subject=f'EduTutor: Yêu cầu mời dạy mới từ {values["contact_name"].strip()}',
                message=(
                    f'Xin chào {tutor.name},\n\n'
                    f'Bạn vừa nhận được một yêu cầu mời dạy trên EduTutor.\n'
                    f'{detail}\n\n'
                    f'Vui lòng đăng nhập EduTutor để xem và phản hồi yêu cầu #{record.id}.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[tutor.email], fail_silently=False,
            ) > 0
        except Exception:
            logger.exception('Could not send tutor invitation email for request %s', record.id)

        return Response({
            'id': int(record.id), 'status': record.status, 'email_sent': email_sent,
            'message': 'Đã gửi yêu cầu mời dạy tới gia sư và chuyển vào danh sách yêu cầu của Admin.' if email_sent else 'Đã lưu yêu cầu cho Admin; email tới gia sư đang chờ hệ thống gửi lại.',
        }, status=status.HTTP_201_CREATED)
from .services import (
    LessonWorkflowError, create_learning_request, learning_request_payload, lesson_session_payload,
    propose_schedule, update_learning_request, update_lesson_attendance, visible_learning_requests, visible_lesson_sessions,
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


class LessonSessionListView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            return Response([lesson_session_payload(item) for item in visible_lesson_sessions(request.user.user)])
        except LessonWorkflowError as error:
            return Response({'detail': str(error)}, status=status.HTTP_403_FORBIDDEN)


class LessonAttendanceView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LessonAttendanceSerializer

    def patch(self, request, lesson_id):
        serializer = LessonAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lesson = Lesson.objects(id=lesson_id).first()
        if lesson is None:
            return Response({'detail': 'Không tìm thấy buổi học.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return Response(lesson_session_payload(update_lesson_attendance(
                request.user.user, lesson, serializer.validated_data['status'],
            )))
        except LessonWorkflowError as error:
            return Response({'detail': str(error)}, status=status.HTTP_403_FORBIDDEN)


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
