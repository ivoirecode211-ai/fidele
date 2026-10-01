import { moisDepuis, statutPoids } from "../forms/components/fields/CourbeField";
import { horsDelai } from "../forms/components/fields/PartogrammeField";
import { ETATS_DENTAIRES } from "../forms/components/fields/DentsField";
import {
  OUI_NON, bloc, carte, choix, dansRepliable, examen, paires, repliable,
} from "./briques";

/*
 * ============================================================
 * SPÉCIALITÉS À CHAMPS GRAPHIQUES
 * ============================================================
 *   Pédiatrie        courbe de croissance + PCIME
 *   Cabinet dentaire schéma dentaire FDI
 *   Accouchement     partogramme OMS
 * ============================================================
 */

/* ---------------------------------------------------------------- PÉDIATRIE */

const ETAT_GENERAL = choix("etat_general", "État général", [["bon", "Bon"], ["moyen", "Moyen"], ["altere", "Altéré"]],
  { required: true, requiredMessage: "Veuillez indiquer l'état général." });

/* Périmètre brachial de 6 à 59 mois : < 115 mm malnutrition sévère, < 125 mm modérée. */
export function nutritionPB(pb) {
  const mm = Number(pb);
  if (!mm) return "";
  return mm < 115 ? "Malnutrition aiguë sévère (PB < 115 mm)" : mm < 125 ? "Malnutrition aiguë modérée (PB < 125 mm)" : "PB normal";
}

const moisDe = (v) => (v.__naissance ? moisDepuis(v.__naissance) : null);

export const PEDIATRIE = bloc({
  titre: "Consultation de pédiatrie",
  signes: ["Fièvre", "Toux", "Difficulté à respirer", "Diarrhée", "Vomissements", "Refus de téter", "Convulsions",
    "Écoulement de l'oreille", "Éruption", "Pleurs inhabituels", "Amaigrissement"],
  reprise: (carnet, patient, dossier) => ({
    __naissance: patient?.naissance || "",
    __points: (carnet || []).map((c) => ({ date: c.date, poids: c.valeurs.poids_enfant })).filter((p) => p.poids).reverse(),
    ...(dossier?.constantes?.poids ? { poids_enfant: String(dossier.constantes.poids) } : {}),
  }),
  examen: [
    carte("danger", "Signes généraux de danger (PCIME)", "droite", {
      hint: (v) => ((v.signes_danger_enfant || []).length ? "Référence urgente" : ""),
    }),
    { id: "signes_danger_enfant", type: "liste", label: "Signes présents", span: 12, libre: false,
      options: paires(["Incapable de boire ou de téter", "Vomit tout", "Convulsions", "Léthargique ou inconscient"]) },
    ETAT_GENERAL,

    carte("croissance", "Croissance et nutrition", "gauche", {
      hint: (v) => {
        const mois = moisDe(v);
        const pb = mois !== null && mois >= 6 && mois < 60 ? nutritionPB(v.pb) : "";
        return pb || "";
      },
    }),
    { id: "poids_enfant", type: "number", label: "Poids (kg)", span: 4, spanMobile: 1, min: 0, step: 0.1 },
    { id: "taille_enfant", type: "number", label: "Taille (cm)", span: 4, spanMobile: 1, min: 0, step: 0.5 },
    { id: "pb", type: "number", label: "PB (mm)", span: 4, spanMobile: 1, min: 0,
      visibleIf: (v) => { const m = moisDe(v); return m === null || (m >= 6 && m < 60); } },
    { id: "perimetre_cranien", type: "number", label: "Périmètre crânien (cm)", span: 6, spanMobile: 1, min: 0, step: 0.5,
      visibleIf: (v) => { const m = moisDe(v); return m !== null && m < 24; } },
    choix("oedemes_bilateraux", "Œdèmes bilatéraux des pieds", OUI_NON),
    { id: "courbe_poids", type: "courbe", label: "Poids pour l'âge", span: 12, poids: "poids_enfant",
      visibleIf: (v) => { const m = moisDe(v); return m === null || m <= 60; } },

    carte("pcime", "Évaluation par symptôme (PCIME)"),
    { id: "frequence_resp", type: "number", label: "Fréquence respiratoire (/min)", span: 6, spanMobile: 1, min: 0 },
    ...examen("respiration", "Respiration", ["Respiration rapide", "Tirage sous-costal", "Stridor", "Sibilants"]),
    ...examen("deshydratation", "Hydratation", ["Yeux enfoncés", "Pli cutané lent", "Boit avidement", "Incapable de boire", "Agité, irritable"]),
    ...examen("oreilles", "Oreilles", ["Écoulement", "Douleur", "Gonflement derrière l'oreille"]),
    ...examen("peau_enfant", "Peau et muqueuses", ["Pâleur palmaire", "Ictère", "Éruption", "Raideur de nuque"]),
  ],
});

/* Le statut pondéral, pour la synthèse et l'intitulé. */
export function statutPediatrique(v) {
  const mois = moisDe(v);
  return mois === null ? "" : statutPoids(Number(v.poids_enfant), mois, v.__sexe);
}

/* ---------------------------------------------------------------- CABINET DENTAIRE */

const ACTES_DENTAIRES = ["Consultation", "Détartrage", "Extraction simple", "Extraction chirurgicale", "Obturation (amalgame)",
  "Obturation (composite)", "Dévitalisation", "Pansement dentaire", "Prothèse", "Couronne", "Radiographie rétro-alvéolaire"];

export const DENTAIRE = bloc({
  titre: "Consultation dentaire",
  histoire: false,
  tdr: false,
  signes: ["Douleur dentaire", "Gonflement de la joue", "Saignement des gencives", "Mauvaise haleine", "Dent cassée",
    "Dent mobile", "Sensibilité au froid", "Contrôle"],
  examen: [
    carte("bouche", "Examen endobuccal"),
    ...examen("gencives", "Gencives", ["Gingivite", "Saignement", "Récession", "Abcès"]),
    ...examen("muqueuses", "Muqueuses", ["Aphte", "Lésion blanche", "Mycose", "Plaie"]),
    { id: "hygiene", type: "radio", label: "Hygiène bucco-dentaire", span: 12, variant: "ligne",
      options: [["bonne", "Bonne"], ["moyenne", "Moyenne"], ["mauvaise", "Mauvaise"]] },
    { id: "occlusion", type: "select", label: "Occlusion", span: 6, options: paires(["Normale", "Classe II", "Classe III", "Béance", "Encombrement"]) },
  ],
  etapes: [{
    id: "schema",
    title: "Schéma et actes",
    fields: [
      carte("schema_dentaire", "Schéma dentaire", "droite", { colonne: undefined }),
      { id: "dents", type: "dents", label: "Dents", span: 12, lacteale: (v) => Number(v.__age) < 6 },
      carte("actes_dentaires", "Actes réalisés", "gauche", { colonne: undefined }),
      {
        id: "actes_dentaires", type: "repeater", label: "Actes", span: 12, minRows: 1, addLabel: "Ajouter un acte",
        columns: "minmax(0, .7fr) minmax(0, 2fr) minmax(0, 2fr)",
        fields: [
          { id: "dent", type: "text", label: "Dent", placeholder: "36" },
          { id: "acte", type: "select", label: "Acte", options: paires(ACTES_DENTAIRES) },
          { id: "observation", type: "text", label: "Observation" },
        ],
      },
      repliable("radio_dent", "Radiographie", "gauche", { colonne: undefined }),
      { id: "radio_demandee", type: "select", label: "Demandée", span: 12, visibleIf: dansRepliable("radio_dent"),
        options: paires(["Rétro-alvéolaire", "Panoramique", "Mordu occlusal"]) },
    ],
  }],
});

const ETATS = Object.fromEntries(ETATS_DENTAIRES);
/* « 36 carie, 21 absente » : la synthèse du schéma, ajoutée à celle de l'examen. */
export const syntheseDents = (v) => Object.entries(v.dents || {}).sort(([a], [b]) => a - b)
  .map(([dent, etat]) => `${dent} ${String(ETATS[etat] || etat).toLowerCase()}`).join(", ");

/* ---------------------------------------------------------------- ACCOUCHEMENT */

export const ACCOUCHEMENT = bloc({
  motif: false, histoire: false, sansHistoire: true, diagnostic: false, tdr: false, signes: false, grossesse: false,
  titre: "Accouchement",
  titreEtape1: "Admission",
  intitule: (v) => ["Accouchement", v.mode_accouchement, v.sexe_bebe && `${v.sexe_bebe === "F" ? "fille" : "garçon"}`,
    v.poids_naissance && `${v.poids_naissance} g`].filter(Boolean).join(" · "),
  examen: [
    carte("admission_travail", "Admission en salle de naissance"),
    { id: "heure_admission", type: "time", label: "Heure d'admission", span: 4, spanMobile: 1 },
    { id: "dilatation_admission", type: "number", label: "Dilatation (cm)", span: 4, spanMobile: 1, min: 0, max: 10 },
    { id: "bcf_admission", type: "number", label: "BCF (/min)", span: 4, spanMobile: 1, min: 0 },
    { id: "presentation_accouchement", type: "select", label: "Présentation", span: 6,
      options: paires(["Céphalique", "Siège", "Transverse", "Face"]) },
    { id: "poche_eaux", type: "select", label: "Poche des eaux", span: 6,
      options: paires(["Intacte", "Rompue, liquide clair", "Rompue, liquide teinté", "Rompue, liquide méconial"]) },
    { id: "tension_admission", type: "text", label: "Tension de la mère", span: 6, spanMobile: 1 },
    choix("vih_mere", "Statut VIH de la mère", [["negatif", "Négatif"], ["positif", "Positif"], ["inconnu", "Inconnu"]]),
    { id: "statut_vat", type: "select", label: "Statut vaccinal Td (VAT)", span: 6,
      options: paires(["Non vaccinée", "Td1", "Td2", "Td3", "Td4", "Td5", "Inconnu"]) },
  ],
  etapes: [
    {
      id: "partogramme",
      title: "Partogramme",
      fields: [
        carte("parto", "Surveillance du travail"),
        { id: "partogramme", type: "partogramme", label: "Dilatation du col", span: 12, releves: "releves" },
        {
          id: "releves", type: "repeater", label: "Relevés", span: 12, minRows: 1, addLabel: "Ajouter un relevé",
          columns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
          fields: [
            { id: "heure", type: "text", label: "Heure", placeholder: "08:00" },
            { id: "dilatation", type: "number", label: "Dilatation (cm)" },
            { id: "bcf", type: "number", label: "BCF" },
            { id: "contractions", type: "number", label: "Contractions /10 min" },
            { id: "ta", type: "text", label: "TA mère" },
          ],
        },
      ],
    },
    {
      id: "naissance",
      title: "Naissance",
      fields: [
        carte("mode", "Accouchement", "gauche"),
        { id: "lieu_accouchement_acc", type: "select", label: "Lieu", span: 12, defaut: "Établissement",
          options: paires(["Établissement", "Domicile", "En route"]) },
        { id: "mode_accouchement", type: "select", label: "Mode", required: true, span: 12, requiredMessage: "Veuillez indiquer le mode d'accouchement.",
          options: paires(["Voie basse", "Voie basse instrumentale", "Césarienne"]) },
        { id: "date_naissance_bebe", type: "date", label: "Date", span: 6, spanMobile: 1 },
        { id: "heure_naissance", type: "time", label: "Heure", span: 6, spanMobile: 1 },
        choix("gatpa", "GATPA (ocytocine)", OUI_NON),
        { id: "delivrance", type: "select", label: "Délivrance", span: 6, options: paires(["Complète", "Incomplète", "Artificielle"]) },
        { id: "complications_mere", type: "liste", label: "Complications", span: 12,
          options: paires(["Hémorragie du post-partum", "Déchirure périnéale", "Épisiotomie", "Éclampsie", "Rétention placentaire", "Rupture utérine"]) },
        carte("bebe", "Nouveau-né"),
        choix("sexe_bebe", "Sexe", [["F", "Fille"], ["M", "Garçon"]]),
        { id: "poids_naissance", type: "number", label: "Poids (g)", span: 4, spanMobile: 1, min: 0 },
        { id: "apgar1", type: "number", label: "Apgar 1 min", span: 4, spanMobile: 1, min: 0, max: 10 },
        { id: "apgar5", type: "number", label: "Apgar 5 min", span: 4, spanMobile: 1, min: 0, max: 10 },
        choix("vivant", "Naissance vivante", [["oui", "Oui"], ["non", "Mort-né"]], { defaut: "oui" }),
        choix("reanimation", "Réanimation du nouveau-né", OUI_NON),
        choix("peau_a_peau", "Peau à peau et mise au sein", OUI_NON),
        choix("declaration_naissance", "Déclaration de naissance faite", OUI_NON),
      ],
    },
  ],
});

/* Les champs graphiques ajoutent leur lecture à la synthèse du bloc. */
const syntheseBase = { pediatrie: PEDIATRIE.synthese, dentaire: DENTAIRE.synthese, accouchement: ACCOUCHEMENT.synthese };
const STATUTS = { severe: "insuffisance pondérale sévère", modere: "insuffisance pondérale modérée", eleve: "poids élevé", normal: "normal" };
PEDIATRIE.synthese = (v) => [syntheseBase.pediatrie(v), statutPediatrique(v) && `Poids pour l'âge : ${STATUTS[statutPediatrique(v)]}.`,
  nutritionPB(v.pb) && `${nutritionPB(v.pb)}.`].filter(Boolean).join(" ");
DENTAIRE.synthese = (v) => [syntheseBase.dentaire(v), syntheseDents(v) && `Schéma dentaire : ${syntheseDents(v)}.`].filter(Boolean).join(" ");
ACCOUCHEMENT.synthese = (v) => [syntheseBase.accouchement(v),
  horsDelai(v.releves) && "Partogramme : ligne d'action franchie."].filter(Boolean).join(" ");
