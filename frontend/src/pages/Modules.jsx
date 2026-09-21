import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import {
  Search,
  X,
  Filter,
  Users,
  CalendarDays,
  Stethoscope,
  BedDouble,
  HeartPulse,
  FlaskConical,
  Pill,
  Package,
  Calculator,
  UserRoundCog,
  Building2,
  Wrench,
  FileText,
  ShieldCheck,
  Archive,
  Bot,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/modules.css";

// `color` ne distingue plus visuellement les modules (charte graphique :
// une seule couleur de marque) — conservé uniquement pour ne pas casser
// la forme de données ; toutes les tuiles utilisent le même style bleu.
const ALL_MODULES = [
  { id: "patients", name: "Caisse", description: "Enregistrer les patients, gérer l'accueil et les opérations de caisse", path: "/caisse", icon: Users, color: "blue" },
  { id: "appointments", name: "Rendez-vous", description: "Planifier et gérer les rendez-vous des patients", path: "/appointments", icon: CalendarDays, color: "green" },
  { id: "consultations", name: "Consultation Médecine Générale", description: "Gérer les consultations médicales et les prescriptions", path: "/consultations", icon: Stethoscope, color: "purple" },
  { id: "hospitalization", name: "Hospitalisation", description: "Gérer les admissions, séjours et sorties des patients", path: "/hospitalization", icon: BedDouble, color: "red" },
  { id: "nursing", name: "Soins infirmiers", description: "Saisir les soins, surveillances et traitements", path: "/nursing", icon: HeartPulse, color: "cyan" },
  { id: "laboratory", name: "Laboratoire", description: "Gérer les analyses et résultats de laboratoire", path: "/laboratory", icon: FlaskConical, color: "orange" },
  { id: "pharmacy", name: "Pharmacie", description: "Gérer les médicaments, ordonnances et stocks pharmaceutiques", path: "/pharmacy", icon: Pill, color: "pink" },
  { id: "stocks", name: "Gestion des stocks", description: "Suivre les stocks de médicaments, matériel et consommables", path: "/stocks", icon: Package, color: "blue-dark" },
  { id: "accounting", name: "Comptabilité", description: "Gérer la facturation, les paiements et les rapports financiers", path: "/billing", icon: Calculator, color: "purple" },
  { id: "hr", name: "Ressources humaines", description: "Gérer le personnel, les congés et les plannings", path: "/employees", icon: UserRoundCog, color: "green-dark" },
  { id: "direction", name: "Direction", description: "Tableau de bord de la direction et suivi de l'activité de l'établissement", path: "/direction", icon: Building2, color: "yellow" },
  { id: "maintenance", name: "Maintenance", description: "Gérer les interventions et la maintenance des équipements", path: "/maintenance", icon: Wrench, color: "gray" },
  { id: "reports", name: "Rapports et statistiques", description: "Consulter les rapports et les indicateurs clés", path: "/reports", icon: FileText, color: "blue-light" },
  { id: "administration", name: "Administration", description: "Gérer les utilisateurs, les rôles et les paramètres système", path: "/administration", icon: ShieldCheck, color: "indigo" },
  { id: "hygiene", name: "Hygiène et sécurité", description: "Suivre les contrôles d'hygiène et la sécurité sanitaire", path: "/hygiene", icon: ShieldCheck, color: "green" },
  { id: "archives", name: "Archives", description: "Consulter et gérer les dossiers archivés", path: "/archives", icon: Archive, color: "blue-light" },
  { id: "ia", name: "Intelligence Artificielle", description: "Assistance intelligente pour l'analyse des informations et l'aide à la décision", path: "/ia", icon: Bot, color: "indigo" },
];

const DEFAULT_ROLE_MODULES = {
  ADMIN: ALL_MODULES.map((module) => module.id),
  DIRECTOR: ["patients", "appointments", "consultations", "hospitalization", "nursing", "laboratory", "pharmacy", "stocks", "accounting", "hr", "direction", "maintenance", "reports", "hygiene", "archives", "ia"],
  DOCTOR: ["appointments", "consultations", "hospitalization", "laboratory", "pharmacy", "reports", "ia"],
  NURSE: ["appointments", "hospitalization", "nursing", "laboratory"],
  RECEPTION: ["patients", "appointments"],
  LAB: ["laboratory"],
  PHARMACY: ["pharmacy", "stocks"],
  ACCOUNTING: ["patients", "accounting", "reports"],
  STOCK: ["stocks", "pharmacy"],
  HR: ["hr", "reports"],
  MAINTENANCE: ["maintenance"],
};

// Le backend peut renvoyer le rôle sous différentes casses (ADMIN, admin, Admin...).
function normalizeRole(role) {
  if (!role) return "";
  return String(role).trim().toUpperCase();
}

export default function Modules() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const userRole = useMemo(
    () => normalizeRole(user?.role || user?.role_name || user?.role_code),
    [user],
  );

  const authorizedModules = useMemo(() => {
    if (!user) return [];

    if (user.is_superuser || ["ADMIN", "ADMINISTRATOR", "ADMINISTRATEUR"].includes(userRole)) {
      return ALL_MODULES;
    }

    if (Array.isArray(user.modules)) {
      return ALL_MODULES.filter((module) => user.modules.includes(module.id));
    }

    const roleModules = DEFAULT_ROLE_MODULES[userRole];
    if (!roleModules) return [];

    return ALL_MODULES.filter((module) => roleModules.includes(module.id));
  }, [user, userRole]);

  const filteredModules = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return authorizedModules;

    return authorizedModules.filter(
      (module) =>
        module.name.toLowerCase().includes(value) ||
        module.description.toLowerCase().includes(value)
    );
  }, [search, authorizedModules]);

  const initials = (user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase();

  return (
    <div className="modules-page">
      {/* Pas de sidebar sur cet écran : c'est le choix du module, avant
          même d'entrer dans un espace de travail. */}
      <div className="modules-main">
        <header className="modules-topbar">
          <div className="modules-brand">
            <div className="modules-brand-icon">
              <Logo size={36} />
            </div>

            <div>
              <div className="modules-brand-title">MA SANTÉ</div>
              <div className="modules-brand-subtitle">Clinique & Gestion Hospitalière</div>
            </div>
          </div>

          {/* Un seul déclencheur (avatar + nom) ouvre le menu déroulant ;
              la déconnexion vit exclusivement là. */}
          <div className="modules-user" ref={userMenuRef}>
            <button
              type="button"
              className="modules-user-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <div className="modules-user-information">
                <strong>
                  {user?.first_name || user?.username || "Utilisateur"} {user?.last_name || ""}
                </strong>
                <small>
                  {user?.is_superuser
                    ? "Super administrateur"
                    : user?.role_label || user?.role || "Utilisateur"}
                </small>
              </div>

              <div className="modules-avatar">{initials}</div>

              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`modules-user-chevron ${menuOpen ? "open" : ""}`}
              />
            </button>

            {menuOpen && (
              <div className="modules-user-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="modules-user-menu-item"
                  onClick={handleLogout}
                >
                  <LogOut size={16} strokeWidth={2} />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="modules-content">
          <section className="modules-panel">
            <div className="modules-heading">
              <div className="modules-heading-icon">
                <LayoutGrid size={22} strokeWidth={2} />
              </div>

              <h1>Modules de l’application</h1>
            </div>

            <div className="modules-search-area">
              <div className="modules-search">
                <Search size={23} strokeWidth={2} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un module par son nom..."
                  aria-label="Rechercher un module"
                />
                {search && (
                  <button
                    className="clear-search"
                    onClick={() => setSearch("")}
                    title="Effacer la recherche"
                    type="button"
                  >
                    <X size={22} />
                  </button>
                )}
              </div>

              <button className="all-modules-button" type="button" title="Modules accessibles">
                <Filter size={18} />
                <span>Tous les modules</span>
              </button>
            </div>

            {filteredModules.length > 0 ? (
              <div className="modules-grid">
                {filteredModules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <Link
                      key={module.id}
                      to={module.path}
                      className={`module-card module-${module.color}`}
                      title={`${module.name} — ${module.description}`}
                    >
                      <ChevronRight className="module-arrow" size={18} strokeWidth={2} />

                      <div className="module-icon">
                        <Icon size={28} strokeWidth={2} />
                      </div>

                      <div className="module-text">
                        <h2>{module.name}</h2>
                        <p>{module.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="modules-empty">
                <Search size={42} />
                <h2>Aucun module trouvé</h2>
                <p>Aucun module ne correspond à votre recherche.</p>
                <button onClick={() => setSearch("")} type="button">
                  Afficher tous les modules
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
