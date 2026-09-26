import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  HeartPulse,
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
 * Le compteur vient de l'API (/api/parcours/notifications/) :
 * ce qui attend une action de la personne connectée, selon son
 * rôle. Rafraîchi toutes les minutes et au retour sur l'onglet.
 * ============================================================
 */

const REFRESH_MS = 60000;

const ITEM_ICONS = {
  vitals: HeartPulse,
  consultations: Stethoscope,
  "to-prepare": ClipboardList,
  ready: Pill,
  lab: FlaskConical,
  stock: Package,
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [data, setData] = useState({ count: 0, items: [] });
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    let active = true;

    const load = () =>
      api
        .get("/parcours/notifications/")
        .then((response) => {
          if (active) setData(response.data);
        })
        .catch(() => {});

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener("focus", load);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, []);

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

  const { count, items } = data;
  const badge = count > 99 ? "99+" : String(count);
  const label = count
    ? `Notifications : ${count} action${count > 1 ? "s" : ""} en attente`
    : "Notifications : rien en attente";

  function goTo(link) {
    setOpen(false);
    navigate(link);
  }

  return (
    <div className="ms-bell" ref={rootRef}>
      <button
        type="button"
        className={`ms-bell-button ${open ? "open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        title={label}
      >
        <Bell size={19} strokeWidth={2} aria-hidden="true" />

        {count > 0 && (
          <span key={count} className="ms-bell-badge" aria-hidden="true">
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
                    <button type="button" className="ms-bell-item" onClick={() => goTo(item.link)}>
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
