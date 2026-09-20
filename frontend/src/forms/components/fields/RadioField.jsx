export default function RadioField({ field, value, error, onChange }) {
  return (
    <div className={`field ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <div className="field-radio-group" role="radiogroup" aria-label={field.label}>
        {field.options.map(([optionValue, optionLabel]) => (
          <label key={optionValue} className="field-radio-option">
            <input
              type="radio"
              name={field.id}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(field.id, optionValue)}
            />
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>

      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}
