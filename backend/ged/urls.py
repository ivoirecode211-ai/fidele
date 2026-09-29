from django.urls import path

from . import views

urlpatterns = [
    path("references/", views.ReferencesView.as_view()),
    path("documents/", views.DocumentsView.as_view()),
    path("documents/<int:pk>/", views.DocumentView.as_view()),
    path("documents/<int:pk>/restaurer/", views.RestaurerView.as_view()),
    path("documents/<int:pk>/fichier/", views.FichierView.as_view()),
    path("recherche/", views.RechercheView.as_view()),
    path("identites/", views.IdentitesView.as_view()),
    path("identites/<int:pk>/lier/", views.LierView.as_view()),
    path("dossier/", views.DossierView.as_view()),
]
