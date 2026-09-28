/*
 * ============================================================
 * CONFIGURATIONS DES FORMULAIRES DU MODULE
 * ============================================================
 *
 * Tout le métier vit ici. Le moteur (src/forms/StepModal.jsx)
 * n'en sait rien : il se contente de lire ces objets.
 *
 * Pour ajouter un formulaire ailleurs dans l'application, il
 * suffit d'écrire un fichier comme celui-ci.
 * ============================================================
 */

/* ------------------------------------------------------------
   VILLES ET COMMUNES
   ------------------------------------------------------------
   Référentiel de saisie : on propose les principales villes et
   leurs communes plutôt que de laisser le champ libre, pour que
   deux agents n'écrivent pas « Cocody » et « cocodi ».

   La commune dépend de la ville choisie — c'est le rôle de la
   fonction passée à `options`.
   ------------------------------------------------------------ */
const COMMUNES = {
  Abidjan: ["Abobo", "Adjamé", "Attécoubé", "Cocody", "Koumassi", "Marcory", "Plateau",
            "Port-Bouët", "Treichville", "Yopougon", "Bingerville", "Songon", "Anyama"],
  Yamoussoukro: ["Yamoussoukro", "Attiégouakro", "Kossou"],
  Bouaké: ["Bouaké", "Djébonoua", "Brobo"],
  "San-Pédro": ["San-Pédro", "Grand-Béréby", "Doba"],
  Daloa: ["Daloa", "Gonaté", "Zaïbo"],
  Korhogo: ["Korhogo", "Karakoro", "Sinématiali"],
  Man: ["Man", "Podiagouiné", "Sandougou-Soba"],
  Gagnoa: ["Gagnoa", "Bayota", "Guibéroua"],
  Abengourou: ["Abengourou", "Niablé", "Zaranou"],
  Divo: ["Divo", "Hiré", "Didoko"],
};

const VILLES = Object.keys(COMMUNES).map((ville) => [ville, ville]);

const communesDe = (values) => {
  const liste = COMMUNES[values.city] || [];
  return liste.map((commune) => [commune, commune]);
};

/* ------------------------------------------------------------
   DOSSIER PATIENT + FICHE DE PAIEMENT
   ------------------------------------------------------------
   Deux étapes, du premier champ jusqu'à l'envoi en caisse :

     Patient      qui il est, comment le joindre, son assurance
     Prestation   ce qu'il vient faire, et ce qu'il paiera

   La personne à prévenir, facultative, se déplie à la demande.
   Quand on part d'un patient déjà enregistré, l'étape Patient
   disparaît d'elle-même (`visibleIf`) : il ne reste que la
   prestation.

   Largeurs : `span` sur 12 colonnes à l'écran large,
   `spanMobile` sur 2 colonnes au téléphone.
   ------------------------------------------------------------ */

const argent = (valeur) => `${Math.round(Number(valeur) || 0).toLocaleString("fr-FR")} FCFA`;

export function configDossier({ assurances, services, prestations, patientExistant = false, patient = null }) {
  const nouveauPatient = { field: "__patient_existant__", operator: "falsy" };
  const assure = { field: "assure", operator: "truthy" };
  const contact = { field: "__contact__", operator: "truthy" };

  /* Taux de prise en charge : celui du dossier existant, ou celui choisi à l'étape Patient. */
  const tauxAssurance = (values) => {
    if (patient) return Number(patient.taux_assurance) || 0;
    if (!values.assure) return 0;
    const organisme = assurances.find((a) => String(a.id) === String(values.assurance));
    return Number(organisme?.rate) || 0;
  };

  return {
    title: patientExistant ? "Nouvelle fiche de paiement" : "Enregistrer un patient",
    submitLabel: "Envoyer en caisse",
    steps: [
      {
        id: "patient",
        title: "Patient",
        visibleIf: nouveauPatient,
        fields: [
          { id: "last_name", type: "text", label: "Nom", required: true, placeholder: "KONE", span: 6 },
          { id: "first_names", type: "text", label: "Prénoms", required: true, placeholder: "Aminata", span: 6 },
          { id: "birth_date", type: "birthdate", label: "Date de naissance ou âge", span: 6 },
          {
            id: "sex", type: "radio", label: "Sexe", required: true, span: 6,
            options: [["M", "Masculin"], ["F", "Féminin"], ["O", "Autre"]],
          },

          { id: "__coordonnees__", type: "section", label: "Coordonnées" },
          {
            id: "phone", type: "tel", label: "Téléphone", required: true, placeholder: "07 00 00 00 00", span: 4,
            requiredMessage: "Veuillez renseigner le numéro de téléphone.",
          },
          { id: "city", type: "select", label: "Ville", options: VILLES, placeholder: "Choisir", span: 4, spanMobile: 1 },
          {
            id: "locality", type: "select", label: "Commune", options: communesDe, span: 4, spanMobile: 1,
            placeholder: "Choisir", emptyText: "D'abord la ville",
          },
          { id: "address", type: "text", label: "Domicile", placeholder: "Quartier, repère…", span: 8 },
          { id: "profession", type: "text", label: "Profession", span: 4 },

          { id: "__assurance__", type: "section", label: "Assurance" },
          { id: "assure", type: "switch", label: "Assuré ?", span: 3 },
          {
            id: "assurance", type: "select", label: "Organisme", required: true, span: 5, visibleIf: assure,
            options: assurances.map((a) => [String(a.id), `${a.name} (${Number(a.rate)} %)`]),
          },
          {
            id: "numero_assurance", type: "text", label: "N° d'assuré", required: true, span: 4, visibleIf: assure,
            placeholder: "ASSUR-12345",
          },

          { id: "__contact__", type: "disclosure", label: "Personne à prévenir", hint: "Facultatif" },
          { id: "emergency_contact", type: "text", label: "Nom et prénoms", span: 5, visibleIf: contact },
          { id: "emergency_phone", type: "tel", label: "Téléphone", span: 4, spanMobile: 1, visibleIf: contact },
          { id: "emergency_relationship", type: "text", label: "Lien", placeholder: "Mère, conjoint…", span: 3, spanMobile: 1, visibleIf: contact },
        ],
      },
      {
        id: "prestation",
        title: "Prestation",
        description: patient
          ? `${patient.nom_complet} · ${patient.patient_number}${patient.a_assurance ? ` · ${patient.assurance_nom} (${Number(patient.taux_assurance)} %)` : ""}`
          : "",
        fields: [
          {
            id: "service", type: "select", label: "Service de destination", required: true, span: 6,
            options: services.map((s) => [String(s.id), s.name]),
          },
          {
            id: "prestation", type: "select", label: "Prestation", required: true, span: 6,
            options: (values) => prestations
              .filter((p) => !values.service || String(p.service) === String(values.service))
              .map((p) => [String(p.id), `${p.name} — ${argent(p.price)}`]),
            emptyText: "D'abord le service",
          },
          {
            id: "quantite", type: "number", label: "Quantité", required: true, span: 3, spanMobile: 1,
            validate: { min: 1, max: 50, message: "Entre 1 et 50." },
          },
          { id: "notes", type: "text", label: "Observations", placeholder: "Facultatif", span: 9, spanMobile: 2 },
        ],
        /* Ce que le patient paiera, calculé pendant la saisie. */
        summary: (values) => {
          const choisie = prestations.find((p) => String(p.id) === String(values.prestation));
          if (!choisie) return null;
          const brut = Number(choisie.price) * (Number(values.quantite) || 1);
          const taux = tauxAssurance(values);
          const prise = (brut * taux) / 100;
          return {
            lignes: [
              ["Tarif", argent(brut)],
              ...(taux ? [[`Prise en charge (${taux} %)`, `− ${argent(prise)}`]] : []),
            ],
            total: ["À payer", argent(brut - prise)],
          };
        },
      },
    ],
  };
}
