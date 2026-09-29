import { useState } from "react";

/*
 * Schéma dentaire (numérotation internationale FDI).
 *
 * On choisit un état dans la palette, puis on touche les dents :
 * chacune prend cet état ; la toucher à nouveau la remet « saine ».
 * Denture adulte (32 dents) ou lactéale (20), selon l'âge par défaut.
 *
 *   { id, type: "dents", label, lacteale?: (values) => bool }
 *   valeur : { "16": "carie", "21": "absente", … }  (les dents saines n'y figurent pas)
 */

export const ETATS_DENTAIRES = [
  ["carie", "Carie"], ["obturee", "Obturée"], ["absente", "Absente"], ["a_extraire", "À extraire"],
  ["couronne", "Couronne"], ["mobile", "Mobile"], ["fracturee", "Fracturée"],
];

const ADULTE = [[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]];
const LACTEALE = [[55, 54, 53, 52, 51, 61, 62, 63, 64, 65], [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]];

export default function DentsField({ field, value, values, error, onChange }) {
  const [pinceau, setPinceau] = useState("carie");
  const [lacteale, setLacteale] = useState(() => Boolean(field.lacteale?.(values || {})));
  const etat = value && typeof value === "object" ? value : {};
  const arcades = lacteale ? LACTEALE : ADULTE;
  const libelle = Object.fromEntries(ETATS_DENTAIRES);

  function toucher(dent) {
    const suite = { ...etat };
    if (suite[dent] === pinceau) delete suite[dent];
    else suite[dent] = pinceau;
    onChange(field.id, suite);
  }

  const notes = Object.entries(etat).filter(([dent]) => arcades.flat().includes(Number(dent)));

  return (
    <div className={`field dents ${error ? "field-error" : ""}`}>
      <span>{field.label}</span>

      <div className="dents-outils">
        <div className="dents-palette" role="radiogroup" aria-label="État à appliquer">
          {ETATS_DENTAIRES.map(([code, nom]) => (
            <button key={code} type="button" role="radio" aria-checked={pinceau === code}
              className={`dents-etat ${code} ${pinceau === code ? "actif" : ""}`} onClick={() => setPinceau(code)}>
              <i aria-hidden="true" />{nom}
            </button>
          ))}
        </div>
        <div className="dents-denture" role="radiogroup" aria-label="Denture">
          <button type="button" role="radio" aria-checked={!lacteale} className={!lacteale ? "actif" : ""} onClick={() => setLacteale(false)}>Adulte</button>
          <button type="button" role="radio" aria-checked={lacteale} className={lacteale ? "actif" : ""} onClick={() => setLacteale(true)}>Lactéale</button>
        </div>
      </div>

      <div className="dents-arcades">
        {arcades.map((arcade, a) => (
          <div key={a} className="dents-arcade" aria-label={a === 0 ? "Arcade supérieure" : "Arcade inférieure"}>
            {arcade.map((dent, i) => (
              <button key={dent} type="button" className={`dent ${etat[dent] || "saine"} ${i === arcade.length / 2 ? "milieu" : ""}`}
                aria-label={`Dent ${dent} : ${libelle[etat[dent]] || "saine"}`} onClick={() => toucher(dent)}>
                <span className="dent-couronne" aria-hidden="true" />
                <small>{dent}</small>
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="dents-resume">
        {notes.length
          ? notes.sort(([x], [y]) => x - y).map(([dent, e]) => `${dent} ${libelle[e].toLowerCase()}`).join(" · ")
          : "Toutes les dents sont saines."}
      </p>
      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}
