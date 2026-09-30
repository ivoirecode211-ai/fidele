import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  MessageCircle,
  Package,
  Pill,
  Stethoscope,
} from "lucide-react";

import api from "../services/api";

/*
 * ============================================================
 * PASTILLE DE NOTIFICATIONS — EN-TÊTE DES MODULES
 * ============================================================
 *
 * L'API (/api/parcours/notifications/) dit ce qui attend la personne
 * connectée — son rôle, son hôpital, ses spécialités — et ce qui est
 * nouveau depuis son dernier clic sur la cloche.
 *
 *   pastille    les nouveautés ; le clic l'efface (côté serveur)
 *   son         à chaque arrivée, application ouverte
 *   système     notification du navigateur si la page n'est pas
 *               au premier plan ; push si elle est fermée
 *               (service worker /sw-personnel.js)
 * ============================================================
 */

const REFRESH_MS = 20000;

const ITEM_ICONS = {
  vitals: HeartPulse,
  consultations: Stethoscope,
  "patient-messages": MessageCircle,
  "to-prepare": ClipboardList,
  ready: Pill,
  lab: FlaskConical,
  stock: Package,
};

/* ---------------------------------------------------------------- son */

let audio = null;

/* Le navigateur n'autorise le son qu'après un geste de l'utilisateur. */
function preparerSon() {
  if (audio || typeof window === "undefined") return;
  const Contexte = window.AudioContext || window.webkitAudioContext;
  if (Contexte) audio = new Contexte();
}

function carillon() {
  if (!audio) return;
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const debut = audio.currentTime + 0.02;
  [[880, 0], [1320, 0.16]].forEach(([frequence, decalage]) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = frequence;
    gain.gain.setValueAtTime(0.0001, debut + decalage);
    gain.gain.exponentialRampToValueAtTime(0.25, debut + decalage + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + decalage + 0.45);
    osc.connect(gain).connect(audio.destination);
    osc.start(debut + decalage);
    osc.stop(debut + decalage + 0.5);
  });
}

/* ---------------------------------------------------------------- notifications système */

const PORTEE = "/personnel/";

const pushPossible = () => typeof window !== "undefined" && window.isSecureContext
  && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function clePublique(base64) {
  const brut = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

/* Abonne ce navigateur au push (une fois l'autorisation donnée) ; silencieux en cas d'échec. */
async function abonner() {
  if (!pushPossible() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.register("/sw-personnel.js", { scope: PORTEE });
    await navigator.serviceWorker.ready.catch(() => {});
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { data } = await api.get("/parcours/notifications/push/");
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clePublique(data.publicKey) });
    }
    await api.post("/parcours/notifications/push/", { subscription: sub.toJSON() });
  } catch {
    /* navigateur sans push, ou refus : la pastille et le son restent */
  }
}

async function afficher(item) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const titre = "MA SANTÉ";
  const options = { body: `${item.count} ${item.label}`, tag: `ms-${item.id}`, renotify: true, icon: "/images/marque.svg", data: { url: item.link } };
  try {
    const reg = pushPossible() ? await navigator.serviceWorker.getRegistration(PORTEE) : null;
    if (reg) { await reg.showNotification(titre, options); return; }
    const n = new Notification(titre, options);
    n.onclick = () => { window.focus(); window.location.assign(item.link); };
  } catch {
    /* pas de notification système possible ici */
  }
}

/* Ce qui a déjà sonné dans cet onglet : changer de module ne fait pas resonner. */
const CLE = "ms-notifications-signalees";
function lireSignalees() {
  try { return JSON.parse(sessionStorage.getItem(CLE) || "{}"); } catch { return {}; }
}
function ecrireSignalees(valeur) {
  try { sessionStorage.setItem(CLE, JSON.stringify(valeur)); } catch { /* stockage indisponible */ }
}

/* ---------------------------------------------------------------- composant */

export default function NotificationBell() {
  const navigate = useNavigate();
  const [data, setData] = useState({ count: 0, nouveaux: 0, items: [] });
  const [open, setOpen] = useState(false);
  const [nouveautes, setNouveautes] = useState([]);
  const rootRef = useRef(null);

  const signaler = useCallback((items) => {
    const deja = lireSignalees();
    const arrivees = items.filter((item) => item.nouveau > 0 && item.count > (deja[item.id] || 0));
    ecrireSignalees(Object.fromEntries(items.map((item) => [item.id, item.count])));
    if (!arrivees.length) return;
    carillon();
    if (document.visibilityState !== "visible" || !document.hasFocus()) arrivees.forEach(afficher);
  }, []);

  useEffect(() => {
    let active = true;

    const load = () =>
      api
        .get("/parcours/notifications/")
        .then((response) => {
          if (!active) return;
          setData(response.data);
          signaler(response.data.items || []);
        })
        .catch(() => {});

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener("focus", load);
    window.addEventListener("pointerdown", preparerSon, { once: true });
    abonner();

    /* Clic sur une notification système : le service worker demande d'ouvrir le module. */
    const ouvrir = (event) => {
      if (event.data?.type !== "ms-ouvrir") return;
      const url = new URL(event.data.url, window.location.origin);
      navigate(url.pathname + url.search);
    };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", ouvrir);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener("pointerdown", preparerSon);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", ouvrir);
    };
  }, [navigate, signaler]);

  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function basculer() {
    preparerSon();
    if (open) { setOpen(false); return; }
    setOpen(true);
    // Ce qui était nouveau reste marqué dans le panneau ; la pastille, elle, s'efface.
    setNouveautes(data.items.filter((item) => item.nouveau > 0).map((item) => item.id));
    if (data.nouveaux > 0) {
      setData((d) => ({ ...d, nouveaux: 0 }));
      api.post("/parcours/notifications/vues/").then((r) => setData(r.data)).catch(() => {});
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => { if (p === "granted") abonner(); }).catch(() => {});
    }
  }

  const { count, nouveaux, items } = data;
  const badge = nouveaux > 99 ? "99+" : String(nouveaux);
  const label = nouveaux
    ? `Notifications : ${nouveaux} nouveauté${nouveaux > 1 ? "s" : ""}`
    : count ? `Notifications : ${count} en attente` : "Notifications : rien en attente";

  function goTo(link) {
    setOpen(false);
    navigate(link);
  }

  return (
    <div className="ms-bell" ref={rootRef}>
      <button
        type="button"
        className={`ms-bell-button ${open ? "open" : ""}`}
        onClick={basculer}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        title={label}
      >
        <Bell size={19} strokeWidth={2} aria-hidden="true" />

        {nouveaux > 0 && (
          <span key={nouveaux} className="ms-bell-badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="ms-bell-panel" role="dialog" aria-label="Notifications">
          <div className="ms-bell-panel-header">
            <strong>Notifications</strong>
            <span>{count ? `${count} en attente` : "À jour"}</span>
          </div>

          {items.length === 0 ? (
            <div className="ms-bell-empty">
              <BellOff size={22} strokeWidth={1.8} aria-hidden="true" />
              <p>Rien ne vous attend pour le moment.</p>
            </div>
          ) : (
            <ul className="ms-bell-list">
              {items.map((item) => {
                const Icon = ITEM_ICONS[item.id] || Bell;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`ms-bell-item ${nouveautes.includes(item.id) ? "nouveau" : ""}`}
                      onClick={() => goTo(item.link)}
                    >
                      <span className="ms-bell-item-icon">
                        <Icon size={17} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className="ms-bell-item-text">
                        <strong>{item.count}</strong> {item.label}
                      </span>
                      <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
