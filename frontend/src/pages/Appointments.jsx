
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  User,
  Stethoscope,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Phone,
} from "lucide-react";
import api from "../services/api";
import { useModuleView } from "../layouts/AppLayout";
import "../styles/appointments.css";

const emptyForm = {
  patientId: "",
  doctorId: "",
  patient: "",
  phone: "",
  doctor: "",
  service: "",
  date: "",
  time: "",
  motif: "",
  status: "En attente",
};

function Appointments() {
  const [appointments, setAppointments] =
    useState([]);

  // Agenda servi par l'API (/api/appointments/agenda/).
  const loadAppointments = () =>
    api
      .get("/appointments/agenda/")
      .then((response) => setAppointments(response.data))
      .catch((error) => console.error("Erreur de chargement des rendez-vous :", error));

  useEffect(() => {
    loadAppointments();
  }, []);

  const apiError = (error, fallback) => {
    const data = error.response?.data;
    return data && typeof data === "object" ? Object.values(data).flat().join("\n") : fallback;
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [dateFilter, setDateFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Sous-module de la barre latérale : aujourd'hui, agenda, à venir, manqués, tous.
  const vue = useModuleView("/appointments");
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dansLaVue = (a) => {
    if (vue.id === "aujourdhui") return a.date === aujourdhui;
    if (vue.id === "avenir") return a.date > aujourdhui && !["Annulé", "Terminé", "Absent"].includes(a.status);
    if (vue.id === "manques") return a.status === "Absent" || (a.date < aujourdhui && ["En attente", "Confirmé"].includes(a.status));
    return true;
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(dansLaVue).filter((appointment) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        appointment.patient.toLowerCase().includes(searchValue) ||
        appointment.doctor.toLowerCase().includes(searchValue) ||
        appointment.service.toLowerCase().includes(searchValue) ||
        appointment.motif.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" ||
        appointment.status === statusFilter;

      const matchesDate =
        !dateFilter || appointment.date === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, search, statusFilter, dateFilter, vue.id]);

  const statistics = {
    total: appointments.length,
    confirmed: appointments.filter(
      (a) => a.status === "Confirmé"
    ).length,
    pending: appointments.filter(
      (a) => a.status === "En attente"
    ).length,
    cancelled: appointments.filter(
      (a) => a.status === "Annulé"
    ).length,
  };

  /*
   * ============================================================
   * NOUVEAU RENDEZ-VOUS
   * ============================================================
   */

  const openAddModal = () => {
    setEditingAppointment(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  /*
   * ============================================================
   * RENDEZ POUR UN PATIENT
   * ============================================================
   */

  const openPatientAppointmentModal = (appointment) => {
    setEditingAppointment(null);

    setForm({
      ...emptyForm,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      patient: appointment.patient,
      phone: appointment.phone,
      doctor: appointment.doctor,
      service: appointment.service,
    });

    setShowModal(true);
  };

  /*
   * ============================================================
   * MODIFICATION
   * ============================================================
   */

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);

    setForm({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      patient: appointment.patient,
      phone: appointment.phone,
      doctor: appointment.doctor,
      service: appointment.service,
      date: appointment.date,
      time: appointment.time,
      motif: appointment.motif,
      status: appointment.status,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAppointment(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
   * ============================================================
   * ENREGISTREMENT DU RENDEZ-VOUS
   * ============================================================
   */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.patient ||
      !form.date ||
      !form.time
    ) {
      alert(
        "Veuillez sélectionner un patient et renseigner la date et l'heure du rendez-vous."
      );
      return;
    }

    try {
      if (editingAppointment) {
        await api.put(`/appointments/agenda/${editingAppointment.id}/`, form);
      } else {
        await api.post("/appointments/agenda/", form);
      }
    } catch (error) {
      alert(apiError(error, "Impossible d'enregistrer le rendez-vous."));
      return;
    }

    loadAppointments();

    closeModal();
  };

  /*
   * ============================================================
   * SUPPRESSION
   * ============================================================
   */

  const deleteAppointment = async (id) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce rendez-vous ?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/appointments/agenda/${id}/`);
      loadAppointments();
    } catch (error) {
      alert(apiError(error, "Impossible de supprimer le rendez-vous."));
    }
  };

  /*
   * ============================================================
   * CHANGEMENT DE STATUT
   * ============================================================
   */

  const updateStatus = async (id, status) => {
    try {
      await api.post(`/appointments/agenda/${id}/statut/`, { status });
      loadAppointments();
    } catch (error) {
      alert(apiError(error, "Impossible de changer le statut."));
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    const formatted = new Date(`${date}T00:00:00`);

    return formatted.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="appointments-page">

      {/* ======================================================
          HEADER
          ====================================================== */}


      {/* ======================================================
          STATISTIQUES
          ====================================================== */}

      <div className="appointment-statistics">

        <div className="appointment-stat-card">
          <div className="stat-icon stat-blue">
            <CalendarDays size={22} />
          </div>

          <div>
            <span>Total</span>
            <strong>{statistics.total}</strong>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="stat-icon stat-green">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>Confirmés</span>
            <strong>{statistics.confirmed}</strong>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="stat-icon stat-orange">
            <AlertCircle size={22} />
          </div>

          <div>
            <span>En attente</span>
            <strong>{statistics.pending}</strong>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="stat-icon stat-red">
            <XCircle size={22} />
          </div>

          <div>
            <span>Annulés</span>
            <strong>{statistics.cancelled}</strong>
          </div>
        </div>

      </div>

      {/* ======================================================
          FILTRES
          ====================================================== */}

      <div className="appointments-filters">

        <div className="appointment-search">
          <Search size={19} />

          <input
            type="text"
            placeholder="Rechercher un patient, médecin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="appointment-filter-item">
          <Filter size={17} />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="Tous">
              Tous les statuts
            </option>

            <option value="Confirmé">
              Confirmés
            </option>

            <option value="En attente">
              En attente
            </option>

            <option value="Annulé">
              Annulés
            </option>
          </select>
        </div>

        <div className="appointment-date-filter">
          <CalendarDays size={17} />

          <input
            type="date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(e.target.value)
            }
          />
        </div>

        {(search ||
          dateFilter ||
          statusFilter !== "Tous") && (
          <button
            className="clear-filters-btn"
            onClick={() => {
              setSearch("");
              setDateFilter("");
              setStatusFilter("Tous");
            }}
          >
            Réinitialiser
          </button>
        )}

      </div>

      {/* ======================================================
          TABLEAU
          ====================================================== */}

      {vue.id === "agenda" ? <AgendaSemaine rendezVous={appointments} /> : (
      <div className="appointments-card">

        <div className="appointments-card-header">

          <div>
            <h2>Liste des rendez-vous</h2>

            <p>
              {filteredAppointments.length} rendez-vous
              affiché(s)
            </p>
          </div>

        </div>

        <div className="appointments-table-container">

          <table className="appointments-table">

            <thead>
              <tr>
                <th>Patient</th>
                <th>Médecin / Service</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Motif</th>

                {/* MODIFICATION */}
                <th>Rendez</th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredAppointments.length === 0 ? (

                <tr>
                  <td
                    colSpan="7"
                    className="appointments-empty"
                  >
                    <CalendarDays size={42} />

                    <strong>
                      Aucun rendez-vous trouvé
                    </strong>

                    <span>
                      Modifiez vos critères de recherche
                      ou créez un nouveau rendez-vous.
                    </span>
                  </td>
                </tr>

              ) : (

                filteredAppointments.map((appointment) => (

                  <tr key={appointment.id}>

                    {/* PATIENT */}
                    <td>

                      <div className="patient-cell">

                        <div className="patient-avatar">
                          <User size={18} />
                        </div>

                        <div>

                          <strong>
                            {appointment.patient}
                          </strong>

                          <span>
                            <Phone size={12} />
                            {appointment.phone}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* MEDECIN */}
                    <td>

                      <div className="doctor-cell">

                        <div className="doctor-icon">
                          <Stethoscope size={17} />
                        </div>

                        <div>

                          <strong>
                            {appointment.doctor}
                          </strong>

                          <span>
                            {appointment.service}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* DATE */}
                    <td>

                      <div className="date-cell">

                        <CalendarDays size={16} />

                        <span>
                          {formatDate(
                            appointment.date
                          )}
                        </span>

                      </div>

                    </td>

                    {/* HEURE */}
                    <td>

                      <div className="time-cell">

                        <Clock size={16} />

                        {appointment.time}

                      </div>

                    </td>

                    {/* MOTIF */}
                    <td>

                      <span className="motif-text">
                        {appointment.motif}
                      </span>

                    </td>

                    {/* ==================================================
                        RENDEZ
                        ================================================== */}

                    <td>

                      <button
                        type="button"
                        className="patient-appointment-btn"
                        onClick={() =>
                          openPatientAppointmentModal(
                            appointment
                          )
                        }
                      >
                        <CalendarDays size={15} />
                        RENDEZ VOUS
                      </button>

                    </td>

                    {/* ACTIONS */}
                    <td>

                      <div className="appointment-actions">

                        {appointment.status !==
                          "Confirmé" && (

                          <button
                            className="action-confirm"
                            title="Confirmer"
                            onClick={() =>
                              updateStatus(
                                appointment.id,
                                "Confirmé"
                              )
                            }
                          >
                            <CheckCircle2 size={17} />
                          </button>

                        )}

                        <button
                          className="action-edit"
                          title="Modifier"
                          onClick={() =>
                            openEditModal(
                              appointment
                            )
                          }
                        >
                          <Edit3 size={17} />
                        </button>

                        {appointment.status !==
                          "Annulé" && (

                          <button
                            className="action-cancel"
                            title="Annuler"
                            onClick={() =>
                              updateStatus(
                                appointment.id,
                                "Annulé"
                              )
                            }
                          >
                            <XCircle size={17} />
                          </button>

                        )}

                        <button
                          className="action-delete"
                          title="Supprimer"
                          onClick={() =>
                            deleteAppointment(
                              appointment.id
                            )
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
      )}

      {/* ======================================================
          MODAL RENDEZ-VOUS
          ====================================================== */}

      {showModal && (

        <div
          className="appointment-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >

          <div className="appointment-modal">

            {/* HEADER MODAL */}
            <div className="appointment-modal-header">

              <div>

                <div className="modal-title-icon">
                  <CalendarDays size={21} />
                </div>

                <div>
                  <h2>
                    {editingAppointment
                      ? "Modifier le rendez-vous"
                      : "Nouveau rendez-vous"}
                  </h2>

                  <p>
                    Renseignez les informations du
                    rendez-vous.
                  </p>
                </div>

              </div>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                <X size={21} />
              </button>

            </div>

            {/* ==================================================
                FORMULAIRE SIMPLIFIE
                ================================================== */}

            <form
              className="appointment-form"
              onSubmit={handleSubmit}
            >

              {/* PATIENT SELECTIONNE */}
              <div className="form-section">

                <h3>Patient concerné</h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Patient
                      <span>*</span>
                    </label>

                    <div className="input-icon-wrapper">

                      <User size={17} />

                      <input
                        type="text"
                        name="patient"
                        value={form.patient}
                        readOnly
                        placeholder="Patient"
                      />

                    </div>

                  </div>

                </div>

              </div>

              {/* DATE / HEURE */}
              <div className="form-section">

                <h3>Date et heure</h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Date
                      <span>*</span>
                    </label>

                    <div className="input-icon-wrapper">

                      <CalendarDays size={17} />

                      <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                      />

                    </div>

                  </div>

                  <div className="form-group">

                    <label>
                      Heure
                      <span>*</span>
                    </label>

                    <div className="input-icon-wrapper">

                      <Clock size={17} />

                      <input
                        type="time"
                        name="time"
                        value={form.time}
                        onChange={handleChange}
                      />

                    </div>

                  </div>

                </div>

              </div>

              {/* MOTIF */}
              <div className="form-section">

                <div className="form-grid">

                  <div className="form-group full-width">

                    <label>
                      Motif du rendez-vous
                    </label>

                    <textarea
                      name="motif"
                      value={form.motif}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Décrivez le motif du rendez-vous..."
                    />

                  </div>

                </div>

              </div>

              {/* STATUT */}
              <div className="form-section">

                <div className="form-group">

                  <label>
                    Statut
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >

                    <option>
                      En attente
                    </option>

                    <option>
                      Confirmé
                    </option>

                    <option>
                      Annulé
                    </option>

                  </select>

                </div>

              </div>

              {/* ACTIONS */}
              <div className="appointment-form-actions">

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                >
                  <CheckCircle2 size={18} />

                  {editingAppointment
                    ? "Enregistrer les modifications"
                    : "Créer le rendez-vous"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

/* ============================================================
   AGENDA DE LA SEMAINE
   ============================================================
   Une colonne par jour, du lundi au dimanche ; filtre par médecin.
   ============================================================ */

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function AgendaSemaine({ rendezVous }) {
  const [decalage, setDecalage] = useState(0);
  const [medecin, setMedecin] = useState("");
  const lundi = new Date();
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7) + decalage * 7);
  const jours = Array.from({ length: 7 }, (_, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); return d; });
  const medecins = [...new Set(rendezVous.map((r) => r.doctor))].sort();
  const aujourdhui = isoLocal(new Date());
  const duJour = (iso) => rendezVous.filter((r) => r.date === iso && (!medecin || r.doctor === medecin) && r.status !== "Annulé")
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="appointments-card ag-semaine">
      <div className="ag-barre">
        <div className="ag-nav">
          <button type="button" className="secondary-button" onClick={() => setDecalage(decalage - 1)}>Semaine précédente</button>
          <button type="button" className="secondary-button" onClick={() => setDecalage(0)} disabled={decalage === 0}>Cette semaine</button>
          <button type="button" className="secondary-button" onClick={() => setDecalage(decalage + 1)}>Semaine suivante</button>
        </div>
        <strong>Du {jours[0].toLocaleDateString("fr-FR")} au {jours[6].toLocaleDateString("fr-FR")}</strong>
        <select value={medecin} onChange={(e) => setMedecin(e.target.value)} aria-label="Médecin">
          <option value="">Tous les médecins</option>
          {medecins.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="ag-grille">
        {jours.map((d, i) => {
          const iso = isoLocal(d);
          const liste = duJour(iso);
          return (
            <section key={iso} className={`ag-jour ${iso === aujourdhui ? "aujourdhui" : ""}`}>
              <header><span>{JOURS[i]}</span><strong>{d.getDate()}</strong><b>{liste.length || ""}</b></header>
              {liste.length === 0 ? <p className="ag-vide">—</p> : liste.map((r) => (
                <article key={r.id} className={`ag-rdv ${r.status === "Absent" ? "absent" : r.status === "Terminé" ? "fait" : ""}`}>
                  <time>{r.time}</time>
                  <strong>{r.patient}</strong>
                  <span>{r.doctor}</span>
                  {r.motif && <small>{r.motif}</small>}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default Appointments;
