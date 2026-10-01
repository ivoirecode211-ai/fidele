from datetime import datetime, timedelta

from django.utils import timezone

from .models import CleaningTask, HygieneAudit, HygieneProduct, WasteCollection

# Couleur de la pastille d'icône de chaque déchet (hygiene.css).
WASTE_STYLE = {
    "Déchets infectieux": ("Biohazard", "red"),
    "Déchets chimiques": ("Trash2", "orange"),
    "Déchets assimilés": ("Trash2", "gray"),
}


def fmt(value):
    return value.strftime("%d/%m/%Y") if value else "—"


def task_status(task, now=None):
    now = now or timezone.localtime()
    if task.status != "Terminée":
        due = timezone.make_aware(datetime.combine(task.date, task.hour))
        if due < now and task.status == "Planifiée":
            return "En retard"
    return task.status


def serialize_task(task):
    return {
        "id": task.pk,
        "zone": task.zone,
        "type": task.type,
        "responsible": task.responsible,
        "status": task_status(task),
        "date": task.date.isoformat(),
        "hour": task.hour.strftime("%H:%M"),
    }


def compliance(tasks, audit):
    """Score du dernier contrôle ; à défaut, part des tâches terminées à temps."""
    if audit:
        return audit.score
    due = [t for t in tasks if t.date <= timezone.localdate()]
    if not due:
        return None
    return round(100 * sum(1 for t in due if t.status == "Terminée") / len(due))


def overview(hospital):
    today = timezone.localdate()
    tasks = list(CleaningTask.objects.filter(hospital=hospital, date__gte=today - timedelta(days=30)))
    audit = HygieneAudit.objects.filter(hospital=hospital).first()
    rows = [serialize_task(task) for task in tasks]
    latest_waste = {}
    for collection in WasteCollection.objects.filter(hospital=hospital):
        latest_waste.setdefault(collection.type, collection)
    score = compliance(tasks, audit)
    return {
        "updatedAt": fmt(today),
        "stats": {
            "compliance": score,
            "inProgress": sum(1 for row in rows if row["status"] == "En cours"),
            "late": sum(1 for row in rows if row["status"] == "En retard"),
            "incidents": HygieneAudit.objects.filter(hospital=hospital, compliant=False, date__gte=today - timedelta(days=30)).count(),
        },
        "tasks": rows,
        "products": [
            {"id": p.pk, "name": p.name, "quantity": fmt(p.last_check), "icon": p.icon, "color": "blue"}
            for p in HygieneProduct.objects.filter(hospital=hospital)
        ],
        "wastes": [
            {"id": index, "name": name, "quantity": f"{float(latest_waste[name].quantity_kg):g} kg" if name in latest_waste else "—",
             "collection": fmt(latest_waste[name].date) if name in latest_waste else "—",
             "icon": WASTE_STYLE[name][0], "color": WASTE_STYLE[name][1]}
            for index, (name, _) in enumerate(WasteCollection.TYPES, start=1)
        ],
        "audit": {
            "last": fmt(audit.date) if audit else "—",
            "lastResult": ("Conforme" if audit.compliant else "Non conforme") if audit else "Aucun contrôle",
            "next": fmt(audit.next_date) if audit else "—",
        },
    }
