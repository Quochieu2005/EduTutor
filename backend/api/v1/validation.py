"""Shared request validation helpers for public API query strings."""

from rest_framework import serializers


class SafeQuerySerializer(serializers.Serializer):
    """Reject Mongo-style operator keys before any query is constructed.

    Query serializers already allow pagination parameters that are consumed by
    DRF itself. The explicit operator check closes the dangerous gap where a
    parameter such as ``search[$ne]`` or ``name__regex`` would otherwise be
    silently ignored by the serializer and look like an accepted filter.
    """

    def validate(self, attrs):
        suspicious = [
            str(key) for key in self.initial_data.keys()
            if any(token in str(key) for token in ('$', '[', ']', '__', '.'))
        ]
        if suspicious:
            raise serializers.ValidationError({
                'detail': 'Tham số tìm kiếm không hợp lệ.',
            })
        return attrs
