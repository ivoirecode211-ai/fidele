import {
  OUI_NON, aujourdhui, bloc, carte, choix, dansRepliable, examen, paires, repliable,
} from "./briques";

/*
 * ============================================================
 * BLOCS DES SPÉCIALITÉS (docs/specialites.md, section A)
 * ============================================================
 *
 * Chaque bloc remplace la carte « Examen physique » de la
 * médecine générale ; le reste de la consultation (interrogatoire,
 * diagnostic, ordonnance, issue, aide IA) est le tronc commun.
 *
 * Les champs obligatoires sont ceux qu'exige le serveur
 * (backend/consultations/specialites.py) : à garder alignés.
 * ============================================================
 */

const ETAT_GENERAL = choix("etat_general", "État général", [["bon", "Bon"], ["moyen", "Moyen"], ["altere", "Altéré"]],
  { required: true, requiredMessage: "Veuillez indiquer l'état général." });

/* ---------------------------------------------------------------- */

export const GYNECOLOGIE = bloc({
  titre: "Consultation de gynécologie",
  histoire: false,
  signes: ["Douleur pelvienne", "Leucorrhées", "Saignement anormal", "Retard de règles", "Prurit vulvaire",
    "Douleur aux rapports", "Troubles du cycle", "Masse du sein", "Infertilité"],
  examen: [
    carte("cycle", "Cycle et grossesses"),
    { id: "cycle", type: "radio", label: "Cycle", span: 12, options: [["regulier", "Régulier"], ["irregulier", "Irrégulier"], ["menopause", "Ménopause"]] },
    { id: "gestite", type: "number", label: "Gestité", span: 4, spanMobile: 1, min: 0 },
    { id: "parite", type: "number", label: "Parité", span: 4, spanMobile: 1, min: 0 },
    { id: "contraception", type: "text", label: "Contraception", span: 4 },
    carte("examen_gyneco", "Examen gynécologique"),
    ...examen("seins", "Seins", ["Nodule", "Écoulement", "Rétraction", "Adénopathie axillaire"]),
    ...examen("speculum", "Spéculum", ["Col inflammatoire", "Ectropion", "Leucorrhées", "Saignement", "Lésion suspecte"]),
    ...examen("toucher_vaginal", "Toucher vaginal", ["Utérus augmenté", "Masse annexielle", "Douleur", "Cri du Douglas"]),
    choix("depistage_col", "Dépistage du col (IVA / IVL)", [["non_fait", "Non fait"], ["negatif", "Négatif"], ["positif", "Positif"]], { defaut: "non_fait" }),
  ],
});

export const CARDIOLOGIE = bloc({
  titre: "Consultation de cardiologie",
  signes: ["Douleur thoracique", "Dyspnée d'effort", "Palpitations", "Syncope", "Œdèmes", "Orthopnée", "Céphalées", "Vertiges"],
  examen: [
    carte("examen_cardio", "Examen cardio-vasculaire"),
    ETAT_GENERAL,
    { id: "ta_droit", type: "text", label: "TA bras droit", span: 6, spanMobile: 1 },
    { id: "ta_gauche", type: "text", label: "TA bras gauche", span: 6, spanMobile: 1 },
    ...examen("auscultation_cardiaque", "Auscultation cardiaque", ["Souffle systolique", "Souffle diastolique", "Galop", "Frottement", "Rythme irrégulier"]),
    ...examen("pouls_peripheriques", "Pouls périphériques", ["Abolis", "Asymétriques", "Filants"]),
    ...examen("oedemes", "Membres inférieurs", ["Œdèmes", "Varices", "Signes de phlébite"]),
    ...examen("jugulaires", "Jugulaires", ["Turgescence", "Reflux hépato-jugulaire"]),
    repliable("ecg", "ECG et échographie"),
    { id: "ecg_rythme", type: "select", label: "Rythme ECG", span: 4, visibleIf: dansRepliable("ecg"),
      options: paires(["Sinusal", "Fibrillation atriale", "Flutter", "Bloc", "Autre"]) },
    { id: "ecg_fc", type: "number", label: "Fréquence (bpm)", span: 4, spanMobile: 1, visibleIf: dansRepliable("ecg") },
    { id: "fevg", type: "number", label: "FEVG (%)", span: 4, spanMobile: 1, visibleIf: dansRepliable("ecg") },
    { id: "ecg_anomalies", type: "text", label: "Anomalies", span: 8, visibleIf: dansRepliable("ecg") },
    { id: "nyha", type: "select", label: "Classe NYHA", span: 4, visibleIf: dansRepliable("ecg"), options: paires(["I", "II", "III", "IV"]) },
  ],
});

export const ORL = bloc({
  titre: "Consultation ORL",
  histoire: false,
  signes: ["Otalgie", "Otorrhée", "Surdité", "Acouphènes", "Obstruction nasale", "Épistaxis", "Odynophagie", "Dysphonie", "Vertiges"],
  examen: [
    carte("examen_orl", "Examen ORL"),
    { id: "otoscopie_od", type: "select", label: "Oreille droite", span: 6, spanMobile: 1, defaut: "Normale",
      options: paires(["Normale", "Bouchon de cérumen", "Otite moyenne aiguë", "Otite séreuse", "Perforation", "Otite externe"]) },
    { id: "otoscopie_og", type: "select", label: "Oreille gauche", span: 6, spanMobile: 1, defaut: "Normale",
      options: paires(["Normale", "Bouchon de cérumen", "Otite moyenne aiguë", "Otite séreuse", "Perforation", "Otite externe"]) },
    ...examen("nez", "Fosses nasales", ["Rhinite", "Déviation de cloison", "Polype", "Épistaxis", "Corps étranger"]),
    ...examen("gorge", "Gorge", ["Angine érythémateuse", "Angine pultacée", "Hypertrophie amygdalienne", "Phlegmon"]),
    ...examen("cou", "Cou", ["Adénopathie", "Goitre", "Masse"]),
  ],
});

export const UROLOGIE = bloc({
  titre: "Consultation d'urologie",
  histoire: false,
  signes: ["Dysurie", "Pollakiurie", "Brûlures mictionnelles", "Rétention", "Hématurie", "Incontinence", "Nycturie", "Douleur lombaire"],
  examen: [
    carte("examen_uro", "Examen urologique"),
    ...examen("fosses_lombaires", "Fosses lombaires", ["Douleur à l'ébranlement", "Contact lombaire"]),
    ...examen("globe", "Hypogastre", ["Globe vésical", "Douleur sus-pubienne"]),
    ...examen("organes_genitaux", "Organes génitaux", ["Hydrocèle", "Varicocèle", "Masse testiculaire", "Écoulement urétral"]),
    ...examen("toucher_rectal", "Toucher rectal", ["Prostate augmentée", "Nodule", "Prostate douloureuse"]),
  ],
});

export const RHUMATOLOGIE = bloc({
  titre: "Consultation de rhumatologie",
  histoire: false,
  signes: ["Douleur articulaire", "Gonflement", "Raideur", "Lombalgie", "Cervicalgie", "Douleur nocturne"],
  examen: [
    carte("examen_rhumato", "Examen articulaire"),
    { id: "articulations_douloureuses", type: "liste", label: "Articulations douloureuses", span: 12,
      options: paires(["Épaule D", "Épaule G", "Coude D", "Coude G", "Poignet D", "Poignet G", "Mains", "Hanche D", "Hanche G",
        "Genou D", "Genou G", "Cheville D", "Cheville G", "Pieds", "Rachis cervical", "Rachis lombaire"]) },
    { id: "articulations_gonflees", type: "liste", label: "Articulations gonflées", span: 12,
      options: paires(["Poignet D", "Poignet G", "Mains", "Genou D", "Genou G", "Cheville D", "Cheville G", "Pieds"]) },
    { id: "raideur_matinale", type: "number", label: "Raideur matinale (min)", span: 6, spanMobile: 1, min: 0, suffixe: "min" },
    { id: "eva", type: "number", label: "Douleur (EVA 0-10)", span: 6, spanMobile: 1, min: 0, max: 10 },
    ...examen("rachis", "Rachis", ["Raideur", "Déformation", "Douleur à la palpation", "Signe de Lasègue"]),
  ],
});

export const PNEUMOLOGIE = bloc({
  titre: "Consultation de pneumologie",
  signes: ["Toux", "Expectoration", "Dyspnée", "Hémoptysie", "Douleur thoracique", "Sifflements", "Sueurs nocturnes", "Amaigrissement"],
  examen: [
    carte("examen_pneumo", "Examen pleuro-pulmonaire"),
    ETAT_GENERAL,
    { id: "toux_duree", type: "number", label: "Toux depuis (jours)", span: 6, spanMobile: 1, min: 0, suffixe: "jours" },
    { id: "expectoration", type: "select", label: "Expectoration", span: 6, spanMobile: 1,
      options: paires(["Aucune", "Muqueuse", "Purulente", "Hémoptoïque"]) },
    ...examen("auscultation_pulmonaire", "Auscultation", ["Râles crépitants", "Sibilants", "Ronchi", "Silence auscultatoire", "Souffle tubaire"]),
    ...examen("percussion", "Percussion", ["Matité", "Tympanisme"]),
    ...examen("signes_lutte", "Signes de lutte", ["Tirage", "Battement des ailes du nez", "Cyanose"]),
    carte("tuberculose", "Recherche de tuberculose", "droite", { visibleIf: (v) => Number(v.toux_duree) >= 14 }),
    { id: "genexpert", type: "radio", label: "GeneXpert / crachats", span: 12, variant: "ligne",
      visibleIf: (v) => Number(v.toux_duree) >= 14, options: [["non_fait", "Non fait"], ["demande", "Demandé"], ["negatif", "Négatif"], ["positif", "Positif"]] },
    repliable("souffle", "Débit de pointe / asthme"),
    { id: "debit_pointe", type: "number", label: "Débit de pointe (L/min)", span: 6, spanMobile: 1, visibleIf: dansRepliable("souffle") },
    { id: "crises_asthme", type: "select", label: "Crises d'asthme", span: 6, spanMobile: 1, visibleIf: dansRepliable("souffle"),
      options: paires(["Aucune", "Moins d'une par semaine", "Plusieurs par semaine", "Quotidiennes"]) },
  ],
});

export const DERMATOLOGIE = bloc({
  titre: "Consultation de dermatologie",
  histoire: false,
  signes: ["Prurit", "Éruption", "Tache", "Plaie", "Chute de cheveux", "Lésion des ongles", "Douleur cutanée"],
  examen: [
    carte("lesion", "Lésion"),
    { id: "lesion_type", type: "liste", label: "Type", span: 12,
      options: paires(["Macule", "Papule", "Vésicule", "Bulle", "Pustule", "Plaque", "Nodule", "Ulcère", "Squames", "Croûte"]) },
    { id: "lesion_siege", type: "liste", label: "Siège", span: 12,
      options: paires(["Visage", "Cuir chevelu", "Cou", "Tronc", "Dos", "Membres supérieurs", "Mains", "Membres inférieurs", "Pieds", "Plis", "Organes génitaux", "Diffus"]) },
    { id: "lesion_taille", type: "text", label: "Taille / nombre", span: 6 },
    { id: "lesion_evolution", type: "select", label: "Évolution", span: 6,
      options: paires(["Aiguë (moins de 6 semaines)", "Chronique", "Récidivante"]) },
    choix("prurit", "Prurit", OUI_NON),
  ],
});

export const NEURO_PSYCHIATRIE = bloc({
  titre: "Consultation de neuro-psychiatrie",
  histoire: false,
  signes: ["Céphalées", "Convulsions", "Faiblesse d'un membre", "Troubles de la parole", "Tristesse", "Anxiété",
    "Insomnie", "Agitation", "Hallucinations", "Troubles de la mémoire"],
  examen: [
    carte("neuro", "Examen neurologique"),
    { id: "glasgow", type: "number", label: "Score de Glasgow", span: 6, spanMobile: 1, min: 3, max: 15, defaut: "15" },
    ...examen("deficit", "Motricité et sensibilité", ["Déficit moteur droit", "Déficit moteur gauche", "Déficit sensitif", "Aphasie", "Paralysie faciale"]),
    ...examen("reflexes", "Réflexes", ["Abolis", "Vifs", "Signe de Babinski"]),
    carte("psy", "Examen psychiatrique"),
    { id: "humeur", type: "select", label: "Humeur", span: 6, options: paires(["Normale", "Triste", "Exaltée", "Anxieuse", "Irritable"]) },
    { id: "sommeil", type: "select", label: "Sommeil", span: 6, options: paires(["Normal", "Insomnie", "Hypersomnie"]) },
    choix("idees_suicidaires", "Idées suicidaires", OUI_NON, { required: true, requiredMessage: "Veuillez renseigner les idées suicidaires." }),
    choix("hallucinations", "Hallucinations", OUI_NON),
    repliable("echelles", "Échelles"),
    { id: "phq9", type: "number", label: "PHQ-9 (dépression)", span: 6, spanMobile: 1, min: 0, max: 27, visibleIf: dansRepliable("echelles") },
    { id: "gad7", type: "number", label: "GAD-7 (anxiété)", span: 6, spanMobile: 1, min: 0, max: 21, visibleIf: dansRepliable("echelles") },
  ],
});

export const CPA = bloc({
  titre: "Consultation pré-anesthésie",
  histoire: false,
  diagnostic: false,
  tdr: false,
  signes: false,
  examen: [
    carte("intervention", "Intervention"),
    { id: "intervention", type: "text", label: "Intervention prévue", span: 8 },
    { id: "date_intervention", type: "date", label: "Date", span: 4, min: aujourdhui() },
    carte("risque", "Évaluation anesthésique"),
    choix("asa", "Score ASA", paires(["1", "2", "3", "4", "5"]), { required: true, requiredMessage: "Veuillez indiquer le score ASA." }),
    choix("mallampati", "Mallampati", paires(["1", "2", "3", "4"])),
    choix("ouverture_bouche", "Ouverture de bouche", [["normale", "Plus de 3 cm"], ["reduite", "Moins de 3 cm"]]),
    choix("dents_mobiles", "Dents mobiles ou prothèse", OUI_NON),
    { id: "antecedents_anesthesiques", type: "text", label: "Antécédents anesthésiques", span: 12 },
    carte("conclusion", "Conclusion"),
    choix("aptitude", "Aptitude", [["apte", "Apte"], ["reserve", "Apte sous réserve"], ["inapte", "Inapte"]],
      { required: true, requiredMessage: "Veuillez conclure : apte ou non." }),
    { id: "anesthesie_prevue", type: "select", label: "Anesthésie prévue", span: 6,
      options: paires(["Générale", "Rachianesthésie", "Péridurale", "Locorégionale", "Locale", "Sédation"]) },
    { id: "consignes", type: "text", label: "Consignes (jeûne, traitements)", span: 6 },
  ],
});

export const CHIRURGIE = bloc({
  titre: "Consultation de chirurgie",
  histoire: false,
  signes: ["Douleur", "Masse", "Plaie", "Hernie", "Saignement", "Fièvre", "Vomissements", "Arrêt des matières"],
  examen: [
    carte("examen_chir", "Examen chirurgical"),
    { id: "siege", type: "text", label: "Siège de la lésion", span: 12 },
    ...examen("abdomen", "Abdomen", ["Défense", "Contracture", "Masse", "Hernie", "Météorisme", "Cicatrice"]),
    { id: "examen_local", type: "textarea", label: "Examen local", span: 12, rows: 2 },
    carte("decision", "Décision"),
    choix("indication_operatoire", "Indication opératoire", OUI_NON, { required: true, requiredMessage: "Veuillez indiquer s'il y a une indication opératoire." }),
    choix("urgence", "Urgence", [["immediate", "Immédiate"], ["differee", "Différée"], ["programmee", "Programmée"]],
      { visibleIf: { field: "indication_operatoire", operator: "eq", value: "oui" } }),
    { id: "intervention_prevue", type: "text", label: "Intervention prévue", span: 12, visibleIf: { field: "indication_operatoire", operator: "eq", value: "oui" } },
    repliable("plaie", "Soins de plaie"),
    { id: "type_plaie", type: "select", label: "Plaie", span: 6, visibleIf: dansRepliable("plaie"),
      options: paires(["Propre", "Contuse", "Souillée", "Infectée", "Brûlure"]) },
    { id: "points", type: "number", label: "Points de suture", span: 6, spanMobile: 1, min: 0, visibleIf: dansRepliable("plaie") },
  ],
});

export const OPHTALMOLOGIE = bloc({
  titre: "Consultation d'ophtalmologie",
  histoire: false,
  signes: ["Baisse de vision", "Œil rouge", "Douleur oculaire", "Larmoiement", "Prurit", "Corps étranger", "Vision double"],
  examen: [
    carte("acuite", "Acuité visuelle et tension"),
    { id: "av_od", type: "text", label: "AV œil droit", span: 3, spanMobile: 1 },
    { id: "av_og", type: "text", label: "AV œil gauche", span: 3, spanMobile: 1 },
    { id: "to_od", type: "number", label: "TO droit (mmHg)", span: 3, spanMobile: 1, min: 0 },
    { id: "to_og", type: "number", label: "TO gauche (mmHg)", span: 3, spanMobile: 1, min: 0 },
    carte("examen_oeil", "Examen"),
    ...examen("annexes", "Paupières et conjonctives", ["Rougeur", "Chalazion", "Ptérygion", "Sécrétions"]),
    ...examen("segment_anterieur", "Cornée et cristallin", ["Ulcère", "Opacité cornéenne", "Cataracte"]),
    ...examen("fond_oeil", "Fond d'œil", ["Excavation papillaire", "Rétinopathie", "Hémorragies"]),
    repliable("lunettes", "Prescription de lunettes"),
    ...[["od", "droit"], ["og", "gauche"]].flatMap(([oeil, nom]) => [
      { id: `sphere_${oeil}`, type: "text", label: `Sphère ${nom}`, span: 4, spanMobile: 1, visibleIf: dansRepliable("lunettes") },
      { id: `cylindre_${oeil}`, type: "text", label: `Cylindre ${nom}`, span: 4, spanMobile: 1, visibleIf: dansRepliable("lunettes") },
      { id: `axe_${oeil}`, type: "text", label: `Axe ${nom}`, span: 4, spanMobile: 1, visibleIf: dansRepliable("lunettes") },
    ]),
    { id: "addition", type: "text", label: "Addition", span: 4, visibleIf: dansRepliable("lunettes") },
  ],
});

export const KINESITHERAPIE = bloc({
  titre: "Séance de kinésithérapie",
  titreEtape1: "Bilan et séance",
  histoire: false,
  diagnostic: false,
  tdr: false,
  signes: ["Douleur", "Raideur", "Faiblesse", "Trouble de la marche", "Gêne respiratoire"],
  examen: [
    carte("prescription_kine", "Prescription"),
    { id: "zone", type: "text", label: "Zone traitée", required: true, span: 8, requiredMessage: "Veuillez indiquer la zone traitée." },
    { id: "prescripteur", type: "text", label: "Médecin prescripteur", span: 4 },
    { id: "seance_num", type: "number", label: "Séance n°", span: 4, spanMobile: 1, min: 1 },
    { id: "seances_total", type: "number", label: "Sur", span: 4, spanMobile: 1, min: 1 },
    { id: "eva", type: "number", label: "Douleur (EVA 0-10)", span: 4, min: 0, max: 10 },
    carte("bilan_kine", "Bilan et techniques"),
    choix("force", "Force musculaire (0-5)", paires(["0", "1", "2", "3", "4", "5"])),
    { id: "autonomie", type: "select", label: "Autonomie", span: 6,
      options: paires(["Autonome", "Aide technique", "Aide humaine", "Dépendant"]) },
    { id: "amplitudes", type: "text", label: "Amplitudes articulaires", span: 6 },
    { id: "techniques", type: "liste", label: "Techniques réalisées", span: 12,
      options: paires(["Massage", "Mobilisation", "Renforcement", "Étirements", "Électrothérapie", "Rééducation respiratoire", "Rééducation à la marche", "Drainage"]) },
  ],
});
