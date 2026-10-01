from unittest.mock import patch
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory
from api.v1.content import BannerListView, ContactCreateView, BlogDetailView, ContactSerializer, published_posts
from core.documents import Banner as BannerDocument


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class ContentApiTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()
        self.payload = {'parent_name': 'Nguyễn An', 'email': 'an@example.com',
                        'phone': '0901234567', 'needs_description': 'Tôi cần được tư vấn.'}

    @patch('api.v1.content.Contact')
    def test_contact_saved_to_admin_collection_with_new_status(self, contact):
        response = ContactCreateView.as_view()(self.factory.post('/api/v1/contacts/', self.payload, format='json'))
        self.assertEqual(response.status_code, 201)
        contact.assert_called_once_with(**self.payload, status='new')
        contact.return_value.save.assert_called_once()
        self.assertNotIn('email', response.data)

    def test_contact_cannot_set_admin_status(self):
        serializer = ContactSerializer(data={**self.payload, 'status': 'closed'})
        self.assertFalse(serializer.is_valid())

    def test_invalid_email_and_blank_message(self):
        serializer = ContactSerializer(data={**self.payload, 'email': 'bad', 'needs_description': ' '})
        self.assertFalse(serializer.is_valid())

    @patch('api.v1.content.Subject')
    def test_inactive_subject_rejected(self, subject):
        subject.objects.return_value.first.return_value = None
        serializer = ContactSerializer(data={**self.payload, 'subject_id': 1})
        self.assertFalse(serializer.is_valid())
        subject.objects.assert_called_once()

    def test_contact_inbox_not_public(self):
        response = ContactCreateView.as_view()(self.factory.get('/api/v1/contacts/'))
        self.assertEqual(response.status_code, 405)

    @patch('api.v1.content.Contact')
    def test_contact_rate_limit(self, contact):
        for _ in range(5):
            response = ContactCreateView.as_view()(self.factory.post('/api/v1/contacts/', self.payload, format='json'))
            self.assertEqual(response.status_code, 201)
        response = ContactCreateView.as_view()(self.factory.post('/api/v1/contacts/', self.payload, format='json'))
        self.assertEqual(response.status_code, 429)
        self.assertEqual(contact.return_value.save.call_count, 5)

    @patch('api.v1.content.BlogCategory')
    @patch('api.v1.content.BlogPost')
    def test_public_query_excludes_drafts_and_inactive_categories(self, posts, categories):
        categories.objects.return_value.scalar.return_value = [2]
        published_posts()
        categories.objects.assert_called_once_with(status=1)
        args, kwargs = posts.objects.call_args
        self.assertEqual(kwargs['status'], 'published')
        self.assertIn('published_at__lte', kwargs)
        self.assertEqual(args[0].children[0].query, {'category__in': [2]})
        self.assertEqual(args[0].children[1].query, {'category': None})

    @patch('api.v1.content.Banner')
    def test_banner_list_only_queries_current_active_banners(self, banner):
        banner.objects.return_value.order_by.return_value = []
        response = BannerListView.as_view()(self.factory.get('/api/v1/banners/'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        args, kwargs = banner.objects.call_args
        self.assertEqual(kwargs, {'status': 'active'})
        query = args[0].to_query(BannerDocument)
        self.assertEqual(len(query['$and']), 2)
        self.assertTrue(all('$or' in condition for condition in query['$and']))
        banner.objects.return_value.order_by.assert_called_once_with('sort_order', '-created_at')

    @patch('api.v1.content.published_posts')
    def test_missing_or_hidden_blog_returns_404(self, posts):
        posts.return_value.filter.return_value.first.return_value = None
        response = BlogDetailView.as_view()(self.factory.get('/api/v1/blog/draft/'), slug='draft')
        self.assertEqual(response.status_code, 404)
