from django.contrib import admin

from .models import Movement, Product, Supplier


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "therapeutic_class", "stock", "threshold", "price", "unit"]
    list_editable = ["threshold", "price"]
    list_filter = ["category"]
    search_fields = ["name", "reference"]
    readonly_fields = ["stock"]  # le stock ne bouge que par des mouvements (module Stocks)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ["name", "contact", "phone", "products_count", "active"]
    search_fields = ["name", "contact"]


@admin.register(Movement)
class MovementAdmin(admin.ModelAdmin):
    """Historique : consultable, pas modifiable (il justifie chaque stock)."""
    list_display = ["reference", "date", "product", "type", "quantity", "stock_after", "motif", "user"]
    list_filter = ["type", "motif", "product"]
    search_fields = ["reference", "product__name", "patient", "supplier"]
    date_hierarchy = "date"

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False
