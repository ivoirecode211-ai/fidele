import { Check } from "lucide-react";

/*
 * Indicateur de progression — trois états visuels distincts
 * (terminée / actuelle / à venir), plus une version compacte
 * "Étape X sur Y" avec barre pour mobile (voir form-engine.css).
 */
export default function StepProgress({ steps, currentStepId, completedSteps, onStepClick, navigationMode }) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);
  const total = steps.length;

  return (
    <nav className="step-progress" aria-label="Progression du formulaire">
      <ol className="step-progress-list">
        {steps.map((step, index) => {
          const done = completedSteps.includes(step.id);
          const current = step.id === currentStepId;
          const reachable = navigationMode === "free" && (done || current);

          const state = done ? "done" : current ? "current" : "upcoming";

          return (
            <li key={step.id} className={`step-progress-item ${state}`}>
              <button
                type="button"
                className="step-progress-dot"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(step.id)}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check size={14} strokeWidth={3} /> : index + 1}
              </button>
              <span className="step-progress-label">{step.title}</span>
            </li>
          );
        })}
      </ol>

      <div className="step-progress-compact">
        <span>
          Étape {currentIndex + 1} sur {total}
        </span>
        <div className="step-progress-bar">
          <div
            className="step-progress-bar-fill"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
