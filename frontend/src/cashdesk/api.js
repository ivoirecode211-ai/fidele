import { useEffect, useRef, useState } from "react";
import api from "../services/api";

export const cash = {
  get: (path, params) => api.get(`/cashdesk/${path}/`, { params }).then((r) => r.data),
  post: (path, body) => api.post(`/cashdesk/${path}/`, body).then((r) => r.data),
  patch: (path, body) => api.patch(`/cashdesk/${path}/`, body).then((r) => r.data),
  remove: (path) => api.delete(`/cashdesk/${path}/`),
};

export function errorText(error) {
  const data = error?.response?.data;
  if (!data) return "La connexion a été interrompue. Vos données sont conservées ; vous pouvez réessayer.";
  const flatten = (value) => typeof value === "string" ? value : Array.isArray(value)
    ? value.map(flatten).join(" ") : Object.entries(value).map(([k, v]) => `${k === "detail" || k === "non_field_errors" ? "" : `${k} : `}${flatten(v)}`).join(" ");
  return flatten(data);
}

export function useResource(path, params = {}, version = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [retry, setRetry] = useState(0);
  const query = JSON.stringify(params);
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: "" }); return; }
    let current = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    cash.get(path, JSON.parse(query)).then((data) => current && setState({ data, loading: false, error: "" }))
      .catch((e) => current && setState({ data: null, loading: false, error: errorText(e) }));
    return () => { current = false; };
  }, [path, query, version, retry]);
  return { ...state, reload: () => setRetry((n) => n + 1) };
}

export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function run(fn) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { return await fn(); } catch (e) { setError(errorText(e)); return undefined; }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, setError, run };
}

export async function action(name, body) {
  const userToken = localStorage.getItem("ma_sante_access") || "";
  let userId = "anonymous";
  try { userId = JSON.parse(atob(userToken.split(".")[1].replaceAll("-", "+").replaceAll("_", "/"))).user_id; } catch { /* API refusera la session invalide. */ }
  const bytes = new TextEncoder().encode(JSON.stringify([name, body, userId]));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const storageKey = `ma-sante-operation-${hash}`;
  let key = sessionStorage.getItem(storageKey);
  if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); }
  const result = await api.post(`/cashdesk/actions/${name}/`, body, { headers: { "Idempotency-Key": key } });
  sessionStorage.removeItem(storageKey);
  return result.data;
}

export const money = (value) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} FCFA`;
export const dateTime = (value) => value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Non renseigné";
export const modes = { CASH: "Espèces", MOBILE: "Mobile Money", CARD: "Carte", TRANSFER: "Virement" };
export const statuses = { PAID: "Soldé", PARTIAL: "Partiellement réglé", UNPAID: "À régler", CANCELLED: "Annulé",
  DUE: "À transmettre", SENT: "Transmis", DISPUTED: "Contesté", OPEN: "Ouverte", CLOSED: "À valider", VALIDATED: "Validée",
  WAITING: "En attente", RECEIVED: "Reçu", DONE: "Terminé" };
