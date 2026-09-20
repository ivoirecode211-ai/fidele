/*
 * ============================================================
 * VALIDATION
 * ============================================================
 *
 * Messages toujours concrets et en français — jamais
 * « Validation error ». Chaque champ peut préciser son propre
 * `requiredMessage`, sinon un message générique correct est
 * généré à partir du label.
 * ============================================================
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateField(field, value) {
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "");

  if (field.required && isEmpty) {
    return field.requiredMessage || `Veuillez renseigner « ${field.label} ».`;
  }

  if (isEmpty) {
    return null;
  }

  if (field.type === "email" && !EMAIL_RE.test(value)) {
    return "Veuillez saisir une adresse e-mail valide.";
  }

  const rules = field.validate;
  if (!rules) return null;

  if (field.type === "number") {
    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return "Veuillez saisir un nombre valide.";
    }

    if (rules.min !== undefined && numeric < rules.min) {
      return rules.message || `La valeur minimale est ${rules.min}.`;
    }

    if (rules.max !== undefined && numeric > rules.max) {
      return rules.message || `La valeur maximale est ${rules.max}.`;
    }
  }

  if (typeof value === "string") {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return (
        rules.message ||
        `« ${field.label} » doit contenir au moins ${rules.minLength} caractères.`
      );
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return (
        rules.message ||
        `« ${field.label} » doit contenir au plus ${rules.maxLength} caractères.`
      );
    }

    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return rules.message || `« ${field.label} » n'est pas au bon format.`;
    }
  }

  if (field.type === "date" && rules.notFuture) {
    const today = new Date().toISOString().slice(0, 10);
    if (value > today) {
      return rules.message || "Cette date ne peut pas être dans le futur.";
    }
  }

  return null;
}

/*
 * Valide uniquement les champs VISIBLES d'une étape (les champs
 * masqués par une condition ne doivent jamais bloquer l'envoi).
 * Retourne { [fieldId]: message } — objet vide si tout est valide.
 */
export function validateStep(step, stepValues, isFieldVisible) {
  const errors = {};

  for (const field of step.fields) {
    if (!isFieldVisible(field)) continue;

    const message = validateField(field, stepValues[field.id]);
    if (message) {
      errors[field.id] = message;
    }
  }

  return errors;
}
