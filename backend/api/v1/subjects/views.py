from django.http import Http404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema
from mongoengine.queryset.visitor import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from tutors.documents import Subject, Tutor, TutorSubject

from .serializers import (
    SubjectCategorySerializer, SubjectQuerySerializer, SubjectSerializer,
    SubjectTutorSerializer,
)
from .services import active_tutor_ids, subject_payload, tutor_ids_by_subject


class PublicSubjectView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


def active_subjects():
    """Admin-created subjects are active unless explicitly marked inactive.

    Older records predate the ``status`` field, so ``status=1`` alone would
    incorrectly hide them from the public filters.
    """
    return Subject.objects(Q(status=1) | Q(status__exists=False))


@method_decorator(cache_page(300), name='dispatch')
class SubjectListView(PublicSubjectView):
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        tags=['Môn học'], parameters=[SubjectQuerySerializer],
        responses={200: SubjectSerializer(many=True)},
    )
    def get(self, request):
        query = SubjectQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        subjects = active_subjects()
        if search := query.validated_data.get('search'):
            subjects = subjects.filter(Q(name__icontains=search) | Q(category__icontains=search))
        if category := query.validated_data.get('category'):
            subjects = subjects.filter(category__iexact=category)
        subjects = subjects.order_by('category', 'name', 'id')
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(subjects, request, view=self)
        subject_ids = [subject.id for subject in page]
        tutor_map = tutor_ids_by_subject(subject_ids=subject_ids)
        return paginator.get_paginated_response([
            subject_payload(subject, tutor_map.get(int(subject.id), set())) for subject in page
        ])


@method_decorator(cache_page(300), name='dispatch')
class SubjectDetailView(PublicSubjectView):
    @extend_schema(tags=['Môn học'], responses={200: SubjectSerializer})
    def get(self, request, slug):
        subject = active_subjects().filter(slug=slug).first()
        if subject is None:
            raise Http404
        tutor_map = tutor_ids_by_subject(subject_ids=[subject.id])
        return Response(subject_payload(subject, tutor_map.get(int(subject.id), set())))


@method_decorator(cache_page(300), name='dispatch')
class SubjectCategoryListView(PublicSubjectView):
    @extend_schema(tags=['Môn học'], responses={200: SubjectCategorySerializer(many=True)})
    def get(self, request):
        subjects = list(active_subjects().order_by('category', 'name', 'id'))
        tutor_map = tutor_ids_by_subject(subject_ids=[subject.id for subject in subjects])
        categories = {}
        for subject in subjects:
            name = subject.category or 'Chưa phân loại'
            item = categories.setdefault(name, {'name': name, 'subject_count': 0, 'tutor_ids': set()})
            item['subject_count'] += 1
            item['tutor_ids'].update(tutor_map.get(int(subject.id), set()))
        return Response([
            {
                'name': item['name'], 'subject_count': item['subject_count'],
                'tutor_count': len(item['tutor_ids']),
            }
            for item in categories.values()
        ])


@method_decorator(cache_page(30), name='dispatch')
class SubjectTutorListView(PublicSubjectView):
    pagination_class = StandardResultsSetPagination

    @extend_schema(tags=['Môn học'], responses={200: SubjectTutorSerializer(many=True)})
    def get(self, request, slug):
        subject = active_subjects().filter(slug=slug).first()
        if subject is None:
            raise Http404
        active_ids = active_tutor_ids()
        links = list(TutorSubject.objects(subject=subject).select_related())
        by_tutor = {
            int(link.tutor.id): link
            for link in links
            if int(link.tutor.id) in active_ids
        }
        tutors = Tutor.objects(
            id__in=list(by_tutor), status=Tutor.STATUS_ACTIVE,
        ).order_by('-rating_avg', '-rating_count', 'name') if by_tutor else []
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(tutors, request, view=self)
        return paginator.get_paginated_response([
            {
                'id': int(tutor.id), 'slug': tutor.slug, 'name': tutor.name,
                'avatar': tutor.avatar, 'headline': tutor.headline,
                'teaching_mode': tutor.teaching_mode,
                'rating_avg': float(tutor.rating_avg or 0), 'rating_count': tutor.rating_count,
                'level': by_tutor[int(tutor.id)].level,
                'price_per_hour': by_tutor[int(tutor.id)].price_per_hour,
            }
            for tutor in page
        ])
