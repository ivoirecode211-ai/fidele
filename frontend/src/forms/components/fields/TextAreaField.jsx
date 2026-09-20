export default function TextAreaField({ field, value, error, onChange }) {
  return (
    <label className={`field ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <textarea
        name={field.id}
        value={value ?? ""}
        placeholder={field.placeholder}
        rows={4}
        onChange={(event) => onChange(field.id, event.target.value)}
      />

      {error && <span className="field-error-message">{error}</span>}
    </label>
  );
}
