from django.urls import path

from .views import (
    SubjectCategoryListView, SubjectDetailView, SubjectListView, SubjectTutorListView,
)

urlpatterns = [
    path('', SubjectListView.as_view(), name='api-subject-list'),
    path('categories/', SubjectCategoryListView.as_view(), name='api-subject-category-list'),
    path('<slug:slug>/', SubjectDetailView.as_view(), name='api-subject-detail'),
    path('<slug:slug>/tutors/', SubjectTutorListView.as_view(), name='api-subject-tutor-list'),
]
