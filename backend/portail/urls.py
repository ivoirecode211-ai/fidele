from django.urls import path

from . import views

urlpatterns = [
    # Espace patient (jeton « Patient »).
    path("connexion/", views.LoginView.as_view()),
    path("pin/", views.PinView.as_view()),
    path("accueil/", views.HomeView.as_view()),
    path("dossier/", views.RecordView.as_view()),
    path("rendez-vous/", views.AppointmentsView.as_view()),
    path("medicaments/", views.MedicinesView.as_view()),
    path("medicaments/<int:item_id>/rappel/", views.ReminderView.as_view()),
    path("rappels/<int:reminder_id>/prise/", views.IntakeView.as_view()),
    path("messages/", views.ThreadsView.as_view()),
    path("messages/<int:doctor_id>/", views.ThreadView.as_view()),
    path("notifications/", views.PushView.as_view()),
    path("notifications/test/", views.PushTestView.as_view()),
    # Personnel (jeton « Bearer »).
    path("acces/", views.AccessListView.as_view()),
    path("acces/<int:pk>/<str:action>/", views.AccessActionView.as_view()),
    path("medecin/messages/", views.DoctorThreadsView.as_view()),
    path("medecin/messages/<int:patient_id>/", views.DoctorThreadView.as_view()),
]
