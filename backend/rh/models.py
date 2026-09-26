from django.db import models


class Employee(models.Model):
    """Membre du personnel (module Ressources humaines)."""
    SEXES = [("Homme", "Homme"), ("Femme", "Femme")]
    CONTRACTS = [(c, c) for c in ("CDI", "CDD", "Stage", "Prestataire")]
    STATUSES = [(s, s) for s in ("Actif", "Congé", "Suspendu", "Inactif")]

    matricule = models.CharField(max_length=20, unique=True)
    nom = models.CharField(max_length=120)
    prenom = models.CharField(max_length=120)
    sexe = models.CharField(max_length=10, choices=SEXES, default="Homme")
    telephone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    poste = models.CharField(max_length=120)
    departement = models.CharField(max_length=120)
    dateEmbauche = models.DateField()
    contrat = models.CharField(max_length=20, choices=CONTRACTS, default="CDI")
    statut = models.CharField(max_length=20, choices=STATUSES, default="Actif")

    class Meta:
        verbose_name = "employé"
        verbose_name_plural = "employés"
        ordering = ["matricule"]

    def __str__(self):
        return f"{self.matricule} — {self.nom} {self.prenom}"
