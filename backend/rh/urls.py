from django.urls import path

from . import views

urlpatterns = [
    path("employes/", views.EmployeesView.as_view()),
    path("employes/<int:pk>/", views.EmployeeView.as_view()),
]
