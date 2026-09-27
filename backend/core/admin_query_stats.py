"""Small aggregate queries used by admin lists instead of per-row lookups."""


def reference_counts(document_class, field_name):
    """Count stored relation rows, preserving the existing per-row count meaning.

    Use the persisted field name (e.g. subject_id), not the Python attribute.
    No related documents need to be downloaded or dereferenced for a count.
    """
    db_field = document_class._fields[field_name].db_field
    groups = document_class.objects.order_by().aggregate([
        {'$group': {'_id': f'${db_field}', 'count': {'$sum': 1}}},
    ])
    return {row['_id']: row['count'] for row in groups}
