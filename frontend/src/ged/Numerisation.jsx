import { useState } from "react";
import { Archive, Plus, ScanLine, UserRound, X } from "lucide-react";

import ged, { messageErreur } from "./api";
import RechercheIdentite from "./RechercheIdentite";

/*
 * Poste de numérisation des registres papier.
 *
 *   1. La personne : on la cherche d'abord (patient du logiciel, ou
 *      identité d'archive déjà créée) pour éviter les doublons ; sinon
 *      on crée son identité d'archive à partir du registre.
 *   2. Ses scans : déposés et rattachés à elle, type « Registre papier ».
 */
export default function Numerisation({ onDeposer }) {
  const [personne, setPersonne] = useState(null);
  const [creation, setCreation] = useState(false);
  const [fiche, setFiche] = useState({ nom: "", prenoms: "", sexe: "", naissance: "", numeroRegistre: "", anneeRegistre: "", service: "" });
  const [erreur, setErreur] = useState("");
  const champ = (cle) => ({ value: fiche[cle], onChange: (e) => setFiche((f) => ({ ...f, [cle]: e.target.value })) });

  async function creer(e) {
    e.preventDefault();
    if (!fiche.nom.trim()) { setErreur("Le nom est obligatoire."); return; }
    setErreur("");
    try {
      setPersonne(await ged.post("identites/", fiche));
      setCreation(false);
    } catch (err) {
      // Déjà enregistrée sous ce n° de registre : on reprend sa fiche plutôt que d'en créer une seconde.
      const existante = err?.response?.status === 409 && err.response.data.identite;
      if (existante) { setPersonne(existante); setCreation(false); return; }
      setErreur(messageErreur(err));
    }
  }

  return (
    <div className="ged-numerisation">
      <section className="bloc">
        <div className="bloc-tete"><div><h2>1. La personne du registre</h2></div></div>

        {personne ? (
          <div className="ged-personne grande">
            {personne.sorte === "patient" ? <UserRound size={20} /> : <Archive size={20} />}
            <div>
              <strong>{personne.nom}</strong>
              <small>
                {personne.sorte === "patient" ? personne.numero
                  : ["Registre papier", personne.numeroRegistre, personne.anneeRegistre, personne.naissance && `né(e) ${personne.naissance}`].filter(Boolean).join(" · ")}
              </small>
            </div>
            <button type="button" onClick={() => setPersonne(null)} aria-label="Changer de personne"><X size={16} /></button>
          </div>
        ) : creation ? (
          <form className="ged-grille" onSubmit={creer}>
            <label className="field"><span>Nom *</span><input {...champ("nom")} autoFocus /></label>
            <label className="field"><span>Prénoms</span><input {...champ("prenoms")} /></label>
            <label className="field">
              <span>Sexe</span>
              <select {...champ("sexe")}><option value="">—</option><option value="F">Féminin</option><option value="M">Masculin</option></select>
            </label>
            <label className="field"><span>Naissance (date ou année)</span><input {...champ("naissance")} placeholder="1962 ou 1962-04-18" /></label>
            <label className="field"><span>N° dans le registre</span><input {...champ("numeroRegistre")} /></label>
            <label className="field"><span>Année du registre</span><input {...champ("anneeRegistre")} inputMode="numeric" /></label>
            <label className="field large"><span>Service</span><input {...champ("service")} /></label>
            {erreur && <p className="pop-erreur large" role="alert">{erreur}</p>}
            <div className="ged-boutons large">
              <button type="button" className="secondary-button" onClick={() => setCreation(false)}>Annuler</button>
              <button type="submit" className="primary-button">Créer l'identité</button>
            </div>
          </form>
        ) : (
          <>
            <RechercheIdentite onChoisir={setPersonne} autoFocus />
            <button type="button" className="secondary-button ged-nouvelle" onClick={() => setCreation(true)}>
              <Plus size={16} />Nouvelle personne (absente du logiciel)
            </button>
          </>
        )}
      </section>

      <section className={`bloc ${personne ? "" : "ged-inactif"}`} aria-disabled={!personne}>
        <div className="bloc-tete"><div><h2>2. Ses scans</h2></div></div>
        <button type="button" className="primary-button ged-scanner" disabled={!personne} onClick={() => onDeposer(personne)}>
          <ScanLine size={18} />Déposer les scans du registre
        </button>
      </section>
    </div>
  );
}
