
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { Clock3, Menu, UserCheck, X } from "lucide-react";
import { useState } from "react";
import Logo from "../components/Logo";
import SidebarFooter from "../components/SidebarFooter";
import UserBadge from "../components/UserBadge";
import NotificationBell from "../components/NotificationBell";

// Structure générale après authentification :
// sidebar (logo + retour aux modules + déconnexion en pied),
// barre supérieure,
// contenu de la page via <Outlet/>.
// Titre et sous-titre de chaque module, affichés dans la barre du haut.
const MODULE_HEADERS = {
  "/dashboard": ["Tableau de bord", "Vue globale de l'activité de la clinique MA SANTÉ"],
  "/patients/new": ["Nouveau patient", "Créer un dossier patient électronique"],
  "/appointments": ["Rendez-vous", "Gérez les rendez-vous des patients et le planning médical."],
  "/hospitalization": ["Hospitalisation", "Gestion des admissions, des chambres et des patients hospitalisés."],
  "/billing": ["Encaissements", "Suivi des paiements enregistrés à la caisse"],
  "/laboratory": ["Laboratoire", "Gérez les demandes d'analyses et les résultats biologiques des patients."],
  "/nursing": ["Espace Infirmiers", "Surveillance et suivi des constantes des patients"],
  "/employees": ["Ressources humaines", "Gérez les employés, leurs postes, contrats et informations professionnelles."],
  "/equipments": ["Équipements médicaux", "Module prévu dans l'architecture MA SANTÉ"],
  "/maintenance": ["Maintenance", "Gestion des équipements, interventions et maintenance technique"],
  "/administration": ["Administration", "Gestion des utilisateurs, droits, paramètres et documents administratifs"],
  "/hygiene": ["Hygiène", "Suivi de la propreté, de la désinfection et de la gestion des déchets médicaux"],
  "/archives": ["Archives", "Gestion et consultation des documents médicaux et administratifs"],
  "/reports": ["Rapports", "Consultez et analysez les rapports d'activité de l'établissement."],
  "/ia": ["Intelligence artificielle", "Des outils intelligents pour une meilleure prise en charge"],
  "/procurement": ["Approvisionnement", "Module prévu dans l'architecture MA SANTÉ"],
  "/reception": ["Accueil / Réception", "Module prévu dans l'architecture MA SANTÉ"],
  "/settings": ["Paramètres", "Module prévu dans l'architecture MA SANTÉ"],
};

// Sous-modules affichés dans la barre latérale ; le premier est l'écran d'arrivée.
// La page lit le sous-module actif dans l'adresse (?vue=…).
export const MODULE_VIEWS = {
  "/nursing": [
    { id: "attente", label: "Patients en attente", icon: Clock3 },
    { id: "recus", label: "Patients reçus", icon: UserCheck },
  ],
};

export function useModuleView(pathname) {
  const [params] = useSearchParams();
  const views = MODULE_VIEWS[pathname] || [];
  return views.find((view) => view.id === params.get("vue")) || views[0];
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const views = MODULE_VIEWS[pathname] || [];
  const currentView = useModuleView(pathname);
  const [title, subtitle] = MODULE_HEADERS[pathname] || ["MA SANTÉ", "Clinique & Gestion Hospitalière"];

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          open ? "sidebar-open" : ""
        }`}
      >
        <div className="brand-block">
          <Link
            to="/modules"
            className="brand-link"
            title="Retour aux modules"
          >
            <div className="brand-mark">
              <Logo size={40} />
            </div>

            <div>
              <div className="brand-title">
                <span>MA</span> <b>SANTÉ</b>
              </div>

              <div className="brand-subtitle">
                Clinique & Gestion Hospitalière
              </div>
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

        {views.length > 0 && (
          <nav className="nav-list" aria-label="Sous-modules">
            {views.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                to={`${pathname}?vue=${id}`}
                className={`nav-item ${currentView?.id === id ? "active" : ""}`}
                aria-current={currentView?.id === id ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        )}

        <SidebarFooter />
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setOpen(true)}
            type="button"
            aria-label="Ouvrir le menu"
          >
            <Menu
              size={23}
              strokeWidth={2}
            />
          </button>

          <div className="topbar-title">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="top-actions">
            <NotificationBell />

            <UserBadge />
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

