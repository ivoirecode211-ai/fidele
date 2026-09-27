/*
 * Date de naissance OU âge — les deux se remplissent l'un l'autre.
 *
 * À l'accueil, beaucoup de patients ne connaissent pas leur date de
 * naissance exacte mais donnent leur âge. On saisit ce qu'on a :
 * l'autre champ se complète tout seul.
 *
 * La valeur conservée reste la date de naissance (AAAA-MM-JJ) :
 * l'âge n'est qu'une façon de la saisir.
 */

const AUJOURD_HUI = () => new Date().toISOString().slice(0, 10);

function ageDepuisDate(date) {
  const naissance = new Date(date);
  if (Number.isNaN(naissance.getTime())) return "";
  const ans = Math.floor((Date.now() - naissance.getTime()) / (365.25 * 24 * 3600 * 1000));
  return ans >= 0 && ans < 130 ? String(ans) : "";
}

function dateDepuisAge(age) {
  const ans = Number(age);
  if (!Number.isInteger(ans) || ans < 0 || ans > 129) return "";
  const date = new Date();
  date.setFullYear(date.getFullYear() - ans);
  return date.toISOString().slice(0, 10);
}

export default function BirthDateField({ field, value, error, onChange }) {
  const age = value ? ageDepuisDate(value) : "";

  return (
    <div className={`field champ-naissance ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <div className="champ-naissance-paire">
        <label>
          <small>Date de naissance</small>
          <input
            type="date"
            max={AUJOURD_HUI()}
            value={value || ""}
            onChange={(event) => onChange(field.id, event.target.value)}
          />
        </label>

        <span className="champ-naissance-ou">ou</span>

        <label>
          <small>Âge (ans)</small>
          <input
            type="number"
            min={0}
            max={129}
            inputMode="numeric"
            placeholder="34"
            value={age}
            onChange={(event) => onChange(field.id, dateDepuisAge(event.target.value))}
          />
        </label>
      </div>

      {field.helpText && !error && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}
