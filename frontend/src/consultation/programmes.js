import {
  OUI_NON, RESULTAT, aujourdhui, bloc, carte, choix, dansRepliable, examen, paires, repliable,
} from "./briques";

/*
 * ============================================================
 * PROGRAMMES DE SANTÉ — AVEC CARNET DE SUIVI
 * (docs/specialites.md, section B ; kits OMS « SMART Guidelines »)
 * ============================================================
 *
 * Un programme se suit sur plusieurs visites. Le serveur envoie
 * le carnet (visites précédentes de la même spécialité) ; chaque
 * bloc en reprend ce qui ne change pas (`reprise`) et affiche où
 * en est le suivi. Pas de diagnostic à poser : le programme
 * nomme la consultation (`intitule`).
 * ============================================================
 */

const PROGRAMME = { motif: false, histoire: false, sansHistoire: true, diagnostic: false, tdr: false, signes: false };

const derniere = (carnet) => carnet?.[0]?.valeurs || {};
const reprendre = (carnet, cles) => {
  const v = derniere(carnet);
  return Object.fromEntries(cles.filter((c) => v[c] !== undefined && v[c] !== "").map((c) => [c, v[c]]));
};
const date = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");
const jours = (depuis, jusqua = new Date()) => Math.floor((jusqua - new Date(depuis)) / 86400000);

/* ---------------------------------------------------------------- CPN */

/* Terme en semaines d'aménorrhée et date prévue d'accouchement (règle de Naegele : DDR + 280 j). */
export function terme(ddr) {
  if (!ddr) return "";
  const j = jours(ddr);
  if (j < 0 || j > 310) return "";
  const dpa = new Date(new Date(ddr).getTime() + 280 * 86400000);
  return `${Math.floor(j / 7)} SA ${j % 7} j · accouchement prévu le ${date(dpa)}`;
}

export const CPN = bloc({
  ...PROGRAMME,
  titre: "Consultation prénatale",
  grossesse: false,
  titreEtape1: "Suivi de grossesse",
  intitule: (v) => `CPN ${v.numero_cpn || ""}${v.ddr ? ` · ${terme(v.ddr).split(" ·")[0]}` : ""}`.trim(),
  reprise: (carnet) => ({
    ...reprendre(carnet, ["ddr", "gestite", "parite", "avortements", "cesarienne", "groupe_rhesus"]),
    numero_cpn: String((carnet?.length || 0) + 1),
  }),
  examen: [
    carte("grossesse_cpn", "Grossesse", "gauche", { hint: (v) => terme(v.ddr) }),
    { id: "numero_cpn", type: "number", label: "CPN n°", span: 4, spanMobile: 1, min: 1 },
    { id: "ddr", type: "date", label: "Date des dernières règles", required: true, span: 8, max: aujourdhui(),
      requiredMessage: "Veuillez indiquer la date des dernières règles." },
    { id: "gestite", type: "number", label: "Gestité", span: 4, spanMobile: 1, min: 1 },
    { id: "parite", type: "number", label: "Parité", span: 4, spanMobile: 1, min: 0 },
    { id: "avortements", type: "number", label: "Avortements", span: 4, spanMobile: 1, min: 0 },
    choix("cesarienne", "Césarienne antérieure", OUI_NON),

    carte("examen_cpn", "Examen"),
    { id: "tension_cpn", type: "text", label: "Tension (mmHg)", required: true, span: 4, spanMobile: 1,
      requiredMessage: "Veuillez indiquer la tension artérielle." },
    { id: "poids_cpn", type: "number", label: "Poids (kg)", span: 4, spanMobile: 1, min: 0 },
    { id: "hauteur_uterine", type: "number", label: "Hauteur utérine (cm)", span: 4, spanMobile: 1, min: 0 },
    { id: "bcf", type: "number", label: "BCF (/min)", span: 4, spanMobile: 1, min: 0 },
    { id: "presentation", type: "select", label: "Présentation", span: 8,
      options: paires(["Non déterminée", "Céphalique", "Siège", "Transverse"]) },
    choix("oedemes_cpn", "Œdèmes", OUI_NON),
    { id: "signes_danger", type: "liste", label: "Signes de danger", span: 12, libre: false,
      options: paires(["Saignement vaginal", "Céphalées et troubles visuels", "Convulsions", "Fièvre", "Perte de liquide",
        "Diminution des mouvements du bébé", "Douleurs abdominales intenses", "Pâleur importante"]) },
    // Rapport « Pathologies par tranche d'âge » de la CPN.
    { id: "pathologies_grossesse", type: "liste", label: "Pathologies au cours de la grossesse", span: 12,
      options: paires(["Paludisme", "Anémie", "Hypertension artérielle", "Pré-éclampsie", "Infection urinaire", "Diabète gestationnel",
        "Infection sexuellement transmissible", "Menace d'accouchement prématuré", "Vomissements graves"]) },

    carte("depistages", "Dépistages", "gauche"),
    choix("vih_cpn", "VIH", RESULTAT, { defaut: "non_fait" }),
    choix("syphilis", "Syphilis", RESULTAT, { defaut: "non_fait" }),
    choix("tdr_palu_cpn", "TDR paludisme", RESULTAT, { defaut: "non_fait" }),
    choix("goutte_epaisse", "Goutte épaisse", RESULTAT, { defaut: "non_fait" }),
    { id: "hemoglobine", type: "number", label: "Hémoglobine (g/dL)", span: 4, spanMobile: 1, min: 0, step: 0.1 },
    { id: "proteinurie", type: "select", label: "Protéinurie", span: 4, spanMobile: 1, options: paires(["Négative", "Traces", "+", "++", "+++"]) },
    { id: "groupe_rhesus", type: "select", label: "Groupe / rhésus", span: 4, spanMobile: 1,
      options: paires(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]) },

    carte("prevention", "Prévention"),
    { id: "tpi", type: "select", label: "TPI (SP) donné", span: 6, options: paires(["Aucun", "SP1", "SP2", "SP3", "SP4", "SP5"]) },
    { id: "vat", type: "select", label: "Vaccin Td donné", span: 6, options: paires(["Aucun", "Td1", "Td2", "Td3", "Td4", "Td5"]) },
    choix("fer_folique", "Fer + acide folique", OUI_NON),
    choix("milda", "Moustiquaire (MILDA) remise", OUI_NON),
    repliable("plan", "Plan d'accouchement"),
    { id: "lieu_accouchement", type: "text", label: "Lieu prévu", span: 6, visibleIf: dansRepliable("plan") },
    { id: "transport", type: "text", label: "Transport / accompagnant", span: 6, visibleIf: dansRepliable("plan") },
  ],
});

/* ---------------------------------------------------------------- CPON */

export const CPON = bloc({
  ...PROGRAMME,
  titre: "Consultation postnatale",
  grossesse: false,
  titreEtape1: "Mère et nouveau-né",
  intitule: (v) => `CPON ${{ immediate: "6-72 h", j6_10: "6e-10e jour", s6_8: "6e-8e semaine", autre: "autre période" }[v.visite_cpon] || v.visite_cpon || ""}`.trim(),
  examen: [
    carte("visite", "Visite", "gauche"),
    // Périodes du rapport CPON du DPI.
    choix("visite_cpon", "Visite", [["immediate", "6 à 72 h"], ["j6_10", "6e-10e jour"], ["s6_8", "6e-8e semaine"], ["autre", "Autre période"]],
      { required: true, requiredMessage: "Veuillez indiquer la visite postnatale." }),
    carte("mere", "Mère", "gauche"),
    { id: "tension_cpon", type: "text", label: "Tension (mmHg)", span: 6, spanMobile: 1 },
    { id: "temperature_mere", type: "number", label: "Température (°C)", span: 6, spanMobile: 1, step: 0.1 },
    ...examen("saignement", "Saignements", ["Abondants", "Malodorants", "Caillots"]),
    ...examen("uterus", "Involution utérine", ["Utérus mou", "Douleur"]),
    ...examen("cicatrice", "Périnée / cicatrice", ["Infection", "Désunion", "Douleur"]),
    { id: "allaitement", type: "select", label: "Allaitement", span: 6, options: paires(["Exclusif", "Mixte", "Artificiel", "Difficultés"]) },
    { id: "contraception_pp", type: "text", label: "Contraception post-partum", span: 6 },
    carte("nouveau_ne", "Nouveau-né"),
    { id: "poids_nne", type: "number", label: "Poids (g)", span: 6, spanMobile: 1, min: 0 },
    { id: "temperature_nne", type: "number", label: "Température (°C)", span: 6, spanMobile: 1, step: 0.1 },
    ...examen("cordon", "Cordon", ["Rougeur", "Suintement", "Odeur"]),
    ...examen("peau_nne", "Peau", ["Ictère", "Pustules", "Pâleur"]),
    ...examen("tetee", "Tétée", ["Mauvaise prise du sein", "Refus de téter"]),
    { id: "vaccins_naissance", type: "liste", label: "Vaccins de naissance faits", span: 12, libre: false,
      options: paires(["BCG", "VPO 0", "Hépatite B 0"]) },
  ],
});

/* ---------------------------------------------------------------- PLANNING FAMILIAL */

const DUREE_METHODE = {
  "Pilule combinée": 90, "Pilule progestative": 90, "Injectable 1 mois": 30, "Injectable 3 mois (DMPA)": 90,
  "Sayana Press (auto-injection)": 90, "Implant 3 ans": 3 * 365, "Implant 5 ans": 5 * 365, "DIU au cuivre": 365,
};

export const PLANNING_FAMILIAL = bloc({
  ...PROGRAMME,
  titre: "Planning familial",
  titreEtape1: "Méthode contraceptive",
  intitule: (v) => `PF · ${v.methode_pf || ""} · ${({ nouvelle: "nouvelle utilisatrice", renouvellement: "renouvellement", changement: "changement de méthode" })[v.statut_pf] || ""}`,
  reprise: (carnet) => ({
    ...reprendre(carnet, ["methode_pf"]),
    statut_pf: carnet?.length ? "renouvellement" : "nouvelle",
  }),
  examen: [
    carte("methode", "Méthode", "gauche", {
      hint: (v) => (DUREE_METHODE[v.methode_pf]
        ? `Prochain rendez-vous conseillé : ${date(new Date(Date.now() + DUREE_METHODE[v.methode_pf] * 86400000))}` : ""),
    }),
    { id: "methode_pf", type: "select", label: "Méthode", required: true, span: 12, requiredMessage: "Veuillez indiquer la méthode choisie.",
      options: paires(["Pilule combinée", "Pilule progestative", "Injectable 1 mois", "Injectable 3 mois (DMPA)",
        "Sayana Press (auto-injection)", "Implant 3 ans", "Implant 5 ans", "DIU au cuivre", "Préservatif masculin",
        "Préservatif féminin", "MAMA (allaitement)", "Méthodes naturelles", "Ligature des trompes", "Pilule du lendemain"]) },
    choix("statut_pf", "Utilisatrice", [["nouvelle", "Nouvelle"], ["renouvellement", "Renouvellement"], ["changement", "Changement"]]),
    { id: "quantite_pf", type: "number", label: "Quantité remise", span: 6, spanMobile: 1, min: 0 },
    { id: "prochain_rdv_pf", type: "date", label: "Prochain rendez-vous", span: 6, min: aujourdhui() },
    carte("eligibilite", "Éligibilité (critères OMS)"),
    choix("grossesse_exclue", "Grossesse raisonnablement exclue", [["oui", "Oui"], ["non", "Non"]]),
    { id: "tension_pf", type: "text", label: "Tension (mmHg)", span: 6, spanMobile: 1 },
    { id: "poids_pf", type: "number", label: "Poids (kg)", span: 6, spanMobile: 1 },
    choix("allaitement_pf", "Allaite", OUI_NON),
    { id: "effets_secondaires", type: "liste", label: "Effets secondaires", span: 12,
      options: paires(["Saignements irréguliers", "Aménorrhée", "Céphalées", "Prise de poids", "Nausées", "Douleurs pelviennes"]) },
  ],
});

/* ---------------------------------------------------------------- VACCINATION */

/*
 * Calendrier du PEV de Côte d'Ivoire. Le vaccin antipaludique (R21) à 6, 8, 9 et 15 mois
 * vient du ministère (sante.gouv.ci, 2024 : 8 contacts) ; le reste suit le calendrier
 * habituel du PEV — à faire valider par le district sanitaire.
 */
export const CALENDRIER_PEV = [
  { age: "Naissance", jours: 0, vaccins: ["BCG", "VPO 0", "Hépatite B 0"] },
  { age: "6 semaines", jours: 42, vaccins: ["Penta 1", "VPO 1", "Pneumo 1", "Rota 1"] },
  { age: "10 semaines", jours: 70, vaccins: ["Penta 2", "VPO 2", "Pneumo 2", "Rota 2"] },
  { age: "14 semaines", jours: 98, vaccins: ["Penta 3", "VPO 3", "Pneumo 3", "VPI"] },
  { age: "6 mois", jours: 183, vaccins: ["Antipaludique 1"] },
  { age: "8 mois", jours: 244, vaccins: ["Antipaludique 2"] },
  { age: "9 mois", jours: 274, vaccins: ["RR 1", "Fièvre jaune", "Antipaludique 3"] },
  { age: "15 mois", jours: 456, vaccins: ["RR 2", "Antipaludique 4"] },
];
const TOUS_VACCINS = CALENDRIER_PEV.flatMap((c) => c.vaccins);

/* Ce qui est dû à cet âge et pas encore fait : les retards d'abord. */
export function dus(naissance, faits = []) {
  if (!naissance) return [];
  const age = jours(naissance);
  return CALENDRIER_PEV.filter((c) => c.jours <= age).flatMap((c) => c.vaccins).filter((v) => !faits.includes(v));
}

export const VACCINATION = bloc({
  ...PROGRAMME,
  titre: "Vaccination",
  titreEtape1: "Vaccins",
  intitule: (v) => `Vaccination · ${(v.vaccins_donnes || []).join(", ") || "aucun vaccin"}`,
  reprise: (carnet, patient) => {
    const faits = [...new Set((carnet || []).flatMap((c) => [...(c.valeurs.vaccins_donnes || []), ...(c.valeurs.vaccins_anterieurs || [])]))];
    const aFaire = dus(patient?.naissance, faits);
    return { vaccins_anterieurs: faits, __naissance: patient?.naissance || "", vaccins_donnes: aFaire };
  },
  examen: [
    carte("carnet_pev", "Carnet", "gauche", {
      hint: (v) => {
        const retard = dus(v.__naissance, v.vaccins_anterieurs || []);
        return retard.length ? `${retard.length} vaccin${retard.length > 1 ? "s" : ""} dû${retard.length > 1 ? "s" : ""} à cet âge` : "À jour pour son âge";
      },
    }),
    { id: "vaccins_anterieurs", type: "liste", label: "Déjà faits", span: 12, libre: false, options: paires(TOUS_VACCINS) },
    carte("seance_pev", "Séance du jour"),
    { id: "vaccins_donnes", type: "liste", label: "Vaccins donnés aujourd'hui", span: 12, libre: false, options: paires([...TOUS_VACCINS, "Td (femme en âge de procréer)"]) },
    { id: "lot", type: "text", label: "N° de lot", span: 6 },
    { id: "site_injection", type: "select", label: "Site", span: 6, options: paires(["Cuisse gauche", "Cuisse droite", "Bras gauche", "Bras droit", "Voie orale"]) },
    { id: "prochain_rdv_pev", type: "date", label: "Prochain rendez-vous", span: 6, min: aujourdhui() },
    repliable("mapi", "Manifestation post-vaccinale (MAPI)"),
    { id: "mapi", type: "liste", label: "Manifestations", span: 12, visibleIf: dansRepliable("mapi"),
      options: paires(["Fièvre", "Douleur / rougeur au point d'injection", "Abcès", "Pleurs persistants", "Convulsions", "Réaction allergique"]) },
  ],
});

/* ---------------------------------------------------------------- VIH */

export const VIH = bloc({
  ...PROGRAMME,
  titre: "Suivi VIH",
  titreEtape1: "Suivi et traitement",
  intitule: (v) => `VIH · ${v.statut_arv || ""}`,
  reprise: (carnet) => reprendre(carnet, ["date_diagnostic", "stade_oms", "schema_arv", "date_debut_arv", "cv", "cd4"]),
  examen: [
    carte("statut_vih", "Statut", "gauche"),
    { id: "statut_arv", type: "select", label: "Situation", required: true, span: 12, requiredMessage: "Veuillez indiquer la situation du traitement ARV.",
      options: paires(["Pas encore sous ARV", "Initiation ce jour", "Sous ARV (suivi)", "Interruption de traitement", "Transfert entrant"]) },
    { id: "date_diagnostic", type: "date", label: "Date du diagnostic", span: 6, max: aujourdhui() },
    { id: "stade_oms", type: "select", label: "Stade OMS", span: 6, options: paires(["1", "2", "3", "4"]) },
    carte("traitement_arv", "Traitement ARV"),
    { id: "schema_arv", type: "select", label: "Schéma", span: 8,
      options: paires(["TDF + 3TC + DTG (TLD)", "ABC + 3TC + DTG", "AZT + 3TC + DTG", "TDF + 3TC + EFV", "Pédiatrique", "Autre"]) },
    { id: "date_debut_arv", type: "date", label: "Début", span: 4, max: aujourdhui() },
    { id: "observance", type: "select", label: "Observance", span: 6, options: paires(["Bonne (plus de 95 %)", "Moyenne", "Mauvaise"]) },
    { id: "cv", type: "number", label: "Dernière charge virale (copies/mL)", span: 6, min: 0 },
    { id: "cd4", type: "number", label: "CD4 (/mm³)", span: 6, min: 0 },
    { id: "effets_arv", type: "text", label: "Effets secondaires", span: 6 },
    carte("tb_vih", "Tuberculose et prophylaxies", "gauche"),
    { id: "depistage_tb", type: "liste", label: "Symptômes de tuberculose", span: 12, libre: false,
      options: paires(["Toux", "Fièvre", "Sueurs nocturnes", "Amaigrissement"]) },
    choix("tpt", "Traitement préventif TB (TPT)", OUI_NON),
    choix("cotrimoxazole", "Cotrimoxazole", OUI_NON),
  ],
});

/* ---------------------------------------------------------------- DIABÉTOLOGIE */

export const DIABETOLOGIE = bloc({
  titre: "Consultation de diabétologie",
  histoire: false,
  tdr: false,
  signes: ["Polyurie", "Polydipsie", "Amaigrissement", "Fatigue", "Troubles visuels", "Plaie du pied", "Fourmillements", "Malaise"],
  reprise: (carnet) => ({ ...reprendre(carnet, ["type_diabete", "traitement_fond", "diagnostic"]) }),
  examen: [
    carte("equilibre", "Équilibre", "droite"),
    { id: "type_diabete", type: "select", label: "Type", span: 6, options: paires(["Type 1", "Type 2", "Gestationnel", "Autre"]) },
    { id: "glycemie_jeun", type: "number", label: "Glycémie à jeun (g/L)", span: 6, spanMobile: 1, min: 0, step: 0.01 },
    { id: "hba1c", type: "number", label: "HbA1c (%)", span: 6, spanMobile: 1, min: 0, step: 0.1 },
    { id: "creatinine", type: "number", label: "Créatinine (mg/L)", span: 6, spanMobile: 1, min: 0 },
    { id: "traitement_fond", type: "text", label: "Traitement de fond", span: 12 },
    carte("complications", "Complications"),
    ...examen("pied", "Pieds", ["Plaie", "Perte de sensibilité (monofilament)", "Pouls pédieux abolis", "Déformation", "Mycose"]),
    ...examen("yeux_diab", "Yeux", ["Baisse de vision", "Rétinopathie connue"]),
    choix("hypoglycemies", "Hypoglycémies depuis la dernière visite", OUI_NON),
  ],
});

/* ---------------------------------------------------------------- HÉMODIALYSE */

export const HEMODIALYSE = bloc({
  ...PROGRAMME,
  titre: "Séance d'hémodialyse",
  titreEtape1: "Séance",
  intitule: (v) => `Séance de dialyse${v.uf ? ` · UF ${v.uf} mL` : ""}`,
  reprise: (carnet) => ({ ...reprendre(carnet, ["poids_sec", "abord"]), numero_seance: String((carnet?.length || 0) + 1) }),
  examen: [
    carte("poids", "Poids et tension", "gauche", {
      hint: (v) => (v.poids_avant && v.poids_sec ? `Prise de poids : ${(Number(v.poids_avant) - Number(v.poids_sec)).toFixed(1)} kg` : ""),
    }),
    { id: "numero_seance", type: "number", label: "Séance n°", span: 4, spanMobile: 1, min: 1 },
    { id: "poids_sec", type: "number", label: "Poids sec (kg)", span: 4, spanMobile: 1, step: 0.1 },
    { id: "poids_avant", type: "number", label: "Poids avant (kg)", required: true, span: 4, spanMobile: 1, step: 0.1,
      requiredMessage: "Veuillez indiquer le poids avant la séance." },
    { id: "poids_apres", type: "number", label: "Poids après (kg)", span: 4, spanMobile: 1, step: 0.1 },
    { id: "ta_avant", type: "text", label: "TA avant", span: 4, spanMobile: 1 },
    { id: "ta_apres", type: "text", label: "TA après", span: 4, spanMobile: 1 },
    carte("dialyse", "Dialyse"),
    { id: "abord", type: "select", label: "Abord vasculaire", span: 6, options: paires(["Fistule artério-veineuse", "Cathéter"]) },
    ...examen("etat_abord", "État de l'abord", ["Infection", "Thrombose", "Saignement"]),
    { id: "duree_seance", type: "number", label: "Durée (h)", span: 6, spanMobile: 1, min: 0, step: 0.5 },
    { id: "uf", type: "number", label: "Ultrafiltration (mL)", span: 6, spanMobile: 1, min: 0 },
    { id: "incidents", type: "liste", label: "Incidents", span: 12,
      options: paires(["Hypotension", "Crampes", "Céphalées", "Nausées", "Saignement", "Fièvre", "Coagulation du circuit"]) },
  ],
});
