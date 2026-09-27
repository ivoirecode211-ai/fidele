import { CalendarDays } from "lucide-react";

import "../styles/Caisse.css";

import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import SidebarFooter from "./SidebarFooter";
import UserBadge from "./UserBadge";

/*
 * ============================================================
 * COQUILLE DE MODULE
 * ============================================================
 *
 * La barre latérale de l'application, son en-tête et sa zone
 * de travail — les mêmes dans chaque module, pour qu'on s'y
 * retrouve d'un poste à l'autre.
 *
 *   <Coquille ecrans={[{ id, label, icone, titre, sous }]}
 *             ecran={id} onEcran={setId}
 *             actions={<…/>}      // à droite de l'en-tête
 *             apres={<Popup/>}>   // popups, hors de la zone de travail
 *     …contenu de l'écran…
 *   </Coquille>
 *
 * Un module d'un seul écran passe simplement `titre` et `sous`.
 * ============================================================
 */

export default function Coquille({ ecrans = [], ecran, onEcran, titre, sous, actions, apres, children }) {
  const courant = ecrans.find((e) => e.id === ecran);

  return (
    <div className="caisse-page">
      <aside className="caisse-sidebar">
        <div className="caisse-brand">
          <div className="brand-icon" aria-hidden="true"><Logo size={30} inverted /></div>
          <div className="brand-text"><span>MA</span> <strong>SANTÉ</strong></div>
        </div>

        <nav className="caisse-nav" aria-label="Écrans du module">
          {ecrans.map(({ id, label, icone: Icone, compte }) => (
            <button key={id} type="button" className={`caisse-nav-item ${ecran === id ? "active" : ""}`}
              aria-current={ecran === id ? "page" : undefined} onClick={() => onEcran?.(id)}>
              <Icone size={18} strokeWidth={2} aria-hidden="true" /><span>{label}</span>
              {compte > 0 && <b className="caisse-nav-compte">{compte}</b>}
            </button>
          ))}
        </nav>

        <SidebarFooter />
      </aside>

      <main className="caisse-content">
        <header className="caisse-header">
          <div className="caisse-header-left">
            <div className="caisse-header-title">
              <h1>{courant?.titre || titre || "Chargement…"}</h1>
              <p>{courant?.sous || sous || ""}</p>
            </div>
          </div>
          <div className="caisse-header-right">
            <span className="caisse-date-chip">
              <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            {actions}
            <div className="ms-header-tools">
              <NotificationBell />
              <UserBadge />
            </div>
          </div>
        </header>

        <div className="caisse-main">{children}</div>
      </main>

      {apres}
    </div>
  );
}
