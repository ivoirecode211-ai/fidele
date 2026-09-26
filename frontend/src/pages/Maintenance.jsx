import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  CalendarDays,
  AlertTriangle,
  Clock3,
  Search,
  Plus,
  Settings,
  Zap,
  Wind,
  Building2,
  X,
  Save,
  Activity,
  ShieldAlert,
  Droplets,
} from "lucide-react";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import api from "../services/api";
import "../styles/maintenance.css";

// Données servies par l'API (/api/maintenance/).
// Icône lucide de chaque catégorie d'équipement (champ « icon » de l'API).
const CATEGORY_ICONS = { Zap, Wind, Settings, Droplets, Activity, Building2, Wrench };

const DONUT_COLORS = {
  operational: "#16a34a",
  attention: "#f59e0b",
  critical: "#c94f4f",
};

const pad = (value) => String(value).padStart(2, "0");

const STAT_TONES = { warning: "orange", danger: "red", success: "green" };

const STATUS_TONES = {
  "Terminée": "success",
  "En cours": "info",
  "En attente": "warning",
  "Opérationnel": "success",
  "Attention": "warning",
  "Critique": "danger",
};

const EMPTY_INTERVENTION = {
  equipment: "",
  category: "",
  technician: "",
  date: "",
  time: "",
  type: "Préventive",
  priority: "Normale",
  description: "",
};

export default function Maintenance() {
  const [data, setData] = useState({
    stats: { monthInterventions: 0, pending: 0, critical: 0, plannedThisWeek: 0 },
    equipmentStatus: { total: 0, operational: 0, attention: 0, critical: 0 },
    interventions: [],
    equipments: [],
    criticalEquipments: [],
  });

  const loadOverview = () =>
    api
      .get("/maintenance/overview/")
      .then((response) => setData(response.data))
      .catch((error) => console.error("Erreur de chargement de la maintenance :", error));

  useEffect(() => {
    loadOverview();
  }, []);

  const {
    stats,
    equipmentStatus,
    interventions: INTERVENTIONS,
    equipments,
    criticalEquipments: CRITICAL_EQUIPMENTS,
  } = data;

  const EQUIPMENTS = equipments.map((equipment) => ({
    ...equipment,
    icon: CATEGORY_ICONS[equipment.icon] || Wrench,
  }));

  const donutBackground = (() => {
    const { total, operational, attention, critical } = equipmentStatus;
    if (!total) return undefined;
    const a = (operational / total) * 360;
    const b = a + (attention / total) * 360;
    const c = b + (critical / total) * 360;
    return `conic-gradient(${DONUT_COLORS.operational} 0deg ${a}deg, ${DONUT_COLORS.attention} ${a}deg ${b}deg, ${DONUT_COLORS.critical} ${b}deg ${c}deg)`;
  })();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [showModal, setShowModal] = useState(false);
  const [newIntervention, setNewIntervention] = useState(EMPTY_INTERVENTION);

  const filteredInterventions = useMemo(() => {
    return INTERVENTIONS.filter((item) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        item.equipment.toLowerCase().includes(searchValue) ||
        item.category.toLowerCase().includes(searchValue) ||
        item.technician.toLowerCase().includes(searchValue);

      const matchesStatus = statusFilter === "Tous" || item.status === statusFilter;
      const matchesType = typeFilter === "Tous" || item.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter, INTERVENTIONS]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIntervention((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveIntervention = async (e) => {
    e.preventDefault();

    try {
      await api.post("/maintenance/interventions/", newIntervention);
    } catch (error) {
      const errors = error.response?.data;
      alert(
        errors && typeof errors === "object"
          ? Object.values(errors).flat().join("\n")
          : "Impossible d'enregistrer l'intervention."
      );
      return;
    }

    loadOverview();
    setShowModal(false);
    setNewIntervention(EMPTY_INTERVENTION);
  };

  return (
    <div className="maintenance-page">
      <div className="maintenance-header">

        <button
          type="button"
          className="maintenance-primary-button"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Nouvelle intervention
        </button>
      </div>

      <div className="maintenance-stats-grid">
        <StatCard icon={<Wrench size={22} />} label="Interventions" value={pad(stats.monthInterventions)} detail="Ce mois-ci" tone="blue" />
        <StatCard icon={<Clock3 size={22} />} label="En attente" value={pad(stats.pending)} detail="À traiter" tone={STAT_TONES.warning} />
        <StatCard icon={<AlertTriangle size={22} />} label="Équipements critiques" value={pad(stats.critical)} detail="Intervention requise" tone={STAT_TONES.danger} />
        <StatCard icon={<CalendarDays size={22} />} label="Maintenance planifiée" value={pad(stats.plannedThisWeek)} detail="Cette semaine" tone={STAT_TONES.success} />
      </div>

      <div className="maintenance-toolbar">
        <div className="maintenance-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher une intervention, un équipement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="maintenance-filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Tous">Tous les statuts</option>
            <option value="Terminée">Terminées</option>
            <option value="En cours">En cours</option>
            <option value="En attente">En attente</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="Tous">Tous les types</option>
            <option value="Préventive">Préventive</option>
            <option value="Corrective">Corrective</option>
          </select>
        </div>
      </div>

      <div className="maintenance-main-grid">
        <section className="maintenance-panel maintenance-interventions-panel">
          <div className="maintenance-panel-header">
            <div>
              <h2>Interventions récentes</h2>
              <p>Suivi des dernières opérations de maintenance</p>
            </div>
            <Wrench size={21} />
          </div>

          <div className="maintenance-table-wrapper">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Technicien</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {filteredInterventions.length > 0 ? (
                  filteredInterventions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="maintenance-equipment-cell">
                          <strong>{item.equipment}</strong>
                          <span>{item.category}</span>
                        </div>
                      </td>
                      <td>{item.technician}</td>
                      <td>
                        <div className="maintenance-date-cell">
                          <span>{item.date}</span>
                          <small>{item.time}</small>
                        </div>
                      </td>
                      <td>{item.type}</td>
                      <td>
                        <span
                          className={`maintenance-priority ${item.priority.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={item.status} tone={STATUS_TONES[item.status]} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="maintenance-empty-state">
                        <Search size={28} />
                        <p>Aucune intervention trouvée.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="maintenance-panel maintenance-status-panel">
          <div className="maintenance-panel-header">
            <div>
              <h2>État des équipements</h2>
              <p>Situation actuelle du parc</p>
            </div>
            <Activity size={21} />
          </div>

          <div className="maintenance-donut-container">
            <div className="maintenance-donut" style={donutBackground ? { background: donutBackground } : undefined}>
              <div className="maintenance-donut-inner">
                <strong>{pad(equipmentStatus.total)}</strong>
                <span>Équipements</span>
              </div>
            </div>
          </div>

          <div className="maintenance-status-legend">
            <div>
              <span className="legend-dot operational"></span>
              <span>Opérationnels</span>
              <strong>{equipmentStatus.operational}</strong>
            </div>
            <div>
              <span className="legend-dot attention"></span>
              <span>Attention</span>
              <strong>{equipmentStatus.attention}</strong>
            </div>
            <div>
              <span className="legend-dot critical"></span>
              <span>Critiques</span>
              <strong>{equipmentStatus.critical}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="maintenance-panel maintenance-equipment-panel">
        <div className="maintenance-panel-header">
          <div>
            <h2>Parc des équipements</h2>
            <p>Vue détaillée des équipements de la clinique</p>
          </div>
          <button type="button" className="maintenance-secondary-button">
            Voir tous
          </button>
        </div>

        <div className="maintenance-equipment-grid">
          {EQUIPMENTS.map((equipment) => {
            const Icon = equipment.icon;

            return (
              <div className="maintenance-equipment-card" key={equipment.id}>
                <div className="maintenance-equipment-card-top">
                  <div className="maintenance-equipment-icon">
                    <Icon size={22} />
                  </div>
                  <StatusBadge status={equipment.status} tone={STATUS_TONES[equipment.status]} />
                </div>

                <h3>{equipment.name}</h3>
                <span className="maintenance-equipment-category">{equipment.category}</span>

                <div className="maintenance-equipment-info">
                  <div>
                    <span>Localisation</span>
                    <strong>{equipment.location}</strong>
                  </div>
                  <div>
                    <span>Disponibilité</span>
                    <strong>{equipment.uptime}</strong>
                  </div>
                  <div>
                    <span>Dernière maintenance</span>
                    <strong>{equipment.lastMaintenance}</strong>
                  </div>
                  <div>
                    <span>Prochaine maintenance</span>
                    <strong>{equipment.nextMaintenance}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="maintenance-panel maintenance-critical-panel">
        <div className="maintenance-panel-header">
          <div>
            <h2>Alertes de maintenance</h2>
            <p>Équipements nécessitant une attention particulière</p>
          </div>
          <ShieldAlert size={21} />
        </div>

        <div className="maintenance-critical-list">
          {CRITICAL_EQUIPMENTS.map((equipment, index) => (
            <div className="maintenance-critical-item" key={index}>
              <div className="maintenance-critical-icon">
                <AlertTriangle size={20} />
              </div>
              <div className="maintenance-critical-content">
                <strong>{equipment.name}</strong>
                <span>{equipment.location}</span>
                <p>{equipment.issue}</p>
              </div>
              <span
                className={`maintenance-priority ${equipment.priority.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {equipment.priority}
              </span>
            </div>
          ))}
        </div>
      </section>

      {showModal && (
        <div
          className="maintenance-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="maintenance-modal">
            <div className="maintenance-modal-header">
              <div>
                <h2>Nouvelle intervention</h2>
                <p>Enregistrer une nouvelle opération de maintenance</p>
              </div>
              <button
                type="button"
                className="maintenance-modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveIntervention}>
              <div className="maintenance-form-grid">
                <div className="maintenance-form-group">
                  <label htmlFor="equipment">Équipement</label>
                  <input
                    id="equipment"
                    name="equipment"
                    type="text"
                    placeholder="Nom de l'équipement"
                    value={newIntervention.equipment}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="maintenance-form-group">
                  <label htmlFor="category">Catégorie</label>
                  <select
                    id="category"
                    name="category"
                    value={newIntervention.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sélectionner</option>
                    <option value="Électricité">Électricité</option>
                    <option value="Climatisation">Climatisation</option>
                    <option value="Stérilisation">Stérilisation</option>
                    <option value="Froid médical">Froid médical</option>
                    <option value="Gaz médicaux">Gaz médicaux</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>

                <div className="maintenance-form-group">
                  <label htmlFor="technician">Technicien</label>
                  <input
                    id="technician"
                    name="technician"
                    type="text"
                    placeholder="Nom du technicien"
                    value={newIntervention.technician}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="maintenance-form-group">
                  <label htmlFor="type">Type d'intervention</label>
                  <select id="type" name="type" value={newIntervention.type} onChange={handleInputChange}>
                    <option value="Préventive">Préventive</option>
                    <option value="Corrective">Corrective</option>
                  </select>
                </div>

                <div className="maintenance-form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={newIntervention.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="maintenance-form-group">
                  <label htmlFor="time">Heure</label>
                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={newIntervention.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="maintenance-form-group">
                  <label htmlFor="priority">Priorité</label>
                  <select id="priority" name="priority" value={newIntervention.priority} onChange={handleInputChange}>
                    <option value="Normale">Normale</option>
                    <option value="Haute">Haute</option>
                    <option value="Critique">Critique</option>
                  </select>
                </div>

                <div className="maintenance-form-group maintenance-form-full">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    placeholder="Décrire l'intervention..."
                    value={newIntervention.description}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="maintenance-modal-actions">
                <button
                  type="button"
                  className="maintenance-cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="maintenance-primary-button">
                  <Save size={18} />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
