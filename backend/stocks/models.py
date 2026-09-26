from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

CATEGORIES = [(c, c) for c in ("Médicament", "Consommable", "Laboratoire")]


class Product(models.Model):
    """Produit du stock. La Pharmacie voit ceux de catégorie « Médicament »."""
    name = models.CharField(max_length=150, unique=True)
    category = models.CharField(max_length=30, choices=CATEGORIES)
    therapeutic_class = models.CharField(max_length=80, blank=True, help_text="Ex. Antalgique (Pharmacie).")
    reference = models.CharField(max_length=40, blank=True)
    unit = models.CharField(max_length=30, default="Boîte")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    stock = models.PositiveIntegerField(default=0)
    threshold = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=150, unique=True)
    contact = models.CharField(max_length=120)
    phone = models.CharField(max_length=40)
    products_count = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Movement(models.Model):
    TYPES = [("Entrée", "Entrée"), ("Sortie", "Sortie")]

    reference = models.CharField(max_length=20, unique=True)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="movements")
    type = models.CharField(max_length=10, choices=TYPES)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    stock_after = models.PositiveIntegerField()
    motif = models.CharField(max_length=80)
    date = models.DateField()
    supplier = models.CharField(max_length=150, blank=True)
    document_reference = models.CharField(max_length=60, blank=True)
    service = models.CharField(max_length=80, blank=True)
    patient = models.CharField(max_length=150, blank=True)
    observation = models.TextField(blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    prescription = models.ForeignKey(
        "prescriptions.Prescription", null=True, blank=True, on_delete=models.PROTECT, related_name="stock_movements"
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.reference
