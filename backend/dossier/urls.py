from django.urls import path

from . import views

urlpatterns = [
    path("patients/", views.SearchView.as_view()),
    path("patients/<int:pk>/", views.RecordView.as_view()),
]
