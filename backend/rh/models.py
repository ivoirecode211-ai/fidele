from django.db import models


class Employee(models.Model):
    """Membre du personnel (module Ressources humaines)."""
    hospital = models.ForeignKey("accounts.Hospital", null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="+", verbose_name="hôpital")
    SEXES = [("Homme", "Homme"), ("Femme", "Femme")]
    CONTRACTS = [(c, c) for c in ("CDI", "CDD", "Stage", "Prestataire")]
    STATUSES = [(s, s) for s in ("Actif", "Congé", "Suspendu", "Inactif")]

    matricule = models.CharField(max_length=20)
    nom = models.CharField(max_length=120)
    prenom = models.CharField(max_length=120)
    sexe = models.CharField(max_length=10, choices=SEXES, default="Homme")
    telephone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    poste = models.CharField(max_length=120)
    departement = models.CharField(max_length=120)
    dateEmbauche = models.DateField()
    contrat = models.CharField(max_length=20, choices=CONTRACTS, default="CDI")
    # Fin d'un CDD, d'un stage ou d'une prestation : le sous-module « Contrats » prévient avant l'échéance.
    dateFinContrat = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUSES, default="Actif")

    class Meta:
        verbose_name = "employé"
        verbose_name_plural = "employés"
        ordering = ["matricule"]
        constraints = [models.UniqueConstraint(fields=["hospital", "matricule"], name="rh_matricule_unique_par_hopital")]

    def __str__(self):
        return f"{self.matricule} — {self.nom} {self.prenom}"

    def save(self, *args, **kwargs):
        if self.hospital_id is None:
            from accounts.tenancy import premier_hopital_id

            self.hospital_id = premier_hopital_id()
        super().save(*args, **kwargs)



class Absence(models.Model):
    """Un congé ou une absence d'un employé (sous-module « Congés et absences »)."""
    TYPES = [(t, t) for t in ("Congé annuel", "Maladie", "Maternité", "Paternité", "Formation", "Permission", "Absence injustifiée")]

    hospital = models.ForeignKey("accounts.Hospital", on_delete=models.PROTECT, related_name="+")
    employe = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="absences")
    type = models.CharField(max_length=30, choices=TYPES, default="Congé annuel")
    debut = models.DateField()
    fin = models.DateField()
    motif = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "absence"
        verbose_name_plural = "congés et absences"
        ordering = ["-debut"]

    def __str__(self):
        return f"{self.employe} — {self.type} du {self.debut} au {self.fin}"
