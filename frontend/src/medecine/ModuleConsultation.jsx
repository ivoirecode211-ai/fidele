import { useCallback, useEffect, useState } from "react";
import {
  BedDouble, CalendarDays, FlaskConical, Pill, Sparkles, UserCheck, Users,
} from "lucide-react";

import "../styles/Caisse.css";
import "../styles/medecine.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import { useAttente } from "../components/attente";
import { aujourdhui } from "../accueil/Periode";
import medecine from "./api";
import Assistant from "./Assistant";
import Consultation from "./Consultation";
import { SignauxPatient, identite } from "./EntetePatient";
import { Consultes, Examens, FileAttente, Ordonnances, RendezVous, Sejours } from "./Listes";

/*
 * ============================================================
 * CONSULTATION — toutes les spécialités ; le formulaire suit la prestation payée
 * ============================================================
 *
 * Le module suit la journée du médecin :
 *
 *   Patients à consulter   la salle d'attente, envoyée par l'infirmerie ;
 *                          une consultation commencée y reste (« Poursuivre »)
 *   Patients consultés     ce qui est fait, rouvrable
 *   Ordonnances            ce qui est parti à la pharmacie
 *   Examens                ce qui est parti au laboratoire, et revenu
 *   Rendez-vous            les contrôles fixés
 *   Hospitalisations       les séjours décidés
 *   Assistant IA           la conversation, déjà engagée sur le
 *                          patient ouvert
 *
 * Une consultation s'ouvre dans la page, à la place de la liste ;
 * la barre latérale ne bouge pas.
 * ============================================================
 */

const RAFRAICHISSEMENT = 30000;

export default function ModuleConsultation() {
  const [ecran, setEcran] = useState("attente");
  const [file, setFile] = useState(null);
  const [suivi, setSuivi] = useState(null);
  const [refs, setRefs] = useState(null);
  const [periode, setPeriode] = useState({ du: aujourdhui(), au: aujourdhui() });
  const [version, setVersion] = useState(0);

  const [ouverte, setOuverte] = useState(null);           // admissionId du patient en consultation
  const [dossier, setDossier] = useState(null);           // son dossier, pour l'assistant
  const [valeurs, setValeurs] = useState(null);           // ce que le médecin a saisi, à l'instant

  const [assistant, setAssistant] = useState(false);
  const [question, setQuestion] = useState(null);

  const rafraichir = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => { medecine.get("references/").then(setRefs).catch(() => setRefs({})); }, []);

  /* La salle d'attente se met à jour toute seule. */
  useEffect(() => {
    const charger = () => medecine.get("", periode).then(setFile).catch(() => {});
    charger();
    const minuteur = setInterval(charger, RAFRAICHISSEMENT);
    return () => clearInterval(minuteur);
  }, [version, periode.du, periode.au]);

  useEffect(() => {
    if (["ordonnances", "examens", "rdv", "sejours"].includes(ecran)) {
      medecine.get("suivi/").then(setSuivi).catch(() => {});
    }
  }, [ecran, version]);

  const attente = useAttente(!file || !refs);

  const ECRANS = [
    { id: "attente", label: "Patients à consulter", icone: Users, titre: "Patients à consulter", sous: "", compte: file?.attente.length },
    { id: "consultes", label: "Patients consultés", icone: UserCheck, titre: "Patients consultés", sous: "" },
    { id: "ordonnances", label: "Ordonnances", icone: Pill, titre: "Ordonnances", sous: "" },
    { id: "examens", label: "Examens", icone: FlaskConical, titre: "Examens demandés", sous: "" },
    { id: "rdv", label: "Rendez-vous", icone: CalendarDays, titre: "Rendez-vous", sous: "" },
    { id: "sejours", label: "Hospitalisations", icone: BedDouble, titre: "Hospitalisations", sous: "" },
    { id: "assistant", label: "Assistant IA", icone: Sparkles, titre: "Assistant IA", sous: "" },
  ];

  /* Pendant une consultation, l'en-tête du module le dit. */
  const patientOuvert = ouverte && dossier?.admissionId === ouverte ? dossier : null;
  const ecrans = ouverte
    ? ECRANS.map((e) => (e.id === ecran
      ? { ...e, titre: patientOuvert ? patientOuvert.patient.nomComplet : "Consultation", sous: patientOuvert ? identite(patientOuvert.patient) : "" }
      : e))
    : ECRANS;

  /* Depuis la barre latérale : l'historique. Depuis une consultation : la conversation du patient. */
  const [depuisConsultation, setDepuisConsultation] = useState(false);
  function ouvrirAssistant(questionPosee = null, surPatient = true) {
    setDepuisConsultation(surPatient);
    setQuestion(questionPosee);
    setAssistant(true);
  }

  function consulter(admissionId) {
    setDossier(null);
    setValeurs(null);
    setOuverte(admissionId);
    if (!["attente", "consultes"].includes(ecran)) setEcran("attente");
  }

  function fermer() {
    setOuverte(null);
    setDossier(null);
    setAssistant(false);
    rafraichir();
  }

  function choisirEcran(id) {
    if (id === "assistant") { ouvrirAssistant(null, false); return; }
    if (ouverte) fermer();
    setEcran(id);
  }

  const suivant = file?.attente.find((l) => l.admissionId !== ouverte);

  return (
    <Coquille ecrans={ecrans} ecran={ecran} onEcran={choisirEcran}
      actions={patientOuvert && <SignauxPatient dossier={patientOuvert} />}
      apres={<>
        <Assistant ouvert={assistant} onFermer={() => setAssistant(false)}
          patientCourant={depuisConsultation && ouverte ? ouverte : null}
          valeurs={ouverte ? valeurs : null}
          question={question} onQuestionLue={() => setQuestion(null)} />
      </>}>
      {attente ? <Chargement taille="grande" pleine texte="Chargement du module…" /> : ouverte ? (
          <Consultation admissionId={ouverte} refs={refs}
            onFermer={fermer}
            onSuivant={suivant ? () => consulter(suivant.admissionId) : null}
            onAssistant={() => ouvrirAssistant()}
            onDemander={(q) => ouvrirAssistant(q)}
            onDossier={setDossier}
            onValeurs={setValeurs}
            onTerminee={rafraichir} />
      ) : <>
        {ecran === "attente" && <FileAttente lignes={file.attente} onConsulter={consulter} onActualiser={rafraichir} />}
        {ecran === "consultes" && <Consultes lignes={file.consultes} periode={periode} setPeriode={setPeriode} onConsulter={consulter} />}
        {["ordonnances", "examens", "rdv", "sejours"].includes(ecran) && !suivi && <Chargement taille="moyenne" />}
        {ecran === "ordonnances" && suivi && <Ordonnances lignes={suivi.ordonnances} />}
        {ecran === "examens" && suivi && <Examens lignes={suivi.examens} />}
        {ecran === "rdv" && suivi && <RendezVous lignes={suivi.rendezVous} />}
        {ecran === "sejours" && suivi && <Sejours lignes={suivi.sejours} />}
      </>}
    </Coquille>
  );
}
