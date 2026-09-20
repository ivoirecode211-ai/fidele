/*
 * Couvre text, tel, email, number, date — cinq variantes du
 * même <input>, comme le fait déjà PatientForm.jsx avec ses
 * propres champs.
 */
export default function InputField({ field, value, error, onChange }) {
  return (
    <label className={`field ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <input
        type={field.type}
        name={field.id}
        value={value ?? ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(field.id, event.target.value)}
      />

      {field.helpText && !error && (
        <small className="field-help">{field.helpText}</small>
      )}

      {error && <span className="field-error-message">{error}</span>}
    </label>
  );
}
