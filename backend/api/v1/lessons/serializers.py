"""Validation contracts for student/tutor schedule negotiation."""

from datetime import timedelta

from rest_framework import serializers


class WeeklyScheduleSlotSerializer(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=0, max_value=6)
    period = serializers.ChoiceField(choices=('morning', 'afternoon', 'evening'))
    startTime = serializers.TimeField(input_formats=['%H:%M'])
    endTime = serializers.TimeField(input_formats=['%H:%M'])

    def validate(self, attrs):
        if attrs['startTime'] >= attrs['endTime']:
            raise serializers.ValidationError({'endTime': 'Giờ kết thúc phải sau giờ bắt đầu.'})
        hour = attrs['startTime'].hour
        end_hour = attrs['endTime'].hour
        in_period = (
            (attrs['period'] == 'morning' and hour >= 5 and end_hour <= 12)
            or (attrs['period'] == 'afternoon' and hour >= 12 and end_hour <= 18)
            or (attrs['period'] == 'evening' and hour >= 18 and end_hour <= 23)
        )
        if not in_period:
            raise serializers.ValidationError('Giờ học phải nằm trọn trong buổi sáng, chiều hoặc tối đã chọn.')
        return attrs


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
    provinceId = serializers.IntegerField(min_value=1, required=False)
    wardId = serializers.IntegerField(min_value=1, required=False)
    address = serializers.CharField(max_length=350, required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get('subjectId') and not attrs.get('subject'):
            raise serializers.ValidationError({'subject': 'Vui lòng chọn môn học.'})
        if attrs['preferredTime'] >= attrs['endTime']:
            raise serializers.ValidationError({'endTime': 'Giờ kết thúc phải sau giờ bắt đầu.'})
        if attrs['mode'] == 'online' and not attrs.get('meetingUrl'):
            raise serializers.ValidationError({'meetingUrl': 'Buổi học trực tuyến cần liên kết học.'})
        if attrs['mode'] == 'offline' and not attrs.get('location'):
            raise serializers.ValidationError({'location': 'Buổi học trực tiếp cần địa điểm.'})
        structured_location = any(attrs.get(key) for key in ('provinceId', 'wardId', 'address'))
        if attrs['mode'] == 'offline' and structured_location and not all(
            attrs.get(key) for key in ('provinceId', 'wardId', 'address')
        ):
            raise serializers.ValidationError('Buổi học trực tiếp cần đủ tỉnh/thành, xã/phường và địa chỉ cụ thể.')
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


class LessonAttendanceSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=('completed', 'no_show'))


class ScheduleProposalSerializer(serializers.Serializer):
    preferredDate = serializers.DateField()
    preferredTime = serializers.TimeField(input_formats=['%H:%M'])
    endTime = serializers.TimeField(input_formats=['%H:%M'])
    mode = serializers.ChoiceField(choices=('online', 'offline'))
    meetingUrl = serializers.URLField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=500, required=False, allow_blank=True)
    provinceId = serializers.IntegerField(min_value=1, required=False)
    wardId = serializers.IntegerField(min_value=1, required=False)
    address = serializers.CharField(max_length=350, required=False, allow_blank=True)
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    weeklySlots = WeeklyScheduleSlotSerializer(many=True, required=False)
    recurrenceEndDate = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs['preferredTime'] >= attrs['endTime']:
            raise serializers.ValidationError({'endTime': 'Giờ kết thúc phải sau giờ bắt đầu.'})
        if attrs['mode'] == 'online' and not attrs.get('meetingUrl'):
            raise serializers.ValidationError({'meetingUrl': 'Buổi học trực tuyến cần liên kết học.'})
        if attrs['mode'] == 'offline' and not attrs.get('location'):
            raise serializers.ValidationError({'location': 'Buổi học trực tiếp cần địa điểm.'})
        structured_location = any(attrs.get(key) for key in ('provinceId', 'wardId', 'address'))
        if attrs['mode'] == 'offline' and structured_location and not all(
            attrs.get(key) for key in ('provinceId', 'wardId', 'address')
        ):
            raise serializers.ValidationError('Buổi học trực tiếp cần đủ tỉnh/thành, xã/phường và địa chỉ cụ thể.')
        slots = attrs.get('weeklySlots') or []
        keys = [(slot['weekday'], slot['period']) for slot in slots]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError({'weeklySlots': 'Không được chọn trùng một ngày và buổi học.'})
        if attrs.get('recurrenceEndDate') and attrs['recurrenceEndDate'] < attrs['preferredDate']:
            raise serializers.ValidationError({'recurrenceEndDate': 'Ngày kết thúc phải sau ngày bắt đầu.'})
        if attrs.get('recurrenceEndDate') and attrs['recurrenceEndDate'] > attrs['preferredDate'] + timedelta(days=31):
            raise serializers.ValidationError({'recurrenceEndDate': 'Lịch học chỉ được tạo tối đa một tháng từ ngày bắt đầu.'})
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
    provinceId = serializers.CharField(allow_blank=True)
    wardId = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    createdAt = serializers.CharField()
    source = serializers.CharField()
    proposedBy = serializers.CharField()
    proposalVersion = serializers.IntegerField()
    studentConfirmed = serializers.BooleanField()
    tutorConfirmed = serializers.BooleanField()
    weeklySlots = WeeklyScheduleSlotSerializer(many=True, required=False)
    recurrenceEndDate = serializers.CharField(allow_blank=True)
    proposalNote = serializers.CharField(allow_blank=True)
