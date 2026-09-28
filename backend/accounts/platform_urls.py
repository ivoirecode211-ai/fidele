from django.urls import path

from . import platform_views as views

urlpatterns = [
    path("hopitaux/", views.HospitalsView.as_view()),
    path("hopitaux/code/", views.HospitalCodeView.as_view()),
    path("hopitaux/<int:pk>/", views.HospitalView.as_view()),
    path("administrateurs/", views.AdminsView.as_view()),
]
