import { Link, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, Bell, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

// Structure générale après authentification : sidebar (logo + retour
// aux modules + déconnexion), barre supérieure, contenu de la page via
// <Outlet/>. La liste des modules elle-même vit dans pages/Modules.jsx.
export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const userInitial = (user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase();

  const userFullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Utilisateur";

  const userRole = user?.role_label || user?.role || "Utilisateur";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-block">
          <Link to="/modules" className="brand-link" title="Retour aux modules">
            <div className="brand-mark">
              <Logo size={40} />
            </div>

            <div>
              <div className="brand-title">
                <span>MA</span> <b>SANTÉ</b>
              </div>
              <div className="brand-subtitle">Clinique & Gestion Hospitalière</div>
            </div>
          </Link>

          <button
            className="mobile-close"
            onClick={() => setOpen(false)}
            type="button"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list">
          <Link to="/modules" className="nav-item">
            <LayoutGrid size={20} strokeWidth={2} />
            <span>Modules</span>
          </Link>

          <button
            className="nav-item logout-navigation"
            onClick={handleLogout}
            type="button"
            title="Déconnexion"
          >
            <LogOut size={20} strokeWidth={2} />
            <span>Déconnexion</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini">
            <div className="avatar">{userInitial}</div>
            <div>
              <strong>{userFullName}</strong>
              <small>{userRole}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setOpen(true)}
            type="button"
            aria-label="Ouvrir le menu"
          >
            <Menu size={23} strokeWidth={2} />
          </button>

          <Link to="/modules" className="topbar-brand-container" title="Retour aux modules">
            <div className="top-brand">
              MA <span>SANTÉ</span>
            </div>
            <div className="top-slogan">Clinique & Gestion Hospitalière</div>
          </Link>

          <div className="top-actions">
            <button className="icon-button" title="Notifications" type="button">
              <Bell size={19} strokeWidth={2} />
              <span className="notification-badge">3</span>
            </button>

            <div className="top-user">
              <div className="avatar small">{userInitial}</div>
              <div>
                <strong>{userFullName}</strong>
                <small>{userRole}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {open && (
        <button
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          type="button"
          aria-label="Fermer le menu"
        />
      )}
    </div>
  );
}
