from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("users/", views.UsersView.as_view()),
    path("users/<int:pk>/", views.UserView.as_view()),
    path("documents/", views.DocumentsView.as_view()),
]
