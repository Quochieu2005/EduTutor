"""Public website content and contact intake backed by the admin collections."""
import logging
from datetime import timezone as utc_timezone
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.http import Http404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema, extend_schema_field
from mongoengine.queryset.visitor import Q
from mongoengine.dereference import DeReference
from rest_framework import serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from accounts.documents import User
from api.v1.accounts.authentication import MongoJWTAuthentication
from api.v1.accounts.services import SocialTokenError, ensure_student_profile
from core.admin_contacts import ADMIN_HEADER_NOTIFICATION_CACHE_KEY, NEW_CONTACT_COUNT_CACHE_KEY
from core.documents import Banner, BlogCategory, BlogPost, Contact
from tutors.documents import Province, Subject, Ward
from api.v1.validation import SafeQuerySerializer

logger = logging.getLogger(__name__)


class CategorySerializer(serializers.Serializer):
    slug = serializers.CharField()
    name = serializers.CharField()


class BlogSerializer(serializers.Serializer):
    slug = serializers.CharField()
    title = serializers.CharField()
    excerpt = serializers.CharField(allow_null=True)
    thumbnail = serializers.CharField(allow_null=True)
    published_at = serializers.SerializerMethodField()
    category = CategorySerializer(allow_null=True)

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_published_at(self, obj):
        value = obj.published_at
        if value is None:
            return None
        if timezone.is_naive(value):
            value = timezone.make_aware(value, utc_timezone.utc)
        return timezone.localtime(value, timezone=ZoneInfo('Asia/Ho_Chi_Minh')).date().isoformat()


class BlogDetailSerializer(BlogSerializer):
    content = serializers.CharField()


class BlogQuerySerializer(SafeQuerySerializer):
    category = serializers.SlugField(required=False, max_length=180)
    search = serializers.CharField(required=False, max_length=150)


class ContentPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 50


class PublicView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []


class BannerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField(allow_null=True)
    title = serializers.CharField(allow_null=True)
    image = serializers.URLField()
    link_url = serializers.URLField(allow_null=True)
    sort_order = serializers.IntegerField()


@method_decorator(cache_page(300), name='dispatch')
class BannerListView(PublicView):
    @extend_schema(tags=['Banner'], responses=BannerSerializer(many=True))
    def get(self, request):
        now = timezone.now()
        visible_period = (
            (Q(start_at=None) | Q(start_at__lte=now))
            & (Q(end_at=None) | Q(end_at__gte=now))
        )
        banners = Banner.objects(visible_period, status='active').order_by('sort_order', '-created_at')
        return Response(BannerSerializer(banners, many=True).data)


def published_posts():
    category_ids = list(BlogCategory.objects(Q(status=1) | Q(status__exists=False)).scalar('id'))
    return BlogPost.objects(
        Q(category__in=category_ids) | Q(category=None),
        status='published', published_at__lte=timezone.now(),
    ).order_by('-published_at', '-id')


@method_decorator(cache_page(60), name='dispatch')
class BlogListView(PublicView):
    pagination_class = ContentPagination
    @extend_schema(tags=['Blog'], parameters=[BlogQuerySerializer], responses=BlogSerializer(many=True))
    def get(self, request):
        query = BlogQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        posts = published_posts().only('slug', 'title', 'excerpt', 'thumbnail', 'published_at', 'category')
        if category_slug := query.validated_data.get('category'):
            category = BlogCategory.objects(
                Q(slug=category_slug) & (Q(status=1) | Q(status__exists=False)),
            ).first()
            if category is None:
                raise Http404
            posts = posts.filter(category=category)
        if search := query.validated_data.get('search'):
            posts = posts.filter(Q(title__icontains=search) | Q(excerpt__icontains=search))
        paginator = ContentPagination()
        page = paginator.paginate_queryset(posts, request, view=self)
        page = DeReference()(page, max_depth=1)
        return paginator.get_paginated_response(BlogSerializer(page, many=True).data)


@method_decorator(cache_page(300), name='dispatch')
class BlogDetailView(PublicView):
    @extend_schema(tags=['Blog'], responses=BlogDetailSerializer)
    def get(self, request, slug):
        post = published_posts().filter(slug=slug).first()
        if post is None:
            raise Http404
        return Response(BlogDetailSerializer(post).data)


@method_decorator(cache_page(600), name='dispatch')
class CategoryListView(PublicView):
    @extend_schema(tags=['Blog'], responses=CategorySerializer(many=True))
    def get(self, request):
        categories = BlogCategory.objects(Q(status=1) | Q(status__exists=False)).order_by('name')
        return Response(CategorySerializer(categories, many=True).data)


class ContactSerializer(serializers.Serializer):
    parent_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    phone = serializers.RegexField(r'^\+?[0-9 () .-]{7,20}$', max_length=20)
    grade = serializers.CharField(max_length=100, required=False, allow_blank=True)
    subject_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    province_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    ward_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    teaching_mode = serializers.ChoiceField(choices=('online', 'offline', 'both'), default='both', required=False)
    needs_description = serializers.CharField(max_length=3000)

    def validate(self, attrs):
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError('Có trường dữ liệu không được hỗ trợ.')
        subject_id = attrs.pop('subject_id', None)
        if subject_id is not None:
            # Legacy Admin subjects may not have a persisted status field;
            # treat a missing status as active, matching the subject API.
            subject = Subject.objects(
                Q(id=subject_id) & (Q(status=1) | Q(status__exists=False)),
            ).first()
            if subject is None:
                raise serializers.ValidationError({'subject_id': 'Môn học không tồn tại hoặc đã tắt.'})
            attrs['subject'] = subject
        province_id = attrs.pop('province_id', None)
        ward_id = attrs.pop('ward_id', None)
        teaching_mode = attrs.get('teaching_mode', 'both')
        if teaching_mode != 'online':
            province = Province.objects(id=province_id).first() if province_id else None
            ward = Ward.objects(id=ward_id, province=province).first() if province and ward_id else None
            if province is None or ward is None:
                raise serializers.ValidationError({'province_id': 'Học trực tiếp cần chọn đầy đủ tỉnh/thành và xã/phường.'})
            attrs['province'] = province
            attrs['ward'] = ward
        return attrs


class ContactThrottle(SimpleRateThrottle):
    scope = 'contact_intake'
    rate = '5/hour'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class ContactResponseSerializer(serializers.Serializer):
    message = serializers.CharField()


class ContactCreateView(PublicView):
    # Keep this endpoint usable for visitors, while recognizing a signed-in
    # website account so "Cần tư vấn" can start its learner profile.
    authentication_classes = [MongoJWTAuthentication]
    throttle_classes = [ContactThrottle]

    @extend_schema(tags=['Liên hệ'], request=ContactSerializer, responses={201: ContactResponseSerializer})
    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        principal = getattr(request, 'user', None)
        user = getattr(principal, 'user', None)
        if isinstance(user, User):
            try:
                ensure_student_profile(user)
            except SocialTokenError as error:
                return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        Contact(**serializer.validated_data, status='new').save()
        try:
            cache.delete_many((NEW_CONTACT_COUNT_CACHE_KEY, ADMIN_HEADER_NOTIFICATION_CACHE_KEY))
        except Exception:
            # A cache outage must not turn a successful save into a failed submission.
            logger.warning('Could not invalidate admin contact count', exc_info=True)
        return Response({'message': 'Đã nhận phản hồi của bạn. Chúng tôi sẽ liên hệ lại.'}, status=201)
