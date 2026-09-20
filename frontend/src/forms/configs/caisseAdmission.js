/*
 * ============================================================
 * CONFIGURATION — ADMISSION PATIENT (CAISSE)
 * ============================================================
 *
 * Premier formulaire réel construit avec le moteur générique.
 * Rien ici n'est câblé dans FormEngine : ajouter un formulaire
 * pour un autre module revient à écrire un fichier comme celui-ci.
 * ============================================================
 */
export const caisseAdmissionConfig = {
  key: "caisse_admission",
  title: "Admission patient",
  navigationMode: "linear",
  finalStep: {
    id: "resume",
    label: "Résumé",
    buttonLabel: "Créer le dossier",
  },
  steps: [
    {
      id: "identification",
      title: "Identification du patient",
      fields: [
        { id: "last_name", type: "text", label: "Nom", required: true },
        { id: "first_names", type: "text", label: "Prénoms", required: true },
        {
          id: "birth_date",
          type: "date",
          label: "Date de naissance",
          required: true,
          validate: { notFuture: true },
        },
        {
          id: "sex",
          type: "radio",
          label: "Sexe",
          required: true,
          options: [
            ["M", "Masculin"],
            ["F", "Féminin"],
            ["O", "Autre"],
          ],
        },
        {
          id: "phone",
          type: "tel",
          label: "Téléphone",
          required: true,
          requiredMessage: "Veuillez renseigner le numéro de téléphone.",
        },
        { id: "address", type: "text", label: "Adresse" },
      ],
    },
    {
      id: "orientation",
      title: "Orientation",
      fields: [
        {
          id: "reason",
          type: "textarea",
          label: "Motif de la visite",
          required: true,
        },
        {
          id: "service",
          type: "select",
          label: "Service de destination",
          required: true,
          options: [
            ["MEDECINE", "Médecine générale"],
            ["CHIRURGIE", "Chirurgie"],
            ["PEDIATRIE", "Pédiatrie"],
            ["URGENCES", "Urgences"],
          ],
        },
        {
          id: "doctor",
          type: "select",
          label: "Médecin",
          required: true,
          optionsSource: "/auth/users/?role=DOCTOR",
        },
      ],
    },
    {
      id: "paiement",
      title: "Paiement",
      fields: [
        {
          id: "payment_mode",
          type: "radio",
          label: "Mode de règlement",
          required: true,
          options: [
            ["CASH", "Espèces"],
            ["MOBILE", "Mobile Money"],
            ["CARD", "Carte"],
            ["TRANSFER", "Virement"],
          ],
        },
        {
          id: "amount",
          type: "number",
          label: "Montant à payer (FCFA)",
          required: true,
          validate: { min: 0, message: "Le montant doit être positif." },
        },
      ],
    },
  ],
};
