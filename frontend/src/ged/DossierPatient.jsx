import { useEffect, useState } from "react";
import {
  Archive, ArrowLeft, Cloud, Eye, FileText, FileUp, FlaskConical, Link2, Pill, Stethoscope, Unlink, UserRound, Wallet,
} from "lucide-react";

import Chargement from "../components/Chargement";
import ged, { date, messageErreur, ouvrirFichier } from "./api";
import RechercheIdentite from "./RechercheIdentite";

/*
 * Dossier patient : tout ce que l'hôpital sait d'une personne, sur une
 * frise, du plus récent au plus ancien — registres papier scannés,
 * documents de la GED, consultations, ordonnances, analyses, passages en
 * caisse, et documents du logiciel d'archivage quand il sera branché.
 *
 * Le futur module Dossier patient réutilisera cette vue telle quelle.
 */

const SORTES = {
  document: { icone: FileText, classe: "doc" },
  consultation: { icone: Stethoscope, classe: "consult" },
  ordonnance: { icone: Pill, classe: "consult" },
  laboratoire: { icone: FlaskConical, classe: "consult" },
  passage: { icone: Wallet, classe: "passage" },
  distant: { icone: Cloud, classe: "distant" },
};

export default function DossierPatient({ version, onDeposer }) {
  const [cible, setCible] = useState(null);          // { patient } ou { identite }
  const [dossier, setDossier] = useState(null);
  const [erreur, setErreur] = useState("");
  const [lier, setLier] = useState(null);             // identité d'archive à relier

  useEffect(() => {
    if (!cible) return;
    setDossier(null); setErreur("");
    ged.get("dossier/", cible).then(setDossier).catch((e) => setErreur(messageErreur(e)));
  }, [cible, version]);

  async function relier(identiteId, patientId) {
    setErreur("");
    try {
      await ged.post(`identites/${identiteId}/lier/`, { patient: patientId });
      setLier(null);
      setCible(patientId ? { patient: patientId } : { identite: identiteId });
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  if (!cible) {
    return (
      <section className="bloc">
        <div className="bloc-tete"><div><h2>Retrouver un patient</h2></div></div>
        <RechercheIdentite autoFocus
          onChoisir={(r) => setCible(r.sorte === "patient" ? { patient: r.id } : { identite: r.id })} />
      </section>
    );
  }

  if (erreur && !dossier) return <p className="bandeau erreur" role="alert">{erreur}</p>;
  if (!dossier) return <Chargement taille="moyenne" />;

  const p = dossier.patient;
  const annees = dossier.evenements.reduce((groupes, e) => {
    const annee = (e.date || "").slice(0, 4) || "Sans date";
    (groupes[annee] ||= []).push(e);
    return groupes;
  }, {});
  const rattache = p ? { sorte: "patient", id: p.id, nom: p.nom, numero: p.numero }
    : { sorte: "archive", ...dossier.identites[0] };

  return (
    <div className="ged-dossier">
      <section className="bloc ged-fiche">
        <button type="button" className="sf-retour" onClick={() => setCible(null)} aria-label="Nouvelle recherche">
          <ArrowLeft size={18} />
        </button>
        <span className={`ged-pastille-sorte grande ${p ? "patient" : "archive"}`}>
          {p ? <UserRound size={22} /> : <Archive size={22} />}
        </span>
        <div className="ged-fiche-texte">
          <h2>{p ? p.nom : dossier.identites[0]?.nom}</h2>
          <p>
            {p ? [p.numero, p.sexe && { F: "Femme", M: "Homme" }[p.sexe], p.age != null && `${p.age} ans`, p.telephone].filter(Boolean).join(" · ")
              : "Connu seulement des registres papier"}
          </p>
        </div>
        <button type="button" className="primary-button" onClick={() => onDeposer(rattache)}>
          <FileUp size={16} />Ajouter un document
        </button>
      </section>

      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}

      {dossier.identites.length > 0 && (
        <section className="bloc">
          <div className="bloc-tete"><div><h2>Registres papier</h2></div></div>
          <ul className="ged-identites">
            {dossier.identites.map((i) => (
              <li key={i.id}>
                <Archive size={17} aria-hidden="true" />
                <span>
                  <strong>{i.nom}</strong>
                  <small>{[i.numeroRegistre && `N° ${i.numeroRegistre}`, i.anneeRegistre, i.service, i.naissance && `né(e) ${i.naissance}`,
                    `${i.documents} scan${i.documents > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</small>
                </span>
                {i.patient ? (
                  <button type="button" className="secondary-button" onClick={() => relier(i.id, null)}>
                    <Unlink size={15} />Détacher
                  </button>
                ) : (
                  <button type="button" className="secondary-button" onClick={() => setLier(i.id)}>
                    <Link2 size={15} />Relier à un dossier
                  </button>
                )}
              </li>
            ))}
          </ul>
          {lier && (
            <div className="ged-lier">
              <RechercheIdentite autoFocus sortes={["patient"]} placeholder="Nom ou n° de dossier du patient actuel"
                onChoisir={(r) => relier(lier, r.id)} />
            </div>
          )}
        </section>
      )}

      <section className="bloc">
        <div className="bloc-tete">
          <div><h2>Historique</h2></div>
          {!dossier.connecteur.actif && <span className="etat">Logiciel d'archivage : non branché</span>}
        </div>
        {dossier.evenements.length === 0 ? <p className="vide">Rien d'enregistré pour l'instant.</p> : (
          <ol className="ged-frise">
            {Object.entries(annees).map(([annee, evenements]) => (
              <li key={annee}>
                <h3>{annee}</h3>
                <ul>
                  {evenements.map((e, i) => {
                    const { icone: Icone, classe } = SORTES[e.sorte] || SORTES.document;
                    return (
                      <li key={i} className={classe}>
                        <span className="ged-frise-icone"><Icone size={16} /></span>
                        <div>
                          <strong>{e.titre}</strong>
                          <small>{[date(e.date), e.source, e.detail].filter(Boolean).join(" · ")}</small>
                        </div>
                        {e.document && (
                          <button type="button" className="ged-icone" aria-label={`Ouvrir ${e.titre}`}
                            onClick={() => ouvrirFichier(e.document).catch((err) => setErreur(err.message))}>
                            <Eye size={17} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
