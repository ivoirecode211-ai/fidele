/*
 * ============================================================
 * CONDITIONS D'AFFICHAGE
 * ============================================================
 *
 * `visibleIf` (sur un champ ou une étape) accepte deux formes :
 *
 * 1. Une fonction : (answers) => boolean
 *    `answers` est un objet à plat { fieldId: valeur } fusionnant
 *    TOUTES les étapes déjà saisies (utile pour une condition qui
 *    dépend d'une étape précédente).
 *
 * 2. Un objet déclaratif : { field, operator, value }
 *    operator ∈ "eq" | "neq" | "in" | "truthy" | "falsy"
 *
 * Absence de `visibleIf` = toujours visible.
 * ============================================================
 */

export function evaluateCondition(condition, answers) {
  if (!condition) return true;

  if (typeof condition === "function") {
    return Boolean(condition(answers));
  }

  const { field, operator = "eq", value } = condition;
  const current = answers[field];

  switch (operator) {
    case "truthy":
      return Boolean(current);
    case "falsy":
      return !current;
    case "neq":
      return current !== value;
    case "in":
      return Array.isArray(value) && value.includes(current);
    case "eq":
    default:
      return current === value;
  }
}

/* Fusionne les données de toutes les étapes en un objet à plat. */
export function flattenAnswers(values) {
  return Object.values(values || {}).reduce(
    (flat, stepValues) => ({ ...flat, ...stepValues }),
    {},
  );
}
