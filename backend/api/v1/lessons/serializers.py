"""Validation contracts for student/tutor schedule negotiation."""

from rest_framework import serializers


class LearningRequestCreateSerializer(serializers.Serializer):
    tutorId = serializers.IntegerField(min_value=1)
    subjectId = serializers.IntegerField(min_value=1, required=False)
    subject = serializers.CharField(max_length=150, required=False)
    message = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    preferredDate = serializers.DateField()
    preferredTime = serializers.TimeField(input_formats=['%H:%M'])
    endTime = serializers.TimeField(input_formats=['%H:%M'])
    mode = serializers.ChoiceField(choices=('online', 'offline'))
    meetingUrl = serializers.URLField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get('subjectId') and not attrs.get('subject'):
            raise serializers.ValidationError({'subject': 'Vui lòng chọn môn học.'})
        if attrs['preferredTime'] >= attrs['endTime']:
            raise serializers.ValidationError({'endTime': 'Giờ kết thúc phải sau giờ bắt đầu.'})
        if attrs['mode'] == 'online' and not attrs.get('meetingUrl'):
            raise serializers.ValidationError({'meetingUrl': 'Buổi học trực tuyến cần liên kết học.'})
        if attrs['mode'] == 'offline' and not attrs.get('location'):
            raise serializers.ValidationError({'location': 'Buổi học trực tiếp cần địa điểm.'})
        return attrs


class TutorInvitationSerializer(serializers.Serializer):
    contact_name = serializers.CharField(max_length=150)
    contact_phone = serializers.RegexField(r'^\+?[0-9 () .-]{7,20}$', max_length=20)
    student_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    grade_subject = serializers.CharField(max_length=200, required=False, allow_blank=True)
    message = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class LearningRequestStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=('accepted', 'declined', 'cancelled', 'completed', 'no_show')
    )


class ScheduleProposalSerializer(serializers.Serializer):
    preferredDate = serializers.DateField()
    preferredTime = serializers.TimeField(input_formats=['%H:%M'])
    endTime = serializers.TimeField(input_formats=['%H:%M'])
    mode = serializers.ChoiceField(choices=('online', 'offline'))
    meetingUrl = serializers.URLField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['preferredTime'] >= attrs['endTime']:
            raise serializers.ValidationError({'endTime': 'Giờ kết thúc phải sau giờ bắt đầu.'})
        if attrs['mode'] == 'online' and not attrs.get('meetingUrl'):
            raise serializers.ValidationError({'meetingUrl': 'Buổi học trực tuyến cần liên kết học.'})
        if attrs['mode'] == 'offline' and not attrs.get('location'):
            raise serializers.ValidationError({'location': 'Buổi học trực tiếp cần địa điểm.'})
        return attrs


class LearningRequestResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    studentId = serializers.CharField()
    studentName = serializers.CharField()
    studentPhone = serializers.CharField(allow_null=True)
    tutorId = serializers.CharField()
    tutorName = serializers.CharField()
    subject = serializers.CharField()
    message = serializers.CharField()
    preferredDate = serializers.CharField()
    preferredTime = serializers.CharField()
    endTime = serializers.CharField()
    mode = serializers.ChoiceField(choices=('online', 'offline'), allow_null=True)
    location = serializers.CharField(allow_null=True)
    meetingUrl = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    createdAt = serializers.CharField()
    source = serializers.CharField()
    proposedBy = serializers.CharField()
    proposalVersion = serializers.IntegerField()
    studentConfirmed = serializers.BooleanField()
    tutorConfirmed = serializers.BooleanField()
