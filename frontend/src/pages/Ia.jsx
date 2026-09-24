import { useMemo, useState } from "react";
import {
  BrainCircuit,
  MessageCircle,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  TrendingUp,
  ShieldCheck,
  Stethoscope,
  Search,
  X,
  ChevronRight,
  Sparkles,
  BarChart3,
  Bot,
  FileText,
  Info,
} from "lucide-react";
import "../styles/ia.css";

// Données de démonstration — seront reliées aux API Django/PostgreSQL.

const AI_TOOLS = [
  { id: "diagnostic", title: "Aide au diagnostic", description: "Analyse des symptômes", icon: Stethoscope, color: "blue" },
  { id: "risks", title: "Prédiction des risques", description: "Analyse des données", icon: TrendingUp, color: "green" },
  { id: "assistant", title: "Assistant médical", description: "Réponses & conseils", icon: MessageCircle, color: "cyan" },
  { id: "images", title: "Analyse d'images", description: "Radiologie & imagerie", icon: ImageIcon, color: "purple" },
];

const AI_SUGGESTIONS = [
  { id: 1, type: "warning", title: "Risque d'hypertension détecté", patient: "Patient : KONE Brahim (45 ans)" },
  { id: 2, type: "danger", title: "Suspicion de diabète", patient: "Patient : DIALLO Mariam (38 ans)" },
  { id: 3, type: "success", title: "Suivi post-opératoire", patient: "Patient : TRAORE Awa (52 ans)" },
  { id: 4, type: "info", title: "Rendez-vous de contrôle", patient: "Patient : YAO Claude (60 ans)" },
];

const AI_MODELS = [
  { id: 1, name: "Diagnostic médical", status: "Actif", icon: Stethoscope },
  { id: 2, name: "Prédiction des risques", status: "Actif", icon: TrendingUp },
  { id: 3, name: "Analyse d'images", status: "Actif", icon: ImageIcon },
  { id: 4, name: "Assistant conversationnel", status: "Actif", icon: MessageCircle },
];

const ANALYSIS_DATA = [
  { date: "10/09", reel: 20, prediction: 21 },
  { date: "11/09", reel: 24, prediction: 23 },
  { date: "12/09", reel: 18, prediction: 20 },
  { date: "13/09", reel: 27, prediction: 25 },
  { date: "14/09", reel: 22, prediction: 23 },
  { date: "15/09", reel: 30, prediction: 28 },
  { date: "16/09", reel: 26, prediction: 29 },
];

function AIToolCard({ icon: Icon, title, description, color, onClick }) {
  return (
    <button type="button" className="ia-tool-card" onClick={onClick}>
      <div className={`ia-tool-icon ${color}`}>
        <Icon size={21} />
      </div>
      <strong>{title}</strong>
      <span>{description}</span>
      <ChevronRight size={13} className="ia-tool-arrow" />
    </button>
  );
}

function SuggestionIcon({ type }) {
  if (type === "warning") {
    return <div className="ia-suggestion-icon warning"><AlertTriangle size={15} /></div>;
  }
  if (type === "danger") {
    return <div className="ia-suggestion-icon danger"><AlertTriangle size={15} /></div>;
  }
  if (type === "success") {
    return <div className="ia-suggestion-icon success"><CheckCircle2 size={15} /></div>;
  }
  return <div className="ia-suggestion-icon info"><Clock3 size={15} /></div>;
}

export default function Ia() {
  const [search, setSearch] = useState("");
  const [activeTool, setActiveTool] = useState(null);

  const filteredSuggestions = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return AI_SUGGESTIONS;

    return AI_SUGGESTIONS.filter(
      (item) =>
        item.title.toLowerCase().includes(value) ||
        item.patient.toLowerCase().includes(value)
    );
  }, [search]);

  const closeTool = () => setActiveTool(null);

  return (
    <div className="ia-page">
      <header className="ia-header">

        <div className="ia-status">
          <span className="ia-status-dot"></span>
          IA opérationnelle
        </div>
      </header>

      <section className="ia-tools-grid">
        {AI_TOOLS.map((tool) => (
          <AIToolCard
            key={tool.id}
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            color={tool.color}
            onClick={() => setActiveTool(tool)}
          />
        ))}
      </section>

      <div className="ia-toolbar">
        <div className="ia-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Rechercher une suggestion, un patient..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              className="ia-clear-search"
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="ia-last-update">
          <Clock3 size={13} />
          Dernière analyse :
          <strong>aujourd'hui à 09:42</strong>
        </div>
      </div>

      <div className="ia-main-grid">
        <section className="ia-panel suggestions-panel">
          <div className="ia-panel-header">
            <div>
              <h2>
                Suggestions IA
                <span className="ia-today">Aujourd'hui</span>
              </h2>
              <p>Alertes et recommandations générées par l'intelligence artificielle</p>
            </div>

            <button
              type="button"
              className="ia-view-all"
              onClick={() => alert("Affichage de toutes les suggestions IA.")}
            >
              Voir tout
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="ia-suggestions-list">
            {filteredSuggestions.map((suggestion) => (
              <div className="ia-suggestion-row" key={suggestion.id}>
                <SuggestionIcon type={suggestion.type} />
                <div className="ia-suggestion-content">
                  <strong>{suggestion.title}</strong>
                  <span>{suggestion.patient}</span>
                </div>
                <button
                  type="button"
                  className="ia-suggestion-view"
                  onClick={() => alert(`Détails : ${suggestion.title}`)}
                >
                  Voir
                </button>
              </div>
            ))}

            {filteredSuggestions.length === 0 && (
              <div className="ia-empty">
                <Search size={22} />
                <span>Aucune suggestion trouvée.</span>
              </div>
            )}
          </div>
        </section>

        <section className="ia-panel analysis-panel">
          <div className="ia-panel-header">
            <div>
              <h2>Analyse des données</h2>
              <p>Prédiction des admissions (7 jours)</p>
            </div>
            <div className="ia-analysis-icon">
              <BarChart3 size={17} />
            </div>
          </div>

          <div className="ia-chart">
            <div className="ia-chart-y">
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>

            <div className="ia-chart-body">
              <div className="ia-chart-grid-line line-40"></div>
              <div className="ia-chart-grid-line line-30"></div>
              <div className="ia-chart-grid-line line-20"></div>
              <div className="ia-chart-grid-line line-10"></div>
              <div className="ia-chart-grid-line line-0"></div>

              <svg className="ia-chart-svg" viewBox="0 0 700 210" preserveAspectRatio="none">
                <polyline
                  points="10,108 120,87 230,120 340,72 450,98 560,50 680,73"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <polyline
                  points="10,102 120,94 230,105 340,82 450,92 560,58 680,62"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="7 5"
                  className="prediction-line"
                />
                <circle cx="10" cy="108" r="4" />
                <circle cx="120" cy="87" r="4" />
                <circle cx="230" cy="120" r="4" />
                <circle cx="340" cy="72" r="4" />
                <circle cx="450" cy="98" r="4" />
                <circle cx="560" cy="50" r="4" />
                <circle cx="680" cy="73" r="4" />
              </svg>

              <div className="ia-chart-x">
                {ANALYSIS_DATA.map((item) => (
                  <span key={item.date}>{item.date}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="ia-chart-legend">
            <span><i className="legend-real"></i>Réel</span>
            <span><i className="legend-prediction"></i>Prédiction</span>
          </div>
        </section>
      </div>

      <div className="ia-bottom-grid">
        <section className="ia-health-card">
          <div className="ia-health-icon">
            <Bot size={28} />
          </div>
          <div className="ia-health-content">
            <h2>L'IA au service de la santé</h2>
            <p>
              Une technologie conçue pour rendre la clinique plus performante,
              plus intelligente et mieux organisée.
            </p>
            <button
              type="button"
              onClick={() => alert("Découvrez les fonctionnalités IA de MA SANTÉ.")}
            >
              Découvrir
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <section className="ia-panel models-panel">
          <div className="ia-panel-header">
            <div>
              <h2>Modèles IA</h2>
              <p>État des modèles disponibles</p>
            </div>
            <Sparkles size={17} className="models-sparkle" />
          </div>

          <div className="ia-models-list">
            {AI_MODELS.map((model) => {
              const Icon = model.icon;
              return (
                <div className="ia-model-row" key={model.id}>
                  <div className="ia-model-name">
                    <Icon size={13} />
                    <span>{model.name}</span>
                  </div>
                  <span className="ia-model-status">{model.status}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="ia-information">
        <div className="ia-information-icon">
          <Info size={17} />
        </div>
        <div>
          <strong>Assistance à la décision</strong>
          <span>
            Les résultats produits par l'IA sont des outils d'aide à la décision
            et ne remplacent pas l'analyse d'un professionnel de santé.
          </span>
        </div>
        <ShieldCheck size={19} className="ia-information-check" />
      </div>

      {activeTool && (() => {
        const ActiveToolIcon = activeTool.icon;

        return (
          <div
            className="ia-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeTool();
            }}
          >
            <div className="ia-modal">
              <div className="ia-modal-header">
                <div className="ia-modal-title">
                  <div className={`ia-modal-icon ${activeTool.color}`}>
                    <ActiveToolIcon size={21} />
                  </div>
                  <div>
                    <h2>{activeTool.title}</h2>
                    <p>{activeTool.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="ia-modal-close"
                  onClick={closeTool}
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ia-modal-body">
                <div className="ia-modal-placeholder">
                  <div className="ia-placeholder-icon">
                    <BrainCircuit size={28} />
                  </div>
                  <h3>Module {activeTool.title}</h3>
                  <p>
                    Cette fonctionnalité est prête pour être connectée au moteur
                    d'intelligence artificielle.
                  </p>
                  <div className="ia-development-info">
                    <FileText size={15} />
                    <span>
                      L'API Django pourra traiter les données et retourner les
                      résultats de l'analyse.
                    </span>
                  </div>
                </div>
              </div>

              <div className="ia-modal-footer">
                <button type="button" className="ia-modal-cancel" onClick={closeTool}>
                  Fermer
                </button>
                <button
                  type="button"
                  className="ia-modal-action"
                  onClick={() => alert("Fonctionnalité IA prête à être connectée.")}
                >
                  <Sparkles size={15} />
                  Démarrer l'analyse
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
