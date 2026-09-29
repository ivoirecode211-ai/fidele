import api from "../services/api";
import { messageErreur } from "../accueil/api";

/* Client du module GED. Les fichiers ne sont jamais servis par une URL publique :
   ils passent par l'API, avec la session du médecin, et chaque ouverture est tracée. */
const ged = {
  get: (chemin, params) => api.get(`/ged/${chemin}`, { params }).then((r) => r.data),
  // Le client commun est réglé sur JSON : un envoi de fichiers doit le dire, sinon axios convertit le formulaire en JSON.
  post: (chemin, corps) => api.post(`/ged/${chemin}`, corps,
    corps instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined).then((r) => r.data),
  patch: (chemin, corps) => api.patch(`/ged/${chemin}`, corps).then((r) => r.data),
  supprimer: (chemin) => api.delete(`/ged/${chemin}`).then((r) => r.data),
};

/* Ouvre le fichier dans un nouvel onglet, ou le télécharge. */
export async function ouvrirFichier(document, telecharger = false) {
  const onglet = telecharger ? null : window.open("", "_blank");
  try {
    const { data } = await api.get(`/ged/documents/${document.id}/fichier/`, {
      params: telecharger ? { telecharger: 1 } : {}, responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    if (telecharger) {
      const lien = Object.assign(window.document.createElement("a"), { href: url, download: document.nomFichier || document.titre });
      lien.click();
    } else if (onglet) {
      onglet.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    onglet?.close();
    throw new Error(messageErreur(e));
  }
}

export const taille = (octets) => {
  if (!octets) return "—";
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
};

export const date = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export { messageErreur };
export default ged;
