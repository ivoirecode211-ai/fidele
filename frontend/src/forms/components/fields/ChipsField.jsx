/*
 * Pastilles à cocher : un choix (`multiple: false`) ou plusieurs.
 *
 * Plus rapide qu'une liste déroulante quand les options tiennent
 * sous les yeux : un clic par réponse, aucune fenêtre à ouvrir.
 * `options` est une liste de paires [valeur, libellé], ou une
 * fonction (values) => paires.
 */
export default function ChipsField({ field, value, values, error, onChange }) {
  const options = typeof field.options === "function" ? field.options(values || {}) : (field.options || []);
  const choisis = field.multiple ? (Array.isArray(value) ? value : []) : value;
  const estChoisi = (valeur) => (field.multiple ? choisis.includes(valeur) : choisis === valeur);

  function basculer(valeur) {
    if (!field.multiple) {
      onChange(field.id, estChoisi(valeur) && !field.required ? "" : valeur);
      return;
    }
    onChange(field.id, estChoisi(valeur) ? choisis.filter((v) => v !== valeur) : [...choisis, valeur]);
  }

  return (
    <div className={`field ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      {options.length === 0 ? (
        <small className="field-help">{field.emptyText || "Aucun choix disponible."}</small>
      ) : (
        <div className="pastilles" role="group" aria-label={field.label}>
          {options.map(([valeur, libelle]) => (
            <button key={valeur} type="button" className={`pastille ${estChoisi(valeur) ? "choisie" : ""}`}
              aria-pressed={estChoisi(valeur)} onClick={() => basculer(valeur)}>
              {libelle}
            </button>
          ))}
        </div>
      )}

      {field.helpText && !error && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}
