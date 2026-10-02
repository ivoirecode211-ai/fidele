from django.urls import path

from . import views

urlpatterns = [
    path("patients/", views.SearchView.as_view()),
    path("patients/<int:pk>/", views.RecordView.as_view()),
    path("listes/<str:vue>/", views.ListesView.as_view()),
    path("fusion/", views.FusionView.as_view()),
]
