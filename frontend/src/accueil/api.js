import api from "../services/api";

/* Client du module Accueil & Caisse. Rien n'est conservé dans le navigateur :
   tout passe par l'API et vit en base. */
const accueil = {
  get: (chemin, params) => api.get(`/accueil/${chemin}/`, { params }).then((r) => r.data),
  post: (chemin, corps) => api.post(`/accueil/${chemin}/`, corps).then((r) => r.data),
  patch: (chemin, corps) => api.patch(`/accueil/${chemin}/`, corps).then((r) => r.data),
};

/* Remonte le message du serveur plutôt qu'un « Validation error ». */
export function messageErreur(erreur) {
  const data = erreur?.response?.data;
  if (!data) return "La connexion a été interrompue. Vos données sont conservées, vous pouvez réessayer.";
  if (typeof data === "string") return data;
  const aplatir = (v) =>
    typeof v === "string" ? v
      : Array.isArray(v) ? v.map(aplatir).join(" ")
      : Object.entries(v).map(([k, x]) => (k === "detail" || k === "non_field_errors" ? "" : `${k} : `) + aplatir(x)).join(" ");
  return aplatir(data);
}

export const argent = (v) => `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;
export const moment = (v) => (v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default accueil;
