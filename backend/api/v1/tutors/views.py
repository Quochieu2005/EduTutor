"""HTTP views for tutors and public recruitment content managed by Admin."""

from django.http import Http404
from django.utils.text import slugify
from drf_spectacular.utils import extend_schema
from mongoengine.queryset.visitor import Q
from mongoengine import ValidationError
from mongoengine.dereference import DeReference
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from core.pagination import StandardResultsSetPagination
from accounts.cloudinary_media import delete_asset, upload_tutor_application_document, upload_tutor_avatar
from tutors.documents import (
    JobApplication, JobPosting, Province, Subject, Tutor, TutorApplication,
    TutorAvailability,
)
from .authentication import TutorJWTAuthentication

from .serializers import (
    RecruitmentJobSerializer, RecruitmentQuerySerializer, TutorApplicationResponseSerializer,
    TutorApplicationSerializer,
    TutorAvailabilitySlotSerializer, TutorAvailabilityUpdateSerializer,
    TutorAvailabilityResponseSerializer,
    ClassApplicationResponseSerializer, ClassApplicationSerializer,
    TutorAccountSerializer, TutorChangePasswordSerializer, TutorLoginSerializer,
    TutorPasswordChangedSerializer, TutorRefreshSerializer, TutorTokenPairSerializer,
    TutorProfileSerializer, TutorProfileUpdateSerializer,
)
from .services import (
    TutorAuthError, change_tutor_password, login_tutor, refresh_tutor_token_pair,
    tutor_payload, tutor_profile_payload, tutor_token_pair,
)


def open_recruitment_jobs():
    """Return only jobs that are eligible to appear on the public website."""
    active_subject_ids = list(Subject.objects(status=1).scalar('id'))
    return JobPosting.objects(
        status='open', subject__in=active_subject_ids,
    ).order_by('-created_at', '-id')


class PublicRecruitmentView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class TutorLoginThrottle(SimpleRateThrottle):
    scope = 'tutor_login'
    rate = '10/minute'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class TutorLoginView(PublicRecruitmentView):
    throttle_classes = [TutorLoginThrottle]

    @extend_schema(tags=['Tài khoản gia sư'], request=TutorLoginSerializer, responses={200: TutorTokenPairSerializer})
    def post(self, request):
        serializer = TutorLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tutor = login_tutor(**serializer.validated_data)
        except TutorAuthError as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(tutor_token_pair(tutor), headers={'Cache-Control': 'no-store'})


class TutorRefreshView(PublicRecruitmentView):
    @extend_schema(tags=['Tài khoản gia sư'], request=TutorRefreshSerializer, responses={200: TutorTokenPairSerializer})
    def post(self, request):
        serializer = TutorRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = refresh_tutor_token_pair(serializer.validated_data['refresh'])
        except TutorAuthError as error:
            return Response({'detail': str(error)}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(payload, headers={'Cache-Control': 'no-store'})


class TutorMeView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Tài khoản gia sư'], responses={200: TutorAccountSerializer})
    def get(self, request):
        return Response(tutor_payload(request.user.tutor), headers={'Cache-Control': 'no-store'})


class TutorProfileView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @extend_schema(tags=['Hồ sơ gia sư'], responses={200: TutorProfileSerializer})
    def get(self, request):
        return Response(
            tutor_profile_payload(request.user.tutor),
            headers={'Cache-Control': 'no-store'},
        )

    @extend_schema(
        tags=['Hồ sơ gia sư'], request=TutorProfileUpdateSerializer,
        responses={200: TutorProfileSerializer},
    )
    def patch(self, request):
        tutor = request.user.tutor
        serializer = TutorProfileUpdateSerializer(
            data=request.data, partial=True, context={'tutor': tutor},
        )
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        upload = values.pop('avatar', None)
        old_public_id = None
        if upload is not None:
            try:
                asset = upload_tutor_avatar(upload, tutor.slug)
            except ValueError as error:
                return Response({'avatar': [str(error)]}, status=400)
            old_public_id = tutor.avatar_public_id
            tutor.avatar = asset['secure_url']
            tutor.avatar_public_id = asset['public_id']
        nullable_text = {'phone', 'headline', 'bio', 'education_level'}
        for field, value in values.items():
            setattr(tutor, field, (value or None) if field in nullable_text else value)
        tutor.save()
        if old_public_id and old_public_id != tutor.avatar_public_id:
            delete_asset(old_public_id)
        return Response(tutor_profile_payload(tutor), headers={'Cache-Control': 'no-store'})


class TutorChangePasswordView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Tài khoản gia sư'], request=TutorChangePasswordSerializer,
        responses={200: TutorPasswordChangedSerializer},
    )
    def post(self, request):
        serializer = TutorChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            change_tutor_password(
                request.user.tutor,
                current_password=serializer.validated_data['current_password'],
                new_password=serializer.validated_data['new_password'],
            )
        except TutorAuthError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'message': 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
            'must_change_password': False,
        }, headers={'Cache-Control': 'no-store'})


class RecruitmentJobListView(PublicRecruitmentView):
    pagination_class = StandardResultsSetPagination
    @extend_schema(
        tags=['Tuyển dụng gia sư'],
        parameters=[RecruitmentQuerySerializer],
        responses=RecruitmentJobSerializer(many=True),
    )
    def get(self, request):
        query = RecruitmentQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        jobs = open_recruitment_jobs()

        if search := query.validated_data.get('search'):
            jobs = jobs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(grade__icontains=search)
            )
        if subject_slug := query.validated_data.get('subject'):
            subject = Subject.objects(slug=subject_slug, status=1).only('id').first()
            if subject is None:
                raise Http404
            jobs = jobs.filter(subject=subject)
        if province_slug := query.validated_data.get('province'):
            province = Province.objects(slug=province_slug).only('id').first()
            if province is None:
                raise Http404
            jobs = jobs.filter(province=province)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(jobs, request, view=self)
        page = DeReference()(page, max_depth=1)
        return paginator.get_paginated_response(RecruitmentJobSerializer(page, many=True).data)


class RecruitmentJobDetailView(PublicRecruitmentView):
    @extend_schema(tags=['Tuyển dụng gia sư'], responses=RecruitmentJobSerializer)
    def get(self, request, slug):
        job = open_recruitment_jobs().filter(slug=slug).first()
        if job is None:
            raise Http404
        return Response(RecruitmentJobSerializer(job).data)


class TutorApplicationThrottle(SimpleRateThrottle):
    scope = 'tutor_application'
    rate = '3/day'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class TutorApplicationCreateView(PublicRecruitmentView):
    throttle_classes = [TutorApplicationThrottle]

    @extend_schema(
        tags=['Tuyển dụng gia sư'],
        request=TutorApplicationSerializer,
        responses={201: TutorApplicationResponseSerializer},
    )
    def post(self, request):
        serializer = TutorApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        email = values['email'].strip().lower()
        if TutorApplication.objects(
            email=email, status__in=('pending', 'reviewing', 'approved'),
        ).first() is not None:
            return Response(
                {'detail': 'Email này đã có hồ sơ đang được xử lý hoặc đã được duyệt.'},
                status=status.HTTP_409_CONFLICT,
            )

        applicant_slug = slugify(email.split('@', 1)[0]) or 'candidate'
        try:
            for field in ('cv_file', 'id_card_file', 'education_proof_file'):
                upload = values.pop(field, None)
                if upload is not None:
                    values[field] = upload_tutor_application_document(
                        upload, applicant_slug, field,
                    )['secure_url']
            values['email'] = email
            application = TutorApplication(**values, status='pending').save()
        except (ValueError, ValidationError) as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'id': int(application.id),
            'status': application.status,
            'message': 'Hồ sơ đã được gửi và đang chờ quản trị viên xem xét.',
        }, status=status.HTTP_201_CREATED)


def _availability_payload(tutor):
    slots = TutorAvailability.objects(tutor=tutor, is_available=True).order_by('weekday', 'period')
    return {
        'tutor': {'id': int(tutor.id), 'slug': tutor.slug, 'name': tutor.name},
        'slots': TutorAvailabilitySlotSerializer(slots, many=True).data,
    }


class TutorAvailabilityView(PublicRecruitmentView):
    @extend_schema(tags=['Gia sư'], responses=TutorAvailabilityResponseSerializer)
    def get(self, request, slug):
        tutor = Tutor.objects(slug=slug, status=Tutor.STATUS_ACTIVE).first()
        if tutor is None:
            raise Http404
        return Response(_availability_payload(tutor))


class MyTutorAvailabilityView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TutorAvailabilityUpdateSerializer

    def _tutor(self, request):
        return request.user.tutor

    @extend_schema(tags=['Gia sư'], responses=TutorAvailabilityResponseSerializer)
    def get(self, request):
        tutor = self._tutor(request)
        if tutor is None:
            return Response({'detail': 'Tài khoản chưa có hồ sơ gia sư Active.'}, status=403)
        return Response(_availability_payload(tutor))

    @extend_schema(
        tags=['Gia sư'], request=TutorAvailabilityUpdateSerializer,
        responses=TutorAvailabilityResponseSerializer,
    )
    def put(self, request):
        serializer = TutorAvailabilityUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tutor = self._tutor(request)
        if tutor is None:
            return Response({'detail': 'Tài khoản chưa có hồ sơ gia sư Active.'}, status=403)
        TutorAvailability.objects(tutor=tutor).delete()
        for slot in serializer.validated_data['slots']:
            TutorAvailability(tutor=tutor, **slot, is_available=True).save()
        return Response(_availability_payload(tutor))


class ClassApplicationCreateView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ClassApplicationSerializer

    @extend_schema(
        tags=['Nhận lớp'], request=ClassApplicationSerializer,
        responses={201: ClassApplicationResponseSerializer},
    )
    def post(self, request, slug):
        serializer = ClassApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tutor = request.user.tutor
        if tutor is None:
            return Response({'detail': 'Chỉ gia sư Active mới có thể đề nghị nhận lớp.'}, status=403)
        job = open_recruitment_jobs().filter(slug=slug).first()
        if job is None:
            raise Http404
        if JobApplication.objects(job_posting=job, tutor=tutor).first() is not None:
            return Response({'detail': 'Bạn đã gửi đề nghị cho lớp này.'}, status=409)
        application = JobApplication(
            job_posting=job,
            tutor=tutor,
            cover_letter=serializer.validated_data.get('cover_letter') or None,
            status='pending',
        ).save()
        return Response({
            'id': int(application.id),
            'job_slug': job.slug,
            'status': application.status,
            'message': 'Đã gửi đề nghị nhận lớp. Khi được kết nối, hai bên sẽ thống nhất lịch học.',
        }, status=201)
