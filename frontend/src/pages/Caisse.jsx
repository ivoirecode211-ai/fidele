import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  UserRound,
  FileText,
  CreditCard,
  History,
  TrendingUp,
  Search,
  Plus,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import StatusBadge from "../components/StatusBadge";
import FormEngine from "../forms/FormEngine";
import { caisseAdmissionConfig } from "../forms/configs/caisseAdmission";
import "../styles/Caisse.css";

const STATUS_TONES = {
  "En attente": "warning",
  "En consultation": "info",
  "Payé": "success",
};

const SERVICE_LABELS = {
  MEDECINE: "Médecine",
  CHIRURGIE: "Chirurgie",
  PEDIATRIE: "Pédiatrie",
  URGENCES: "Urgences",
};

const initialPatients = [
  { id: "001", patient: "TRAORE Awa", service: "Médecine", doctor: "Dr. KOUAME", status: "En attente" },
  { id: "002", patient: "KONE Ibrahim", service: "Chirurgie", doctor: "Dr. BAH", status: "En consultation" },
  { id: "003", patient: "DIALLO Mariam", service: "Pédiatrie", doctor: "Dr. KONE", status: "Payé" },
  { id: "004", patient: "YAO Claude", service: "Médecine", doctor: "Dr. KOUAME", status: "En attente" },
];

const SIDEBAR_COLLAPSE_KEY = "caisse_sidebar_collapsed";

function readCollapsedPreference() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsedPreference(value) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Préférence non persistée (stockage indisponible) : sans conséquence, la session reste utilisable.
  }
}

export default function Caisse() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState(initialPatients);
  const [view, setView] = useState("liste"); // "liste" | "formulaire"
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);

  // Le mode réduit est un confort desktop : en dessous de 850px la sidebar
  // redevient une barre horizontale pleine largeur, les libellés doivent rester visibles.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 850px)");

    function syncWithViewport(event) {
      if (event.matches) setCollapsed(false);
    }

    if (query.matches) setCollapsed(false);
    query.addEventListener("change", syncWithViewport);
    return () => query.removeEventListener("change", syncWithViewport);
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      writeCollapsedPreference(next);
      return next;
    });
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const filteredPatients = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return patients;

    return patients.filter((item) =>
      [item.id, item.patient, item.service, item.doctor, item.status]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [search, patients]);

  function handleAdmissionComplete(instance) {
    const identification = instance.data?.identification || {};
    const orientation = instance.data?.orientation || {};
    const nextNumber = String(patients.length + 1).padStart(3, "0");

    const newPatient = {
      id: nextNumber,
      patient:
        `${identification.last_name || ""} ${identification.first_names || ""}`.trim() ||
        "Patient",
      service: SERVICE_LABELS[orientation.service] || orientation.service || "—",
      doctor: "À affecter",
      status: "En attente",
    };

    setPatients((current) => [...current, newPatient]);
    setView("liste");
  }

  const initials = (user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase();
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Utilisateur";
  const roleLabel = user?.role_label || user?.role || "Caissier(ère)";

  const today = useMemo(() => {
    const label = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, []);

  return (
    <div className="caisse-page">
      <aside className={`caisse-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="caisse-brand">
          <div className="brand-icon">
            <Logo size={26} inverted />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span>MA</span>
              <strong>SANTÉ</strong>
            </div>
          )}
        </div>

        <nav className="caisse-nav">
          <Link to="/modules" className="caisse-nav-item" title="Accueil">
            <Home size={18} strokeWidth={2} />
            {!collapsed && <span>Accueil</span>}
          </Link>

          <button type="button" className="caisse-nav-item active" title="Enregistrer un patient">
            <UserRound size={18} strokeWidth={2} />
            {!collapsed && <span>Enregistrer un patient</span>}
          </button>

          <Link to="/billing" className="caisse-nav-item" title="Facturation">
            <FileText size={18} strokeWidth={2} />
            {!collapsed && <span>Facturation</span>}
          </Link>

          <button type="button" className="caisse-nav-item" title="Paiements">
            <CreditCard size={18} strokeWidth={2} />
            {!collapsed && <span>Paiements</span>}
          </button>

          <button type="button" className="caisse-nav-item" title="Historique">
            <History size={18} strokeWidth={2} />
            {!collapsed && <span>Historique</span>}
          </button>

          <button type="button" className="caisse-nav-item" title="Bilan">
            <TrendingUp size={18} strokeWidth={2} />
            {!collapsed && <span>Bilan</span>}
          </button>

          <Link to="/reports" className="caisse-nav-item" title="Rapports">
            <TrendingUp size={18} strokeWidth={2} />
            {!collapsed && <span>Rapports</span>}
          </Link>

          <div className="caisse-nav-divider" />

          <button type="button" className="caisse-nav-item" onClick={handleLogout} title="Déconnexion">
            <LogOut size={18} strokeWidth={2} />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </nav>

        <div className="caisse-sidebar-footer">
          <div className="avatar small">{initials}</div>
          {!collapsed && (
            <div>
              <strong>{fullName}</strong>
              <small>{roleLabel}</small>
            </div>
          )}
        </div>
      </aside>

      <main className="caisse-content">
        <header className="caisse-header">
          <div className="caisse-header-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={toggleSidebar}
              title={collapsed ? "Afficher le menu" : "Réduire le menu"}
              aria-label={collapsed ? "Afficher le menu" : "Réduire le menu"}
            >
              {collapsed ? <PanelLeftOpen size={19} strokeWidth={2} /> : <PanelLeftClose size={19} strokeWidth={2} />}
            </button>

            <div className="caisse-header-title">
              <h1>Espace Caissier</h1>
              <p>Accueil, enregistrement et encaissement des patients</p>
            </div>
          </div>

          <div className="caisse-header-right">
            <div className="caisse-date-chip">
              <CalendarDays size={15} strokeWidth={2} />
              <span>{today}</span>
            </div>

            <button className="icon-button" title="Notifications" type="button">
              <Bell size={18} strokeWidth={2} />
              <span className="notification-dot" />
            </button>

            <div className="top-user">
              <div className="avatar small">{initials}</div>
              <div>
                <strong>{fullName}</strong>
                <small>{roleLabel}</small>
              </div>
            </div>
          </div>
        </header>

        <section className="caisse-main">
          {view === "formulaire" ? (
            <FormEngine
              config={caisseAdmissionConfig}
              onCancel={() => setView("liste")}
              onComplete={handleAdmissionComplete}
            />
          ) : (
            <>
              <div className="patient-toolbar">
                <div className="search-box">
                  <Search size={19} strokeWidth={2} />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un patient (nom, téléphone...)"
                  />
                </div>

                <button type="button" className="new-patient-btn" onClick={() => setView("formulaire")}>
                  <Plus size={18} strokeWidth={2} />
                  <span>Nouveau patient</span>
                </button>
              </div>

              <div className="patients-card">
                <div className="table-wrapper">
                  <table className="patients-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient</th>
                        <th>Service</th>
                        <th>Affecté à</th>
                        <th>Statut</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPatients.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td className="patient-name">{item.patient}</td>
                          <td>{item.service}</td>
                          <td>{item.doctor}</td>
                          <td>
                            <StatusBadge status={item.status} tone={STATUS_TONES[item.status]} />
                          </td>
                          <td>
                            <button type="button" className="row-action" aria-label={`Ouvrir ${item.patient}`}>
                              <ChevronRight size={16} strokeWidth={2} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredPatients.length === 0 && (
                        <tr>
                          <td colSpan="6" className="empty-row">
                            Aucun patient trouvé.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <section className="summary-grid">
                <article className="summary-card">
                  <span className="summary-label">Bilan du jour</span>
                  <strong className="summary-value green">450 000 FCFA</strong>
                  <span className="summary-note">Recettes enregistrées aujourd'hui</span>
                </article>

                <article className="summary-card">
                  <span className="summary-label">Bilan semaine</span>
                  <strong className="summary-value green">2 850 000 FCFA</strong>
                  <span className="summary-note">Total des recettes de la semaine</span>
                </article>

                <article className="summary-card">
                  <span className="summary-label">Bilan mois</span>
                  <strong className="summary-value blue">12 450 000 FCFA</strong>
                  <span className="summary-note">Total des recettes du mois</span>
                </article>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
