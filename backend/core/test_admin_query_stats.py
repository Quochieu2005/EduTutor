from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import MagicMock

from core.admin_query_stats import reference_counts


class ReferenceCountsTests(TestCase):
    def test_single_aggregate_uses_stored_field_and_preserves_counts(self):
        model = MagicMock()
        model._fields = {'subject': SimpleNamespace(db_field='subject_id')}
        model.objects.order_by.return_value.aggregate.return_value = [
            {'_id': 4, 'count': 3}, {'_id': 9, 'count': 1},
        ]
        counts = reference_counts(model, 'subject')
        self.assertEqual(counts, {4: 3, 9: 1})
        self.assertEqual(counts.get(10, 0), 0)
        model.objects.order_by.return_value.aggregate.assert_called_once_with([
            {'$group': {'_id': '$subject_id', 'count': {'$sum': 1}}},
        ])
        model.objects.assert_not_called()

    def test_empty_collection(self):
        model = MagicMock()
        model._fields = {'payment': SimpleNamespace(db_field='payment_id')}
        model.objects.order_by.return_value.aggregate.return_value = []
        self.assertEqual(reference_counts(model, 'payment'), {})
