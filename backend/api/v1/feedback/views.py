from django.http import Http404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.accounts.authentication import MongoJWTAuthentication
from api.v1.payments.services import PaymentApiError, student_for_user
from api.v1.tutors.authentication import TutorJWTAuthentication
from core.documents import Complaint
from core.pagination import StandardResultsSetPagination
from lessons.documents import Lesson, Review, TutorQuestion
from tutors.documents import Tutor

from .serializers import (
    ComplaintCreateSerializer, ComplaintSerializer, ReviewCreateSerializer, ReviewSerializer,
    TutorQuestionAnswerSerializer, TutorQuestionCreateSerializer, TutorQuestionSerializer,
)
from .services import complaint_payload, create_complaint, question_payload, review_payload


@method_decorator(cache_page(30), name='dispatch')
class TutorReviewListView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    @extend_schema(tags=['Đánh giá & Khiếu nại'], responses={200: ReviewSerializer(many=True)})
    def get(self, request, slug):
        tutor = Tutor.objects(slug=slug, status=Tutor.STATUS_ACTIVE).first()
        if tutor is None:
            raise Http404
        reviews = Review.objects(tutor=tutor, status='visible').order_by('-created_at').select_related()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(reviews, request, view=self)
        return paginator.get_paginated_response([review_payload(review) for review in page])


class StudentReviewCreateView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Đánh giá & Khiếu nại'], request=ReviewCreateSerializer, responses={201: ReviewSerializer})
    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            student = student_for_user(request.user.user)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        lesson = Lesson.objects(
            id=serializer.validated_data['lesson_id'], student=student,
        ).first()
        if lesson is None:
            return Response({'detail': 'Không tìm thấy buổi học của bạn.'}, status=404)
        if lesson.status != 'completed':
            return Response({'detail': 'Chỉ được đánh giá sau khi buổi học hoàn thành.'}, status=409)
        if Review.objects(lesson=lesson).first() is not None:
            return Response({'detail': 'Buổi học này đã được đánh giá.'}, status=409)
        review = Review(
            lesson=lesson, student=student, tutor=lesson.tutor,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data.get('comment') or None,
            status='visible',
        ).save()
        # Keep the tutor aggregate consistent with the review collection.
        ratings = list(Review.objects(tutor=lesson.tutor, status='visible').scalar('rating'))
        lesson.tutor.rating_count = len(ratings)
        lesson.tutor.rating_avg = sum(ratings) / len(ratings) if ratings else 0
        lesson.tutor.save()
        return Response(review_payload(review), status=status.HTTP_201_CREATED)


@method_decorator(cache_page(30), name='dispatch')
class TutorQuestionListCreateView(APIView):
    """Read public questions and let an authenticated learner ask a tutor."""

    pagination_class = StandardResultsSetPagination

    def get_authenticators(self):
        # drf-spectacular instantiates the view while generating the schema,
        # before DRF attaches a request object. Never dereference None here.
        method = getattr(getattr(self, 'request', None), 'method', None)
        if method == 'GET':
            return []
        return [MongoJWTAuthentication()]

    def get_permissions(self):
        method = getattr(getattr(self, 'request', None), 'method', None)
        if method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request, slug):
        tutor = Tutor.objects(slug=slug, status=Tutor.STATUS_ACTIVE).first()
        if tutor is None:
            raise Http404
        questions = TutorQuestion.objects(
            tutor=tutor, status='visible',
        ).order_by('-created_at').select_related()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(questions, request, view=self)
        return paginator.get_paginated_response([question_payload(question) for question in page])

    @extend_schema(
        tags=['ÄÃ¡nh giÃ¡ & Khiáº¿u náº¡i'],
        request=TutorQuestionCreateSerializer,
        responses={201: TutorQuestionSerializer},
    )
    def post(self, request, slug):
        tutor = Tutor.objects(slug=slug, status=Tutor.STATUS_ACTIVE).first()
        if tutor is None:
            raise Http404
        serializer = TutorQuestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            student = student_for_user(request.user.user)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        question = TutorQuestion(
            tutor=tutor, student=student,
            content=serializer.validated_data['content'].strip(),
            status='visible',
        ).save()
        return Response(question_payload(question), status=status.HTTP_201_CREATED)


class TutorQuestionTutorInboxView(APIView):
    """Private question inbox for the tutor who owns the public profile."""

    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Đánh giá & Hỏi đáp'], responses={200: TutorQuestionSerializer(many=True)})
    def get(self, request):
        questions = TutorQuestion.objects(
            tutor=request.user.tutor, status__ne='hidden',
        ).order_by('-created_at').select_related()
        return Response([question_payload(question) for question in questions])


class TutorQuestionAnswerView(APIView):
    """A tutor can answer only questions posted on their own profile."""

    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Đánh giá & Hỏi đáp'], request=TutorQuestionAnswerSerializer, responses={200: TutorQuestionSerializer})
    def patch(self, request, question_id):
        serializer = TutorQuestionAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = TutorQuestion.objects(id=question_id, tutor=request.user.tutor).first()
        if question is None:
            return Response({'detail': 'Không tìm thấy bình luận thuộc hồ sơ gia sư này.'}, status=status.HTTP_404_NOT_FOUND)
        question.answer = serializer.validated_data['answer'].strip()
        question.answered_at = timezone.now()
        question.status = 'visible'
        question.save()
        return Response(question_payload(question))


class StudentComplaintListCreateView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _student(self, request):
        return student_for_user(request.user.user)

    @extend_schema(tags=['Đánh giá & Khiếu nại'], responses={200: ComplaintSerializer(many=True)})
    def get(self, request):
        try:
            student = self._student(request)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        records = Complaint.objects(sender_type='student', sender_id=int(student.id)).order_by('-created_at')
        return Response([complaint_payload(record) for record in records])

    @extend_schema(tags=['Đánh giá & Khiếu nại'], request=ComplaintCreateSerializer, responses={201: ComplaintSerializer})
    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            student = self._student(request)
        except PaymentApiError as error:
            return Response({'detail': str(error)}, status=403)
        complaint = create_complaint(actor_type='student', actor=student, values=serializer.validated_data)
        return Response(complaint_payload(complaint), status=status.HTTP_201_CREATED)


class TutorComplaintListCreateView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Đánh giá & Khiếu nại'], responses={200: ComplaintSerializer(many=True)})
    def get(self, request):
        records = Complaint.objects(sender_type='tutor', sender_id=int(request.user.tutor.id)).order_by('-created_at')
        return Response([complaint_payload(record) for record in records])

    @extend_schema(tags=['Đánh giá & Khiếu nại'], request=ComplaintCreateSerializer, responses={201: ComplaintSerializer})
    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = create_complaint(
            actor_type='tutor', actor=request.user.tutor, values=serializer.validated_data,
        )
        return Response(complaint_payload(complaint), status=status.HTTP_201_CREATED)
