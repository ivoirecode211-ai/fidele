import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";

import Chargement from "../components/Chargement";
import StepForm from "../forms/StepForm";
import medecine, { erreurLisible } from "./api";
import AideIa from "./AideIa";
import { ConstantesPatient, OutilsPatient } from "./EntetePatient";
import { specialite } from "../catalogue/specialites";

/*
 * ============================================================
 * CONSULTATION — DANS UNE FENÊTRE, COMME À LA CAISSE
 * ============================================================
 *
 * Ouvrir un patient le « prend » : la consultation existe dès cet
 * instant, et tout ce qui est saisi s'enregistre au fil de l'eau.
 * Fermer la fenêtre, même par erreur, ne perd rien : on rouvre avec
 * « Poursuivre », à l'étape où l'on s'était arrêté.
 * ============================================================
 */

/* Les rubriques qu'une suggestion de l'IA remplit : on les garde pour pouvoir annuler. */
const REMPLIT = {
  diagnostic: ["diagnostic", "hypotheses"],
  examens: ["examens"],
  ordonnance: ["ordonnance", "conseils"],
  conseils: ["conseils"],
};

export default function Consultation({ admissionId, refs, onFermer, onSuivant, onAssistant, onDemander, onValeurs, onDossier, onTerminee }) {
  const [dossier, setDossier] = useState(null);
  const [erreur, setErreur] = useState("");
  const [fin, setFin] = useState(null);
  const [propositions, setPropositions] = useState({});
  const [version, setVersion] = useState(0);
  const [constantes, setConstantes] = useState(false);

  useEffect(() => {
    let actif = true;
    setDossier(null); setErreur(""); setFin(null); setPropositions({});
    medecine.post(`${admissionId}/`)
      .then((d) => { if (!actif) return; setDossier(d); onDossier?.(d); })
      .catch((e) => actif && setErreur(erreurLisible(e).message));
    return () => { actif = false; };
  }, [admissionId, version, onDossier]);

  /* Le formulaire de la spécialité du patient (fixée par la prestation payée en caisse). */
  const spe = dossier && specialite(dossier.specialite);
  const config = useMemo(() => spe && spe.config({ dossier, refs }), [spe, dossier, refs]);
  // Les « Normal » du bloc d'abord : ce que le médecin a déjà saisi passe par-dessus.
  // Puis ce que le carnet de suivi reprend des visites précédentes (DDR, vaccins faits, traitement ARV…).
  const initiales = useMemo(() => dossier && ({
    ...(specialite(dossier.specialite).bloc.defauts || {}),
    ...(specialite(dossier.specialite).bloc.reprise?.(dossier.carnet, dossier.patient, dossier) || {}),
    ...dossier.valeurs,
    __sexe: dossier.patient.sexe,
    __age: dossier.patient.age,
  }), [dossier]);

  const enregistrerEtape = useCallback(
    (etape, valeurs, complete) => medecine.post(`${admissionId}/etape/`, { etape, valeurs, complete })
      .catch((e) => { throw erreurLisible(e); }),
    [admissionId],
  );

  async function terminer(valeurs) {
    try {
      // La synthèse du bloc de la spécialité accompagne la consultation (dossier, rapports).
      await medecine.post(`${admissionId}/terminer/`, { valeurs: {
        ...valeurs,
        __synthese: spe.bloc.synthese?.(valeurs) || "",
        // Un programme (CPN, vaccination…) n'a pas de diagnostic : son intitulé en tient lieu.
        __diagnostic_programme: spe.bloc.intitule?.(valeurs) || "",
      } });
      setFin(valeurs);
      onTerminee?.();
    } catch (e) {
      throw erreurLisible(e);
    }
  }

  async function proposer(cible, values, setValue) {
    setPropositions((p) => ({ ...p, [cible]: { statut: "attente" } }));
    try {
      const proposition = await medecine.post(`${admissionId}/ia/`, { cible, valeurs: values });
      const avant = Object.fromEntries(REMPLIT[cible].map((id) => [id, values[id]]));
      if (cible === "diagnostic") {
        if (proposition.diagnostic) setValue("diagnostic", proposition.diagnostic);
        if (proposition.hypotheses.length) setValue("hypotheses", proposition.hypotheses.join(", "));
      }
      if (cible === "examens") setValue("examens", proposition.examens);
      if (cible === "ordonnance") {
        setValue("ordonnance", proposition.ordonnance);
        if (!values.conseils?.trim() && proposition.conseils) setValue("conseils", proposition.conseils);
      }
      if (cible === "conseils") setValue("conseils", proposition.conseils);
      setPropositions((p) => ({ ...p, [cible]: { statut: "propose", proposition, avant } }));
    } catch (e) {
      setPropositions((p) => ({ ...p, [cible]: { statut: "erreur", message: erreurLisible(e).message } }));
    }
  }

  const fieldAddon = (field, { values, setValue }) => {
    if (!field.assist) return null;
    const cible = field.assist;
    const etat = propositions[cible];
    return (
      <AideIa cible={cible} etat={etat}
        onProposer={() => proposer(cible, values, setValue)}
        onAnnuler={() => {
          Object.entries(etat.avant).forEach(([id, valeur]) => setValue(id, valeur ?? ""));
          setPropositions((p) => ({ ...p, [cible]: undefined }));
        }}
        onFermer={() => setPropositions((p) => ({ ...p, [cible]: undefined }))}
        onDemander={onDemander} />
    );
  };

  if (!dossier && !erreur) return <Chargement taille="moyenne" texte="Ouverture du dossier…" />;

  if (erreur) {
    return (
      <section className="bloc">
        <p className="bandeau erreur" role="alert">{erreur}</p>
        <div className="sf-pied-droite">
          <button type="button" className="secondary-button" onClick={onFermer}>Retour à la liste</button>
          <button type="button" className="primary-button" onClick={() => setVersion((n) => n + 1)}>Réessayer</button>
        </div>
      </section>
    );
  }

  if (fin) {
    return <Fin valeurs={fin} refs={refs} patient={dossier.patient} onFermer={onFermer} onSuivant={onSuivant}
      onModifier={() => setVersion((n) => n + 1)} />;
  }

  return (
    <StepForm key={`${admissionId}-${version}`} config={config} initialValues={initiales}
      initialStep={dossier.etapeCourante} initialDone={dossier.etapesFaites}
      outils={<OutilsPatient onAssistant={onAssistant}
        constantesOuvertes={constantes} onConstantes={() => setConstantes((o) => !o)} />}
      bandeau={constantes && <ConstantesPatient dossier={dossier} />}
      onSaveStep={enregistrerEtape} onSubmit={terminer} onChange={onValeurs} onClose={onFermer} enPage
      fieldAddon={fieldAddon} />
  );
}

/* Fin de consultation : ce qui est parti, en trois lignes. */
function Fin({ valeurs: v, refs, patient, onFermer, onSuivant, onModifier }) {
  const medicaments = (v.ordonnance || []).filter((l) => l.medicament?.trim());
  const examens = (refs.examens || []).filter((e) => (v.examens || []).includes(e.code));
  const issue = refs.issues?.find((i) => i.code === v.issue)?.libelle;
  const detail = v.issue === "rdv"
    ? `${new Date(v.rdv_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}${v.rdv_heure ? ` à ${v.rdv_heure}` : ""}`
    : ["hospitalisation", "observation"].includes(v.issue) ? `Chambre ${v.chambre}, lit ${v.lit}`
      : v.issue === "refere_interne" ? v.refere_service
        : v.issue === "refere_externe" ? v.refere_structure : "";

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onFermer()}>
      <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Consultation terminée">
        <header className="pop-tete">
          <div>
            <h2>Consultation terminée</h2>
            <p>{patient.nomComplet}</p>
          </div>
        </header>
        <div className="pop-corps">
          <div className="reussite"><BadgeCheck size={38} strokeWidth={2} aria-hidden="true" /></div>
          <dl className="recap">
            <div><dt>Diagnostic</dt><dd>{v.diagnostic}</dd></div>
            <div><dt>Pharmacie</dt><dd>{medicaments.length ? `${medicaments.length} médicament${medicaments.length > 1 ? "s" : ""}` : "—"}</dd></div>
            <div><dt>Laboratoire</dt><dd>{examens.length ? examens.map((e) => e.nom).join(", ") : "—"}</dd></div>
            <div><dt>Issue</dt><dd>{[issue, detail].filter(Boolean).join(" · ")}</dd></div>
          </dl>
        </div>
        <footer className="pop-pied">
          <button type="button" className="secondary-button" onClick={onModifier}>Modifier</button>
          <div className="sf-pied-droite">
            <button type="button" className={onSuivant ? "secondary-button" : "primary-button"} onClick={onFermer}>Fermer</button>
            {onSuivant && <button type="button" className="primary-button" onClick={onSuivant}>Patient suivant</button>}
          </div>
        </footer>
      </div>
    </div>
  );
}
