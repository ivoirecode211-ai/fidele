import api from "../../services/api";

/*
 * ============================================================
 * MOTEUR DE FORMULAIRE — CLIENT API
 * ============================================================
 *
 * Fine couche au-dessus du client axios partagé. Le moteur ne
 * connaît que ces cinq opérations ; il ignore tout du métier
 * (form_key, contenu de `data`...).
 * ============================================================
 */

export function createInstance(formKey, patientId) {
  return api
    .post("/forms/", { form_key: formKey, patient: patientId ?? null })
    .then((res) => res.data);
}

export function getInstance(instanceId) {
  return api.get(`/forms/${instanceId}/`).then((res) => res.data);
}

export function saveStep(instanceId, stepId, data, complete) {
  return api
    .post(`/forms/${instanceId}/save_step/`, {
      step_id: stepId,
      data,
      complete,
    })
    .then((res) => res.data);
}

export function submitInstance(instanceId) {
  return api.post(`/forms/${instanceId}/submit/`).then((res) => res.data);
}

export function cancelInstance(instanceId) {
  return api.post(`/forms/${instanceId}/cancel/`).then((res) => res.data);
}
