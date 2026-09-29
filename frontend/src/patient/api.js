import axios from "axios";

/*
 * ============================================================
 * CLIENT DE L'ESPACE PATIENT
 * ============================================================
 *
 * Séparé de celui du personnel : autre jeton (« Patient … »),
 * autre clé de stockage. Un patient connecté sur un téléphone
 * n'a jamais de jeton du personnel, et inversement.
 * ============================================================
 */

const CLE = "ma_sante_patient";
const CLE_CODE = "ma_sante_patient_code";

const portail = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"}/portail`,
  headers: { "Content-Type": "application/json" },
});

portail.interceptors.request.use((config) => {
  const jeton = lireJeton();
  if (jeton) config.headers.Authorization = `Patient ${jeton}`;
  return config;
});

/* Session expirée ou révoquée (PIN réinitialisé à l'accueil) : retour à la connexion. */
portail.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("connexion")) {
      oublierJeton();
      window.location.assign("/patient");
    }
    return Promise.reject(error);
  },
);

export function lireJeton() {
  try { return localStorage.getItem(CLE); } catch { return null; }
}

export function garderJeton(jeton) {
  try { localStorage.setItem(CLE, jeton); } catch { /* navigation privée : la session dure le temps de l'onglet */ }
}

export function oublierJeton() {
  try { localStorage.removeItem(CLE); } catch { /* rien à oublier */ }
}

/* Le code patient est retenu sur le téléphone : la fois suivante, seul le PIN est demandé. */
export function codeRetenu() {
  try { return localStorage.getItem(CLE_CODE) || ""; } catch { return ""; }
}

export function retenirCode(code) {
  try { localStorage.setItem(CLE_CODE, code); } catch { /* sans stockage, on redemandera le code */ }
}

export function oublierCode() {
  try { localStorage.removeItem(CLE_CODE); } catch { /* rien à oublier */ }
}

export function erreur(e, secours = "Une erreur est survenue. Réessayez.") {
  const data = e?.response?.data;
  if (!e?.response) return "Pas de connexion au serveur. Vérifiez votre réseau et réessayez.";
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") return Object.values(data).flat().join(" ");
  return secours;
}

export default portail;
