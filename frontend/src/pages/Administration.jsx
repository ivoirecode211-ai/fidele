import { useMemo, useState } from "react";
import {
  Users,
  UserRound,
  UserCog,
  ShieldCheck,
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
  Activity,
  KeyRound,
} from "lucide-react";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import "../styles/administration.css";

// Données de démonstration — seront reliées aux API Django/PostgreSQL.

const USERS = [
  { id: 1, name: "KOUADIO Jean", function: "Médecin", role: "Médecin", status: "Actif", connection: "10/09/2026 08:45" },
  { id: 2, name: "TRAORE Awa", function: "Infirmier", role: "Infirmier", status: "Actif", connection: "09/09/2026 07:32" },
  { id: 3, name: "DIARRA Samuel", function: "Pharmacien", role: "Pharmacien", status: "Actif", connection: "09/09/2026 16:20" },
  { id: 4, name: "KONAN Bintou", function: "Secrétaire", role: "Secrétaire", status: "Actif", connection: "09/09/2026 14:12" },
  { id: 5, name: "YAO Claude", function: "Comptable", role: "Comptable", status: "Actif", connection: "09/09/2026 11:05" },
];

const DOCUMENTS = [
  { id: 1, name: "Règlement intérieur", type: "PDF", date: "10/09/2026" },
  { id: 2, name: "Procès-verbal CA", type: "PDF", date: "05/09/2026" },
  { id: 3, name: "Contrats de travail", type: "PDF", date: "28/08/2026" },
  { id: 4, name: "Conventions", type: "PDF", date: "20/08/2026" },
];

const ROLES = [
  { name: "Médecin", percentage: 31, className: "doctor" },
  { name: "Infirmier", percentage: 25, className: "nurse" },
  { name: "Pharmacien", percentage: 16, className: "pharmacy" },
  { name: "Secrétaire", percentage: 12, className: "secretary" },
  { name: "Comptable", percentage: 8, className: "accounting" },
  { name: "Autres", percentage: 8, className: "other" },
];

const EMPTY_USER_FORM = { name: "", function: "", role: "", email: "", phone: "" };

export default function Administration() {
  const [search, setSearch] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [documentForm, setDocumentForm] = useState({ name: "", type: "PDF" });

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return USERS;

    return USERS.filter(
      (user) =>
        user.name.toLowerCase().includes(value) ||
        user.function.toLowerCase().includes(value) ||
        user.role.toLowerCase().includes(value) ||
        user.status.toLowerCase().includes(value)
    );
  }, [search]);

  const handleUserChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  // Plus tard : api.post("/accounts/users/", form) pour enregistrer dans Django.
  const handleUserSubmit = (event) => {
    event.preventDefault();
    alert(selectedUser ? "Utilisateur modifié avec succès." : "Utilisateur créé avec succès.");
    setForm(EMPTY_USER_FORM);
    setSelectedUser(null);
    setShowUserModal(false);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setForm({ name: user.name, function: user.function, role: user.role, email: "", phone: "" });
    setShowUserModal(true);
  };

  const handleDocumentChange = (event) => {
    const { name, value } = event.target;
    setDocumentForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleDocumentSubmit = (event) => {
    event.preventDefault();
    alert("Document administratif ajouté avec succès.");
    setDocumentForm({ name: "", type: "PDF" });
    setShowDocumentModal(false);
  };

  const openNewUser = () => {
    setSelectedUser(null);
    setForm(EMPTY_USER_FORM);
    setShowUserModal(true);
  };

  return (
    <div className="administration-page">
      <header className="administration-header">
        <div className="administration-title-area">
          <div className="administration-title-icon">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h1>Administration</h1>
            <p>Gestion des utilisateurs, droits, paramètres et documents administratifs</p>
          </div>
        </div>

        <div className="administration-header-actions">
          <button type="button" className="administration-primary-button" onClick={openNewUser}>
            <Plus size={17} />
            Nouvel utilisateur
          </button>
        </div>
      </header>

      <section className="administration-stat-grid">
        <StatCard icon={<UserRound size={24} strokeWidth={2.2} />} value="32" label="Utilisateurs actifs" tone="blue" />
        <StatCard icon={<Users size={24} strokeWidth={2.2} />} value="5" label="Rôles" tone="green" />
        <StatCard icon={<FileText size={24} strokeWidth={2.2} />} value="18" label="Documents administratifs" tone="purple" />
        <StatCard icon={<Settings size={24} strokeWidth={2.2} />} value="99%" label="Disponibilité du système" tone="orange" />
      </section>

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

      <div className="administration-main-grid">
        <section className="administration-panel users-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Utilisateurs récents</h2>
              <p>Derniers utilisateurs enregistrés</p>
            </div>
            <button type="button" className="administration-small-button" onClick={openNewUser}>
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
                          {user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.function}</td>
                    <td>
                      <span className="role-badge">{user.role}</span>
                    </td>
                    <td>
                      <StatusBadge status={user.status} tone={user.status === "Actif" ? "success" : "neutral"} />
                    </td>
                    <td>{user.connection}</td>
                    <td>
                      <div className="user-actions">
                        <button type="button" title="Voir" onClick={() => alert(`Utilisateur : ${user.name}`)}>
                          <Eye size={14} />
                        </button>
                        <button type="button" title="Modifier" onClick={() => handleEditUser(user)}>
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          className="delete-action"
                          onClick={() => alert(`Suppression de ${user.name}`)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="administration-empty">Aucun utilisateur trouvé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="administration-panel roles-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Répartition des rôles</h2>
              <p>Utilisateurs par rôle</p>
            </div>
          </div>

          <div className="roles-content">
            <div className="roles-chart-area">
              <div className="roles-donut" aria-label="Répartition des rôles">
                <div className="roles-donut-center">
                  <strong>32</strong>
                  <span>Utilisateurs</span>
                </div>
              </div>
            </div>

            <div className="roles-legend">
              {ROLES.map((role) => (
                <div className="role-legend-row" key={role.name}>
                  <div className="role-legend-name">
                    <span className={`role-dot ${role.className}`}></span>
                    <span>{role.name}</span>
                  </div>
                  <strong>{role.percentage}%</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="administration-bottom-grid">
        <section className="administration-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Paramètres système</h2>
              <p>Configuration générale de l'application</p>
            </div>
          </div>

          <div className="system-settings-grid">
            <button type="button" className="system-setting-card" onClick={() => alert("Paramètres généraux")}>
              <div className="system-setting-icon blue">
                <Settings size={21} />
              </div>
              <div>
                <strong>Paramètres généraux</strong>
                <span>Configuration de la clinique</span>
              </div>
              <ChevronRight size={16} />
            </button>

            <button type="button" className="system-setting-card" onClick={() => alert("Paramètres de sauvegarde")}>
              <div className="system-setting-icon green">
                <Database size={21} />
              </div>
              <div>
                <strong>Sauvegarde</strong>
                <span>Base de données</span>
              </div>
              <ChevronRight size={16} />
            </button>

            <button type="button" className="system-setting-card" onClick={() => alert("Paramètres de sécurité")}>
              <div className="system-setting-icon purple">
                <LockKeyhole size={21} />
              </div>
              <div>
                <strong>Sécurité</strong>
                <span>Gestion des accès</span>
              </div>
              <ChevronRight size={16} />
            </button>

            <button type="button" className="system-setting-card" onClick={() => alert("Journal d'audit")}>
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

        <section className="administration-panel documents-panel">
          <div className="administration-panel-header">
            <div>
              <h2>Documents administratifs</h2>
              <p>Documents officiels de la clinique</p>
            </div>
            <button type="button" className="documents-add-button" onClick={() => setShowDocumentModal(true)}>
              <Plus size={14} />
              Ajouter
            </button>
          </div>

          <div className="documents-list">
            {DOCUMENTS.map((document) => (
              <div className="document-row" key={document.id}>
                <div className="document-icon">
                  <FileText size={16} />
                </div>
                <div className="document-info">
                  <strong>{document.name}</strong>
                  <span>{document.date}</span>
                </div>
                <span className="document-type">{document.type}</span>
                <button
                  type="button"
                  className="document-view"
                  title="Voir le document"
                  onClick={() => alert(`Ouverture : ${document.name}`)}
                >
                  <Eye size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="view-all-documents"
            onClick={() => alert("Affichage de tous les documents")}
          >
            Voir tous les documents
            <ChevronRight size={14} />
          </button>
        </section>
      </div>

      {showUserModal && (
        <div
          className="administration-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowUserModal(false);
          }}
        >
          <div className="administration-modal">
            <div className="administration-modal-header">
              <div className="modal-header-title">
                <div className="modal-icon blue">
                  <UserCog size={21} />
                </div>
                <div>
                  <h2>{selectedUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
                  <p>Gestion du compte utilisateur</p>
                </div>
              </div>

              <button type="button" className="modal-close" onClick={() => setShowUserModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form className="administration-form" onSubmit={handleUserSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Nom et prénom</label>
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

                <div className="form-group">
                  <label htmlFor="function">Fonction</label>
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

                <div className="form-group">
                  <label htmlFor="role">Rôle</label>
                  <select id="role" name="role" value={form.role} onChange={handleUserChange} required>
                    <option value="">Sélectionner un rôle</option>
                    <option value="Administrateur">Administrateur</option>
                    <option value="Médecin">Médecin</option>
                    <option value="Infirmier">Infirmier</option>
                    <option value="Pharmacien">Pharmacien</option>
                    <option value="Secrétaire">Secrétaire</option>
                    <option value="Comptable">Comptable</option>
                    <option value="Caissier">Caissier</option>
                    <option value="Directeur Général">Directeur Général</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Adresse e-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="utilisateur@masante.ci"
                    value={form.email}
                    onChange={handleUserChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Téléphone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+225 XX XX XX XX XX"
                    value={form.phone}
                    onChange={handleUserChange}
                  />
                </div>

                {!selectedUser && (
                  <div className="form-group">
                    <label htmlFor="password">Mot de passe</label>
                    <div className="password-input">
                      <KeyRound size={16} />
                      <input id="password" type="password" placeholder="Mot de passe initial" required />
                    </div>
                  </div>
                )}
              </div>

              <div className="administration-modal-actions">
                <button
                  type="button"
                  className="administration-cancel-button"
                  onClick={() => setShowUserModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="administration-save-button">
                  <Save size={16} />
                  {selectedUser ? "Enregistrer les modifications" : "Créer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocumentModal && (
        <div
          className="administration-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowDocumentModal(false);
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
                  <p>Ajouter un document administratif</p>
                </div>
              </div>

              <button type="button" className="modal-close" onClick={() => setShowDocumentModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form className="administration-form" onSubmit={handleDocumentSubmit}>
              <div className="form-group">
                <label htmlFor="document-name">Nom du document</label>
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
                <label htmlFor="document-type">Type de document</label>
                <select id="document-type" name="type" value={documentForm.type} onChange={handleDocumentChange}>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="XLSX">XLSX</option>
                </select>
              </div>

              <div className="document-upload-zone">
                <Download size={25} />
                <strong>Sélectionner le fichier</strong>
                <span>PDF, DOCX ou XLSX</span>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" />
              </div>

              <div className="administration-modal-actions">
                <button
                  type="button"
                  className="administration-cancel-button"
                  onClick={() => setShowDocumentModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="administration-save-button">
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
