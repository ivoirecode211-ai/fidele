import { useMemo, useState } from "react";
import {
  ShieldCheck,
  FlaskConical,
  CalendarDays,
  Plus,
  Search,
  X,
  CheckCircle2,
  Clock3,
  Trash2,
  Biohazard,
  Package,
  LockKeyhole,
  ClipboardCheck,
  ChevronRight,
  Save,
  Eye,
} from "lucide-react";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import "../styles/hygiene.css";

// Données de démonstration — seront reliées aux API Django/PostgreSQL.

const CLEANING_TASKS = [
  { id: 1, zone: "Bloc opératoire", type: "Désinfection", responsible: "ADOU K.", status: "Terminée", hour: "08:00" },
  { id: 2, zone: "Chambres patients", type: "Nettoyage", responsible: "KOUAME S.", status: "En cours", hour: "10:30" },
  { id: 3, zone: "Salle d'attente", type: "Nettoyage", responsible: "TRAORE M.", status: "Planifiée", hour: "14:00" },
  { id: 4, zone: "Laboratoire", type: "Désinfection", responsible: "DIARRA L.", status: "En cours", hour: "12:00" },
  { id: 5, zone: "Sanitaires", type: "Nettoyage", responsible: "YAO F.", status: "En retard", hour: "11:30" },
];

const HYGIENE_PRODUCTS = [
  { id: 1, name: "Désinfectant", quantity: "12/09/2026", icon: FlaskConical, color: "blue" },
  { id: 2, name: "Savon liquide", quantity: "12/09/2026", icon: LockKeyhole, color: "green" },
  { id: 3, name: "Gants", quantity: "12/09/2026", icon: ShieldCheck, color: "cyan" },
  { id: 4, name: "Masques", quantity: "11/09/2026", icon: Biohazard, color: "purple" },
  { id: 5, name: "Sacs DASRI", quantity: "11/09/2026", icon: Package, color: "blue" },
];

const WASTE_TYPES = [
  { id: 1, name: "Déchets infectieux", quantity: "12 kg", collection: "10/09/2026", icon: Biohazard, color: "red" },
  { id: 2, name: "Déchets chimiques", quantity: "3 kg", collection: "09/09/2026", icon: Trash2, color: "orange" },
  { id: 3, name: "Déchets assimilés", quantity: "8 kg", collection: "09/09/2026", icon: Trash2, color: "gray" },
];

const TASK_STATUS_TONES = {
  "Terminée": "success",
  "En cours": "info",
  "Planifiée": "neutral",
  "En retard": "danger",
};

const EMPTY_TASK_FORM = { zone: "", type: "Nettoyage", responsible: "", date: "", hour: "" };

export default function Hygiene() {
  const [search, setSearch] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);

  const filteredTasks = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return CLEANING_TASKS;

    return CLEANING_TASKS.filter(
      (task) =>
        task.zone.toLowerCase().includes(value) ||
        task.type.toLowerCase().includes(value) ||
        task.responsible.toLowerCase().includes(value) ||
        task.status.toLowerCase().includes(value)
    );
  }, [search]);

  const handleTaskChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((previous) => ({ ...previous, [name]: value }));
  };

  const openNewTask = () => {
    setSelectedTask(null);
    setTaskForm(EMPTY_TASK_FORM);
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setSelectedTask(task);
    setTaskForm({ zone: task.zone, type: task.type, responsible: task.responsible, date: "", hour: task.hour });
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    setTaskForm(EMPTY_TASK_FORM);
  };

  // Plus tard : api.post("/hygiene/tasks/", taskForm) ou api.put(`/hygiene/tasks/${selectedTask.id}/`, taskForm).
  const handleTaskSubmit = (event) => {
    event.preventDefault();
    alert(selectedTask ? "Tâche modifiée avec succès." : "Nouvelle tâche créée avec succès.");
    closeTaskModal();
  };

  return (
    <div className="hygiene-page">
      <header className="hygiene-header">
        <div className="hygiene-title-area">
          <div className="hygiene-title-icon">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h1>Hygiène</h1>
            <p>Suivi de la propreté, de la désinfection et de la gestion des déchets médicaux</p>
          </div>
        </div>

        <button type="button" className="hygiene-primary-button" onClick={openNewTask}>
          <Plus size={16} />
          Nouvelle tâche
        </button>
      </header>

      <section className="hygiene-stat-grid">
        <StatCard icon={<ShieldCheck size={22} strokeWidth={2.2} />} value="96%" label="Taux de conformité" tone="green" />
        <StatCard icon={<FlaskConical size={22} strokeWidth={2.2} />} value="8" label="Tâches en cours" tone="blue" />
        <StatCard icon={<CalendarDays size={22} strokeWidth={2.2} />} value="3" label="Tâches en retard" tone="orange" />
        <StatCard icon={<Biohazard size={22} strokeWidth={2.2} />} value="2" label="Incidents d'hygiène" tone="purple" />
      </section>

      <div className="hygiene-toolbar">
        <div className="hygiene-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher une zone, une tâche..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="hygiene-clear-search"
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="hygiene-date-info">
          <CalendarDays size={14} />
          Mise à jour :
          <strong>10/09/2026</strong>
        </div>
      </div>

      <div className="hygiene-main-grid">
        <section className="hygiene-panel tasks-panel">
          <div className="hygiene-panel-header">
            <div>
              <h2>Tâches de nettoyage</h2>
              <p>Suivi des opérations d'hygiène</p>
            </div>
            <button type="button" className="hygiene-small-button" onClick={openNewTask}>
              <Plus size={14} />
              Nouvelle tâche
            </button>
          </div>

          <div className="hygiene-table-wrapper">
            <table className="hygiene-table">
              <thead>
                <tr>
                  <th>Zone / Lieu</th>
                  <th>Type</th>
                  <th>Responsable</th>
                  <th>Statut</th>
                  <th>Heure</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td><strong>{task.zone}</strong></td>
                    <td>{task.type}</td>
                    <td>{task.responsible}</td>
                    <td>
                      <StatusBadge status={task.status} tone={TASK_STATUS_TONES[task.status]} />
                    </td>
                    <td>{task.hour}</td>
                    <td>
                      <button
                        type="button"
                        className="hygiene-edit-button"
                        title="Modifier"
                        aria-label={`Modifier ${task.zone}`}
                        onClick={() => openEditTask(task)}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan="6" className="hygiene-empty">Aucune tâche trouvée.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="hygiene-panel products-panel">
          <div className="hygiene-panel-header">
            <div>
              <h2>Suivi des produits</h2>
              <p>Produits d'hygiène disponibles</p>
            </div>
          </div>

          <div className="hygiene-products-list">
            {HYGIENE_PRODUCTS.map((product) => {
              const Icon = product.icon;
              return (
                <div className="hygiene-product-row" key={product.id}>
                  <div className={`hygiene-product-icon ${product.color}`}>
                    <Icon size={15} />
                  </div>
                  <div className="hygiene-product-info">
                    <strong>{product.name}</strong>
                    <span>Disponible</span>
                  </div>
                  <span className="product-date">{product.quantity}</span>
                  <span className="product-check">
                    <CheckCircle2 size={14} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="hygiene-bottom-grid">
        <section className="hygiene-panel waste-panel">
          <div className="hygiene-panel-header">
            <div>
              <h2>Gestion des déchets médicaux</h2>
              <p>Suivi du tri, stockage et enlèvement</p>
            </div>
            <button
              type="button"
              className="hygiene-link-button"
              onClick={() => alert("Gestion complète des déchets")}
            >
              Voir tout
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="waste-grid">
            {WASTE_TYPES.map((waste) => {
              const Icon = waste.icon;
              return (
                <div className="waste-card" key={waste.id}>
                  <div className={`waste-icon ${waste.color}`}>
                    <Icon size={18} />
                  </div>
                  <strong>{waste.name}</strong>
                  <span className="waste-quantity">{waste.quantity}</span>
                  <small>Collecte : {waste.collection}</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="hygiene-panel audit-panel">
          <div className="hygiene-panel-header">
            <div>
              <h2>Contrôles et audits</h2>
              <p>Suivi des contrôles d'hygiène</p>
            </div>
          </div>

          <div className="audit-content">
            <div className="audit-item">
              <div className="audit-icon">
                <ClipboardCheck size={18} />
              </div>
              <div className="audit-info">
                <strong>Dernier contrôle</strong>
                <span>09/09/2026</span>
              </div>
              <span className="audit-status">Conforme</span>
            </div>

            <div className="audit-separator"></div>

            <div className="audit-item">
              <div className="audit-icon next">
                <CalendarDays size={18} />
              </div>
              <div className="audit-info">
                <strong>Prochain contrôle</strong>
                <span>16/09/2026</span>
              </div>
              <ChevronRight size={15} className="audit-arrow" />
            </div>

            <div className="audit-summary">
              <div>
                <strong>96%</strong>
                <span>conformité globale</span>
              </div>
              <div className="audit-progress">
                <div className="audit-progress-bar" style={{ width: "96%" }}></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="hygiene-summary">
        <div className="summary-icon">
          <CheckCircle2 size={21} />
        </div>
        <div className="summary-content">
          <strong>État général de l'hygiène</strong>
          <span>
            Les indicateurs d'hygiène de la clinique sont actuellement conformes
            aux objectifs définis.
          </span>
        </div>
        <div className="summary-score">
          <strong>96%</strong>
          <span>Conformité</span>
        </div>
      </section>

      {showTaskModal && (
        <div
          className="hygiene-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTaskModal();
          }}
        >
          <div className="hygiene-modal">
            <div className="hygiene-modal-header">
              <div className="modal-title">
                <div className="modal-icon">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h2>{selectedTask ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
                  <p>Planification d'une opération d'hygiène</p>
                </div>
              </div>

              <button type="button" className="modal-close" onClick={closeTaskModal} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <form className="hygiene-form" onSubmit={handleTaskSubmit}>
              <div className="hygiene-form-grid">
                <div className="hygiene-form-group">
                  <label htmlFor="zone">Zone / Lieu</label>
                  <input
                    id="zone"
                    name="zone"
                    type="text"
                    placeholder="Ex. Bloc opératoire"
                    value={taskForm.zone}
                    onChange={handleTaskChange}
                    required
                  />
                </div>

                <div className="hygiene-form-group">
                  <label htmlFor="type">Type d'intervention</label>
                  <select id="type" name="type" value={taskForm.type} onChange={handleTaskChange}>
                    <option value="Nettoyage">Nettoyage</option>
                    <option value="Désinfection">Désinfection</option>
                    <option value="Décontamination">Décontamination</option>
                    <option value="Stérilisation">Stérilisation</option>
                  </select>
                </div>

                <div className="hygiene-form-group">
                  <label htmlFor="responsible">Responsable</label>
                  <input
                    id="responsible"
                    name="responsible"
                    type="text"
                    placeholder="Nom du responsable"
                    value={taskForm.responsible}
                    onChange={handleTaskChange}
                    required
                  />
                </div>

                <div className="hygiene-form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={taskForm.date}
                    onChange={handleTaskChange}
                    required
                  />
                </div>

                <div className="hygiene-form-group">
                  <label htmlFor="hour">Heure</label>
                  <input
                    id="hour"
                    name="hour"
                    type="time"
                    value={taskForm.hour}
                    onChange={handleTaskChange}
                    required
                  />
                </div>
              </div>

              <div className="hygiene-form-note">
                <Clock3 size={15} />
                <span>La tâche sera ajoutée au planning des opérations d'hygiène.</span>
              </div>

              <div className="hygiene-modal-actions">
                <button type="button" className="hygiene-cancel-button" onClick={closeTaskModal}>
                  Annuler
                </button>
                <button type="submit" className="hygiene-save-button">
                  <Save size={15} />
                  {selectedTask ? "Enregistrer" : "Créer la tâche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
