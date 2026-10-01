from rest_framework import serializers


class NotificationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    message = serializers.CharField()
    audience = serializers.CharField()
    delivered_at = serializers.DateTimeField()
    sent_at = serializers.DateTimeField(allow_null=True)
    read_at = serializers.DateTimeField(allow_null=True)
    is_read = serializers.BooleanField()


class NotificationInboxSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = NotificationSerializer(many=True)


class NotificationReadSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    read_at = serializers.DateTimeField()


class NotificationReadAllSerializer(serializers.Serializer):
    updated_count = serializers.IntegerField()
    read_at = serializers.DateTimeField()
