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
   Un seul parcours, du premier champ jusqu'à l'envoi en caisse.
   L'utilisateur ne quitte jamais le popup.

   Quand on part d'un patient déjà enregistré, les quatre
   premières étapes disparaissent d'elles-mêmes : c'est la
   condition `visibleIf` qui les retire du parcours.
   ------------------------------------------------------------ */
export function configDossier({ assurances, services, prestations, patientExistant = false }) {
  const nouveauPatient = { field: "__patient_existant__", operator: "falsy" };

  return {
    title: patientExistant ? "Nouvelle fiche de paiement" : "Enregistrer un patient",
    submitLabel: "Envoyer en caisse",
    steps: [
      {
        id: "identite",
        title: "Identité",
        description: "Seuls le nom et les prénoms sont indispensables. Le reste peut être complété plus tard.",
        visibleIf: nouveauPatient,
        fields: [
          { id: "last_name", type: "text", label: "Nom", required: true, placeholder: "KONE" },
          { id: "first_names", type: "text", label: "Prénoms", required: true, placeholder: "Aminata" },
          {
            id: "birth_date", type: "birthdate", label: "Date de naissance ou âge", large: true,
            helpText: "Renseignez ce que le patient connaît : la date, ou simplement son âge.",
          },
          {
            id: "sex", type: "radio", label: "Sexe", required: true,
            options: [["M", "Masculin"], ["F", "Féminin"], ["O", "Autre"]],
          },
        ],
      },
      {
        id: "coordonnees",
        title: "Coordonnées",
        description: "Un numéro de téléphone permet de joindre le patient ou son accompagnant.",
        visibleIf: nouveauPatient,
        fields: [
          {
            id: "phone", type: "tel", label: "Téléphone", required: true, placeholder: "07 00 00 00 00",
            requiredMessage: "Veuillez renseigner le numéro de téléphone.",
          },
          { id: "city", type: "select", label: "Ville ou commune", options: VILLES, placeholder: "Sélectionner la ville" },
          {
            id: "locality", type: "select", label: "Commune ou localité", options: communesDe,
            placeholder: "Sélectionner la commune", emptyText: "Choisissez d'abord une ville",
          },
          { id: "address", type: "text", label: "Domicile", large: true, placeholder: "Quartier, repère…" },
          { id: "profession", type: "text", label: "Profession" },
        ],
      },
      {
        id: "urgence",
        title: "Personne à prévenir",
        description: "Facultatif. À renseigner si le patient a communiqué un contact d'urgence.",
        visibleIf: nouveauPatient,
        fields: [
          { id: "emergency_contact", type: "text", label: "Nom et prénoms du contact" },
          { id: "emergency_phone", type: "tel", label: "Téléphone du contact" },
          { id: "emergency_relationship", type: "text", label: "Lien avec le patient" },
        ],
      },
      {
        id: "assurance",
        title: "Assurance",
        description: "Si le patient est assuré, la part prise en charge sera calculée automatiquement.",
        visibleIf: nouveauPatient,
        fields: [
          { id: "assure", type: "switch", label: "Le patient est-il assuré ?" },
          {
            id: "assurance", type: "select", label: "Organisme", required: true,
            visibleIf: { field: "assure", operator: "truthy" },
            options: assurances.map((a) => [String(a.id), `${a.name} (${a.rate} %)`]),
          },
          {
            id: "numero_assurance", type: "text", label: "Numéro d'assuré", required: true,
            placeholder: "ASSUR-12345",
            visibleIf: { field: "assure", operator: "truthy" },
          },
        ],
      },
      {
        id: "prestation",
        title: "Prestation",
        description: "La fiche part en caisse. Le patient sera enregistré dès qu'elle sera réglée.",
        fields: [
          {
            id: "service", type: "select", label: "Service de destination", required: true,
            options: services.map((s) => [String(s.id), s.name]),
          },
          {
            id: "prestation", type: "select", label: "Prestation", required: true,
            options: (values) => prestations
              .filter((p) => !values.service || String(p.service) === String(values.service))
              .map((p) => [String(p.id), `${p.name} — ${Number(p.price).toLocaleString("fr-FR")} FCFA`]),
            emptyText: "Aucune prestation pour ce service",
          },
          {
            id: "quantite", type: "number", label: "Quantité", required: true,
            validate: { min: 1, max: 50, message: "La quantité doit être comprise entre 1 et 50." },
          },
          { id: "notes", type: "textarea", label: "Observations", large: true },
        ],
      },
    ],
  };
}
