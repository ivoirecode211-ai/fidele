
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  X,
  Phone,
  Mail,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock3,
  UserCheck,
} from "lucide-react";

import api from "../services/api";
import Liste from "../components/Liste";
import { useModuleView } from "../layouts/AppLayout";
import "../styles/employees.css";

const emptyForm = {
  matricule: "",
  nom: "",
  prenom: "",
  sexe: "Homme",
  telephone: "",
  email: "",
  poste: "",
  departement: "",
  dateEmbauche: "",
  contrat: "CDI",
  statut: "Actif",
};

function Employees() {
  const [employees, setEmployees] = useState([]);
  const vue = useModuleView("/employees");

  // Personnel servi par l'API (/api/rh/employes/).
  const loadEmployees = () =>
    api
      .get("/rh/employes/")
      .then((response) => setEmployees(response.data))
      .catch((error) => console.error("Erreur de chargement du personnel :", error));

  useEffect(() => {
    loadEmployees();
  }, []);

  const apiError = (error, fallback) => {
    const data = error.response?.data;
    return data && typeof data === "object" ? Object.values(data).flat().join("\n") : fallback;
  };

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState("Tous");
  const [statusFilter, setStatusFilter] =
    useState("Tous");

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [selectedEmployee, setSelectedEmployee] =
    useState(null);

  const [editingEmployee, setEditingEmployee] =
    useState(null);

  const [form, setForm] = useState(emptyForm);

  const statistics = {
    total: employees.length,

    actifs: employees.filter(
      (employee) => employee.statut === "Actif"
    ).length,

    conges: employees.filter(
      (employee) => employee.statut === "Congé"
    ).length,

    hommes: employees.filter(
      (employee) => employee.sexe === "Homme"
    ).length,

    femmes: employees.filter(
      (employee) => employee.sexe === "Femme"
    ).length,
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const searchValue = search.toLowerCase();

      const fullName =
        `${employee.nom} ${employee.prenom}`.toLowerCase();

      const matchesSearch =
        fullName.includes(searchValue) ||
        employee.matricule
          .toLowerCase()
          .includes(searchValue) ||
        employee.poste
          .toLowerCase()
          .includes(searchValue) ||
        employee.telephone
          .toLowerCase()
          .includes(searchValue);

      const matchesDepartment =
        departmentFilter === "Tous" ||
        employee.departement === departmentFilter;

      const matchesStatus =
        statusFilter === "Tous" ||
        employee.statut === statusFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus
      );
    });
  }, [
    employees,
    search,
    departmentFilter,
    statusFilter,
  ]);

  const openAddModal = () => {
    setEditingEmployee(null);

    const nextMatricule = `EMP-${String(
      employees.length + 1
    ).padStart(4, "0")}`;

    setForm({
      ...emptyForm,
      matricule: nextMatricule,
    });

    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);

    setForm({
      matricule: employee.matricule,
      nom: employee.nom,
      prenom: employee.prenom,
      sexe: employee.sexe,
      telephone: employee.telephone,
      email: employee.email,
      poste: employee.poste,
      departement: employee.departement,
      dateEmbauche: employee.dateEmbauche,
      contrat: employee.contrat,
      statut: employee.statut,
    });

    setShowModal(true);
  };

  const openDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetails(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setForm(emptyForm);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedEmployee(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.nom ||
      !form.prenom ||
      !form.poste ||
      !form.departement ||
      !form.dateEmbauche
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires."
      );
      return;
    }

    try {
      if (editingEmployee) {
        await api.put(`/rh/employes/${editingEmployee.id}/`, form);
      } else {
        await api.post("/rh/employes/", form);
      }
    } catch (error) {
      alert(apiError(error, "Impossible d'enregistrer l'employé."));
      return;
    }

    loadEmployees();
    closeModal();
  };

  const deleteEmployee = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cet employé ?"
    );

    if (!confirmation) {
      return;
    }

    try {
      await api.delete(`/rh/employes/${id}/`);
      loadEmployees();
    } catch (error) {
      alert(apiError(error, "Impossible de supprimer l'employé."));
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/rh/employes/${id}/`, { statut: status });
      loadEmployees();
    } catch (error) {
      alert(apiError(error, "Impossible de changer le statut."));
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Actif":
        return "employee-status-active";

      case "Congé":
        return "employee-status-leave";

      case "Suspendu":
        return "employee-status-suspended";

      case "Inactif":
        return "employee-status-inactive";

      default:
        return "";
    }
  };

  // Sous-modules : personnel (cette page), congés et absences, contrats, organigramme.
  if (vue.id === "conges") return <div className="employees-page"><Conges employes={employees} /></div>;
  if (vue.id === "contrats") return <div className="employees-page"><Contrats employes={employees} onChange={loadEmployees} /></div>;
  if (vue.id === "organigramme") return <div className="employees-page"><Organigramme employes={employees} /></div>;

  return (
    <div className="employees-page">

      <div className="employees-header">


        <button
          className="employees-primary-btn"
          onClick={openAddModal}
        >
          <UserPlus size={19} />
          Nouvel employé
        </button>

      </div>

      <div className="employees-statistics">

        <div className="employee-stat-card">

          <div className="employee-stat-icon employee-blue">
            <Users size={22} />
          </div>

          <div>
            <span>Total employés</span>
            <strong>{statistics.total}</strong>
          </div>

        </div>

        <div className="employee-stat-card">

          <div className="employee-stat-icon employee-green">
            <UserCheck size={22} />
          </div>

          <div>
            <span>Employés actifs</span>
            <strong>{statistics.actifs}</strong>
          </div>

        </div>

        <div className="employee-stat-card">

          <div className="employee-stat-icon employee-orange">
            <Clock3 size={22} />
          </div>

          <div>
            <span>En congé</span>
            <strong>{statistics.conges}</strong>
          </div>

        </div>

        <div className="employee-stat-card">

          <div className="employee-stat-icon employee-purple">
            <Users size={22} />
          </div>

          <div>
            <span>Hommes / Femmes</span>
            <strong>
              {statistics.hommes} / {statistics.femmes}
            </strong>
          </div>

        </div>

      </div>

      <div className="employees-filters">

        <div className="employee-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        <div className="employee-filter">

          <Filter size={17} />

          <select
            value={departmentFilter}
            onChange={(event) =>
              setDepartmentFilter(event.target.value)
            }
          >
            <option value="Tous">
              Tous les départements
            </option>

            <option value="Médecine générale">
              Médecine générale
            </option>

            <option value="Soins infirmiers">
              Soins infirmiers
            </option>

            <option value="Laboratoire">
              Laboratoire
            </option>

            <option value="Pharmacie">
              Pharmacie
            </option>

            <option value="Administration">
              Administration
            </option>
          </select>

        </div>

        <div className="employee-filter">

          <UserCheck size={17} />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="Tous">
              Tous les statuts
            </option>

            <option value="Actif">
              Actifs
            </option>

            <option value="Congé">
              En congé
            </option>

            <option value="Suspendu">
              Suspendus
            </option>

            <option value="Inactif">
              Inactifs
            </option>
          </select>

        </div>

      </div>

      <div className="employees-card">

        <div className="employees-card-header">

          <div>
            <h2>Liste du personnel</h2>

            <p>
              {filteredEmployees.length} employé(s)
              affiché(s)
            </p>
          </div>

          <div className="employees-total-badge">
            {statistics.total} employés
          </div>

        </div>

        <div className="employees-table-container">

          <table className="employees-table">

            <thead>
              <tr>
                <th>Employé</th>
                <th>Poste</th>
                <th>Département</th>
                <th>Contrat</th>
                <th>Date d'embauche</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredEmployees.length === 0 ? (

                <tr>

                  <td
                    colSpan="7"
                    className="employees-empty"
                  >
                    <Users size={43} />

                    <strong>
                      Aucun employé trouvé
                    </strong>

                    <span>
                      Modifiez vos critères de recherche
                      ou ajoutez un nouvel employé.
                    </span>
                  </td>

                </tr>

              ) : (

                filteredEmployees.map((employee) => (

                  <tr key={employee.id}>

                    {/* EMPLOYE */}

                    <td>

                      <div className="employee-person">

                        <div className="employee-avatar">
                          {employee.prenom
                            .charAt(0)
                            .toUpperCase()}
                          {employee.nom
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>

                          <strong>
                            {employee.prenom}{" "}
                            {employee.nom}
                          </strong>

                          <span>
                            {employee.matricule}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* POSTE */}

                    <td>

                      <div className="employee-job">

                        <Briefcase size={16} />

                        <span>
                          {employee.poste}
                        </span>

                      </div>

                    </td>

                    {/* DEPARTEMENT */}

                    <td>

                      <div className="employee-department">

                        <Building2 size={16} />

                        <span>
                          {employee.departement}
                        </span>

                      </div>

                    </td>

                    {/* CONTRAT */}

                    <td>

                      <span className="contract-badge">
                        {employee.contrat}
                      </span>

                    </td>

                    {/* DATE */}

                    <td>

                      <div className="employee-date">

                        <CalendarDays size={15} />

                        {formatDate(
                          employee.dateEmbauche
                        )}

                      </div>

                    </td>

                    {/* STATUT */}

                    <td>

                      <span
                        className={`employee-status ${getStatusClass(
                          employee.statut
                        )}`}
                      >

                        {employee.statut ===
                          "Actif" && (
                          <CheckCircle2 size={14} />
                        )}

                        {employee.statut ===
                          "Congé" && (
                          <Clock3 size={14} />
                        )}

                        {employee.statut ===
                          "Suspendu" && (
                          <XCircle size={14} />
                        )}

                        {employee.statut}

                      </span>

                    </td>

                    {/* ACTIONS */}

                    <td>

                      <div className="employee-actions">

                        <button
                          className="employee-action-view"
                          title="Voir"
                          onClick={() =>
                            openDetails(employee)
                          }
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          className="employee-action-edit"
                          title="Modifier"
                          onClick={() =>
                            openEditModal(employee)
                          }
                        >
                          <Edit3 size={17} />
                        </button>

                        <button
                          className="employee-action-delete"
                          title="Supprimer"
                          onClick={() =>
                            deleteEmployee(employee.id)
                          }
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

      {showModal && (

        <div
          className="employee-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="employee-modal">

            <div className="employee-modal-header">

              <div className="employee-modal-heading">

                <div className="employee-modal-icon">
                  <UserPlus size={21} />
                </div>

                <div>

                  <h2>
                    {editingEmployee
                      ? "Modifier l'employé"
                      : "Nouvel employé"}
                  </h2>

                  <p>
                    Renseignez les informations
                    professionnelles.
                  </p>

                </div>

              </div>

              <button
                className="employee-modal-close"
                onClick={closeModal}
              >
                <X size={20} />
              </button>

            </div>

            <form
              className="employee-form"
              onSubmit={handleSubmit}
            >

              {/* INFORMATIONS PERSONNELLES */}

              <div className="employee-form-section">

                <h3>
                  Informations personnelles
                </h3>

                <div className="employee-form-grid">

                  {/* MATRICULE */}

                  <div className="employee-form-group">

                    <label>
                      Matricule
                    </label>

                    <input
                 type="text"
                 name="matricule"
                 value={form.matricule}
                 onChange={handleChange}
                 placeholder="Ex : EMP-0007"
                className="employee-matricule-input"
                />
                  </div>

                  <div className="employee-form-group">

                    <label>
                      Nom <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="nom"
                      value={form.nom}
                      onChange={handleChange}
                      placeholder="Nom"
                    />

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Prénom <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="prenom"
                      value={form.prenom}
                      onChange={handleChange}
                      placeholder="Prénom"
                    />

                  </div>

                  <div className="employee-form-group">

                    <label>Sexe</label>

                    <select
                      name="sexe"
                      value={form.sexe}
                      onChange={handleChange}
                    >
                      <option value="Homme">
                        Homme
                      </option>

                      <option value="Femme">
                        Femme
                      </option>
                    </select>

                  </div>

                  <div className="employee-form-group">

                    <label>Téléphone</label>

                    <div className="employee-input-icon">

                      <Phone size={16} />

                      <input
                        type="text"
                        name="telephone"
                        value={form.telephone}
                        onChange={handleChange}
                        placeholder="07 00 00 00 00"
                      />

                    </div>

                  </div>

                  <div className="employee-form-group employee-full-width">

                    <label>Email professionnel</label>

                    <div className="employee-input-icon">

                      <Mail size={16} />

                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="nom@sante.ci"
                      />

                    </div>

                  </div>

                </div>

              </div>

              {/* INFORMATIONS PROFESSIONNELLES */}

              <div className="employee-form-section">

                <h3>
                  Informations professionnelles
                </h3>

                <div className="employee-form-grid">

                  <div className="employee-form-group">

                    <label>
                      Poste <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="poste"
                      value={form.poste}
                      onChange={handleChange}
                      placeholder="Ex : Infirmière"
                    />

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Département <span>*</span>
                    </label>

                    <select
                      name="departement"
                      value={form.departement}
                      onChange={handleChange}
                    >
                      <option value="">
                        Sélectionner
                      </option>

                      <option>
                        Médecine générale
                      </option>

                      <option>
                        Soins infirmiers
                      </option>

                      <option>
                        Laboratoire
                      </option>

                      <option>
                        Pharmacie
                      </option>

                      <option>
                        Administration
                      </option>

                      <option>
                        Direction
                      </option>

                      <option>
                        Comptabilité
                      </option>
                    </select>

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Date d'embauche <span>*</span>
                    </label>

                    <div className="employee-input-icon">

                      <CalendarDays size={16} />

                      <input
                        type="date"
                        name="dateEmbauche"
                        value={form.dateEmbauche}
                        onChange={handleChange}
                      />

                    </div>

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Type de contrat
                    </label>

                    <select
                      name="contrat"
                      value={form.contrat}
                      onChange={handleChange}
                    >
                      <option value="CDI">
                        CDI
                      </option>

                      <option value="CDD">
                        CDD
                      </option>

                      <option value="Stage">
                        Stage
                      </option>

                      <option value="Prestataire">
                        Prestataire
                      </option>
                    </select>

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Statut
                    </label>

                    <select
                      name="statut"
                      value={form.statut}
                      onChange={handleChange}
                    >
                      <option value="Actif">
                        Actif
                      </option>

                      <option value="Congé">
                        Congé
                      </option>

                      <option value="Suspendu">
                        Suspendu
                      </option>

                      <option value="Inactif">
                        Inactif
                      </option>
                    </select>

                  </div>

                </div>

              </div>

              {/* ACTIONS */}

              <div className="employee-form-actions">

                <button
                  type="button"
                  className="employee-secondary-btn"
                  onClick={closeModal}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="employees-primary-btn"
                >
                  <CheckCircle2 size={18} />

                  {editingEmployee
                    ? "Enregistrer"
                    : "Créer l'employé"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {showDetails && selectedEmployee && (

        <div
          className="employee-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >

          <div className="employee-details-modal">

            <div className="employee-modal-header">

              <div className="employee-modal-heading">

                <div className="employee-avatar employee-avatar-large">
                  {selectedEmployee.prenom
                    .charAt(0)
                    .toUpperCase()}
                  {selectedEmployee.nom
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <h2>
                    {selectedEmployee.prenom}{" "}
                    {selectedEmployee.nom}
                  </h2>

                  <p>
                    {selectedEmployee.poste}
                  </p>

                </div>

              </div>

              <button
                className="employee-modal-close"
                onClick={closeDetails}
              >
                <X size={20} />
              </button>

            </div>

            <div className="employee-details-body">

              <div className="employee-details-status">

                <span
                  className={`employee-status ${getStatusClass(
                    selectedEmployee.statut
                  )}`}
                >
                  {selectedEmployee.statut}
                </span>

                <span className="contract-badge">
                  {selectedEmployee.contrat}
                </span>

              </div>

              <div className="employee-details-grid">

                <div className="employee-detail-item">
                  <span>Matricule</span>
                  <strong>
                    {selectedEmployee.matricule}
                  </strong>
                </div>

                <div className="employee-detail-item">
                  <span>Sexe</span>
                  <strong>
                    {selectedEmployee.sexe}
                  </strong>
                </div>

                <div className="employee-detail-item">
                  <span>Téléphone</span>
                  <strong>
                    {selectedEmployee.telephone}
                  </strong>
                </div>

                <div className="employee-detail-item">
                  <span>Email</span>
                  <strong>
                    {selectedEmployee.email}
                  </strong>
                </div>

                <div className="employee-detail-item">
                  <span>Département</span>
                  <strong>
                    {selectedEmployee.departement}
                  </strong>
                </div>

                <div className="employee-detail-item">
                  <span>Date d'embauche</span>
                  <strong>
                    {formatDate(
                      selectedEmployee.dateEmbauche
                    )}
                  </strong>
                </div>

              </div>

              <div className="employee-details-actions">

                {selectedEmployee.statut !==
                  "Actif" && (
                  <button
                    className="employees-primary-btn"
                    onClick={() => {
                      changeStatus(
                        selectedEmployee.id,
                        "Actif"
                      );

                      setSelectedEmployee({
                        ...selectedEmployee,
                        statut: "Actif",
                      });
                    }}
                  >
                    <CheckCircle2 size={17} />
                    Activer
                  </button>
                )}

                {selectedEmployee.statut ===
                  "Actif" && (
                  <button
                    className="employee-leave-btn"
                    onClick={() => {
                      changeStatus(
                        selectedEmployee.id,
                        "Congé"
                      );

                      setSelectedEmployee({
                        ...selectedEmployee,
                        statut: "Congé",
                      });
                    }}
                  >
                    <Clock3 size={17} />
                    Mettre en congé
                  </button>
                )}

                <button
                  className="employee-secondary-btn"
                  onClick={() => {
                    closeDetails();
                    openEditModal(
                      selectedEmployee
                    );
                  }}
                >
                  <Edit3 size={17} />
                  Modifier
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

/* ============================================================
   SOUS-MODULES DES RESSOURCES HUMAINES
   ============================================================ */

const dateFr = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const isoJour = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TYPES_ABSENCE = ["Congé annuel", "Maladie", "Maternité", "Paternité", "Formation", "Permission", "Absence injustifiée"];

function Conges({ employes }) {
  const [lignes, setLignes] = useState(null);
  const [form, setForm] = useState({ employe: "", type: "Congé annuel", debut: "", fin: "", motif: "" });
  const charger = () => api.get("/rh/absences/").then(({ data }) => setLignes(data)).catch(() => setLignes([]));
  useEffect(() => { charger(); }, []);
  const aujourdhui = isoJour(new Date());
  const enCours = (lignes || []).filter((a) => a.debut <= aujourdhui && a.fin >= aujourdhui);

  async function enregistrer(event) {
    event.preventDefault();
    try { await api.post("/rh/absences/", form); setForm({ ...form, employe: "", debut: "", fin: "", motif: "" }); charger(); }
    catch (e) { const d = e.response?.data; alert(d && typeof d === "object" ? Object.values(d).flat().join("\n") : "Enregistrement impossible."); }
  }
  async function supprimer(a) {
    if (!window.confirm(`Supprimer l'absence de ${a.employeNom} ?`)) return;
    await api.delete(`/rh/absences/${a.id}/`).catch(() => {}); charger();
  }

  return (
    <>
      <section className="bloc">
        <h2>Enregistrer un congé ou une absence</h2>
        <form className="rh-absence-form" onSubmit={enregistrer}>
          <label className="field"><span>Employé</span>
            <select value={form.employe} onChange={(e) => setForm({ ...form, employe: e.target.value })} required>
              <option value="">Choisir…</option>
              {employes.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom} · {e.poste}</option>)}
            </select></label>
          <label className="field"><span>Type</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES_ABSENCE.map((t) => <option key={t}>{t}</option>)}
            </select></label>
          <label className="field"><span>Du</span><input type="date" required value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })} /></label>
          <label className="field"><span>Au</span><input type="date" required value={form.fin} min={form.debut} onChange={(e) => setForm({ ...form, fin: e.target.value })} /></label>
          <label className="field rh-absence-motif"><span>Motif</span><input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} /></label>
          <button type="submit" className="primary-button">Enregistrer</button>
        </form>
      </section>
      <Liste titre="Congés et absences" lignes={lignes} vide="Aucune absence enregistrée."
        chercher={(a) => `${a.employeNom} ${a.type} ${a.motif}`}
        chiffres={[{ libelle: "Absents aujourd'hui", valeur: enCours.length, ton: enCours.length ? "alerte" : "" },
          { libelle: "À venir", valeur: (lignes || []).filter((a) => a.debut > aujourdhui).length }]}
        colonnes={[
          { titre: "Employé", rendu: (a) => <strong>{a.employeNom}</strong> },
          { titre: "Type", rendu: (a) => a.type },
          { titre: "Période", rendu: (a) => <>du {dateFr(a.debut)} au {dateFr(a.fin)}<small>{a.jours} jour(s)</small></> },
          { titre: "État", rendu: (a) => (a.fin < aujourdhui ? <span className="etat">Terminée</span>
            : a.debut <= aujourdhui ? <span className="etat bleu">En cours</span> : <span className="etat">À venir</span>) },
          { titre: "Motif", rendu: (a) => a.motif || "—" },
          { titre: "", rendu: (a) => <button type="button" className="secondary-button" onClick={() => supprimer(a)}>Supprimer</button> },
        ]} />
    </>
  );
}

function Contrats({ employes, onChange }) {
  const aujourdhui = new Date();
  const dans60 = isoJour(new Date(aujourdhui.getTime() + 60 * 86400000));
  const iso = isoJour(aujourdhui);
  const lignes = [...employes].sort((a, b) => (a.dateFinContrat || "9999").localeCompare(b.dateFinContrat || "9999"));
  async function fixerFin(e, valeur) {
    try { await api.patch(`/rh/employes/${e.id}/`, { dateFinContrat: valeur || null }); onChange(); }
    catch { alert("Date de fin non enregistrée."); }
  }
  const proches = employes.filter((e) => e.dateFinContrat && e.dateFinContrat >= iso && e.dateFinContrat <= dans60);
  return (
    <Liste titre="Contrats" sous="Fins de CDD, de stage et de prestation à anticiper" lignes={lignes}
      chercher={(e) => `${e.nom} ${e.prenom} ${e.poste} ${e.contrat}`}
      chiffres={[
        { libelle: "CDI", valeur: employes.filter((e) => e.contrat === "CDI").length },
        { libelle: "CDD", valeur: employes.filter((e) => e.contrat === "CDD").length },
        { libelle: "Stages et prestataires", valeur: employes.filter((e) => ["Stage", "Prestataire"].includes(e.contrat)).length },
        { libelle: "Fin dans 60 jours", valeur: proches.length, ton: proches.length ? "alerte" : "" },
      ]}
      colonnes={[
        { titre: "Employé", rendu: (e) => <><strong>{e.nom} {e.prenom}</strong><small>{e.matricule} · {e.poste}</small></> },
        { titre: "Contrat", rendu: (e) => e.contrat },
        { titre: "Embauche", rendu: (e) => dateFr(e.dateEmbauche) },
        { titre: "Fin du contrat", rendu: (e) => (e.contrat === "CDI" ? "—" : (
          <input type="date" defaultValue={e.dateFinContrat || ""} onBlur={(ev) => ev.target.value !== (e.dateFinContrat || "") && fixerFin(e, ev.target.value)} />
        )) },
        { titre: "", rendu: (e) => (!e.dateFinContrat ? "" : e.dateFinContrat < iso ? <span className="etat critique">Échu</span>
          : e.dateFinContrat <= dans60 ? <span className="etat critique">Bientôt</span> : <span className="etat regle">En cours</span>) },
      ]} />
  );
}

function Organigramme({ employes }) {
  const services = {};
  for (const e of employes) (services[e.departement || "Sans service"] ||= []).push(e);
  const noms = Object.keys(services).sort();
  return (
    <section className="bloc">
      <div className="bloc-tete"><div><h2>Organigramme</h2><p>{employes.length} employé(s) dans {noms.length} service(s)</p></div></div>
      <div className="rh-organigramme">
        {noms.map((n) => (
          <article key={n} className="rh-service">
            <header><strong>{n}</strong><span>{services[n].length}</span></header>
            <ul>
              {services[n].sort((a, b) => a.poste.localeCompare(b.poste)).map((e) => (
                <li key={e.id} className={e.statut !== "Actif" ? "absent" : ""}>
                  <strong>{e.nom} {e.prenom}</strong>
                  <span>{e.poste}{e.statut !== "Actif" ? ` · ${e.statut}` : ""}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Employees;

