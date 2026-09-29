import { Check } from "lucide-react";

/*
 * Cases à cocher, chacune reliée à son propre champ Oui / Non :
 *
 *   { id, type: "coches", label, items: [[idDuChamp, libellé], …] }
 *
 * Cocher « HTA » met `ant_hta` à true. Des cases larges, sur une
 * grille qui s'adapte à la largeur : rien ne déborde.
 */
export default function CochesField({ field, values, onChange }) {
  return (
    <div className="field coches">
      <span>{field.label}</span>
      <div className="coches-grille" role="group" aria-label={field.label}>
        {field.items.map(([id, libelle]) => {
          const coche = values?.[id] === true;
          return (
            <button key={id} type="button" role="checkbox" aria-checked={coche}
              className={`coche ${coche ? "cochee" : ""}`} onClick={() => onChange(id, !coche)}>
              <span className="coche-case">{coche && <Check size={14} strokeWidth={3} />}</span>
              {libelle}
            </button>
          );
        })}
      </div>
    </div>
  );
}
