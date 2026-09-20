/* Interrupteur Oui / Non — deux boutons dans un cadre, comme
   spécifié dans la charte graphique (section « Oui / Non »). */
export default function SwitchField({ field, value, error, onChange }) {
  return (
    <div className={`field ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <div className="field-switch" role="radiogroup" aria-label={field.label}>
        <button
          type="button"
          className={value === true ? "active" : ""}
          onClick={() => onChange(field.id, true)}
        >
          Oui
        </button>

        <button
          type="button"
          className={value === false ? "active" : ""}
          onClick={() => onChange(field.id, false)}
        >
          Non
        </button>
      </div>

      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}
