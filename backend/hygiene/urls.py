from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("tasks/", views.TasksView.as_view()),
    path("tasks/<int:pk>/", views.TaskView.as_view()),
    path("tasks/<int:pk>/statut/", views.TaskStatusView.as_view()),
]
