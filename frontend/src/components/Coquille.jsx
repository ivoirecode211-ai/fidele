import { CalendarDays, Heart, LogOut } from "lucide-react";

import "../styles/Caisse.css";

import { useAuth } from "../context/AuthContext";
import LienTableau from "./LienTableau";

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
  const { user, logout } = useAuth();
  const courant = ecrans.find((e) => e.id === ecran);

  return (
    <div className="caisse-page">
      <aside className="caisse-sidebar">
        <div className="caisse-brand">
          <div className="brand-icon" aria-hidden="true"><Heart size={22} strokeWidth={2.4} /></div>
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
          <div className="caisse-nav-divider" />
          <LienTableau className="caisse-nav-item" />
          <button type="button" className="caisse-nav-item" onClick={logout}>
            <LogOut size={18} strokeWidth={2} /><span>Se déconnecter</span>
          </button>
        </nav>

        <div className="caisse-sidebar-footer">
          {user && <div>
            <strong>{user.first_name ? `${user.first_name} ${user.last_name}` : user.username}</strong>
            <small>{user.role_label || user.role}</small>
          </div>}
        </div>
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
          </div>
        </header>

        <div className="caisse-main">{children}</div>
      </main>

      {apres}
    </div>
  );
}
