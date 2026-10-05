"""Request and response serializers for tutors and recruitment postings."""

from rest_framework import serializers


def validate_bcrypt_password(value):
    if len(value.encode('utf-8')) > 72:
        raise serializers.ValidationError('Mật khẩu không được vượt quá 72 byte.')
    return value


class TutorLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=72, trim_whitespace=False, write_only=True)

    validate_password = staticmethod(validate_bcrypt_password)


class TutorChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=72, trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(min_length=8, max_length=72, trim_whitespace=False, write_only=True)
    confirm_password = serializers.CharField(min_length=8, max_length=72, trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        validate_bcrypt_password(attrs['current_password'])
        validate_bcrypt_password(attrs['new_password'])
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Mật khẩu xác nhận không trùng khớp.',
            })
        if attrs['new_password'] == attrs['current_password']:
            raise serializers.ValidationError({
                'new_password': 'Mật khẩu mới phải khác mật khẩu hiện tại.',
            })
        return attrs


class TutorRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(max_length=5000, write_only=True)


class TutorAccountSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    avatar = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    must_change_password = serializers.BooleanField()


class PublicTutorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    avatar = serializers.CharField(allow_null=True)
    birth_year = serializers.IntegerField(allow_null=True)
    gender = serializers.CharField(allow_null=True)
    hometown = serializers.CharField(allow_null=True)
    voice = serializers.CharField(allow_null=True)
    headline = serializers.CharField(allow_null=True)
    bio = serializers.CharField(allow_null=True)
    education_level = serializers.CharField(allow_null=True)
    major = serializers.CharField(allow_null=True)
    institution = serializers.CharField(allow_null=True)
    experience_years = serializers.IntegerField()
    hourly_rate_min = serializers.IntegerField(allow_null=True)
    hourly_rate_max = serializers.IntegerField(allow_null=True)
    teaching_mode = serializers.CharField()
    rating_avg = serializers.FloatField()
    rating_count = serializers.IntegerField()
    subjects = serializers.ListField(child=serializers.DictField())
    teaching_areas = serializers.ListField(child=serializers.DictField())


class PublicTutorQuerySerializer(serializers.Serializer):
    subject = serializers.SlugField(required=False, max_length=180)
    province = serializers.SlugField(required=False, max_length=180)
    ward = serializers.SlugField(required=False, max_length=180)
    teaching_mode = serializers.ChoiceField(choices=('online', 'offline', 'both'), required=False)
    search = serializers.CharField(max_length=150, required=False)


class TutorTokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField()
    tutor = TutorAccountSerializer()


class TutorPasswordChangedSerializer(serializers.Serializer):
    message = serializers.CharField()
    must_change_password = serializers.BooleanField()


class TutorProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    phone = serializers.RegexField(r'^\+?[0-9 () .-]{7,20}$', max_length=20, required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    birth_year = serializers.IntegerField(min_value=1900, max_value=2100, required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=('male', 'female', 'other'), required=False, allow_null=True)
    hometown = serializers.CharField(max_length=250, required=False, allow_blank=True)
    voice = serializers.CharField(max_length=150, required=False, allow_blank=True)
    headline = serializers.CharField(max_length=250, required=False, allow_blank=True)
    bio = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    education_level = serializers.CharField(max_length=150, required=False, allow_blank=True)
    major = serializers.CharField(max_length=250, required=False, allow_blank=True)
    institution = serializers.CharField(max_length=350, required=False, allow_blank=True)
    experience_years = serializers.IntegerField(min_value=0, required=False)
    hourly_rate_min = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    hourly_rate_max = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    teaching_mode = serializers.ChoiceField(choices=('online', 'offline', 'both'), required=False)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Họ và tên không được để trống.')
        return value

    def validate(self, attrs):
        tutor = self.context.get('tutor')
        minimum = attrs.get('hourly_rate_min', getattr(tutor, 'hourly_rate_min', None))
        maximum = attrs.get('hourly_rate_max', getattr(tutor, 'hourly_rate_max', None))
        if minimum is not None and maximum is not None and minimum > maximum:
            raise serializers.ValidationError({
                'hourly_rate_max': 'Học phí tối đa không được nhỏ hơn học phí tối thiểu.',
            })
        return attrs


class TutorProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(allow_null=True)
    avatar = serializers.CharField(allow_null=True)
    birth_year = serializers.IntegerField(allow_null=True)
    gender = serializers.CharField(allow_null=True)
    hometown = serializers.CharField(allow_null=True)
    voice = serializers.CharField(allow_null=True)
    headline = serializers.CharField(allow_null=True)
    bio = serializers.CharField(allow_null=True)
    education_level = serializers.CharField(allow_null=True)
    major = serializers.CharField(allow_null=True)
    institution = serializers.CharField(allow_null=True)
    experience_years = serializers.IntegerField()
    hourly_rate_min = serializers.IntegerField(allow_null=True)
    hourly_rate_max = serializers.IntegerField(allow_null=True)
    teaching_mode = serializers.CharField()
    is_verified = serializers.BooleanField()
    status = serializers.CharField()
    rating_avg = serializers.FloatField()
    rating_count = serializers.IntegerField()
    must_change_password = serializers.BooleanField()
    subjects = serializers.ListField(child=serializers.DictField())
    teaching_areas = serializers.ListField(child=serializers.DictField())


class RecruitmentQuerySerializer(serializers.Serializer):
    search = serializers.CharField(required=False, max_length=150)
    subject = serializers.SlugField(required=False, max_length=180)
    province = serializers.SlugField(required=False, max_length=180)
    ward = serializers.SlugField(required=False, max_length=180)
    # ``admin`` is the recruitment board. ``requester`` combines parent and
    # student postings on the separate public class board.
    posted_by = serializers.ChoiceField(
        required=False,
        choices=('admin', 'parent', 'student', 'requester'),
    )
    teaching_mode = serializers.ChoiceField(required=False, choices=('online', 'offline', 'both'))


class RecruitmentReferenceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()


class RecruitmentWardSerializer(RecruitmentReferenceSerializer):
    type = serializers.CharField()


class RecruitmentJobSerializer(serializers.Serializer):
    slug = serializers.CharField()
    posted_by_type = serializers.CharField()
    title = serializers.CharField()
    subject = RecruitmentReferenceSerializer()
    province = RecruitmentReferenceSerializer(allow_null=True)
    district = RecruitmentReferenceSerializer(allow_null=True)
    ward = RecruitmentWardSerializer(allow_null=True)
    grade = serializers.CharField(allow_null=True)
    description = serializers.CharField()
    budget_min = serializers.IntegerField(allow_null=True)
    budget_max = serializers.IntegerField(allow_null=True)
    schedule_expect = serializers.CharField(allow_null=True)
    teaching_mode = serializers.ChoiceField(choices=('online', 'offline', 'both'))
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    applications_count = serializers.SerializerMethodField()

    def get_applications_count(self, job):
        counts = self.context.get('applications_count')
        if counts is not None:
            return counts.get(str(job.id), 0)
        from tutors.documents import JobApplication
        return JobApplication.objects(job_posting=job).count()


class TutorRequestCreateSerializer(serializers.Serializer):
    """Payload for a signed-in student/parent tutor-finding request."""

    subject_id = serializers.IntegerField(min_value=1)
    province_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    ward_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    title = serializers.CharField(max_length=250)
    description = serializers.CharField(max_length=5000)
    grade = serializers.CharField(max_length=100, required=False, allow_blank=True)
    budget_min = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    budget_max = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    schedule_expect = serializers.CharField(max_length=500, required=False, allow_blank=True)
    teaching_mode = serializers.ChoiceField(
        choices=('online', 'offline', 'both'),
        required=False,
        default='both',
    )

    def validate(self, attrs):
        minimum = attrs.get('budget_min')
        maximum = attrs.get('budget_max')
        if minimum is not None and maximum is not None and minimum > maximum:
            raise serializers.ValidationError({'budget_max': 'Ngân sách tối đa phải lớn hơn hoặc bằng tối thiểu.'})
        if not attrs.get('title', '').strip() or not attrs.get('description', '').strip():
            raise serializers.ValidationError('Tiêu đề và mô tả nhu cầu không được để trống.')
        if attrs.get('teaching_mode', 'both') != 'online' and (not attrs.get('province_id') or not attrs.get('ward_id')):
            raise serializers.ValidationError({'province_id': 'Học trực tiếp cần chọn đầy đủ tỉnh/thành và xã/phường.'})
        return attrs


class TutorApplicationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    phone = serializers.RegexField(r'^\+?[0-9 () .-]{7,20}$', max_length=20)
    job_slug = serializers.CharField(max_length=180, required=False, allow_blank=True)
    cover_letter = serializers.CharField(max_length=3000, required=False, allow_blank=True)
    cv_file = serializers.FileField(required=False, allow_null=True)
    id_card_file = serializers.FileField(required=False, allow_null=True)
    education_proof_file = serializers.FileField(required=False, allow_null=True)

    def validate(self, attrs):
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError('Có trường dữ liệu không được hỗ trợ.')
        return attrs


class TutorApplicationResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    message = serializers.CharField()


class TutorAvailabilitySlotSerializer(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=0, max_value=6)
    period = serializers.ChoiceField(choices=('morning', 'afternoon', 'evening'))


class TutorAvailabilityUpdateSerializer(serializers.Serializer):
    slots = TutorAvailabilitySlotSerializer(many=True)

    def validate_slots(self, slots):
        keys = [(slot['weekday'], slot['period']) for slot in slots]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError('Lịch rảnh không được chứa khung giờ trùng nhau.')
        return slots


class TutorAvailabilityResponseSerializer(serializers.Serializer):
    tutor = RecruitmentReferenceSerializer()
    slots = TutorAvailabilitySlotSerializer(many=True)


class TutorSubjectChangeRequestSerializer(serializers.Serializer):
    subject_id = serializers.IntegerField(min_value=1)
    action = serializers.ChoiceField(choices=('add', 'remove'))
    level = serializers.CharField(max_length=150, required=False, allow_blank=True)
    price_per_hour = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['action'] == 'add' and attrs.get('price_per_hour') is None:
            # The fee is optional in the database, but requiring it here gives
            # Admin enough information to approve a new teaching subject.
            raise serializers.ValidationError({'price_per_hour': 'Vui lòng nhập học phí dự kiến cho môn muốn thêm.'})
        return attrs


class TutorSubjectChangeRequestResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    subject = RecruitmentReferenceSerializer()
    action = serializers.CharField()
    level = serializers.CharField(allow_null=True)
    price_per_hour = serializers.IntegerField(allow_null=True)
    note = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    review_note = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()


class ClassApplicationSerializer(serializers.Serializer):
    cover_letter = serializers.CharField(max_length=3000, required=False, allow_blank=True)


class ClassApplicationResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    job_slug = serializers.CharField()
    status = serializers.CharField()
    message = serializers.CharField()


class MyClassApplicationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    job_slug = serializers.CharField()
    status = serializers.CharField()
    cover_letter = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
