/*
 * ============================================================
 * QR CODE ÉQUIPEMENTS — OUTILS COMMUNS
 * ============================================================
 *
 * L'étiquette contient une adresse, pas un numéro : l'appareil
 * photo de n'importe quel téléphone l'ouvre directement, sans
 * application. Le jeton est aléatoire et révocable (« Nouvelle
 * étiquette »), si bien qu'une étiquette ne se devine pas.
 * ============================================================
 */

export const adresseEtiquette = (jeton) => `${window.location.origin}/equipement/${jeton}`;

const JETON = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/* Le jeton lu dans un QR code (adresse complète) ou saisi à la main. */
export function jetonDepuis(texte) {
  const trouve = String(texte || "").match(JETON);
  return trouve ? trouve[1].toLowerCase() : null;
}

export const dateFr = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR") : "—");

export const argent = (valeur) =>
  valeur === null || valeur === undefined ? "—" : `${Number(valeur).toLocaleString("fr-FR")} FCFA`;

/* Couleur de l'état : en service / en panne / réformé, puis l'état déduit des interventions. */
export const CLASSE_ETAT = {
  "En service": "regle",
  "En panne": "critique",
  Réformé: "reforme",
  Opérationnel: "regle",
  Attention: "attente",
  Critique: "critique",
};
