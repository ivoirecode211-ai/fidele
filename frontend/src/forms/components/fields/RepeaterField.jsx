import { Plus, Trash2 } from "lucide-react";

/*
 * Liste répétable : une ligne par élément (un médicament, un
 * enfant, un document…), ajoutée ou retirée à la demande.
 *
 *   { id, type: "repeater", label, addLabel, minRows,
 *     columns: "grid-template-columns CSS",
 *     fields: [{ id, type: text|number|select|combobox, label,
 *               placeholder, options, suffix }],
 *     rowNote: (ligne) => texte affiché sous la ligne,
 *     rowChange: (ligne, cle) => ligne complétée après une saisie }
 *
 * Une sous-option peut dépendre de sa ligne : options(values, ligne)
 * (la posologie qui suit la forme du médicament choisi).
 *
 * La valeur est un tableau d'objets. Une ligne vide ne compte
 * pas : c'est au métier de l'ignorer à l'enregistrement.
 */
const LIGNE_VIDE = (fields) => Object.fromEntries(fields.map((f) => [f.id, ""]));

export default function RepeaterField({ field, value, values, error, onChange }) {
  const lignes = Array.isArray(value) ? value : [];
  const affichees = lignes.length >= (field.minRows ?? 1) ? lignes
    : [...lignes, ...Array.from({ length: (field.minRows ?? 1) - lignes.length }, () => LIGNE_VIDE(field.fields))];

  const modifier = (index, cle, valeur) => onChange(field.id, affichees.map((ligne, i) => {
    if (i !== index) return ligne;
    const suite = { ...ligne, [cle]: valeur };
    return field.rowChange ? field.rowChange(suite, cle, ligne) : suite;
  }));
  const ajouter = () => onChange(field.id, [...affichees, LIGNE_VIDE(field.fields)]);
  const retirer = (index) => onChange(field.id, affichees.filter((_, i) => i !== index));

  return (
    <div className={`field repeteur ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <div className="repeteur-lignes" style={{ "--colonnes": field.columns }}>
        <div className="repeteur-entete" aria-hidden="true">
          {field.fields.map((f) => <span key={f.id}>{f.label}</span>)}
          <span />
        </div>

        {affichees.map((ligne, index) => {
          const note = field.rowNote?.(ligne);
          return (
            <div key={index} className="repeteur-ligne">
              <div className="repeteur-cases">
                {field.fields.map((f) => (
                  <Case key={f.id} sous={f} ligne={ligne} index={index} parent={field.id} values={values}
                    onChange={(v) => modifier(index, f.id, v)} />
                ))}
                <button type="button" className="repeteur-retirer" onClick={() => retirer(index)}
                  aria-label={`Retirer la ligne ${index + 1}`} title="Retirer la ligne">
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
              {note && <small className="repeteur-note">{note}</small>}
            </div>
          );
        })}
      </div>

      <button type="button" className="repeteur-ajouter" onClick={ajouter}>
        <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
        {field.addLabel || "Ajouter une ligne"}
      </button>

      {field.helpText && !error && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}

function Case({ sous, ligne, index, parent, values, onChange }) {
  const id = `${parent}-${index}-${sous.id}`;
  const valeur = ligne[sous.id] ?? "";
  const options = typeof sous.options === "function" ? sous.options(values || {}, ligne) : (sous.options || []);
  const paires = options.map((o) => (Array.isArray(o) ? o : [o, o]));
  const libelle = `${sous.label} (ligne ${index + 1})`;

  if (sous.type === "select") {
    return (
      <label className="repeteur-case">
        <span className="repeteur-case-nom">{sous.label}</span>
        <select value={valeur} aria-label={libelle} onChange={(e) => onChange(e.target.value)}>
          <option value="">{sous.placeholder || "Choisir"}</option>
          {paires.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    );
  }

  return (
    <label className={`repeteur-case ${sous.suffix ? "avec-suffixe" : ""}`}>
      <span className="repeteur-case-nom">{sous.label}</span>
      <input
        id={id}
        type={sous.type === "number" ? "number" : "text"}
        inputMode={sous.type === "number" ? "numeric" : undefined}
        min={sous.type === "number" ? 0 : undefined}
        list={sous.type === "combobox" ? `${id}-liste` : undefined}
        value={valeur}
        placeholder={sous.placeholder}
        aria-label={libelle}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {sous.suffix && <em className="repeteur-suffixe">{sous.suffix}</em>}
      {sous.type === "combobox" && (
        <datalist id={`${id}-liste`}>
          {paires.map(([v, l]) => <option key={v} value={v}>{l !== v ? l : undefined}</option>)}
        </datalist>
      )}
    </label>
  );
}
