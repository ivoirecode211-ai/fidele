import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";

/*
 * ============================================================
 * PIED DE BARRE LATÉRALE — COMMUN À TOUS LES MODULES
 * ============================================================
 *
 * Toujours en bas de la barre latérale, dans le même ordre :
 * « Retour aux modules », puis « Déconnexion ».
 * ============================================================
 */

export default function SidebarFooter({ className = "" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={`ms-sidebar-footer ${className}`}>
      <Link
        to="/modules"
        className="ms-sidebar-action"
        title="Retour aux modules"
      >
        <LayoutGrid size={18} strokeWidth={2} />
        <span>Retour aux modules</span>
      </Link>

      <button
        type="button"
        className="ms-sidebar-action ms-sidebar-logout"
        onClick={handleLogout}
        title="Déconnexion"
      >
        <LogOut size={18} strokeWidth={2} />
        <span>Déconnexion</span>
      </button>
    </div>
  );
}
