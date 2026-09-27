from django.db import models

class Patient(models.Model):
    SEX_CHOICES = [("M", "Masculin"), ("F", "Féminin"), ("O", "Autre")]
    BLOOD_CHOICES = [
        ("A+", "A+"), ("A-", "A-"), ("B+", "B+"), ("B-", "B-"),
        ("AB+", "AB+"), ("AB-", "AB-"), ("O+", "O+"), ("O-", "O-"),
    ]
    patient_number = models.CharField(max_length=30, unique=True)
    last_name = models.CharField(max_length=120)
    first_names = models.CharField(max_length=180)
    birth_date = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=1, choices=SEX_CHOICES)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    profession = models.CharField(max_length=120, blank=True)
    emergency_contact = models.CharField(max_length=180, blank=True)
    emergency_phone = models.CharField(max_length=30, blank=True)
    emergency_relationship = models.CharField(max_length=80, blank=True)
    nationality = models.CharField(max_length=80, blank=True)
    marital_status = models.CharField(max_length=30, blank=True)
    city = models.CharField(max_length=120, blank=True)
    locality = models.CharField(max_length=120, blank=True)
    blood_group = models.CharField(max_length=3, choices=BLOOD_CHOICES, blank=True)
    history = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    insurance = models.CharField(max_length=180, blank=True)
    insurance_number = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "patient"
        verbose_name_plural = "patients"
        ordering = ["last_name", "first_names"]

    def __str__(self):
        return f"{self.patient_number} — {self.last_name} {self.first_names}"
