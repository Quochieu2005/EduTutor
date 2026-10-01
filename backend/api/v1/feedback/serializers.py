from rest_framework import serializers


class ReviewCreateSerializer(serializers.Serializer):
    lesson_id = serializers.IntegerField(min_value=1)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=3000, required=False, allow_blank=True)


class ReviewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    lesson_id = serializers.IntegerField()
    student = serializers.CharField()
    tutor = serializers.CharField()
    rating = serializers.IntegerField()
    comment = serializers.CharField(allow_null=True)
    admin_reply = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField(allow_null=True)


class TutorQuestionCreateSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=3, max_length=3000)


class TutorQuestionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    tutor = serializers.CharField()
    student = serializers.CharField()
    content = serializers.CharField()
    answer = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField(allow_null=True)
    answered_at = serializers.DateTimeField(allow_null=True)


class ComplaintCreateSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=('lesson', 'tutor', 'student', 'payment', 'other'))
    target_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    target_label = serializers.CharField(max_length=250)
    content = serializers.CharField(min_length=10, max_length=3000)


class ComplaintSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    sender_type = serializers.CharField()
    target_type = serializers.CharField()
    target_id = serializers.IntegerField(allow_null=True)
    target_label = serializers.CharField()
    content = serializers.CharField()
    status = serializers.CharField()
    response_message = serializers.CharField(allow_null=True)
    response_sent_at = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()
