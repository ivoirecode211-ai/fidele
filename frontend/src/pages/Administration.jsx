import { useMemo, useState, useEffect, useRef } from "react";
import Prestations from "../administration/Prestations";
import { useModuleView } from "../layouts/AppLayout";
import { LISTE_SPECIALITES } from "../catalogue/specialites";
import {
  Users,
  UserRound,
  UserCog,
  FileText,
  Settings,
  Database,
  LockKeyhole,
  ClipboardList,
  Search,
  Plus,
  X,
  Save,
  Download,
  Eye,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  Activity,
  KeyRound,
  Check,
  Copy,
} from "lucide-react";

import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import api from "../services/api";
import AuditLogModal from "../components/admin/AuditLogModal";
import GeneralSettingsModal from "../components/admin/GeneralSettingsModal";
import "../styles/administration.css";

// ============================================================
// FORMULAIRE UTILISATEUR — utilisateurs, rôles et documents
// viennent de l'API (/api/administration/)
// ============================================================

const EMPTY_USER_FORM = {
  name: "",
  username: "",
  password: "",
  function: "",
  roles: [],
  specialites: [],
  email: "",
  phone: "",
};

// Couleur de chaque rôle dans l'anneau (identique aux pastilles .role-dot).
const ROLE_COLORS = {
  doctor: "#0a4979",
  nurse: "#1671b7",
  pharmacy: "#67aae9",
  secretary: "#98caf9",
  accounting: "#c2e0ff",
  other: "#cbd5e1",
};

// ============================================================
// COMPOSANT
// ============================================================

/* Deux sous-modules dans la barre latérale : les comptes, et le catalogue de la caisse. */
export default function AdministrationModule() {
  const vue = useModuleView("/administration");
  return vue?.id === "prestations" ? <Prestations /> : <Administration />;
}

function Administration() {
  const [overview, setOverview] = useState({
    stats: { activeUsers: 0, roles: 0, documents: 0 },
    users: [],
    roleDistribution: [],
    availableRoles: [],
    documents: [],
  });

  const loadOverview = () =>
    api
      .get("/administration/overview/")
      .then((response) => setOverview(response.data))
      .catch((error) => console.error("Erreur de chargement de l'administration :", error));

  useEffect(() => {
    loadOverview();
  }, []);

  const {
    stats,
    users: USERS,
    roleDistribution: ROLES,
    availableRoles: AVAILABLE_ROLES,
    documents: DOCUMENTS,
  } = overview;

  const apiError = (error, fallback) => {
    const data = error.response?.data;
    return data && typeof data === "object" ? Object.values(data).flat().join("\n") : fallback;
  };
  const [search, setSearch] = useState("");

  const [showUserModal, setShowUserModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // Fenêtre des paramètres système : "settings", "audit", "security" ou null.
  const [adminPanel, setAdminPanel] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);

  const [form, setForm] = useState(EMPTY_USER_FORM);

  // Nom d'utilisateur proposé par le serveur pendant la saisie du nom
  // (nomenclature : initiale(s) du prénom + nom), tant qu'il n'a pas été retouché.
  const [usernameEdited, setUsernameEdited] = useState(false);

  useEffect(() => {
    if (!showUserModal || usernameEdited || form.name.trim().split(/\s+/).length < 2) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      api
        .get("/administration/users/nom-utilisateur/", {
          params: { name: form.name, exclude: selectedUser?.id },
        })
        .then(({ data }) => setForm((previous) => ({ ...previous, username: data.username })))
        .catch(() => {});
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.name, showUserModal, usernameEdited, selectedUser]);

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(form.username);
      alert(`Nom d'utilisateur copié : ${form.username}`);
    } catch {
      alert(`Nom d'utilisateur : ${form.username}`);
    }
  };

  const [documentForm, setDocumentForm] = useState({
    name: "",
    type: "PDF",
  });

  // Gestion de la liste déroulante des rôles
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roleDropdownRef = useRef(null);

  // ============================================================
  // FERMER LA LISTE DES RÔLES SI ON CLIQUE À L'EXTÉRIEUR
  // ============================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target)
      ) {
        setShowRoleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ============================================================
  // RECHERCHE UTILISATEURS
  // ============================================================

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return USERS;

    return USERS.filter((user) => {
      const rolesText = user.roles.join(" ").toLowerCase();

      return (
        user.name.toLowerCase().includes(value) ||
        user.function.toLowerCase().includes(value) ||
        rolesText.includes(value) ||
        user.status.toLowerCase().includes(value)
      );
    });
  }, [search, USERS]);

  // ============================================================
  // MODIFICATION DES CHAMPS
  // ============================================================

  const handleUserChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // SÉLECTION / DÉSÉLECTION D'UN RÔLE
  // ============================================================

  const handleRoleToggle = (role) => {
    setForm((previous) => {
      const alreadySelected = previous.roles.includes(role);

      if (alreadySelected) {
        return {
          ...previous,
          roles: previous.roles.filter((item) => item !== role),
        };
      }

      return {
        ...previous,
        roles: [...previous.roles, role],
      };
    });
  };

  // ============================================================
  // SOUMISSION UTILISATEUR
  // ============================================================

  const handleUserSubmit = async (event) => {
    event.preventDefault();

    if (form.roles.length === 0) {
      alert("Veuillez sélectionner au moins un rôle.");
      return;
    }

    try {
      if (selectedUser) {
        await api.put(`/administration/users/${selectedUser.id}/`, form);
        alert("Utilisateur modifié avec succès.");
      } else {
        const { data } = await api.post("/administration/users/", form);
        alert(
          data.temporaryPassword
            ? `Utilisateur créé avec succès.\n\nNom d'utilisateur : ${data.username}\nMot de passe provisoire : ${data.temporaryPassword}\n\nCommuniquez-les à la personne : le mot de passe ne sera plus affiché.`
            : `Utilisateur créé avec succès.\n\nNom d'utilisateur : ${data.username}`
        );
      }
    } catch (error) {
      alert(apiError(error, "Impossible d'enregistrer l'utilisateur."));
      return;
    }

    loadOverview();

    setForm(EMPTY_USER_FORM);
    setSelectedUser(null);
    setShowUserModal(false);
    setShowRoleDropdown(false);
  };

  // ============================================================
  // MODIFICATION UTILISATEUR
  // ============================================================

  const handleEditUser = (user) => {
    setSelectedUser(user);

    setUsernameEdited(true);
    setForm({
      name: user.name,
      username: user.username || "",
      password: "",
      function: user.function,
      roles: [...user.roles],
      specialites: [...(user.specialites || [])],
      email: user.email || "",
      phone: user.phone || "",
    });

    setShowRoleDropdown(false);
    setShowUserModal(true);
  };

  // ============================================================
  // DÉSACTIVATION (le compte est conservé pour l'historique)
  // ============================================================

  const handleDeactivateUser = async (user) => {
    if (!window.confirm(`Désactiver le compte de ${user.name} ? Il ne pourra plus se connecter.`)) {
      return;
    }

    try {
      await api.delete(`/administration/users/${user.id}/`);
      loadOverview();
    } catch (error) {
      alert(apiError(error, "Impossible de désactiver ce compte."));
    }
  };

  // ============================================================
  // DOCUMENT
  // ============================================================

  const handleDocumentChange = (event) => {
    const { name, value } = event.target;

    setDocumentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleDocumentSubmit = async (event) => {
    event.preventDefault();

    try {
      await api.post("/administration/documents/", documentForm);
    } catch (error) {
      alert(apiError(error, "Impossible d'ajouter le document."));
      return;
    }

    loadOverview();
    alert("Document administratif ajouté avec succès.");

    setDocumentForm({
      name: "",
      type: "PDF",
    });

    setShowDocumentModal(false);
  };

  // ============================================================
  // NOUVEL UTILISATEUR
  // ============================================================

  const openNewUser = () => {
    setUsernameEdited(false);
    setSelectedUser(null);
    setForm(EMPTY_USER_FORM);
    setShowRoleDropdown(false);
    setShowUserModal(true);
  };

  // ============================================================
  // AFFICHAGE DU TEXTE DU BOUTON RÔLES
  // ============================================================

  const getRoleButtonText = () => {
    if (form.roles.length === 0) {
      return "Sélectionner les rôles";
    }

    if (form.roles.length === 1) {
      return form.roles[0];
    }

    return `${form.roles.length} rôles sélectionnés`;
  };

  return (
    <div className="administration-page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="administration-header">
        <div className="administration-header-actions">
          <button
            type="button"
            className="administration-primary-button"
            onClick={openNewUser}
          >
            <Plus size={17} />
            Nouvel utilisateur
          </button>
        </div>
      </header>

      {/* ======================================================
          STATISTIQUES
      ====================================================== */}

      <section className="administration-stat-grid">
        <StatCard
          icon={<UserRound size={24} strokeWidth={2.2} />}
          value={String(stats.activeUsers)}
          label="Utilisateurs actifs"
          tone="blue"
        />

        <StatCard
          icon={<Users size={24} strokeWidth={2.2} />}
          value={String(stats.roles)}
          label="Rôles"
          tone="green"
        />

        <StatCard
          icon={<FileText size={24} strokeWidth={2.2} />}
          value={String(stats.documents)}
          label="Documents administratifs"
          tone="purple"
        />

        <StatCard
          icon={<Settings size={24} strokeWidth={2.2} />}
          value="99%"
          label="Disponibilité du système"
          tone="orange"
        />
      </section>

      {/* ======================================================
          BARRE DE RECHERCHE
      ====================================================== */}

      <div className="administration-toolbar">
        <div className="administration-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="administration-clear-search"
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="administration-system-status">
          <Activity size={15} />
          Système opérationnel
          <span></span>
        </div>
      </div>

      {/* ======================================================
          CONTENU PRINCIPAL
      ====================================================== */}

      <div className="administration-main-grid">
        {/* ====================================================
            UTILISATEURS
        ==================================================== */}

        <section className="administration-panel users-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Utilisateurs récents</h2>
              <p>Derniers utilisateurs enregistrés</p>
            </div>

            <button
              type="button"
              className="administration-small-button"
              onClick={openNewUser}
            >
              <Plus size={14} />
              Nouvel utilisateur
            </button>
          </div>

          <div className="administration-table-wrapper">
            <table className="administration-table">
              <thead>
                <tr>
                  <th>Nom et prénom</th>
                  <th>Fonction</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Dern. connexion</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar">
                          {user.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </div>

                        <span>{user.name}</span>
                      </div>
                    </td>

                    <td>{user.function}</td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px",
                        }}
                      >
                        {user.roles.map((role) => (
                          <span className="role-badge" key={role}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <StatusBadge
                        status={user.status}
                        tone={
                          user.status === "Actif"
                            ? "success"
                            : "neutral"
                        }
                      />
                    </td>

                    <td>{user.connection}</td>

                    <td>
                      <div className="user-actions">
                        <button
                          type="button"
                          title="Voir"
                          onClick={() =>
                            alert(`Utilisateur : ${user.name}`)
                          }
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          title="Modifier"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          title="Supprimer"
                          className="delete-action"
                          onClick={() =>
                            handleDeactivateUser(user)
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="administration-empty"
                    >
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ====================================================
            RÉPARTITION DES RÔLES
        ==================================================== */}

        <section className="administration-panel roles-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Répartition des rôles</h2>
              <p>Utilisateurs par rôle</p>
            </div>
          </div>

          <div className="roles-content">
            <div className="roles-chart-area">
              <div
                className="roles-donut"
                aria-label="Répartition des rôles"
                style={
                  ROLES.length
                    ? {
                        background: `conic-gradient(${ROLES.reduce(
                          (parts, role, index) => {
                            const start = ROLES.slice(0, index).reduce((sum, item) => sum + item.percentage, 0);
                            return [...parts, `${ROLE_COLORS[role.className] || ROLE_COLORS.other} ${start}% ${start + role.percentage}%`];
                          },
                          []
                        ).join(", ")})`,
                      }
                    : undefined
                }
              >
                <div className="roles-donut-center">
                  <strong>{stats.activeUsers}</strong>
                  <span>Utilisateurs</span>
                </div>
              </div>
            </div>

            <div className="roles-legend">
              {ROLES.map((role) => (
                <div
                  className="role-legend-row"
                  key={role.name}
                >
                  <div className="role-legend-name">
                    <span
                      className={`role-dot ${role.className}`}
                    ></span>

                    <span>{role.name}</span>
                  </div>

                  <strong>{role.percentage}%</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ======================================================
          PARAMÈTRES + DOCUMENTS
      ====================================================== */}

      <div className="administration-bottom-grid">
        <section className="administration-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Paramètres système</h2>
              <p>Configuration générale de l'application</p>
            </div>
          </div>

          <div className="system-settings-grid">
            <button
              type="button"
              className="system-setting-card"
              onClick={() => setAdminPanel("settings")}
            >
              <div className="system-setting-icon blue">
                <Settings size={21} />
              </div>

              <div>
                <strong>Paramètres généraux</strong>
                <span>Configuration de la clinique</span>
              </div>

              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="system-setting-card"
              onClick={() => alert("Sauvegarde : elle se configure sur le serveur (sauvegarde PostgreSQL planifiée avec pg_dump). Aucune sauvegarde ne peut être lancée depuis le navigateur.")}
            >
              <div className="system-setting-icon green">
                <Database size={21} />
              </div>

              <div>
                <strong>Sauvegarde</strong>
                <span>Base de données</span>
              </div>

              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="system-setting-card"
              onClick={() => setAdminPanel("security")}
            >
              <div className="system-setting-icon purple">
                <LockKeyhole size={21} />
              </div>

              <div>
                <strong>Sécurité</strong>
                <span>Gestion des accès</span>
              </div>

              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="system-setting-card"
              onClick={() => setAdminPanel("audit")}
            >
              <div className="system-setting-icon orange">
                <ClipboardList size={21} />
              </div>

              <div>
                <strong>Journal d'audit</strong>
                <span>Historique des actions</span>
              </div>

              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        {/* ====================================================
            DOCUMENTS
        ==================================================== */}

        <section className="administration-panel documents-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Documents administratifs</h2>
              <p>Documents officiels de la clinique</p>
            </div>

            <button
              type="button"
              className="documents-add-button"
              onClick={() => setShowDocumentModal(true)}
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>

          <div className="documents-list">
            {DOCUMENTS.map((document) => (
              <div
                className="document-row"
                key={document.id}
              >
                <div className="document-icon">
                  <FileText size={16} />
                </div>

                <div className="document-info">
                  <strong>{document.name}</strong>
                  <span>{document.date}</span>
                </div>

                <span className="document-type">
                  {document.type}
                </span>

                <button
                  type="button"
                  className="document-view"
                  title="Voir le document"
                  onClick={() =>
                    alert(`Ouverture : ${document.name}`)
                  }
                >
                  <Eye size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="view-all-documents"
            onClick={() =>
              alert("Affichage de tous les documents")
            }
          >
            Voir tous les documents
            <ChevronRight size={14} />
          </button>
        </section>
      </div>

      {/* ======================================================
          MODALE UTILISATEUR
      ====================================================== */}

      {showUserModal && (
        <div
          className="administration-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowUserModal(false);
              setShowRoleDropdown(false);
            }
          }}
        >
          <div className="administration-modal">
            <div className="administration-modal-header">
              <div className="modal-header-title">
                <div className="modal-icon blue">
                  <UserCog size={21} />
                </div>

                <div>
                  <h2>
                    {selectedUser
                      ? "Modifier l'utilisateur"
                      : "Nouvel utilisateur"}
                  </h2>

                  <p>Gestion du compte utilisateur</p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowUserModal(false);
                  setShowRoleDropdown(false);
                }}
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="administration-form"
              onSubmit={handleUserSubmit}
            >
              <div className="form-grid">
                {/* NOM */}

                <div className="form-group">
                  <label htmlFor="name">
                    Nom et prénom
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ex. KOUADIO Jean"
                    value={form.name}
                    onChange={handleUserChange}
                    required
                  />
                </div>

                {/* NOM D'UTILISATEUR */}

                <div className="form-group">
                  <label htmlFor="username">
                    Nom d'utilisateur
                  </label>
                  <span className="username-hint">
                    Nom d'utilisateur — n'oubliez pas de le copier
                  </span>
                  <div className="username-field">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="off"
                      placeholder="Généré à partir du nom"
                      value={form.username}
                      onChange={(event) => {
                        setUsernameEdited(true);
                        setForm((previous) => ({
                          ...previous,
                          username: event.target.value.toLowerCase().replace(/\s+/g, ""),
                        }));
                      }}
                    />
                    <button
                      type="button"
                      className="username-copy"
                      onClick={copyUsername}
                      disabled={!form.username}
                      title="Copier le nom d'utilisateur"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* FONCTION */}

                <div className="form-group">
                  <label htmlFor="function">
                    Fonction
                  </label>

                  <input
                    id="function"
                    name="function"
                    type="text"
                    placeholder="Ex. Médecin"
                    value={form.function}
                    onChange={handleUserChange}
                    required
                  />
                </div>

                {/* ==================================================
                    RÔLES - LISTE DÉROULANTE MULTI-SÉLECTION
                ================================================== */}

                <div
                  className="form-group"
                  ref={roleDropdownRef}
                >
                  <label htmlFor="roles-dropdown">
                    Rôle
                  </label>

                  <div className="roles-dropdown-container">
                    <button
                      type="button"
                      id="roles-dropdown"
                      className={`roles-dropdown-trigger ${
                        showRoleDropdown ? "active" : ""
                      }`}
                      onClick={() =>
                        setShowRoleDropdown(
                          (previous) => !previous
                        )
                      }
                      aria-expanded={showRoleDropdown}
                    >
                      <span
                        className={
                          form.roles.length === 0
                            ? "roles-placeholder"
                            : "roles-selected-text"
                        }
                      >
                        {getRoleButtonText()}
                      </span>

                      <ChevronDown
                        size={17}
                        className={
                          showRoleDropdown
                            ? "roles-chevron-open"
                            : ""
                        }
                      />
                    </button>

                    {showRoleDropdown && (
                      <div className="roles-dropdown-menu">
                        <div className="roles-dropdown-header">
                          <span>
                            Sélectionner les rôles
                          </span>

                          {form.roles.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((previous) => ({
                                  ...previous,
                                  roles: [],
                                }))
                              }
                            >
                              Tout effacer
                            </button>
                          )}
                        </div>

                        <div className="roles-dropdown-options">
                          {AVAILABLE_ROLES.map((role) => {
                            const isSelected =
                              form.roles.includes(role);

                            return (
                              <label
                                key={role}
                                className={`role-checkbox-option ${
                                  isSelected
                                    ? "selected"
                                    : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleRoleToggle(role)
                                  }
                                />

                                <span className="custom-role-checkbox">
                                  {isSelected && (
                                    <Check size={12} strokeWidth={3} />
                                  )}
                                </span>

                                <span className="role-option-text">
                                  {role}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="roles-dropdown-footer">
                          <span>
                            {form.roles.length === 0
                              ? "Aucun rôle sélectionné"
                              : `${form.roles.length} rôle${
                                  form.roles.length > 1
                                    ? "s"
                                    : ""
                                } sélectionné${
                                  form.roles.length > 1
                                    ? "s"
                                    : ""
                                }`}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setShowRoleDropdown(false)
                            }
                          >
                            Terminer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ==================================================
                    SPÉCIALITÉS — les formulaires et la file d'attente
                    du praticien dans le module Consultation. Aucune :
                    médecine générale.
                ================================================== */}

                <div className="form-group">
                  <label>Spécialités exercées</label>
                  <div className="specialites-grille">
                    {LISTE_SPECIALITES.map(([code, nom]) => {
                      const coche = form.specialites.includes(code);
                      return (
                        <button key={code} type="button" role="checkbox" aria-checked={coche}
                          className={`spe-case ${coche ? "cochee" : ""}`}
                          onClick={() => setForm((f) => ({
                            ...f,
                            specialites: coche ? f.specialites.filter((c) => c !== code) : [...f.specialites, code],
                          }))}>
                          <span className="spe-coche">{coche && <Check size={12} strokeWidth={3} />}</span>
                          {nom}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* EMAIL */}

                <div className="form-group">
                  <label htmlFor="email">
                    Adresse e-mail
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="utilisateur@masante.ci"
                    value={form.email}
                    onChange={handleUserChange}
                  />
                </div>

                {/* TÉLÉPHONE */}

                <div className="form-group">
                  <label htmlFor="phone">
                    Téléphone
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+225 XX XX XX XX XX"
                    value={form.phone}
                    onChange={handleUserChange}
                  />
                </div>

                {/* MOT DE PASSE */}

                <div className="form-group">
                  <label htmlFor="password">
                    {selectedUser ? "Nouveau mot de passe" : "Mot de passe"}
                  </label>

                  <div className="password-input">
                    <KeyRound size={16} />

                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={
                        selectedUser
                          ? "Laisser vide pour ne pas le changer"
                          : "Mot de passe initial"
                      }
                      value={form.password}
                      onChange={handleUserChange}
                      required={!selectedUser}
                    />
                  </div>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="administration-modal-actions">
                <button
                  type="button"
                  className="administration-cancel-button"
                  onClick={() => {
                    setShowUserModal(false);
                    setShowRoleDropdown(false);
                  }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="administration-save-button"
                >
                  <Save size={16} />

                  {selectedUser
                    ? "Enregistrer les modifications"
                    : "Créer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODALE DOCUMENT
      ====================================================== */}

      {adminPanel === "settings" && (
        <GeneralSettingsModal onClose={() => setAdminPanel(null)} />
      )}

      {(adminPanel === "audit" || adminPanel === "security") && (
        <AuditLogModal
          failuresOnly={adminPanel === "security"}
          onClose={() => setAdminPanel(null)}
        />
      )}

      {showDocumentModal && (
        <div
          className="administration-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDocumentModal(false);
            }
          }}
        >
          <div className="administration-modal small-modal">
            <div className="administration-modal-header">
              <div className="modal-header-title">
                <div className="modal-icon purple">
                  <FileText size={21} />
                </div>

                <div>
                  <h2>Ajouter un document</h2>
                  <p>
                    Ajouter un document administratif
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowDocumentModal(false)
                }
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="administration-form"
              onSubmit={handleDocumentSubmit}
            >
              <div className="form-group">
                <label htmlFor="document-name">
                  Nom du document
                </label>

                <input
                  id="document-name"
                  name="name"
                  type="text"
                  placeholder="Ex. Règlement intérieur"
                  value={documentForm.name}
                  onChange={handleDocumentChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="document-type">
                  Type de document
                </label>

                <select
                  id="document-type"
                  name="type"
                  value={documentForm.type}
                  onChange={handleDocumentChange}
                >
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="XLSX">XLSX</option>
                </select>
              </div>

              <div className="document-upload-zone">
                <Download size={25} />

                <strong>
                  Sélectionner le fichier
                </strong>

                <span>
                  PDF, DOCX ou XLSX
                </span>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </div>

              <div className="administration-modal-actions">
                <button
                  type="button"
                  className="administration-cancel-button"
                  onClick={() =>
                    setShowDocumentModal(false)
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="administration-save-button"
                >
                  <Save size={16} />
                  Ajouter le document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}