import "../styles/direction.css";
import Logo from "../components/Logo";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  BedDouble,
  Package,
  UserRound,
  Wrench,
  Siren,
  FileText,
  Search,
  Bell,
  ChevronDown,
  CalendarDays,
  TrendingUp,
  Database,
  Box,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const menuItems = [
  { label: "Tableau de bord", icon: LayoutDashboard, path: "/direction", active: true },
  { label: "Patients", icon: Users, path: "/patients" },
  { label: "Consultations", icon: Stethoscope, path: "/consultations" },
  { label: "Laboratoire", icon: FlaskConical, path: "/laboratory" },
  { label: "Pharmacie", icon: Pill, path: "/pharmacy" },
  { label: "Caisse / Facturation", icon: CreditCard, path: "/billing" },
  { label: "Hospitalisation / Lits", icon: BedDouble, path: "/hospitalization" },
  { label: "Stocks", icon: Package, path: "/stocks" },
  { label: "Ressources humaines", icon: UserRound, path: "/employees" },
  { label: "Équipements", icon: Wrench, path: "/equipments" },
  { label: "Urgences", icon: Siren, path: "/urgences" },
  { label: "Rapports & Statistiques", icon: FileText, path: "/reports" },
];

const statistics = [
  { title: "Patients aujourd'hui", value: "128", variation: "+12%", icon: Users, color: "blue" },
  { title: "Consultations", value: "96", variation: "+8%", icon: Stethoscope, color: "blue" },
  { title: "Recettes du jour", value: "2 450 000", unit: "FCFA", variation: "+18%", icon: Database, color: "green" },
  { title: "Lits disponibles", value: "18", unit: "/ 50", variation: "62% occupés", icon: BedDouble, color: "blue" },
  { title: "Analyses réalisées", value: "45", variation: "+5%", icon: FlaskConical, color: "green" },
  { title: "Médicaments délivrés", value: "230", variation: "+10%", icon: Pill, color: "red" },
  { title: "Stock critiques", value: "3", action: "Voir détails", icon: Box, color: "orange" },
  { title: "Urgences", value: "7", action: "En cours", icon: Siren, color: "red" },
];

const consultationData = [
  { day: "Lun", consultations: 70, patients: 45 },
  { day: "Mar", consultations: 90, patients: 55 },
  { day: "Mer", consultations: 150, patients: 80 },
  { day: "Jeu", consultations: 75, patients: 45 },
  { day: "Ven", consultations: 115, patients: 70 },
  { day: "Sam", consultations: 155, patients: 90 },
  { day: "Dim", consultations: 170, patients: 105 },
];

const services = [
  { name: "Médecine générale", percentage: 36, color: "#2d7ff9" },
  { name: "Pédiatrie", percentage: 18, color: "#4f8df7" },
  { name: "Gynécologie", percentage: 15, color: "#697cf4" },
  { name: "Chirurgie", percentage: 12, color: "#f39a13" },
  { name: "Laboratoire", percentage: 10, color: "#f2c21b" },
  { name: "Autres", percentage: 9, color: "#806df1" },
];

const alerts = [
  { type: "critical", title: "Stock critique : Gants", text: "Il reste 25 unités (seuil : 50)", time: "Il y a 20 min", icon: AlertTriangle },
  { type: "warning", title: "Maintenance : Générateur", text: "Intervention prévue dans 3 jours", time: "Il y a 1 h", icon: Wrench },
  { type: "info", title: "Affluence élevée aux urgences", text: "Temps d'attente estimé : 45 min", time: "Il y a 2 h", icon: Siren },
  { type: "success", title: "3 résultats d'analyses à valider", text: "", time: "Il y a 3 h", icon: CheckCircle2 },
];

// Carte plus riche que le StatCard partagé (unité, variation, action) :
// reste locale exprès, un passage au composant générique ferait perdre ces informations.
function StatCard({ stat }) {
  const Icon = stat.icon;

  return (
    <div className="direction-stat-card">
      <div className={`direction-stat-icon ${stat.color}`}>
        <Icon size={25} strokeWidth={2.2} />
      </div>

      <div className="direction-stat-info">
        <span className="direction-stat-title">{stat.title}</span>

        <div className="direction-stat-value-row">
          <strong className="direction-stat-value">{stat.value}</strong>
          {stat.unit && <span className="direction-stat-unit">{stat.unit}</span>}
        </div>

        {stat.variation && (
          <span
            className={
              stat.variation.includes("%") ? "direction-stat-positive" : "direction-stat-secondary"
            }
          >
            {stat.variation.includes("%") && <TrendingUp size={11} />}
            {stat.variation}
          </span>
        )}

        {stat.action && <button className="direction-stat-action">{stat.action}</button>}
      </div>
    </div>
  );
}

function ConsultationChart() {
  const width = 560;
  const height = 235;
  const left = 48;
  const right = 15;
  const top = 18;
  const bottom = 38;
  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;
  const maxValue = 200;

  const getX = (index) => left + (index * graphWidth) / 6;
  const getY = (value) => top + graphHeight - (value / maxValue) * graphHeight;

  const makePath = (key) =>
    consultationData
      .map((item, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(item[key])}`)
      .join(" ");

  return (
    <div className="direction-chart-wrapper">
      <svg className="direction-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 50, 100, 150, 200].map((value) => (
          <g key={value}>
            <line x1={left} y1={getY(value)} x2={width - right} y2={getY(value)} className="chart-grid" />
            <text x="10" y={getY(value) + 4} className="chart-axis">{value}</text>
          </g>
        ))}

        <path d={makePath("consultations")} className="chart-consultations" />
        <path d={makePath("patients")} className="chart-patients" />

        {consultationData.map((item, index) => (
          <circle
            key={`consultation-${index}`}
            cx={getX(index)}
            cy={getY(item.consultations)}
            r="3.5"
            className="chart-point-consultations"
          />
        ))}

        {consultationData.map((item, index) => (
          <circle
            key={`patient-${index}`}
            cx={getX(index)}
            cy={getY(item.patients)}
            r="3.5"
            className="chart-point-patients"
          />
        ))}

        {consultationData.map((item, index) => (
          <text key={item.day} x={getX(index)} y={height - 12} textAnchor="middle" className="chart-day">
            {item.day}
          </text>
        ))}
      </svg>
    </div>
  );
}

// Donut construit avec un conic-gradient (pas de librairie de graphiques dans ce projet).
function ServicesDonut() {
  let current = 0;
  const gradientParts = services.map((service) => {
    const start = current;
    current += service.percentage;
    return `${service.color} ${start}% ${current}%`;
  });

  return (
    <div className="services-chart-area">
      <div className="services-donut" style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}>
        <div className="services-donut-center">
          <span>Total</span>
          <strong>96</strong>
        </div>
      </div>

      <div className="services-legend">
        {services.map((service) => (
          <div className="service-legend-item" key={service.name}>
            <span className="service-dot" style={{ backgroundColor: service.color }} />
            <span className="service-name">{service.name}</span>
            <strong>{service.percentage}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Direction() {
  return (
    <div className="direction-dashboard">
      <aside className="direction-sidebar">
        <div className="direction-brand">
          <div className="direction-brand-icon">
            <Logo size={32} inverted />
          </div>
          <span>MA SANTE</span>
        </div>

        <nav className="direction-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                href={item.path}
                className={`direction-menu-item ${item.active ? "active" : ""}`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
                {item.active && <span className="direction-menu-arrow">›</span>}
              </a>
            );
          })}
        </nav>
      </aside>

      <main className="direction-content">
        <header className="direction-topbar">
          <div className="direction-search">
            <Search size={16} />
            <input type="text" placeholder="Rechercher un patient, une consultation, un utilisateur..." />
          </div>

          <div className="direction-topbar-right">
            <button className="direction-notification">
              <Bell size={19} />
              <span>5</span>
            </button>

            <div className="direction-user">
              <div className="direction-user-avatar">👨🏾‍💼</div>
              <div className="direction-user-info">
                <strong>Directeur</strong>
              </div>
              <ChevronDown size={15} className="direction-user-chevron" />
            </div>
          </div>
        </header>

        <div className="direction-page-content">
          <div className="direction-page-heading">
            <div>
              <h1>Tableau de bord - Direction</h1>
              <p>Vue globale des activités de la clinique</p>
            </div>

            <button className="direction-date-button">
              <span>Aujourd'hui</span>
              <CalendarDays size={16} />
            </button>
          </div>

          <section className="direction-statistics">
            {statistics.map((stat) => (
              <StatCard key={stat.title} stat={stat} />
            ))}
          </section>

          <section className="direction-dashboard-grid">
            <div className="direction-panel direction-consultations-panel">
              <div className="direction-panel-header">
                <h2>Évolution des consultations</h2>
                <div className="direction-chart-legend">
                  <span><i className="legend-blue" />Consultations</span>
                  <span><i className="legend-green" />Patients</span>
                </div>
              </div>

              <ConsultationChart />
            </div>

            <div className="direction-panel direction-services-panel">
              <div className="direction-panel-header">
                <h2>Répartition des services</h2>
              </div>

              <ServicesDonut />
            </div>

            <div className="direction-panel direction-alerts-panel">
              <div className="direction-panel-header">
                <h2>Alertes et notifications</h2>
                <button className="direction-see-all">Voir tout</button>
              </div>

              <div className="direction-alert-list">
                {alerts.map((alert, index) => {
                  const AlertIcon = alert.icon;

                  return (
                    <div className="direction-alert" key={index}>
                      <div className={`direction-alert-icon ${alert.type}`}>
                        <AlertIcon size={15} strokeWidth={2.5} />
                      </div>

                      <div className="direction-alert-content">
                        <div className="direction-alert-title-row">
                          <strong>{alert.title}</strong>
                          <span>{alert.time}</span>
                        </div>

                        {alert.text && <p>{alert.text}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
