from django.urls import path
from rest_framework.routers import DefaultRouter

from . import medecine_views as medecine
from .views import ConsultationViewSet

router = DefaultRouter()
router.register("", ConsultationViewSet, basename="consultation")

# Avant le routeur : sinon « medecine/ » serait lu comme l'identifiant d'une consultation.
urlpatterns = [
    path("medecine/", medecine.FileView.as_view()),
    path("medecine/references/", medecine.ReferencesView.as_view()),
    path("medecine/suivi/", medecine.SuiviView.as_view()),
    path("medecine/conversations/", medecine.ConversationsView.as_view()),
    path("medecine/<int:pk>/", medecine.DossierView.as_view()),
    path("medecine/<int:pk>/etape/", medecine.EtapeView.as_view()),
    path("medecine/<int:pk>/terminer/", medecine.TerminerView.as_view()),
    path("medecine/<int:pk>/ia/", medecine.PropositionView.as_view()),
    path("medecine/<int:pk>/conversation/", medecine.ConversationView.as_view()),
] + router.urls
