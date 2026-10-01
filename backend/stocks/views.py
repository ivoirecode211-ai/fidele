from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from parcours.permissions import PharmacyAccess, RoleAccess

from .models import CATEGORIES, Movement, Product, Supplier
from .services import StockError, create_product, produits, record_movement


class StocksAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "PHARMACY", "STOCK"}


def person(user):
    return f"{user.last_name.upper()} {user.first_name}".strip() or user.username


def serialize_product(product):
    return {"id": f"{product.pk:03d}", "produit": product.name, "categorie": product.category,
            "stock": product.stock, "seuil": product.threshold}


def serialize_movement(movement):
    when = movement.created_at
    return {
        "id": movement.pk,
        "reference": movement.reference,
        "date": movement.date.strftime("%d/%m/%Y"),
        "heure": timezone.localtime(when).strftime("%H:%M"),
        "produitId": f"{movement.product_id:03d}",
        "produit": movement.product.name,
        "type": movement.type,
        "quantite": movement.quantity,
        "motif": movement.motif,
        "utilisateur": person(movement.user),
        "stockApres": movement.stock_after,
        "fournisseur": movement.supplier,
        "referenceDocument": movement.document_reference,
        "service": movement.service,
        "patient": movement.patient,
        "observation": movement.observation,
    }


def serialize_supplier(supplier, last_orders):
    last = last_orders.get(supplier.name.lower())
    return {
        "id": f"FOU-{supplier.pk:03d}",
        "fournisseur": supplier.name,
        "contact": supplier.contact,
        "telephone": supplier.phone,
        "produits": supplier.products_count,
        "derniereCommande": last.strftime("%d/%m/%Y") if last else "Aucune",
        "statut": "Actif" if supplier.active else "Inactif",
    }


def product_from_code(code, user):
    """Un produit du stock de l'hôpital de l'utilisateur ; celui d'un autre hôpital est introuvable."""
    return get_object_or_404(produits(hospital_of(user)), pk=int(str(code).lstrip("0") or 0))


class OverviewView(APIView):
    permission_classes = [StocksAccess]

    def get(self, request):
        hopital = hospital_of(request.user)
        last_orders = {
            row["supplier"].lower(): row["last"]
            for row in Movement.objects.filter(type="Entrée", product__hospital=hopital).exclude(supplier="")
            .values("supplier").annotate(last=Max("date"))
        }
        return Response({
            "produits": [serialize_product(p) for p in produits(hopital)],
            "mouvements": [serialize_movement(m) for m in
                           Movement.objects.filter(product__hospital=hopital).select_related("product", "user")[:500]],
            "fournisseurs": [serialize_supplier(s, last_orders) for s in Supplier.objects.filter(hospital=hopital)],
        })


class ProductInputSerializer(serializers.Serializer):
    produit = serializers.CharField(max_length=150)
    categorie = serializers.ChoiceField(choices=[c for c, _ in CATEGORIES])
    stock = serializers.IntegerField(min_value=0)
    seuil = serializers.IntegerField(min_value=0)

    def validate_produit(self, value):
        if produits(self.context["hospital"]).filter(name__iexact=value.strip()).exists():
            raise serializers.ValidationError("Ce produit existe déjà.")
        return value.strip()


class ProductsView(APIView):
    permission_classes = [StocksAccess]

    def post(self, request):
        serializer = ProductInputSerializer(data=request.data, context={"hospital": hospital_of(request.user)})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        product = create_product(
            data={"name": data["produit"], "category": data["categorie"], "stock": data["stock"],
                  "threshold": data["seuil"]},
            user=request.user, hospital=hospital_of(request.user),
        )
        return Response(serialize_product(product), status=status.HTTP_201_CREATED)


class MovementInputSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["Entrée", "Sortie"])
    produitId = serializers.CharField()
    quantite = serializers.IntegerField(min_value=1)
    motif = serializers.CharField(max_length=80)
    date = serializers.DateField()
    fournisseur = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    referenceDocument = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    service = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    patient = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    observation = serializers.CharField(required=False, allow_blank=True, default="")


class MovementsView(APIView):
    permission_classes = [StocksAccess]

    def post(self, request):
        serializer = MovementInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            movement = record_movement(
                product=product_from_code(data["produitId"], request.user), kind=data["type"], quantity=data["quantite"],
                user=request.user, motif=data["motif"], date=data["date"], supplier=data["fournisseur"],
                document_reference=data["referenceDocument"], service=data["service"],
                patient=data["patient"], observation=data["observation"],
            )
        except StockError as error:
            return Response({"quantite": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_movement(movement), status=status.HTTP_201_CREATED)


class SupplierInputSerializer(serializers.Serializer):
    fournisseur = serializers.CharField(max_length=150)
    contact = serializers.CharField(max_length=120)
    telephone = serializers.CharField(max_length=40)
    produits = serializers.IntegerField(min_value=0, required=False, default=0)
    statut = serializers.ChoiceField(choices=["Actif", "Inactif"], default="Actif")

    def to_internal_value(self, data):
        data = {**data, "produits": data.get("produits") or 0}
        return super().to_internal_value(data)


class SuppliersView(APIView):
    permission_classes = [StocksAccess]

    def post(self, request):
        serializer = SupplierInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        supplier, created = Supplier.objects.get_or_create(
            hospital=hospital_of(request.user), name=data["fournisseur"].strip(),
            defaults={"contact": data["contact"], "phone": data["telephone"],
                      "products_count": data["produits"], "active": data["statut"] == "Actif"},
        )
        if not created:
            return Response({"fournisseur": "Ce fournisseur existe déjà."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_supplier(supplier, {}), status=status.HTTP_201_CREATED)


class SupplierView(APIView):
    permission_classes = [StocksAccess]

    def delete(self, request, code):
        get_object_or_404(Supplier, pk=int(code.replace("FOU-", "") or 0), hospital=hospital_of(request.user)).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PharmacyProductsView(APIView):
    """Médicaments du stock, au format des produits de pharmacy.jsx."""
    permission_classes = [PharmacyAccess]

    def get(self, request):
        return Response([
            {"id": f"P{p.pk:03d}", "name": p.name, "category": p.therapeutic_class or "Médicament",
             "reference": p.reference, "stock": p.stock, "alertStock": p.threshold,
             "price": float(p.price), "unit": p.unit}
            for p in produits(hospital_of(request.user)).filter(category="Médicament")
        ])
