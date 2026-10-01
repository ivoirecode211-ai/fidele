from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Equipment, EquipmentScan, Intervention, next_maintenance

OPEN = ("En attente", "En cours")
# Icône lucide affichée pour chaque catégorie (Maintenance.jsx).
CATEGORY_ICONS = {
    "Électricité": "Zap",
    "Climatisation": "Wind",
    "Stérilisation": "Settings",
    "Froid médical": "Droplets",
    "Gaz médicaux": "Activity",
    "Infrastructure": "Building2",
    "Imagerie médicale": "ScanLine",
    "Laboratoire": "FlaskConical",
    "Monitoring": "Activity",
    "Bloc opératoire": "Scissors",
    "Mobilier médical": "BedDouble",
    "Informatique": "Monitor",
}


def fmt_date(value):
    return value.strftime("%d/%m/%Y") if value else "—"


def equipment_state(equipment):
    """État déduit des interventions ouvertes : la plus grave l'emporte."""
    open_items = [item for item in equipment.interventions.all() if item.status in OPEN]
    critical = next((item for item in open_items if item.priority == "Critique"), None)
    high = next((item for item in open_items if item.priority == "Haute"), None)
    if critical:
        return "Critique", critical
    if high:
        return "Attention", high
    return "Opérationnel", None


def serialize_equipment(equipment):
    status, cause = equipment_state(equipment)
    done = [item.date for item in equipment.interventions.all() if item.status == "Terminée"]
    last_done = max(done) if done else None
    return {
        "id": equipment.pk,
        "name": equipment.name,
        "category": equipment.category,
        "icon": CATEGORY_ICONS.get(equipment.category, "Wrench"),
        "status": status,
        "location": equipment.location or "—",
        "lastMaintenance": fmt_date(last_done),
        "nextMaintenance": fmt_date(next_maintenance(equipment, last_done)),
        "uptime": f"{equipment.availability}%",
        "issue": cause.description if cause else "",
        "priority": cause.priority if cause else "",
    }


def serialize_intervention(item):
    return {
        "id": item.pk,
        "equipment": item.equipment.name,
        "category": item.equipment.category,
        "technician": item.technician,
        "date": fmt_date(item.date),
        "time": item.time.strftime("%H:%M") if item.time else "",
        "type": item.type,
        "status": item.status,
        "priority": item.priority,
        "description": item.description,
    }


def overview(hospital):
    equipments = list(Equipment.objects.filter(hospital=hospital).prefetch_related("interventions"))
    interventions = list(Intervention.objects.filter(equipment__hospital=hospital)
                         .select_related("equipment", "technician_user", "closed_by", "created_by")
                         .order_by("-date", "-time", "-id"))
    park = [serialize_equipment(equipment) for equipment in equipments]
    today = timezone.localdate()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    critical = [
        {"name": row["name"], "location": row["location"], "issue": row["issue"], "priority": row["priority"]}
        for row in park if row["status"] != "Opérationnel"
    ]
    return {
        "stats": {
            "monthInterventions": sum(1 for i in interventions if (i.date.year, i.date.month) == (today.year, today.month)),
            "pending": sum(1 for i in interventions if i.status == "En attente"),
            "critical": len(critical),
            "plannedThisWeek": sum(1 for i in interventions if i.status in OPEN and week_start <= i.date <= week_end),
        },
        "equipmentStatus": {
            "total": len(park),
            "operational": sum(1 for row in park if row["status"] == "Opérationnel"),
            "attention": sum(1 for row in park if row["status"] == "Attention"),
            "critical": sum(1 for row in park if row["status"] == "Critique"),
        },
        # Avec le compte rendu et l'appareil : l'historique se lit sans ouvrir chaque fiche.
        "interventions": [{**intervention_detail(item), "equipmentId": item.equipment_id, "code": item.equipment.code,
                           "token": str(item.equipment.qr_token), "isoDate": item.date.isoformat()}
                          for item in interventions],
        "equipments": park,
        "criticalEquipments": critical,
    }


@transaction.atomic
def create_intervention(*, data, user, hospital):
    """L'équipement est retrouvé par son nom dans l'hôpital ; s'il n'existe pas, il rejoint le parc."""
    equipment = Equipment.objects.filter(hospital=hospital, name__iexact=data["equipment"]).first()
    if equipment is None:
        equipment = create_equipment(data={"name": data["equipment"], "category": data["category"]},
                                     user=user, hospital=hospital)
    return Intervention.objects.create(
        equipment=equipment,
        technician=data["technician"],
        technician_user=data.get("technician_user"),
        company=data.get("company", ""),
        date=data["date"],
        time=data.get("time"),
        type=data["type"],
        priority=data["priority"],
        description=data.get("description", ""),
        created_by=user,
    )


def change_status(*, intervention, status):
    intervention.status = status
    intervention.completed_at = timezone.now() if status == "Terminée" else None
    intervention.save(update_fields=["status", "completed_at"])
    return intervention


# ------------------------------------------------------------------ parc et QR codes

def next_code(hospital):
    """EQ-<code de l'hôpital>-0001, EQ-MAS-0002… : lisible sur l'étiquette et au téléphone."""
    prefix = f"EQ-{hospital.code}-"
    numbers = [int(code.removeprefix(prefix)) for code in
               Equipment.objects.filter(code__startswith=prefix).values_list("code", flat=True)
               if code.removeprefix(prefix).isdigit()]
    return f"{prefix}{max(numbers, default=0) + 1:04d}"


@transaction.atomic
def create_equipment(*, data, user, hospital):
    return Equipment.objects.create(hospital=hospital, code=next_code(hospital), created_by=user, **data)


def regenerate_token(equipment):
    """Nouvelle étiquette : l'ancienne ne mène plus nulle part."""
    import uuid

    equipment.qr_token = uuid.uuid4()
    equipment.save(update_fields=["qr_token"])
    return equipment


def person(user):
    if user is None:
        return ""
    return f"{user.last_name.upper()} {user.first_name}".strip() or user.username


def equipment_row(equipment):
    """Ligne du parc (module QR Code) : identité, état et dernière maintenance."""
    status, cause = equipment_state(equipment)
    done = [item.date for item in equipment.interventions.all() if item.status == "Terminée"]
    last_done = max(done) if done else None
    return {
        "id": equipment.pk,
        "code": equipment.code,
        "token": str(equipment.qr_token),
        "name": equipment.name,
        "category": equipment.category,
        "icon": CATEGORY_ICONS.get(equipment.category, "Wrench"),
        "brand": equipment.brand,
        "model": equipment.model_name,
        "serialNumber": equipment.serial_number,
        "supplier": equipment.supplier,
        "acquisition": equipment.acquisition,
        "installationDate": equipment.installation_date.isoformat() if equipment.installation_date else "",
        "warrantyEnd": equipment.warranty_end.isoformat() if equipment.warranty_end else "",
        "service": equipment.service,
        "location": equipment.location,
        "state": equipment.state,
        "notes": equipment.notes,
        "maintenanceIntervalDays": equipment.maintenance_interval_days,
        "status": status,
        "issue": cause.description if cause else "",
        "lastMaintenance": fmt_date(last_done),
        "nextMaintenance": fmt_date(next_maintenance(equipment, last_done)),
        "interventionsCount": len(equipment.interventions.all()),
    }


def intervention_detail(item):
    return {
        **serialize_intervention(item),
        "technicianAccount": person(item.technician_user),
        "company": item.company,
        "diagnosis": item.diagnosis,
        "workDone": item.work_done,
        "parts": item.parts,
        "cost": float(item.cost) if item.cost is not None else None,
        "durationMinutes": item.duration_minutes,
        "completedAt": timezone.localtime(item.completed_at).strftime("%d/%m/%Y %H:%M") if item.completed_at else "",
        "closedBy": person(item.closed_by),
        "createdBy": person(item.created_by),
    }


def equipment_sheet(equipment):
    """Fiche complète, telle qu'elle s'affiche au scan de l'étiquette."""
    interventions = (equipment.interventions.select_related("technician_user", "closed_by", "created_by", "equipment")
                     .order_by("-date", "-time", "-id"))
    today = timezone.localdate()
    finished = [i for i in interventions if i.status == "Terminée"]
    return {
        **equipment_row(equipment),
        "hospital": equipment.hospital.name if equipment.hospital else "",
        "underWarranty": bool(equipment.warranty_end and equipment.warranty_end >= today),
        "totalCost": float(sum(i.cost or 0 for i in finished)),
        "interventions": [intervention_detail(i) for i in interventions],
        "lastScans": last_scans(equipment),
    }


def last_scans(equipment, limit=3):
    """Les dernières personnes qui ont consulté la fiche, chacune une seule fois."""
    seen, rows = set(), []
    for scan in equipment.scans.select_related("user")[:50]:
        if scan.user_id in seen:
            continue
        seen.add(scan.user_id)
        rows.append({"user": person(scan.user), "date": timezone.localtime(scan.scanned_at).strftime("%d/%m/%Y %H:%M")})
        if len(rows) == limit:
            break
    return rows


def record_scan(*, equipment, user, ip_address):
    EquipmentScan.objects.create(equipment=equipment, user=user, ip_address=ip_address)


@transaction.atomic
def close_intervention(*, intervention, data, user):
    """Clôture avec compte rendu : ce que la fiche de l'appareil gardera en mémoire."""
    for field in ("diagnosis", "work_done", "parts", "cost", "duration_minutes"):
        if field in data:
            setattr(intervention, field, data[field])
    intervention.status = "Terminée"
    intervention.completed_at = timezone.now()
    intervention.closed_by = user
    if intervention.technician_user is None and not intervention.company:
        intervention.technician_user = user
    intervention.save()
    # Une panne réparée remet l'appareil en service ; un appareil réformé le reste.
    equipment = intervention.equipment
    if equipment.state == Equipment.BROKEN:
        equipment.state = Equipment.IN_SERVICE
        equipment.save(update_fields=["state"])
    return intervention
