import { useRef, useState } from "react";
import { Archive, FileUp, UserRound, X } from "lucide-react";

import Chargement from "../components/Chargement";
import ged, { messageErreur, taille } from "./api";
import RechercheIdentite from "./RechercheIdentite";

/*
 * Dépôt de documents : un ou plusieurs fichiers, une fiche commune.
 * Même fenêtre que la caisse. `rattache` pré-remplit la personne
 * (depuis un dossier patient ou le poste de numérisation).
 */
export default function Depot({ refs, rattache = null, typeParDefaut = "autre", onFermer, onDepose }) {
  const [fichiers, setFichiers] = useState([]);
  const [personne, setPersonne] = useState(rattache);
  const [fiche, setFiche] = useState({ type: typeParDefaut, titre: "", date: "", service: "", motsCles: "" });
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const choix = useRef(null);

  const ajouter = (liste) => setFichiers((f) => [...f, ...[...liste].filter((n) => !f.some((x) => x.name === n.name && x.size === n.size))]);
  const champ = (cle) => ({ value: fiche[cle], onChange: (e) => setFiche((f) => ({ ...f, [cle]: e.target.value })) });

  async function deposer() {
    if (!fichiers.length) { setErreur("Choisissez au moins un fichier."); return; }
    const trop = fichiers.find((f) => f.size > refs.tailleMax);
    if (trop) { setErreur(`« ${trop.name} » dépasse ${taille(refs.tailleMax)}.`); return; }
    const corps = new FormData();
    fichiers.forEach((f) => corps.append("fichiers", f));
    Object.entries(fiche).forEach(([cle, valeur]) => valeur && corps.append(cle, valeur));
    if (personne?.sorte === "patient") corps.append("patient", personne.id);
    if (personne?.sorte === "archive") corps.append("identite", personne.id);
    setEnvoi(true); setErreur("");
    try {
      const crees = await ged.post("documents/", corps);
      onDepose?.(crees);
      onFermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !envoi && onFermer()}>
      <div className="pop-boite" role="dialog" aria-modal="true" aria-label="Déposer des documents">
        <header className="pop-tete">
          <div><h2>Déposer des documents</h2></div>
          <button type="button" className="pop-fermer" onClick={onFermer} disabled={envoi} aria-label="Fermer"><X size={18} /></button>
        </header>

        <div className="pop-corps ged-depot">
          <div className={`ged-zone ${survol ? "survol" : ""}`} role="button" tabIndex={0}
            onClick={() => choix.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && choix.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouter(e.dataTransfer.files); }}>
            <FileUp size={30} strokeWidth={1.8} aria-hidden="true" />
            <strong>Glisser les fichiers ici, ou cliquer</strong>
            <small>PDF, images, Word, Excel · {taille(refs.tailleMax)} au plus par fichier</small>
            <input ref={choix} type="file" multiple hidden accept={refs.extensions.join(",")}
              onChange={(e) => { ajouter(e.target.files); e.target.value = ""; }} />
          </div>

          {fichiers.length > 0 && (
            <ul className="ged-fichiers">
              {fichiers.map((f) => (
                <li key={f.name + f.size}>
                  <span>{f.name}</span><small>{taille(f.size)}</small>
                  <button type="button" onClick={() => setFichiers((l) => l.filter((x) => x !== f))} aria-label={`Retirer ${f.name}`}><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}

          <div className="ged-grille">
            <label className="field">
              <span>Type</span>
              <select {...champ("type")}>
                {refs.types.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Date du document</span>
              <input type="date" {...champ("date")} />
            </label>
            <label className="field large">
              <span>Titre {fichiers.length > 1 && <small>(sinon le nom de chaque fichier)</small>}</span>
              <input {...champ("titre")} />
            </label>
            <label className="field">
              <span>Service</span>
              <input {...champ("service")} />
            </label>
            <label className="field">
              <span>Mots-clés</span>
              <input {...champ("motsCles")} />
            </label>
          </div>

          <div className="field">
            <span>Patient</span>
            {personne ? (
              <div className="ged-personne">
                {personne.sorte === "patient" ? <UserRound size={16} /> : <Archive size={16} />}
                <strong>{personne.nom}</strong>
                <small>{personne.numero || personne.numeroRegistre || "Registre papier"}</small>
                <button type="button" onClick={() => setPersonne(null)} aria-label="Retirer le patient"><X size={14} /></button>
              </div>
            ) : <RechercheIdentite onChoisir={setPersonne} />}
          </div>

          {erreur && <p className="pop-erreur" role="alert">{erreur}</p>}
        </div>

        <footer className="pop-pied">
          <button type="button" className="secondary-button" onClick={onFermer} disabled={envoi}>Annuler</button>
          <button type="button" className="primary-button" onClick={deposer} disabled={envoi}>
            {envoi && <Chargement taille="petite" centre={false} couleur="currentColor" muet />}
            {envoi ? "Envoi…" : `Déposer${fichiers.length > 1 ? ` ${fichiers.length} fichiers` : ""}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
