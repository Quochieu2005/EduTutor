from django.http import Http404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from tutors.documents import JobPosting, Province, Subject, Tutor, TutorSubject, TutorTeachingArea, Ward

from .serializers import AreaDetailSerializer, ProvinceSerializer, WardSerializer


class PublicGeographyView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


def _active_tutor_ids(query):
    return list({
        int(value.id) if hasattr(value, 'id') else int(value)
        for value in query.scalar('tutor')
    })


class ProvinceListView(PublicGeographyView):
    @extend_schema(tags=['Địa giới hành chính'], responses={200: ProvinceSerializer(many=True)})
    def get(self, request):
        provinces = list(Province.objects.order_by('name'))
        active_tutor_ids = set(Tutor.objects(status=Tutor.STATUS_ACTIVE).scalar('id'))
        tutor_ids_by_province = {}
        for area in TutorTeachingArea.objects.select_related():
            tutor_id = int(area.tutor.id)
            if tutor_id in active_tutor_ids:
                tutor_ids_by_province.setdefault(int(area.province.id), set()).add(tutor_id)
        ward_count_by_province = {}
        for ward in Ward.objects.only('province'):
            ward_count_by_province[int(ward.province.id)] = ward_count_by_province.get(int(ward.province.id), 0) + 1
        request_count_by_province = {}
        active_subject_ids = set(Subject.objects(status=1).scalar('id'))
        for job in JobPosting.objects(status='open').only('province', 'subject'):
            if int(job.subject.id) in active_subject_ids:
                province_id = int(job.province.id)
                request_count_by_province[province_id] = request_count_by_province.get(province_id, 0) + 1
        result = []
        for province in provinces:
            province_id = int(province.id)
            result.append({
                'id': province_id, 'slug': province.slug, 'code': province.code,
                'name': province.name,
                'ward_count': ward_count_by_province.get(province_id, 0),
                'tutor_count': len(tutor_ids_by_province.get(province_id, set())),
                'teaching_request_count': request_count_by_province.get(province_id, 0),
            })
        return Response(result)


class ProvinceWardListView(PublicGeographyView):
    @extend_schema(tags=['Địa giới hành chính'], responses={200: WardSerializer(many=True)})
    def get(self, request, province_slug):
        province = Province.objects(slug=province_slug).first()
        if province is None:
            raise Http404
        wards = list(Ward.objects(province=province).order_by('name'))
        active_tutor_ids = set(Tutor.objects(status=Tutor.STATUS_ACTIVE).scalar('id'))
        tutor_ids_by_ward = {}
        for area in TutorTeachingArea.objects(province=province, ward__ne=None).select_related():
            tutor_id = int(area.tutor.id)
            if tutor_id in active_tutor_ids:
                tutor_ids_by_ward.setdefault(int(area.ward.id), set()).add(tutor_id)
        request_count_by_ward = {}
        active_subject_ids = set(Subject.objects(status=1).scalar('id'))
        for job in JobPosting.objects(province=province, status='open', ward__ne=None).only('ward', 'subject'):
            if int(job.subject.id) in active_subject_ids:
                ward_id = int(job.ward.id)
                request_count_by_ward[ward_id] = request_count_by_ward.get(ward_id, 0) + 1
        result = []
        for ward in wards:
            ward_id = int(ward.id)
            result.append({
                'id': ward_id, 'slug': ward.slug, 'code': ward.code,
                'name': ward.name, 'type': ward.type,
                'tutor_count': len(tutor_ids_by_ward.get(ward_id, set())),
                'teaching_request_count': request_count_by_ward.get(ward_id, 0),
            })
        return Response(result)


class AreaDetailView(PublicGeographyView):
    def get(self, request, province_slug, ward_slug=None):
        province = Province.objects(slug=province_slug).first()
        if province is None:
            raise Http404
        ward = Ward.objects(province=province, slug=ward_slug).first() if ward_slug else None
        if ward_slug and ward is None:
            raise Http404
        area_query = TutorTeachingArea.objects(province=province)
        job_query = JobPosting.objects(province=province, status='open')
        if ward is not None:
            area_query = area_query.filter(ward=ward)
            job_query = job_query.filter(ward=ward)
        tutor_ids = _active_tutor_ids(area_query)
        tutors = list(Tutor.objects(id__in=tutor_ids, status=Tutor.STATUS_ACTIVE).order_by('-rating_avg')) if tutor_ids else []
        subject_map = {}
        if tutors:
            for link in TutorSubject.objects(tutor__in=[tutor.id for tutor in tutors]).select_related():
                subject_map.setdefault(int(link.tutor.id), []).append(link.subject.name)
        active_subject_ids = list(Subject.objects(status=1).scalar('id'))
        jobs = (
            job_query.filter(subject__in=active_subject_ids).select_related()
            if active_subject_ids else []
        )
        return Response({
            'province': {'id': int(province.id), 'slug': province.slug, 'name': province.name},
            'ward': ({'id': int(ward.id), 'slug': ward.slug, 'name': ward.name, 'type': ward.type} if ward else None),
            'tutors': [{
                'id': int(tutor.id), 'slug': tutor.slug, 'name': tutor.name,
                'avatar': tutor.avatar, 'headline': tutor.headline,
                'teaching_mode': tutor.teaching_mode, 'rating_avg': float(tutor.rating_avg or 0),
                'subjects': subject_map.get(int(tutor.id), []),
            } for tutor in tutors],
            'teaching_requests': [{
                'id': int(job.id), 'slug': job.slug, 'title': job.title,
                'subject': job.subject.name, 'grade': job.grade,
                'budget_min': job.budget_min, 'budget_max': job.budget_max,
                'schedule_expect': job.schedule_expect,
            } for job in jobs],
        })


class ProvinceAreaDetailView(AreaDetailView):
    @extend_schema(
        tags=['Địa giới hành chính'], responses={200: AreaDetailSerializer},
        operation_id='geography_province_area_detail',
    )
    def get(self, request, province_slug):
        return super().get(request, province_slug)


class WardAreaDetailView(AreaDetailView):
    @extend_schema(
        tags=['Địa giới hành chính'], responses={200: AreaDetailSerializer},
        operation_id='geography_ward_area_detail',
    )
    def get(self, request, province_slug, ward_slug):
        return super().get(request, province_slug, ward_slug)
