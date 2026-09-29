import * as BLOCS from "../consultation/blocs";
import * as PROG from "../consultation/programmes";
import * as GRAPH from "../consultation/graphiques";
import { BLOC_GENERAL, configConsultation } from "../medecine/configs";

/*
 * ============================================================
 * REGISTRE DES SPÉCIALITÉS
 * ============================================================
 *
 * Une spécialité = le tronc commun de la consultation + son bloc
 * (medecine/configs.js décrit ce qu'un bloc peut contenir). Le
 * module Consultation ouvre le formulaire de la spécialité de la
 * prestation payée en caisse ; le Catalogue le montre sans patient.
 *
 * Les codes sont ceux du serveur (backend/consultations/specialites.py).
 * Ajouter une spécialité = écrire son bloc et l'inscrire ici.
 * ============================================================
 */
/* Toutes les spécialités attribuables (mêmes codes que backend/consultations/specialites.py). */
export const LISTE_SPECIALITES = [
  ["medecine-generale", "Médecine générale"], ["pediatrie", "Pédiatrie"], ["dentaire", "Cabinet dentaire"],
  ["cardiologie", "Cardiologie"], ["chirurgie", "Chirurgie"], ["cpa", "Consultation pré-anesthésie"],
  ["dermatologie", "Dermatologie"], ["gynecologie", "Gynécologie"], ["kinesitherapie", "Kinésithérapie"],
  ["ophtalmologie", "Ophtalmologie"], ["orl", "ORL"], ["diabetologie", "Diabétologie"],
  ["neuro-psychiatrie", "Neuro-psychiatrie"], ["urologie", "Urologie"], ["rhumatologie", "Rhumatologie"],
  ["pneumologie", "Pneumologie"], ["hemodialyse", "Hémodialyse"], ["cpn", "Consultation prénatale"],
  ["accouchement", "Accouchement"], ["cpon", "Consultation postnatale"], ["planning-familial", "Planning familial"],
  ["vaccination", "Vaccination"], ["vih", "VIH"],
];

const INSCRITES = [
  {
    id: "medecine-generale",
    nom: "Médecine générale",
    bloc: BLOC_GENERAL,
    sources: ["DPI (captures)", "Observation médicale standard", "Recommandations PNLP / OMS paludisme"],
  },
  { id: "gynecologie", nom: "Gynécologie", bloc: BLOCS.GYNECOLOGIE, sources: ["Examen gynécologique standard", "Dépistage du cancer du col (IVA/IVL, OMS)"] },
  { id: "cardiologie", nom: "Cardiologie", bloc: BLOCS.CARDIOLOGIE, sources: ["Examen cardio-vasculaire standard", "Classification NYHA"] },
  { id: "orl", nom: "ORL", bloc: BLOCS.ORL, sources: ["Examen ORL standard"] },
  { id: "urologie", nom: "Urologie", bloc: BLOCS.UROLOGIE, sources: ["Examen urologique standard"] },
  { id: "rhumatologie", nom: "Rhumatologie", bloc: BLOCS.RHUMATOLOGIE, sources: ["Examen articulaire standard", "EVA"] },
  { id: "pneumologie", nom: "Pneumologie", bloc: BLOCS.PNEUMOLOGIE, sources: ["Examen pleuro-pulmonaire standard", "PNLT : toux de plus de 2 semaines"] },
  { id: "dermatologie", nom: "Dermatologie", bloc: BLOCS.DERMATOLOGIE, sources: ["Sémiologie dermatologique"] },
  { id: "neuro-psychiatrie", nom: "Neuro-psychiatrie", bloc: BLOCS.NEURO_PSYCHIATRIE, sources: ["Score de Glasgow", "PHQ-9, GAD-7"] },
  { id: "cpa", nom: "Consultation pré-anesthésie", bloc: BLOCS.CPA, sources: ["Score ASA", "Classification de Mallampati"] },
  { id: "chirurgie", nom: "Chirurgie", bloc: BLOCS.CHIRURGIE, sources: ["Examen chirurgical standard"] },
  { id: "ophtalmologie", nom: "Ophtalmologie", bloc: BLOCS.OPHTALMOLOGIE, sources: ["Examen ophtalmologique standard"] },
  { id: "kinesitherapie", nom: "Kinésithérapie", bloc: BLOCS.KINESITHERAPIE, sources: ["Bilan kinésithérapique standard", "EVA, testing musculaire 0-5"] },
  { id: "cpn", nom: "Consultation prénatale", bloc: PROG.CPN, sources: ["OMS — Digital Adaptation Kit CPN", "Indicateurs CPN1 / CPN4 (DHIS2 CI)", "TPI, MILDA (PNLP)"] },
  { id: "cpon", nom: "Consultation postnatale", bloc: PROG.CPON, sources: ["OMS — soins postnatals (J3, J7, S6)"] },
  { id: "planning-familial", nom: "Planning familial", bloc: PROG.PLANNING_FAMILIAL, sources: ["OMS — Digital Adaptation Kit PF", "Critères de recevabilité médicale OMS"] },
  { id: "vaccination", nom: "Vaccination", bloc: PROG.VACCINATION, sources: ["Calendrier PEV Côte d'Ivoire (VAP 2024, sante.gouv.ci)", "OMS — Digital Adaptation Kit vaccination"] },
  { id: "vih", nom: "VIH", bloc: PROG.VIH, sources: ["OMS — Digital Adaptation Kit VIH (2e éd.)"] },
  { id: "diabetologie", nom: "Diabétologie", bloc: PROG.DIABETOLOGIE, sources: ["Suivi du diabète : HbA1c, pied diabétique, rétinopathie"] },
  { id: "hemodialyse", nom: "Hémodialyse", bloc: PROG.HEMODIALYSE, sources: ["Fiche de séance d'hémodialyse standard"] },
  { id: "pediatrie", nom: "Pédiatrie", bloc: GRAPH.PEDIATRIE, sources: ["OMS-UNICEF — PCIME", "Normes de croissance OMS 2006", "Périmètre brachial (malnutrition aiguë)"] },
  { id: "dentaire", nom: "Cabinet dentaire", bloc: GRAPH.DENTAIRE, sources: ["Numérotation dentaire FDI", "Examen bucco-dentaire standard"] },
  { id: "accouchement", nom: "Accouchement", bloc: GRAPH.ACCOUCHEMENT, sources: ["OMS — partogramme (lignes d'alerte et d'action)", "Apgar, GATPA"] },
];

export const SPECIALITES = INSCRITES.map((s) => ({
  ...s,
  statut: "en service",
  config: (contexte) => configConsultation({ ...contexte, bloc: s.bloc }),
}));

/* La spécialité d'un code ; à défaut, la médecine générale. */
export const specialite = (code) => SPECIALITES.find((s) => s.id === code) || SPECIALITES[0];

/* Ce que le moteur attend autour d'une configuration : un faux dossier et de fausses listes. */
export const DOSSIER_EXEMPLE = {
  terminee: false,
  patient: { sexe: "F", age: 28, ageTexte: "28 ans", nomComplet: "EXEMPLE Aya", numero: "P26EXEMAS" },
};

export const REFS_EXEMPLE = {
  examens: [
    { code: "nfs", nom: "NFS", categorie: "Hématologie", prix: 5000 },
    { code: "ge", nom: "Goutte épaisse", categorie: "Parasitologie", prix: 2000 },
    { code: "glycemie", nom: "Glycémie", categorie: "Biochimie", prix: 1500 },
    { code: "ecbu", nom: "ECBU", categorie: "Bactériologie", prix: 6000 },
  ],
  medicaments: [
    { nom: "Artéméther-Luméfantrine 20/120 mg", stock: 40, unite: "Boîte" },
    { nom: "Paracétamol 500 mg", stock: 200, unite: "Boîte" },
    { nom: "Amoxicilline sirop 250 mg", stock: 30, unite: "Flacon" },
  ],
  chambres: [{ nom: "A-101", service: "Médecine", lits: ["1", "2"] }],
  services: ["Pédiatrie", "Gynécologie-Obstétrique", "Cardiologie", "Chirurgie"],
  issues: [
    ["sortie", "Retour à domicile"], ["rdv", "Rendez-vous de contrôle"], ["observation", "Mise en observation"],
    ["hospitalisation", "Hospitalisation"], ["refere_interne", "Référé en interne"], ["refere_externe", "Référé en externe"],
    ["refus", "Refus d'hospitalisation"], ["evade", "Évadé"], ["decede", "Décédé"],
  ].map(([code, libelle]) => ({ code, libelle })),
};
