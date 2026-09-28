from rest_framework import serializers


class ProvinceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    code = serializers.CharField(allow_null=True)
    name = serializers.CharField()
    ward_count = serializers.IntegerField()
    tutor_count = serializers.IntegerField()
    teaching_request_count = serializers.IntegerField()


class WardSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    code = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    tutor_count = serializers.IntegerField()
    teaching_request_count = serializers.IntegerField()


class AreaTutorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    avatar = serializers.CharField(allow_null=True)
    headline = serializers.CharField(allow_null=True)
    teaching_mode = serializers.CharField()
    rating_avg = serializers.FloatField()
    subjects = serializers.ListField(child=serializers.CharField())


class AreaTeachingRequestSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    title = serializers.CharField()
    subject = serializers.CharField()
    grade = serializers.CharField(allow_null=True)
    budget_min = serializers.IntegerField(allow_null=True)
    budget_max = serializers.IntegerField(allow_null=True)
    schedule_expect = serializers.CharField(allow_null=True)


class AreaDetailSerializer(serializers.Serializer):
    province = serializers.DictField()
    ward = serializers.DictField(allow_null=True)
    tutors = AreaTutorSerializer(many=True)
    teaching_requests = AreaTeachingRequestSerializer(many=True)
