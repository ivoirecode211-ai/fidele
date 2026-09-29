from django.db import transaction
from django.utils import timezone

from .models import Movement, Product


class StockError(Exception):
    pass


def next_reference(kind):
    prefix = "ENT" if kind == "Entrée" else "SOR"
    count = Movement.objects.filter(type=kind).count() + 1
    reference = f"{prefix}-{count:03d}"
    while Movement.objects.filter(reference=reference).exists():
        count += 1
        reference = f"{prefix}-{count:03d}"
    return reference


@transaction.atomic
def record_movement(*, product, kind, quantity, user, motif, date=None, **extra):
    """Seule façon de modifier un stock : le produit est verrouillé le temps du calcul."""
    product = Product.objects.select_for_update().get(pk=product.pk)
    if kind == "Sortie" and quantity > product.stock:
        raise StockError(f"Stock insuffisant pour {product.name}. Stock disponible : {product.stock}")
    product.stock = product.stock + quantity if kind == "Entrée" else product.stock - quantity
    product.save(update_fields=["stock"])
    return Movement.objects.create(
        reference=next_reference(kind), product=product, type=kind, quantity=quantity,
        stock_after=product.stock, motif=motif, date=date or timezone.localdate(), user=user, **extra,
    )


@transaction.atomic
def create_product(*, data, user):
    initial = data.pop("stock", 0)
    product = Product.objects.create(**data)
    if initial:
        record_movement(product=product, kind="Entrée", quantity=initial, user=user, motif="Stock initial")
    return Product.objects.get(pk=product.pk)


def dispense(*, prescription, user):
    """Sorties de stock d'une ordonnance servie : la quantité prescrite de chaque médicament du catalogue."""
    patient = f"{prescription.patient.last_name} {prescription.patient.first_names}"
    products = {p.name.lower().strip(): p for p in Product.objects.filter(category="Médicament")}
    matched = [
        (products[item.medicine.lower().strip()], max(item.quantity, 1))
        for item in prescription.items.all() if item.medicine.lower().strip() in products
    ]
    short = [product.name for product, quantity in matched if product.stock < quantity]
    if short:
        raise StockError(f"Stock insuffisant : {', '.join(short)}")
    for product, quantity in matched:
        record_movement(product=product, kind="Sortie", quantity=quantity, user=user, motif="Dispensation",
                        service="Pharmacie", patient=patient, prescription=prescription)
