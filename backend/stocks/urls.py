from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("produits/", views.ProductsView.as_view()),
    path("mouvements/", views.MovementsView.as_view()),
    path("fournisseurs/", views.SuppliersView.as_view()),
    path("fournisseurs/<str:code>/", views.SupplierView.as_view()),
    path("pharmacie/produits/", views.PharmacyProductsView.as_view()),
]
