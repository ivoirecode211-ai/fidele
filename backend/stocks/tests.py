from django.contrib.auth import get_user_model
from django.utils import timezone

from parcours.tests import ParcoursBase
from stocks.models import Product

User = get_user_model()


class StocksTests(ParcoursBase):
    def setUp(self):
        super().setUp()
        self.magasinier = User.objects.create_user(username="stk", password="x", role="STOCK", first_name="Paul", last_name="Nguessan")
        self.as_user(self.magasinier)

    def product(self, **overrides):
        data = {"produit": "Paracétamol 500 mg", "categorie": "Médicament", "stock": 2, "seuil": 1}
        data.update(overrides)
        response = self.client.post("/api/stocks/produits/", data, format="json")
        if response.status_code == 201:
            self.product_id = response.data["id"]
        return response

    def movement(self, **overrides):
        data = {"type": "Sortie", "produitId": self.product_id, "quantite": 1, "motif": "Consultation",
                "date": timezone.localdate().isoformat(), "service": "Consultation"}
        data.update(overrides)
        return self.client.post("/api/stocks/mouvements/", data, format="json")

    def test_product_creation_records_initial_stock_movement(self):
        response = self.product()
        self.assertEqual(response.data, {"id": self.product_id, "produit": "Paracétamol 500 mg", "categorie": "Médicament", "stock": 2, "seuil": 1})
        self.assertRegex(self.product_id, r"^\d{3,}$")
        movement = self.client.get("/api/stocks/overview/").data["mouvements"][0]
        self.assertEqual((movement["reference"], movement["motif"], movement["stockApres"], movement["utilisateur"]),
                         ("ENT-001", "Stock initial", 2, "NGUESSAN Paul"))
        self.assertEqual(self.product().status_code, 400)

    def test_movements_update_stock_and_refuse_overdraft(self):
        self.product()
        self.assertEqual(self.movement(quantite=2).data["stockApres"], 0)
        self.assertIn("Stock insuffisant", str(self.movement().data))
        entry = self.movement(type="Entrée", quantite=10, motif="Livraison", fournisseur="MedEquip CI").data
        self.assertEqual((entry["reference"], entry["stockApres"]), ("ENT-002", 10))

    def test_suppliers_last_order_comes_from_entries(self):
        self.product()
        self.client.post("/api/stocks/fournisseurs/", {"fournisseur": "MedEquip CI", "contact": "Aya", "telephone": "0500"}, format="json")
        self.movement(type="Entrée", quantite=5, motif="Livraison", fournisseur="MedEquip CI")
        supplier = self.client.get("/api/stocks/overview/").data["fournisseurs"][0]
        self.assertEqual(supplier["derniereCommande"], timezone.localdate().strftime("%d/%m/%Y"))
        self.assertEqual(self.client.delete(f"/api/stocks/fournisseurs/{supplier['id']}/").status_code, 204)

    def test_serving_a_prescription_takes_medicines_out_of_stock(self):
        self.product(stock=1)
        self.envoyer_en_consultation()
        self.valider(traitement="Paracétamol 500 mg\nVitamine C")
        self.as_user(self.pharmacien)
        self.assertEqual(self.client.get("/api/stocks/pharmacie/produits/").data[0]["stock"], 1)
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]["id"]
        self.assertEqual(self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/servir/").status_code, 200)
        self.assertEqual(Product.objects.get().stock, 0)
        self.as_user(self.magasinier)
        out = self.client.get("/api/stocks/overview/").data["mouvements"][0]
        self.assertEqual((out["motif"], out["patient"], out["service"]), ("Dispensation", "TRAORE Awa", "Pharmacie"))

    def test_out_of_stock_blocks_dispensation(self):
        self.product(stock=0)
        self.envoyer_en_consultation()
        self.valider(traitement="Paracétamol 500 mg")
        self.as_user(self.pharmacien)
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]["id"]
        response = self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/servir/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Stock insuffisant", response.data["detail"])

    def test_roles(self):
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/stocks/overview/").status_code, 403)
