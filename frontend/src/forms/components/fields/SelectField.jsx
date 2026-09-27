/*
 * Liste déroulante.
 *
 * `field.options` est soit une liste de paires [valeur, libellé],
 * soit une fonction (values) => paires — ce qui permet à une liste
 * de dépendre d'une réponse précédente, par exemple une commune
 * qui dépend de sa ville.
 */
export default function SelectField({ field, value, values, error, onChange }) {
  const options = typeof field.options === "function" ? field.options(values || {}) : (field.options || []);
  const vide = options.length === 0;

  return (
    <label className={`field ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <select
        name={field.id}
        value={value ?? ""}
        disabled={vide}
        onChange={(event) => onChange(field.id, event.target.value)}
      >
        <option value="">{vide ? (field.emptyText || "Aucun choix disponible") : (field.placeholder || "Sélectionner…")}</option>

        {options.map(([valeur, libelle]) => (
          <option key={valeur} value={valeur}>{libelle}</option>
        ))}
      </select>

      {field.helpText && !error && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error-message">{error}</span>}
    </label>
  );
}
