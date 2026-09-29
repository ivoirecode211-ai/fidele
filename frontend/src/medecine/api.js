import api from "../services/api";
import { messageErreur } from "../accueil/api";

/* Client du module Consultation. Tout vit en base : le navigateur
   ne garde que la conversation avec l'assistant, le temps de la séance. */
const medecine = {
  get: (chemin = "", params) => api.get(`/consultations/medecine/${chemin}`, { params }).then((r) => r.data),
  post: (chemin, corps) => api.post(`/consultations/medecine/${chemin}`, corps).then((r) => r.data),
};

/*
 * Une erreur du serveur, rendue lisible. Un refus champ par champ
 * garde `champs` : le formulaire ramène alors au champ concerné.
 */
export function erreurLisible(erreur) {
  const champs = erreur?.response?.data?.champs;
  const lisible = new Error(champs ? "Certains champs sont à compléter." : messageErreur(erreur));
  if (champs) lisible.champs = champs;
  return lisible;
}

export const heure = (iso) => (iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
export const jour = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—");

export function attente(minutes) {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `depuis ${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `depuis ${h} h ${String(minutes % 60).padStart(2, "0")}`;
}

export default medecine;
