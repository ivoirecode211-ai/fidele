from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Equipment, Intervention, next_maintenance

OPEN = ("En attente", "En cours")
# Icône lucide affichée pour chaque catégorie (Maintenance.jsx).
CATEGORY_ICONS = {
    "Électricité": "Zap",
    "Climatisation": "Wind",
    "Stérilisation": "Settings",
    "Froid médical": "Droplets",
    "Gaz médicaux": "Activity",
    "Infrastructure": "Building2",
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


def overview():
    equipments = list(Equipment.objects.prefetch_related("interventions"))
    interventions = list(Intervention.objects.select_related("equipment"))
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
        "interventions": [serialize_intervention(item) for item in interventions],
        "equipments": park,
        "criticalEquipments": critical,
    }


@transaction.atomic
def create_intervention(*, data, user):
    """L'équipement est retrouvé par son nom ; s'il n'existe pas, il rejoint le parc."""
    equipment = Equipment.objects.filter(name__iexact=data["equipment"]).first()
    if equipment is None:
        equipment = Equipment.objects.create(name=data["equipment"], category=data["category"])
    return Intervention.objects.create(
        equipment=equipment,
        technician=data["technician"],
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
