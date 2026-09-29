import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, PencilLine, X } from "lucide-react";

/*
 * Liste déroulante à choix multiple.
 *
 * Les choix s'affichent en étiquettes dans le champ ; un clic ouvre
 * la liste. Le petit crayon au-dessus du champ permet d'y écrire :
 * on filtre la liste, et Entrée ajoute ce qui n'y figure pas
 * (sauf `libre: false`, pour une liste fermée comme un catalogue).
 *
 * `options` : paires [valeur, libellé], ou (values) => paires.
 * La valeur est un tableau.
 */
export default function ListeField({ field, value, values, error, onChange }) {
  const options = typeof field.options === "function" ? field.options(values || {}) : (field.options || []);
  const choisis = Array.isArray(value) ? value : [];
  const libre = field.libre !== false;
  const [ouvert, setOuvert] = useState(false);
  const [ecrire, setEcrire] = useState(false);
  const [texte, setTexte] = useState("");
  const boite = useRef(null);
  const saisie = useRef(null);

  const libelle = (v) => options.find(([o]) => o === v)?.[1] ?? v;
  const terme = texte.trim().toLowerCase();
  const visibles = terme ? options.filter(([, l]) => l.toLowerCase().includes(terme)) : options;

  useEffect(() => {
    if (!ouvert) return undefined;
    const dehors = (e) => { if (!boite.current?.contains(e.target)) setOuvert(false); };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert]);

  useEffect(() => { if (ecrire) saisie.current?.focus(); }, [ecrire]);

  const basculer = (v) => onChange(field.id, choisis.includes(v) ? choisis.filter((x) => x !== v) : [...choisis, v]);

  function clavier(e) {
    if (e.key === "Escape") { setOuvert(false); return; }
    if (e.key === "Backspace" && !texte && choisis.length) { onChange(field.id, choisis.slice(0, -1)); return; }
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    if (!terme) return;
    const exact = options.find(([, l]) => l.toLowerCase() === terme) || (visibles.length === 1 ? visibles[0] : null);
    if (exact) { if (!choisis.includes(exact[0])) basculer(exact[0]); }
    else if (libre && !choisis.includes(texte.trim())) onChange(field.id, [...choisis, texte.trim()]);
    setTexte("");
  }

  return (
    <div className={`field liste ${error ? "field-error" : ""}`} ref={boite}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <button type="button" className={`liste-bascule ${ecrire ? "actif" : ""}`} aria-pressed={ecrire}
        aria-label={`Écrire dans « ${field.label} »`} title="Écrire"
        onClick={() => { setEcrire((e) => !e); setOuvert(true); }}>
        <PencilLine size={14} strokeWidth={2.2} />
      </button>

      <div className={`liste-champ ${ouvert ? "ouvert" : ""}`} role="combobox" aria-expanded={ouvert} aria-haspopup="listbox"
        tabIndex={ecrire ? -1 : 0}
        onClick={() => { setOuvert(true); if (ecrire) saisie.current?.focus(); }}
        onKeyDown={(e) => { if (!ecrire && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) { e.preventDefault(); setOuvert(true); } if (e.key === "Escape") setOuvert(false); }}>
        {choisis.map((v) => (
          <span key={v} className="liste-etiquette">
            {libelle(v)}
            <button type="button" aria-label={`Retirer ${libelle(v)}`}
              onClick={(e) => { e.stopPropagation(); basculer(v); }}>
              <X size={12} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        {ecrire ? (
          <input ref={saisie} value={texte} aria-label={field.label} autoComplete="off"
            placeholder={choisis.length ? "" : "Écrire…"}
            onChange={(e) => { setTexte(e.target.value); setOuvert(true); }} onKeyDown={clavier} />
        ) : !choisis.length && <span className="liste-vide">Choisir</span>}
        <ChevronDown className="liste-fleche" size={17} strokeWidth={2} aria-hidden="true" />
      </div>

      {ouvert && (
        <ul className="liste-options" role="listbox" aria-multiselectable="true">
          {visibles.map(([v, l]) => (
            <li key={v} role="option" aria-selected={choisis.includes(v)}
              className={choisis.includes(v) ? "choisie" : ""}
              onMouseDown={(e) => { e.preventDefault(); basculer(v); }}>
              <span className="liste-case">{choisis.includes(v) && <Check size={13} strokeWidth={3} />}</span>
              {l}
            </li>
          ))}
          {terme && libre && !options.some(([, l]) => l.toLowerCase() === terme) && (
            <li className="liste-ajout" onMouseDown={(e) => { e.preventDefault(); onChange(field.id, [...choisis, texte.trim()]); setTexte(""); }}>
              Ajouter « {texte.trim()} »
            </li>
          )}
          {!visibles.length && !(terme && libre) && <li className="liste-rien">{field.emptyText || "Aucun choix"}</li>}
        </ul>
      )}

      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}
