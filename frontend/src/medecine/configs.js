/*
 * ============================================================
 * CONSULTATION — CONFIGURATION (tronc commun + bloc de la spécialité)
 * ============================================================
 *
 * Tout le métier vit ici ; le moteur (src/forms/StepForm.jsx)
 * n'en sait rien. Quatre étapes, dans l'ordre de l'observation
 * médicale : interroger, examiner, conclure, traiter.
 *
 * Seuls six renseignements sont obligatoires : motif, histoire,
 * état général, diagnostic, issue — et la posologie de chaque
 * médicament prescrit. Tout le reste se déplie à la demande.
 *
 * L'identité, l'assurance et les constantes ne se ressaisissent
 * pas : elles viennent de la caisse et de l'infirmerie, et
 * s'affichent dans le bandeau du patient.
 *
 * Les identifiants des champs sont ceux que lit le serveur
 * (backend/consultations/medecine.py).
 * ============================================================
 */

export const APPAREILS = [
  { id: "cutane", label: "Cutanéo-muqueux", signes: ["Pâleur conjonctivale", "Ictère", "Déshydratation", "Œdèmes", "Éruption cutanée", "Plaie"] },
  { id: "cardio", label: "Cardio-vasculaire", signes: ["Tachycardie", "Souffle", "Arythmie", "Œdèmes des membres inférieurs"] },
  { id: "pulmo", label: "Pleuro-pulmonaire", signes: ["Râles crépitants", "Sibilants", "Matité", "Tirage", "Diminution du murmure"] },
  { id: "digestif", label: "Digestif", signes: ["Sensibilité", "Défense", "Hépatomégalie", "Splénomégalie", "Ballonnement"] },
  { id: "neuro", label: "Neurologique", signes: ["Raideur de nuque", "Trouble de la conscience", "Déficit moteur", "Convulsions"] },
  { id: "osteo", label: "Ostéo-articulaire", signes: ["Douleur articulaire", "Gonflement", "Limitation"] },
  { id: "orl", label: "ORL", signes: ["Angine", "Otite", "Rhinorrhée", "Adénite cervicale"] },
  { id: "ganglions", label: "Aires ganglionnaires", signes: ["Adénopathie cervicale", "Adénopathie axillaire", "Adénopathie inguinale"] },
];

const SIGNES = [
  "Fièvre", "Frissons", "Céphalées", "Courbatures", "Asthénie", "Toux", "Dyspnée", "Douleur thoracique",
  "Douleur abdominale", "Nausées", "Vomissements", "Diarrhée", "Brûlures mictionnelles", "Éruption cutanée",
  "Vertiges", "Perte d'appétit",
];

const ETATS_GENERAUX = [["bon", "Bon"], ["moyen", "Moyen"], ["altere", "Altéré"]];
const RESULTATS = [["non_fait", "Non fait"], ["positif", "Positif"], ["negatif", "Négatif"]];
const VOIES = ["Orale", "IV", "IM", "SC", "Rectale", "Cutanée", "Inhalée", "Oculaire", "Autre"];

const paires = (liste) => liste.map((x) => [x, x]);

/* ------------------------------------------------------------
   POSOLOGIE — une liste, comme au DPI
   ------------------------------------------------------------
   « 1 comprimé / 2x / jour ». La forme se déduit du nom du
   médicament (sirop → cuillère, injectable → ampoule…) ; on
   peut toujours écrire autre chose. La quantité et la voie
   s'en déduisent aussi, tant que le médecin ne les a pas
   touchées.
   ------------------------------------------------------------ */
const FORMES = [
  { forme: "cuillère", voie: "Orale", motif: /sirop|susp|buvable|solution orale/ },
  { forme: "ampoule", voie: "IM", motif: /inj|ampoule|amp\b|flacon|\biv\b|\bim\b|perf/ },
  { forme: "suppositoire", voie: "Rectale", motif: /suppo/ },
  { forme: "sachet", voie: "Orale", motif: /sachet|poudre|sro\b/ },
  { forme: "gélule", voie: "Orale", motif: /g[ée]lule|caps/ },
  { forme: "goutte", voie: "Oculaire", motif: /goutte|collyre/ },
  { forme: "application", voie: "Cutanée", motif: /cr[èe]me|pommade|gel\b/ },
  { forme: "bouffée", voie: "Inhalée", motif: /inhal|a[ée]rosol|spray/ },
  { forme: "comprimé", voie: "Orale", motif: /\bcp\b|comprim|\bmg\b/ },
];
const DOSES = ["1", "2", "1/2", "3", "4"];
const PRISES = [1, 2, 3, 4];

const formeDe = (medicament) => {
  const nom = String(medicament || "").toLowerCase();
  return nom.trim() ? FORMES.find((f) => f.motif.test(nom)) : null;
};

const pluriel = (forme, dose) => (Number(dose) > 1 && !forme.endsWith("s") ? `${forme}s` : forme);

function posologies(ligne) {
  const trouvee = formeDe(ligne?.medicament);
  const formes = trouvee ? [trouvee.forme] : ["comprimé", ...FORMES.map((f) => f.forme).filter((f) => f !== "comprimé"), "unité"];
  return formes.flatMap((forme) => DOSES.flatMap((dose) => PRISES.map((n) => `${dose} ${pluriel(forme, dose)} / ${n}x / jour`)));
}

/* « 2 comprimés / 3x / jour » pendant 5 jours → 30. */
function quantiteDe(posologie, duree) {
  const lu = String(posologie || "").match(/^\s*(1\/2|\d+(?:[.,]\d+)?)\s+\S+.*?(\d+)\s*x\s*\/\s*jour/i);
  const jours = Number(duree);
  if (!lu || !jours) return "";
  const dose = lu[1] === "1/2" ? 0.5 : Number(lu[1].replace(",", "."));
  return String(Math.ceil(dose * Number(lu[2]) * jours));
}

function completerLigne(ligne, cle, avant) {
  const suite = { ...ligne };
  if (cle === "medicament") {
    const forme = formeDe(ligne.medicament);
    if (forme && (!avant.voie || avant.voie === formeDe(avant.medicament)?.voie)) suite.voie = forme.voie;
  }
  if (["posologie", "duree"].includes(cle)) {
    const auto = quantiteDe(avant.posologie, avant.duree);
    if (!avant.quantite || String(avant.quantite) === auto) suite.quantite = quantiteDe(suite.posologie, suite.duree) || suite.quantite;
  }
  return suite;
}
const aujourdhui = () => new Date().toISOString().slice(0, 10);

const ANTECEDENTS_OUI_NON = [["ant_hta", "HTA"], ["ant_diabete", "Diabète"], ["ant_asthme", "Asthme"],
  ["ant_drepanocytose", "Drépanocytose"], ["tabac", "Tabac"], ["alcool", "Alcool"]];

/* « HTA, diabète · Allergie : pénicilline » — l'essentiel du dossier, dossier fermé. */
function resumeAntecedents(v) {
  const oui = ANTECEDENTS_OUI_NON.filter(([id]) => v[id] === true).map(([, l]) => l);
  const autres = ["ant_medicaux", "ant_chirurgicaux", "traitements_en_cours"].filter((id) => v[id]?.trim()).length;
  const morceaux = [
    oui.join(", "),
    autres ? `${autres} autre${autres > 1 ? "s" : ""} renseigné${autres > 1 ? "s" : ""}` : "",
    v.allergies?.trim() ? `Allergie : ${v.allergies.trim()}` : "",
  ].filter(Boolean);
  return morceaux.join(" · ");
}

/* Même phrase que le serveur écrit dans la consultation (synthese_examen). */
export function syntheseExamen(v) {
  const etat = ETATS_GENERAUX.find(([id]) => id === v.etat_general)?.[1];
  const normaux = [];
  const anomalies = [];
  for (const a of APPAREILS) {
    if (v[`ex_${a.id}`] === "anormal") {
      const details = [...(v[`ex_${a.id}_signes`] || []), v[`ex_${a.id}_detail`]?.trim()].filter(Boolean);
      anomalies.push(`${a.label} : ${details.join(", ") || "anormal"}.`);
    } else {
      normaux.push(a.label.toLowerCase());
    }
  }
  return [
    etat ? `État général ${etat.toLowerCase()}.` : "",
    normaux.length ? `Examen ${normaux.join(", ")} normal.` : "",
    ...anomalies,
    v.ex_autres?.trim() || "",
  ].filter(Boolean).join(" ");
}

/* Le bloc de la médecine générale : son examen physique, et sa synthèse. */
export const BLOC_GENERAL = {
  titre: "Consultation de médecine générale",
  examen: [
      { id: "__etat__", type: "section", label: "Examen physique", colonne: "droite" },
      { id: "etat_general", type: "radio", label: "État général", required: true, span: 12, options: ETATS_GENERAUX,
        requiredMessage: "Veuillez indiquer l'état général.", variant: "ligne" },
      ...APPAREILS.flatMap((a) => {
        const anormal = { field: `ex_${a.id}`, operator: "eq", value: "anormal" };
        return [
          { id: `ex_${a.id}`, type: "radio", label: a.label, span: 12, variant: "ligne",
            options: [["normal", "Normal"], ["anormal", "Anormal"]] },
          { id: `ex_${a.id}_signes`, type: "liste", label: "Signes", span: 12,
            options: paires(a.signes), visibleIf: anormal, variant: "detail" },
          { id: `ex_${a.id}_detail`, type: "text", label: "Précisions", span: 12, visibleIf: anormal, variant: "detail" },
        ];
      }),
      { id: "ex_autres", type: "textarea", label: "Autres constatations", span: 12, rows: 2 },
  ],
  synthese: syntheseExamen,
};

/*
 * Toute consultation = le tronc commun + le bloc de sa spécialité (voir
 * catalogue/specialites.js). Le bloc peut :
 *
 *   examen          remplacer la carte « Examen physique » de l'étape 1
 *   synthese(v)     résumer son examen (affiché, et enregistré dans la consultation)
 *   histoire        false : l'histoire de la maladie devient facultative
 *   diagnostic      false : le diagnostic devient facultatif (programmes : CPN, vaccination…)
 *   tdr             false : pas de carte « Tests rapides »
 *   etapes          étapes propres, insérées après l'étape 1 (schéma dentaire, partogramme…)
 *   diagnosticChamps champs ajoutés à la carte « Diagnostic »
 */
export function configConsultation({ dossier, refs, bloc = BLOC_GENERAL }) {
  const femmeEnAgeDeProcreer = (v) => v.__sexe === "F" && v.__age >= 12 && v.__age <= 55;
  // La carte « Grossesse » du tronc commun s'efface quand la spécialité suit elle-même la grossesse (CPN, CPON).
  const grossesseDuTronc = (v) => bloc.grossesse !== false && femmeEnAgeDeProcreer(v);
  const antecedents = { field: "__antecedents__", operator: "truthy" };
  const issue = (...codes) => (v) => codes.includes(v.issue);
  const medicaments = refs.medicaments || [];
  const stockDe = (nom) => medicaments.find((m) => m.nom.toLowerCase() === String(nom || "").trim().toLowerCase());
  const chambres = refs.chambres || [];

  return {
    title: bloc.titre,
    navigation: "libre",
    submitLabel: dossier.terminee ? "Enregistrer les modifications" : "Terminer la consultation",
    steps: [
      /* ---------------------------------------------------- */
      {
        id: "interrogatoire",
        title: bloc.titreEtape1 || "Interrogatoire et examen",
        resume: (v) => ({ titre: "Synthèse de l'examen", texte: bloc.synthese?.(v) || "" }),

        fields: [
          { id: "__motif__", type: "section", label: "Motif et histoire de la maladie", colonne: "gauche" },
          { id: "motif", type: "text", label: "Motif de consultation", required: bloc.motif !== false, span: 12, requiredMessage: "Veuillez indiquer le motif de consultation." },
          // Compté dans le rapport d'activités (« référés d'une autre structure reçus »).
          { id: "refere_recu", type: "switch", label: "Référé par une autre structure", span: 12 },
          { id: "histoire", type: "textarea", label: "Histoire de la maladie", required: bloc.histoire !== false,
            visibleIf: () => !bloc.sansHistoire, span: 12, rows: bloc.histoire === false ? 2 : 4,
            requiredMessage: "Veuillez décrire l'histoire de la maladie." },
          { id: "signes", type: "liste", label: "Signes rapportés", span: 12, options: paires(bloc.signes || SIGNES), visibleIf: () => bloc.signes !== false },

          { id: "__antecedents__", type: "disclosure", label: "Antécédents et mode de vie", colonne: "gauche", hint: resumeAntecedents },
          { id: "__ant_connus__", type: "coches", label: "Antécédents et facteurs de risque", span: 12,
            items: ANTECEDENTS_OUI_NON, visibleIf: antecedents },
          { id: "allergies", type: "text", label: "Allergies", span: 6, visibleIf: antecedents },
          { id: "traitements_en_cours", type: "text", label: "Traitements en cours", span: 6, visibleIf: antecedents },
          { id: "ant_medicaux", type: "text", label: "Autres antécédents médicaux", span: 6, visibleIf: antecedents },
          { id: "ant_chirurgicaux", type: "text", label: "Antécédents chirurgicaux", span: 6, visibleIf: antecedents },
          { id: "ant_familiaux", type: "text", label: "Antécédents familiaux", span: 12, visibleIf: antecedents },

          { id: "__grossesse__", type: "section", label: "Grossesse", colonne: "gauche", visibleIf: grossesseDuTronc },
          { id: "grossesse", type: "radio", label: "Grossesse en cours", span: 12, visibleIf: grossesseDuTronc,
            options: [["non", "Non"], ["oui", "Oui"], ["nsp", "Ne sait pas"]] },
          { id: "ddr", type: "date", label: "Date des dernières règles", span: 6, max: aujourdhui(), visibleIf: grossesseDuTronc },

          ...bloc.examen,
        ].filter((f) => bloc.grossesse !== false || !["__grossesse__", "grossesse", "ddr"].includes(f.id) || bloc.examen.includes(f)),
      },

      ...(bloc.etapes || []),

      /* ---------------------------------------------------- */
      {
        id: "diagnostic",
        title: "Diagnostic",
        fields: [
          { id: "__tdr__", type: "section", label: "Tests rapides", colonne: "gauche", visibleIf: () => bloc.tdr !== false },
          { id: "tdr_palu", type: "radio", label: "TDR paludisme", span: 12, options: RESULTATS, variant: "ligne", visibleIf: () => bloc.tdr !== false },
          { id: "__autres_tdr__", type: "disclosure", label: "Autres tests rapides", colonne: "gauche", visibleIf: () => bloc.tdr !== false },
          ...[["goutte_epaisse", "Goutte épaisse"], ["tdr_vih", "TDR VIH"], ["tdr_dengue", "TDR dengue"], ["tdr_covid", "Test COVID-19"]].map(([id, label]) => ({
            id, type: "radio", label, span: 12, options: RESULTATS, variant: "ligne",
            visibleIf: { field: "__autres_tdr__", operator: "truthy" },
          })),
          { id: "tdr_grossesse", type: "radio", label: "Test de grossesse", span: 12, options: RESULTATS, variant: "ligne",
            visibleIf: (v) => v.__autres_tdr__ && femmeEnAgeDeProcreer(v) },

          { id: "__diagnostic__", type: "section", label: "Diagnostic", colonne: "droite" },
          { id: "diagnostic", type: "text", label: "Diagnostic retenu", required: bloc.diagnostic !== false, span: 12, assist: "diagnostic", requiredMessage: "Veuillez poser le diagnostic retenu." },
          { id: "hypotheses", type: "text", label: "Hypothèses", span: 6 },
          // Liste déroulante (le crayon permet d'en écrire une autre) : rapport « maladies avec pathologies associées ».
          { id: "pathologies", type: "liste", label: "Pathologies associées", span: 6,
            options: paires(["Paludisme", "Anémie", "Hypertension artérielle", "Diabète", "Infection urinaire", "Gastro-entérite",
              "Infection respiratoire", "Fièvre typhoïde", "Drépanocytose", "Malnutrition", "VIH", "Tuberculose"]) },
          ...(bloc.diagnosticChamps || []),

          { id: "__examens__", type: "section", label: "Examens au laboratoire", colonne: "gauche" },
          { id: "examens", type: "liste", libre: false, label: "Examens demandés", span: 12, assist: "examens",
            options: (refs.examens || []).map((e) => [e.code, e.nom]), emptyText: "Le catalogue du laboratoire est vide." },
          { id: "examens_priorite", type: "radio", label: "Priorité", span: 12, variant: "ligne",
            options: [["Normale", "Normale"], ["Urgente", "Urgente"]], visibleIf: (v) => (v.examens || []).length > 0 },
        ],
      },

      /* ---------------------------------------------------- */
      {
        id: "traitement",
        title: "Traitement et issue",
        fields: [
          { id: "__ordonnance__", type: "section", label: "Ordonnance" },
          {
            id: "ordonnance", type: "repeater", label: "Médicaments prescrits", span: 12, assist: "ordonnance", minRows: 1,
            addLabel: "Ajouter un médicament",
            columns: "minmax(0, 2.2fr) minmax(0, 1.8fr) minmax(0, .8fr) minmax(0, .8fr) minmax(0, 1fr)",
            fields: [
              { id: "medicament", type: "combobox", label: "Médicament",
                options: medicaments.map((m) => [m.nom, `${m.stock} ${m.unite || ""} en stock`.trim()]) },
              { id: "posologie", type: "combobox", label: "Posologie", options: (_, ligne) => posologies(ligne) },
              { id: "duree", type: "number", label: "Durée", suffix: "j" },
              { id: "quantite", type: "number", label: "Quantité" },
              { id: "voie", type: "select", label: "Voie", options: paires(VOIES) },
            ],
            rowChange: completerLigne,
            rowNote: (ligne) => {
              if (!ligne.medicament?.trim()) return "";
              const produit = stockDe(ligne.medicament);
              if (!produit) return "Hors stock";
              if (produit.stock <= 0) return "Rupture";
              return "";
            },
          },
          { id: "__conseils__", type: "section", label: "Conseils au patient", colonne: "gauche" },
          { id: "conseils", type: "textarea", label: "Conseils", span: 12, rows: 3, assist: "conseils" },
          { id: "__actes__", type: "disclosure", label: "Actes posés pendant la consultation", colonne: "gauche" },
          { id: "actes", type: "textarea", label: "Actes posés", span: 12, rows: 2, visibleIf: { field: "__actes__", operator: "truthy" } },

          { id: "__issue__", type: "section", label: "Issue de la consultation", colonne: "droite" },
          { id: "issue", type: "select", label: "Orientation du patient", required: true, span: 12,
            options: (refs.issues || []).map((i) => [i.code, i.libelle]),
            requiredMessage: "Veuillez choisir l'issue de la consultation." },

          { id: "rdv_date", type: "date", label: "Date du rendez-vous", required: true, span: 4, min: aujourdhui(), visibleIf: issue("rdv"),
            requiredMessage: "Veuillez fixer la date du rendez-vous." },
          { id: "rdv_heure", type: "time", label: "Heure", span: 3, spanMobile: 1, visibleIf: issue("rdv") },
          { id: "rdv_motif", type: "text", label: "Motif du rendez-vous", span: 5, visibleIf: issue("rdv") },

          { id: "chambre", type: "select", label: "Chambre", required: true, span: 4, visibleIf: issue("hospitalisation", "observation"),
            options: chambres.map((c) => [c.nom, `${c.nom} · ${c.service}`]), emptyText: "Aucun lit libre",
            requiredMessage: "Veuillez choisir la chambre." },
          { id: "lit", type: "select", label: "Lit", required: true, span: 3, spanMobile: 1, visibleIf: issue("hospitalisation", "observation"),
            options: (v) => (chambres.find((c) => c.nom === v.chambre)?.lits || []).map((l) => [l, `Lit ${l}`]),
            emptyText: "D'abord la chambre", requiredMessage: "Veuillez choisir le lit." },
          { id: "sortie_prevue", type: "date", label: "Sortie prévue", span: 5, min: aujourdhui(), visibleIf: issue("hospitalisation") },

          { id: "refere_service", type: "select", label: "Service", required: true, span: 6, visibleIf: issue("refere_interne"),
            options: paires(refs.services || []), requiredMessage: "Veuillez choisir le service." },
          { id: "refere_structure", type: "text", label: "Structure d'accueil", required: true, span: 6, visibleIf: issue("refere_externe"), requiredMessage: "Veuillez indiquer la structure d'accueil." },
          { id: "refere_motif", type: "text", label: "Motif de la référence", span: 6, visibleIf: issue("refere_interne", "refere_externe") },
          { id: "issue_note", type: "text", label: "Circonstances", span: 12, visibleIf: issue("refus", "evade", "decede") },
        ],
      },
    ],
  };
}
