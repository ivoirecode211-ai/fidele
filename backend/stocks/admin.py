from django.contrib import admin

from .models import Movement, Product, Supplier


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "therapeutic_class", "stock", "threshold", "price"]
    readonly_fields = ["stock"]  # le stock ne bouge que par des mouvements


admin.site.register(Supplier)
admin.site.register(Movement)
