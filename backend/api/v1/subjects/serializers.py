from rest_framework import serializers

from api.v1.validation import SafeQuerySerializer


class SubjectQuerySerializer(SafeQuerySerializer):
    search = serializers.CharField(required=False, max_length=150)
    category = serializers.CharField(required=False, max_length=150)


class SubjectSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    category = serializers.CharField(allow_null=True)
    level = serializers.CharField(allow_null=True)
    tutor_count = serializers.IntegerField()


class SubjectCategorySerializer(serializers.Serializer):
    name = serializers.CharField()
    subject_count = serializers.IntegerField()
    tutor_count = serializers.IntegerField()


class SubjectTutorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    avatar = serializers.CharField(allow_null=True)
    headline = serializers.CharField(allow_null=True)
    teaching_mode = serializers.CharField()
    rating_avg = serializers.FloatField()
    rating_count = serializers.IntegerField()
    level = serializers.CharField(allow_null=True)
    price_per_hour = serializers.IntegerField(allow_null=True)
