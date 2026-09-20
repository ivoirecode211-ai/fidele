import { Pencil } from "lucide-react";

/*
 * Étape "Résumé" — relit la config, affiche label + valeur de
 * chaque champ rempli, et un bouton "Modifier" par section qui
 * ramène directement à l'étape correspondante.
 */

function displayValue(field, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return "—";
  }

  if (field.type === "switch") {
    return rawValue ? "Oui" : "Non";
  }

  if ((field.type === "select" || field.type === "radio") && field.options) {
    const match = field.options.find(([value]) => String(value) === String(rawValue));
    if (match) return match[1];
  }

  return String(rawValue);
}

export default function FormSummary({ steps, values, onEditStep }) {
  return (
    <div className="form-summary">
      {steps.map((step) => (
        <section key={step.id} className="form-summary-section">
          <header>
            <h2>{step.title}</h2>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onEditStep(step.id)}
            >
              <Pencil size={14} strokeWidth={2} />
              <span>Modifier</span>
            </button>
          </header>

          <dl>
            {step.fields.map((field) => (
              <div key={field.id} className="form-summary-row">
                <dt>{field.label}</dt>
                <dd>{displayValue(field, values[step.id]?.[field.id])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
