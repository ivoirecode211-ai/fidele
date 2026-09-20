from django.utils import timezone


class InvalidStepData(Exception):
    """Données d'étape invalides envoyées à save_step."""


def save_step(instance, step_id, data, complete):
    if not step_id:
        raise InvalidStepData("step_id est obligatoire.")
    if not isinstance(data, dict):
        raise InvalidStepData("data doit être un objet.")

    instance.data = {**instance.data, step_id: data}

    if complete and step_id not in instance.completed_steps:
        instance.completed_steps = [*instance.completed_steps, step_id]

    instance.current_step = step_id
    if instance.status == "draft":
        instance.status = "in_progress"

    instance.save()
    return instance


def submit_instance(instance):
    instance.status = "submitted"
    instance.submitted_at = timezone.now()
    instance.save()
    return instance


def cancel_instance(instance):
    instance.status = "cancelled"
    instance.save()
    return instance
