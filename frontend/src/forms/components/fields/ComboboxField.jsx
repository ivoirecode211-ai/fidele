/*
 * Saisie libre avec suggestions : on tape trois lettres, la liste
 * propose ; on peut aussi écrire ce qui n'y est pas.
 *
 * `options` : liste de chaînes, de paires [valeur, libellé], ou
 * une fonction (values) => l'un ou l'autre.
 */
export default function ComboboxField({ field, value, values, error, onChange, compact = false }) {
  const brutes = typeof field.options === "function" ? field.options(values || {}) : (field.options || []);
  const options = brutes.map((o) => (Array.isArray(o) ? o : [o, o]));
  const liste = `liste-${field.id}`;

  return (
    <label className={`field ${error ? "field-error" : ""}`}>
      {!compact && (
        <span>
          {field.label}
          {field.required && <span className="required">*</span>}
        </span>
      )}

      <input
        type="text"
        name={field.id}
        list={liste}
        value={value ?? ""}
        placeholder={field.placeholder}
        aria-label={compact ? field.label : undefined}
        autoComplete="off"
        onChange={(event) => onChange(field.id, event.target.value)}
      />
      <datalist id={liste}>
        {options.map(([valeur, libelle]) => (
          <option key={valeur} value={valeur}>{libelle !== valeur ? libelle : undefined}</option>
        ))}
      </datalist>

      {field.helpText && !error && !compact && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error-message">{error}</span>}
    </label>
  );
}
