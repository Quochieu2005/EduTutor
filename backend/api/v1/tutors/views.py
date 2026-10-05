"""HTTP views for tutors and public recruitment content managed by Admin."""

from datetime import datetime, timezone

from django.core.cache import cache
from django.http import Http404
from django.utils.decorators import method_decorator
from django.utils.text import slugify
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema
from mongoengine.queryset.visitor import Q
from mongoengine import ValidationError
from mongoengine.errors import NotUniqueError
from mongoengine.dereference import DeReference
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from core.pagination import StandardResultsSetPagination
from accounts.cloudinary_media import delete_asset, upload_tutor_application_document, upload_tutor_avatar
from accounts.documents import Parent, Student, User
from api.v1.accounts.services import SocialTokenError, ensure_student_profile
from tutors.documents import (
    JobApplication, JobPosting, Province, Subject, Tutor, TutorApplication,
    TutorAvailability, TutorSubject, TutorSubjectChangeRequest, TutorTeachingArea, Ward,
)
from core.documents import AdminNotification, NotificationDelivery, SystemNotification
from lessons.documents import LearningRequest
from .authentication import TutorJWTAuthentication
from api.v1.accounts.authentication import MongoJWTAuthentication

from .serializers import (
    RecruitmentJobSerializer, RecruitmentQuerySerializer, TutorApplicationResponseSerializer,
    TutorApplicationSerializer, TutorRequestCreateSerializer,
    TutorAvailabilitySlotSerializer, TutorAvailabilityUpdateSerializer,
    TutorAvailabilityResponseSerializer,
    ClassApplicationResponseSerializer, ClassApplicationSerializer,
    MyClassApplicationSerializer,
    TutorAccountSerializer, TutorChangePasswordSerializer, TutorLoginSerializer,
    TutorPasswordChangedSerializer, TutorRefreshSerializer, TutorTokenPairSerializer,
    TutorProfileSerializer, TutorProfileUpdateSerializer,
    TutorSubjectChangeRequestResponseSerializer, TutorSubjectChangeRequestSerializer,
    PublicTutorQuerySerializer, PublicTutorSerializer,
)
from .services import (
    TutorAuthError, change_tutor_password, login_tutor, refresh_tutor_token_pair,
    tutor_payload, tutor_profile_payload, tutor_token_pair,
)


def open_recruitment_jobs(posted_by_type=None):
    """Return only jobs that are eligible to appear on the public website."""
    active_subject_ids = list(Subject.objects(Q(status=1) | Q(status__exists=False)).scalar('id'))
    # A posting stops being public as soon as its owner/Admin accepts someone.
    # The exclusion also repairs legacy records whose application was accepted
    # before the posting status was consistently changed to ``closed``.
    filled_job_ids = {
        int(application.job_posting.id)
        for application in JobApplication.objects(status='accepted').only('job_posting').select_related()
        if application.job_posting is not None
    }
    filled_job_ids.update(
        int(application.job_posting.id)
        for application in TutorApplication.objects(status='approved', job_posting__ne=None)
        .only('job_posting').select_related()
        if application.job_posting is not None
    )
    filters = {
        'status': 'open',
        'subject__in': active_subject_ids,
    }
    if posted_by_type == 'requester':
        filters['posted_by_type__in'] = ('parent', 'student')
    elif posted_by_type:
        filters['posted_by_type'] = posted_by_type
    jobs = JobPosting.objects(**filters)
    if filled_job_ids:
        jobs = jobs.filter(id__nin=list(filled_job_ids))
    return jobs.order_by('-created_at', '-id')


def _public_tutor_payload(tutor, subject_links=None, area_links=None):
    # List views pass preloaded links to avoid two MongoDB queries per tutor.
    # Detail views keep the same behavior by loading only this tutor's links.
    if subject_links is None:
        subject_links = TutorSubject.objects(tutor=tutor).select_related()
    if area_links is None:
        area_links = TutorTeachingArea.objects(tutor=tutor).select_related()
    return {
        # This endpoint is public: never reuse the authenticated account
        # payload here because it contains private fields such as email and
        # password-change state.
        'id': int(tutor.id),
        'slug': tutor.slug,
        'name': tutor.name,
        'avatar': tutor.avatar,
        'birth_year': tutor.birth_year,
        'gender': tutor.gender,
        'hometown': tutor.hometown,
        'voice': tutor.voice,
        'headline': tutor.headline,
        # The tutor now edits this as their public introduction in the portal.
        'bio': tutor.bio,
        'education_level': tutor.education_level,
        'major': tutor.major,
        'institution': tutor.institution,
        'experience_years': tutor.experience_years or 0,
        'hourly_rate_min': tutor.hourly_rate_min,
        'hourly_rate_max': tutor.hourly_rate_max,
        'rating_avg': float(tutor.rating_avg or 0),
        'rating_count': tutor.rating_count or 0,
        'teaching_mode': tutor.teaching_mode,
        'subjects': [{'slug': link.subject.slug, 'name': link.subject.name, 'level': link.level} for link in subject_links],
        'teaching_areas': [
            {
                'province_slug': link.province.slug,
                'province_name': link.province.name,
                'ward_slug': link.ward.slug if link.ward else None,
                'ward_name': link.ward.name if link.ward else None,
            }
            for link in area_links
        ],
    }


@method_decorator(cache_page(30), name='dispatch')
class PublicTutorListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = StandardResultsSetPagination

    @extend_schema(tags=['Gia sư'], parameters=[PublicTutorQuerySerializer], responses=PublicTutorSerializer(many=True))
    def get(self, request):
        query = PublicTutorQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        tutors = Tutor.objects(status=Tutor.STATUS_ACTIVE)
        values = query.validated_data
        if values.get('teaching_mode'):
            tutors = tutors.filter(teaching_mode=values['teaching_mode'])
        if values.get('subject'):
            subject = Subject.objects(
                Q(slug=values['subject']) & (Q(status=1) | Q(status__exists=False)),
            ).first()
            if subject is None:
                return Response([])
            tutor_ids = [link.tutor.id for link in TutorSubject.objects(subject=subject).select_related()]
            tutors = tutors.filter(id__in=tutor_ids)
        if values.get('province'):
            province = Province.objects(slug=values['province']).first()
            if province is None:
                return Response([])
            tutor_ids = [link.tutor.id for link in TutorTeachingArea.objects(province=province).select_related()]
            tutors = tutors.filter(id__in=tutor_ids)
        if values.get('ward'):
            ward = Ward.objects(slug=values['ward']).first()
            if ward is None:
                return Response([])
            tutor_ids = [link.tutor.id for link in TutorTeachingArea.objects(ward=ward).select_related()]
            tutors = tutors.filter(id__in=tutor_ids)
        if values.get('search'):
            tutors = tutors.filter(Q(name__icontains=values['search']) | Q(headline__icontains=values['search']) | Q(bio__icontains=values['search']))
        paginator = self.pagination_class()
        page = list(paginator.paginate_queryset(
            tutors.order_by('-is_verified', '-rating_avg', 'name'),
            request,
            view=self,
        ))
        tutor_ids = [tutor.id for tutor in page]
        subjects_by_tutor = {tutor_id: [] for tutor_id in tutor_ids}
        areas_by_tutor = {tutor_id: [] for tutor_id in tutor_ids}
        if tutor_ids:
            for link in TutorSubject.objects(tutor__in=tutor_ids).select_related():
                subjects_by_tutor.setdefault(link.tutor.id, []).append(link)
            for link in TutorTeachingArea.objects(tutor__in=tutor_ids).select_related():
                areas_by_tutor.setdefault(link.tutor.id, []).append(link)
        payload = [
            _public_tutor_payload(
                tutor,
                subjects_by_tutor.get(tutor.id, []),
                areas_by_tutor.get(tutor.id, []),
            )
            for tutor in page
        ]
        return paginator.get_paginated_response(payload)


@method_decorator(cache_page(30), name='dispatch')
class PublicTutorDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    @extend_schema(tags=['Gia sư'], responses=PublicTutorSerializer)
    def get(self, request, slug):
        tutor = Tutor.objects(slug=slug, status=Tutor.STATUS_ACTIVE).first()
        if tutor is None:
            raise Http404
        return Response(_public_tutor_payload(tutor))


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
        nullable_text = {
            'phone', 'hometown', 'voice', 'headline', 'bio', 'education_level',
            'major', 'institution',
        }
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
        jobs = open_recruitment_jobs(query.validated_data.get('posted_by'))

        if search := query.validated_data.get('search'):
            jobs = jobs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(grade__icontains=search)
            )
        if subject_slug := query.validated_data.get('subject'):
            subject = Subject.objects(
                Q(slug=subject_slug) & (Q(status=1) | Q(status__exists=False)),
            ).only('id').first()
            if subject is None:
                raise Http404
            jobs = jobs.filter(subject=subject)
        if province_slug := query.validated_data.get('province'):
            province = Province.objects(slug=province_slug).only('id').first()
            if province is None:
                raise Http404
            jobs = jobs.filter(province=province)
        if ward_slug := query.validated_data.get('ward'):
            ward = Ward.objects(slug=ward_slug).first()
            if ward is None:
                raise Http404
            jobs = jobs.filter(ward=ward)
        if teaching_mode := query.validated_data.get('teaching_mode'):
            # A flexible request (``both``) is compatible with either filter.
            # Older postings have no field and are treated as flexible too.
            accepted_modes = ('both',) if teaching_mode == 'both' else (teaching_mode, 'both')
            jobs = jobs.filter(
                Q(teaching_mode__in=accepted_modes) | Q(teaching_mode__exists=False),
            )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(jobs, request, view=self)
        page = DeReference()(page, max_depth=1)
        application_counts = {str(job.id): 0 for job in page}
        if page:
            applications = JobApplication.objects(job_posting__in=page).only('job_posting').select_related()
            for application in applications:
                job_id = str(application.job_posting.id)
                application_counts[job_id] = application_counts.get(job_id, 0) + 1
        serializer = RecruitmentJobSerializer(
            page,
            many=True,
            context={'applications_count': application_counts},
        )
        return paginator.get_paginated_response(serializer.data)


class RecruitmentJobDetailView(PublicRecruitmentView):
    @extend_schema(tags=['Tuyển dụng gia sư'], responses=RecruitmentJobSerializer)
    def get(self, request, slug):
        job = open_recruitment_jobs().filter(slug=slug).first()
        if job is None:
            raise Http404
        return Response(RecruitmentJobSerializer(job).data)


def _requester_profile(user):
    """Resolve the authenticated EduTutor account to a student or parent."""
    email = (getattr(user, 'email', '') or '').strip().lower()
    student = Student.objects(email=email, status='active').first()
    if student is not None:
        return 'student', int(student.id)
    parent = Parent.objects(email=email).first()
    if parent is not None:
        return 'parent', int(parent.id)
    if isinstance(user, User):
        try:
            student = ensure_student_profile(user)
        except SocialTokenError:
            return None
        return 'student', int(student.id)
    return None


def _unique_request_slug(title):
    base = slugify(title)[:150] or 'yeu-cau-tim-gia-su'
    candidate = base
    suffix = 2
    while JobPosting.objects(slug=candidate).first() is not None:
        suffix_text = f'-{suffix}'
        candidate = f'{base[:180 - len(suffix_text)]}{suffix_text}'
        suffix += 1
    return candidate


class TutorRequestThrottle(SimpleRateThrottle):
    scope = 'tutor_request'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class TutorRequestCreateView(APIView):
    """Create a parent/student request on the separate Nhận lớp board."""

    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    throttle_classes = [TutorRequestThrottle]

    @extend_schema(
        tags=['Nhận lớp'], request=TutorRequestCreateSerializer,
        responses={201: RecruitmentJobSerializer},
    )
    def post(self, request):
        serializer = TutorRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requester = _requester_profile(request.user.user)
        if requester is None:
            return Response(
                {'detail': 'Không thể tạo hồ sơ học viên để gửi yêu cầu tìm gia sư.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        values = serializer.validated_data
        subject = Subject.objects(id=values['subject_id']).first()
        if subject is None or getattr(subject, 'status', 1) == 0:
            return Response({'detail': 'Môn học không tồn tại hoặc đang ngưng hoạt động.'}, status=400)
        teaching_mode = values.get('teaching_mode', 'both')
        province = Province.objects(id=values.get('province_id')).first() if values.get('province_id') else None
        ward = Ward.objects(id=values.get('ward_id'), province=province).first() if province and values.get('ward_id') else None
        if teaching_mode != 'online' and (province is None or ward is None):
            return Response({'detail': 'Tỉnh/thành và xã/phường không hợp lệ.'}, status=400)

        try:
            job = JobPosting(
                slug=_unique_request_slug(values['title']),
                posted_by_type=requester[0], posted_by_id=requester[1],
                title=values['title'].strip(), description=values['description'].strip(),
                subject=subject, province=province, ward=ward,
                grade=values.get('grade', '').strip() or None,
                budget_min=values.get('budget_min'), budget_max=values.get('budget_max'),
                schedule_expect=values.get('schedule_expect', '').strip() or None,
                teaching_mode=teaching_mode,
                status='open',
            ).save()
        except (ValidationError, NotUniqueError) as error:
            return Response({'detail': str(error)}, status=400)
        requester_label = 'Học viên' if requester[0] == 'student' else 'Phụ huynh'
        AdminNotification(
            title='Có yêu cầu đăng lớp mới',
            message=(
                f'{requester_label} vừa đăng nhu cầu "{job.title}" '
                f'({subject.name} · {province.name if province else "Học online"}).'
            ),
            kind='system',
            url='/admin/management/tutor-requests/',
        ).save()
        cache.delete('admin-header-notification-items:v1')
        return Response(RecruitmentJobSerializer(job).data, status=status.HTTP_201_CREATED)


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
        job_slug = (values.pop('job_slug', '') or '').strip()
        job = None
        if job_slug:
            # A CV can only be attached to an active admin recruitment notice.
            # Parent/student requests use the separate tutor proposal endpoint.
            job = open_recruitment_jobs('admin').filter(slug=job_slug).first()
            if job is None:
                raise Http404
            if not values.get('cv_file'):
                return Response(
                    {'cv_file': 'CV là bắt buộc khi ứng tuyển tin tuyển dụng.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        email = values['email'].strip().lower()
        duplicate_query = {
            'email': email,
            'status__in': ('pending', 'reviewing', 'approved'),
        }
        if job is not None:
            duplicate_query['job_posting'] = job
        if TutorApplication.objects(**duplicate_query).first() is not None:
            return Response(
                {'detail': 'Email này đã có hồ sơ cho tin tuyển dụng này đang được xử lý hoặc đã được duyệt.' if job else 'Email này đã có hồ sơ đang được xử lý hoặc đã được duyệt.'},
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
            if job is not None:
                values['job_posting'] = job
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


@method_decorator(cache_page(30), name='dispatch')
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
        # This is immediately visible on the public profile, but Admin is
        # informed so scheduling staff can coordinate any existing classes.
        AdminNotification(
            title='Gia sư cập nhật lịch có thể dạy',
            message=f'{tutor.name} vừa cập nhật lịch rảnh ({len(serializer.validated_data["slots"])} khung giờ).',
            kind='system', url='/admin/management/tutors/',
        ).save()
        cache.delete('admin-header-notification-items:v1')
        return Response(_availability_payload(tutor))


def _subject_change_payload(change):
    return {
        'id': int(change.id),
        'subject': {
            'id': int(change.subject.id), 'slug': change.subject.slug,
            'name': change.subject.name,
        },
        'action': change.action,
        'level': change.level,
        'price_per_hour': change.price_per_hour,
        'note': change.note,
        'status': change.status,
        'review_note': change.review_note,
        'created_at': change.created_at,
    }


class TutorSubjectChangeRequestView(APIView):
    """Tutor subject changes are queued for an administrator to approve."""

    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Hồ sơ gia sư'], responses=TutorSubjectChangeRequestResponseSerializer(many=True),
    )
    def get(self, request):
        changes = TutorSubjectChangeRequest.objects(tutor=request.user.tutor).order_by('-created_at')
        return Response([_subject_change_payload(change) for change in changes])

    @extend_schema(
        tags=['Hồ sơ gia sư'], request=TutorSubjectChangeRequestSerializer,
        responses={201: TutorSubjectChangeRequestResponseSerializer},
    )
    def post(self, request):
        serializer = TutorSubjectChangeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tutor = request.user.tutor
        values = serializer.validated_data
        # Legacy subjects created before the status field was introduced are
        # active in the public catalogue, so this write endpoint must apply
        # the same rule as the catalogue endpoint.
        subject = Subject.objects(
            Q(id=values['subject_id']) & (Q(status=1) | Q(status__exists=False)),
        ).first()
        if subject is None:
            return Response({'subject_id': ['Môn học không tồn tại hoặc đang ngưng hoạt động.']}, status=400)
        assignment = TutorSubject.objects(tutor=tutor, subject=subject).first()
        if values['action'] == TutorSubjectChangeRequest.ACTION_ADD and assignment is not None:
            return Response({'detail': 'Môn học này đã có trong hồ sơ gia sư.'}, status=409)
        if values['action'] == TutorSubjectChangeRequest.ACTION_REMOVE and assignment is None:
            return Response({'detail': 'Môn học này không có trong hồ sơ gia sư.'}, status=409)
        if TutorSubjectChangeRequest.objects(
            tutor=tutor, subject=subject, action=values['action'],
            status=TutorSubjectChangeRequest.STATUS_PENDING,
        ).first() is not None:
            return Response({'detail': 'Yêu cầu cho môn học này đang chờ Admin duyệt.'}, status=409)

        change = TutorSubjectChangeRequest(
            tutor=tutor, subject=subject, action=values['action'],
            level=(values.get('level') or '').strip() or None,
            price_per_hour=values.get('price_per_hour'),
            note=(values.get('note') or '').strip() or None,
        ).save()
        action_label = 'thêm' if change.action == TutorSubjectChangeRequest.ACTION_ADD else 'gỡ'
        AdminNotification(
            title='Yêu cầu cập nhật môn dạy',
            message=f'{tutor.name} yêu cầu {action_label} môn {subject.name}.',
            kind='system', url='/admin/management/tutor-subject-requests/',
        ).save()
        cache.delete('admin-header-notification-items:v1')
        return Response(_subject_change_payload(change), status=status.HTTP_201_CREATED)


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
        # Tutor proposals are accepted only for parent/student requests.
        # Admin recruitment notices remain read-only announcements.
        job = open_recruitment_jobs('requester').filter(slug=slug).first()
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
        AdminNotification(
            title='Gia sư đề nghị dạy lớp',
            message=f'{tutor.name} đã đề nghị dạy lớp {job.title}.',
            kind='system', url='/admin/management/tutor-requests/?tab=class-postings',
        ).save()
        cache.delete('admin-header-notification-items:v1')
        return Response({
            'id': int(application.id),
            'job_slug': job.slug,
            'status': application.status,
            'message': 'Đã gửi đề nghị nhận lớp. Khi được kết nối, hai bên sẽ thống nhất lịch học.',
        }, status=201)


class MyClassApplicationListView(APIView):
    authentication_classes = [TutorJWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Nhận lớp'], responses=MyClassApplicationSerializer(many=True))
    def get(self, request):
        tutor = request.user.tutor
        if tutor is None:
            return Response({'detail': 'Chỉ gia sư Active mới có thể xem đề nghị nhận lớp.'}, status=403)
        applications = JobApplication.objects(tutor=tutor).order_by('-created_at').select_related()
        payload = [{
            'id': int(application.id),
            'job_slug': application.job_posting.slug,
            'status': application.status,
            'cover_letter': application.cover_letter,
            'created_at': application.created_at,
        } for application in applications]
        return Response(MyClassApplicationSerializer(payload, many=True).data)


def _student_for_job_owner(job):
    if job.posted_by_type == 'student':
        return Student.objects(id=job.posted_by_id, status='active').first()
    if job.posted_by_type == 'parent':
        parent = Parent.objects(id=job.posted_by_id).first()
        return Student.objects(parent=parent, status='active').first() if parent else None
    return None


def _ensure_class_board_learning_request(job, application):
    learning_request = LearningRequest.objects(job_posting=job).first()
    if learning_request is not None:
        return learning_request
    student = _student_for_job_owner(job)
    if student is None:
        return None
    return LearningRequest(
        student=student,
        requested_by_type=job.posted_by_type,
        requested_by_id=job.posted_by_id,
        tutor=application.tutor,
        subject=job.subject,
        message=f'Gia sư được chọn từ bài đăng: {job.title}',
        expected_schedule='Chờ người đăng chọn lịch học',
        source='class_board',
        job_posting=job,
        proposed_by='student',
        student_confirmed=False,
        tutor_confirmed=False,
        status='pending',
    ).save()


def _posted_job_application_payload(job):
    applications = JobApplication.objects(job_posting=job).order_by('-created_at').select_related()
    learning_request = LearningRequest.objects(job_posting=job).order_by('-created_at').first()
    if learning_request is None:
        accepted = next((item for item in applications if item.status == 'accepted'), None)
        if accepted is not None:
            learning_request = _ensure_class_board_learning_request(job, accepted)
    return {
        'slug': job.slug,
        'title': job.title,
        'subject': job.subject.name,
        'status': job.status,
        'created_at': job.created_at,
        'learning_request_id': int(learning_request.id) if learning_request else None,
        'applications': [{
            'id': int(application.id),
            'status': application.status,
            'cover_letter': application.cover_letter,
            'created_at': application.created_at,
            'tutor': {
                'id': int(application.tutor.id),
                'slug': application.tutor.slug,
                'name': application.tutor.name,
                'email': application.tutor.email,
                'phone': application.tutor.phone,
                'avatar': application.tutor.avatar,
                'headline': application.tutor.headline,
                'experience_years': application.tutor.experience_years,
                'rating_avg': float(application.tutor.rating_avg or 0),
                'rating_count': application.tutor.rating_count,
            },
        } for application in applications],
    }


class MyPostedClassApplicationsView(APIView):
    """Let a learner/parent see every tutor who applied to their postings."""

    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        requester = _requester_profile(request.user.user)
        if requester is None:
            return Response({'detail': 'Không tìm thấy hồ sơ học viên hoặc phụ huynh.'}, status=403)
        jobs = JobPosting.objects(
            posted_by_type=requester[0], posted_by_id=requester[1],
        ).order_by('-created_at').select_related()
        return Response([_posted_job_application_payload(job) for job in jobs])


class PostedClassApplicationDecisionView(APIView):
    """Accept or reject an applicant, but only by the owner of the posting."""

    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, application_id):
        decision = str(request.data.get('status') or '').strip().lower()
        if decision not in ('accepted', 'rejected'):
            return Response({'status': ['Chỉ chấp nhận accepted hoặc rejected.']}, status=400)
        requester = _requester_profile(request.user.user)
        application = JobApplication.objects(id=application_id).first()
        if requester is None or application is None:
            raise Http404
        job = application.job_posting
        if job.posted_by_type != requester[0] or int(job.posted_by_id) != requester[1]:
            return Response({'detail': 'Bạn không có quyền xử lý đề nghị này.'}, status=403)
        if application.status != 'pending':
            return Response({'detail': 'Đề nghị này đã được xử lý.'}, status=409)
        if decision == 'accepted':
            if job.status != 'open':
                return Response({'detail': 'Bài đăng này đã đóng.'}, status=409)
            if _student_for_job_owner(job) is None:
                return Response({'detail': 'Không tìm thấy hồ sơ học viên để chốt lịch.'}, status=400)
            application.status = 'accepted'
            application.save()
            JobApplication.objects(job_posting=job, status='pending', id__ne=application.id).update(status='rejected')
            job.status = 'closed'
            job.save()
            _ensure_class_board_learning_request(job, application)
            try:
                notification = SystemNotification(
                    title='Bạn đã được chọn dạy lớp',
                    message=(
                        f'Người đăng đã chọn bạn dạy lớp {job.title}. '
                        'Mở mục Chốt lịch & buổi học để xem lịch học được gửi tới.'
                    ),
                    audience=SystemNotification.AUDIENCE_TUTORS,
                    status=SystemNotification.STATUS_SENT,
                    sent_at=datetime.now(timezone.utc), recipient_count=1,
                ).save()
                NotificationDelivery(
                    notification=notification, recipient_type='tutor',
                    recipient_id=int(application.tutor.id),
                ).save()
            except Exception:
                pass
            message = f'Đã chọn gia sư {application.tutor.name} cho lớp {job.title}.'
        else:
            application.status = 'rejected'
            application.save()
            message = f'Đã từ chối đề nghị của gia sư {application.tutor.name}.'
        AdminNotification(
            title='Người đăng đã xử lý đề nghị dạy', message=message,
            kind='system', url='/admin/management/tutor-requests/?tab=class-postings',
        ).save()
        cache.delete('admin-header-notification-items:v1')
        return Response(_posted_job_application_payload(job))
