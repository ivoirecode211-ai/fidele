import { useEffect, useMemo, useState } from "react";
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
import api from "../services/api";
import "../styles/ia.css";

// Données de démonstration — seront reliées aux API Django/PostgreSQL.

const AI_TOOLS = [
  { id: "diagnostic", title: "Aide au diagnostic", description: "Analyse des symptômes", icon: Stethoscope, color: "blue" },
  { id: "risks", title: "Prédiction des risques", description: "Analyse des données", icon: TrendingUp, color: "green" },
  { id: "assistant", title: "Assistant médical", description: "Réponses & conseils", icon: MessageCircle, color: "cyan" },
  { id: "images", title: "Analyse d'images", description: "Radiologie & imagerie", icon: ImageIcon, color: "purple" },
];

// Suggestions, courbe et modèles servis par /api/ia/ (règles cliniques
// appliquées aux constantes réelles).
const MODEL_ICONS = { Stethoscope, TrendingUp, ImageIcon, MessageCircle };

// Points de la courbe dans le repère du SVG (700 × 210).
function chartPoints(values, max) {
  const step = values.length > 1 ? 670 / (values.length - 1) : 0;
  return values.map((value, index) => [10 + index * step, 210 - (value / max) * 205]);
}

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
  const [data, setData] = useState({ suggestions: [], analysis: [], models: [] });

  useEffect(() => {
    api
      .get("/ia/overview/")
      .then((response) => setData(response.data))
      .catch((error) => console.error("Erreur de chargement de l'IA :", error));
  }, []);

  const analysedAt = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const AI_SUGGESTIONS = data.suggestions;
  const ANALYSIS_DATA = data.analysis;
  const AI_MODELS = data.models.map((model) => ({ ...model, icon: MODEL_ICONS[model.icon] || Stethoscope }));

  // Échelle : un multiple de 4 au-dessus de la plus haute valeur.
  const chartMax = Math.max(4, Math.ceil(Math.max(0, ...ANALYSIS_DATA.flatMap((d) => [d.reel, d.prediction])) / 4) * 4);
  const realPoints = chartPoints(ANALYSIS_DATA.map((d) => d.reel), chartMax);
  const predictionPoints = chartPoints(ANALYSIS_DATA.map((d) => d.prediction), chartMax);

  const filteredSuggestions = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return AI_SUGGESTIONS;

    return AI_SUGGESTIONS.filter(
      (item) =>
        item.title.toLowerCase().includes(value) ||
        item.patient.toLowerCase().includes(value)
    );
  }, [search, AI_SUGGESTIONS]);

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
          <strong>aujourd'hui à {analysedAt}</strong>
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
              onClick={() => setSearch("")}
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
              {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                <span key={ratio}>{chartMax * ratio}</span>
              ))}
            </div>

            <div className="ia-chart-body">
              <div className="ia-chart-grid-line line-40"></div>
              <div className="ia-chart-grid-line line-30"></div>
              <div className="ia-chart-grid-line line-20"></div>
              <div className="ia-chart-grid-line line-10"></div>
              <div className="ia-chart-grid-line line-0"></div>

              <svg className="ia-chart-svg" viewBox="0 0 700 210" preserveAspectRatio="none">
                <polyline
                  points={realPoints.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <polyline
                  points={predictionPoints.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="7 5"
                  className="prediction-line"
                />
                {realPoints.map(([x, y], index) => (
                  <circle key={index} cx={x} cy={y} r="4" />
                ))}
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
                  onClick={() => alert("Cet outil n'est pas encore disponible : les alertes de la page sont calculées à partir des constantes réelles.")}
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
