import { useEffect, useState } from "react";
import { X } from "lucide-react";

import "../styles/form-engine.css";

import FormHeader from "./components/FormHeader";
import StepProgress from "./components/StepProgress";
import DynamicField from "./components/DynamicField";
import FormSummary from "./components/FormSummary";
import PreviousButton from "./components/PreviousButton";
import SaveAndContinueButton from "./components/SaveAndContinueButton";

import { evaluateCondition, flattenAnswers } from "./lib/conditions";
import { validateStep } from "./lib/validation";
import {
  cancelInstance,
  createInstance,
  getInstance,
  saveStep,
  submitInstance,
} from "./lib/api";

const SUMMARY_STEP_ID = "__summary__";

function isStepVisible(step, answers) {
  return evaluateCondition(step.visibleIf, answers);
}

function isFieldVisible(field, answers) {
  return evaluateCondition(field.visibleIf, answers);
}

function visibleSteps(config, answers) {
  return config.steps.filter((step) => isStepVisible(step, answers));
}

/*
 * ============================================================
 * FORM ENGINE
 * ============================================================
 *
 * Orchestrateur générique : lit `config`, gère la navigation
 * entre étapes, la validation, la sauvegarde progressive (une
 * étape = un appel réseau, jamais tout en une fois) et la
 * reprise d'un brouillon existant.
 *
 * Le moteur ne connaît RIEN du métier — tout vient de `config`.
 * ============================================================
 */
export default function FormEngine({
  config,
  patientId,
  resumeInstanceId,
  onCancel,
  onComplete,
}) {
  const [instanceId, setInstanceId] = useState(resumeInstanceId || null);
  const [currentStepId, setCurrentStepId] = useState(config.steps[0].id);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(resumeInstanceId));
  const [loadError, setLoadError] = useState(null);

  /* Reprise d'un brouillon existant. */
  useEffect(() => {
    if (!resumeInstanceId) return;

    getInstance(resumeInstanceId)
      .then((instance) => {
        setValues(instance.data || {});
        setCompletedSteps(instance.completed_steps || []);
        setCurrentStepId(instance.current_step || config.steps[0].id);
      })
      .catch(() => setLoadError("Impossible de charger ce dossier en cours."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeInstanceId]);

  const answers = flattenAnswers(values);
  const steps = visibleSteps(config, answers);
  const isSummary = currentStepId === SUMMARY_STEP_ID;
  const currentStep = steps.find((step) => step.id === currentStepId);

  function updateField(fieldId, value) {
    setValues((prev) => ({
      ...prev,
      [currentStepId]: { ...prev[currentStepId], [fieldId]: value },
    }));

    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  function goToStep(stepId) {
    setErrors({});
    setCurrentStepId(stepId);
  }

  function nextStepId(fromStepId) {
    const index = steps.findIndex((step) => step.id === fromStepId);
    const next = steps[index + 1];
    return next ? next.id : SUMMARY_STEP_ID;
  }

  function previousStepId() {
    if (isSummary) {
      return steps[steps.length - 1]?.id ?? config.steps[0].id;
    }
    const index = steps.findIndex((step) => step.id === currentStepId);
    return index > 0 ? steps[index - 1].id : null;
  }

  async function handleSaveAndContinue() {
    const stepValues = values[currentStepId] || {};
    const stepErrors = validateStep(currentStep, stepValues, (field) =>
      isFieldVisible(field, answers),
    );

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setSaving(true);

    try {
      let id = instanceId;
      if (!id) {
        const created = await createInstance(config.key, patientId);
        id = created.id;
        setInstanceId(id);
      }

      await saveStep(id, currentStepId, stepValues, true);

      setCompletedSteps((prev) =>
        prev.includes(currentStepId) ? prev : [...prev, currentStepId],
      );
      setErrors({});
      setCurrentStepId(nextStepId(currentStepId));
    } catch {
      setErrors({ __step__: "Impossible d'enregistrer. Réessayez." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!instanceId) return;

    setSaving(true);
    try {
      const instance = await submitInstance(instanceId);
      onComplete?.(instance);
    } catch {
      setErrors({ __step__: "Impossible de valider le dossier. Réessayez." });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (instanceId) {
      cancelInstance(instanceId).catch(() => {});
    }
    onCancel?.();
  }

  if (loading) {
    return <p className="form-engine-status">Chargement du formulaire…</p>;
  }

  if (loadError) {
    return <p className="form-engine-status">{loadError}</p>;
  }

  return (
    <div className="form-engine">
      <div className="form-engine-top">
        <FormHeader
          title={config.title}
          stepTitle={isSummary ? config.finalStep.label : currentStep?.title}
        />

        <button
          type="button"
          className="form-engine-cancel"
          onClick={handleCancel}
          aria-label="Annuler et revenir à la liste"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <StepProgress
        steps={[...steps, { id: SUMMARY_STEP_ID, title: config.finalStep.label }]}
        currentStepId={currentStepId}
        completedSteps={completedSteps}
        navigationMode={config.navigationMode}
        onStepClick={goToStep}
      />

      <div className="form-engine-step">
        {isSummary ? (
          <FormSummary steps={steps} values={values} onEditStep={goToStep} />
        ) : (
          <div className="form-grid">
            {currentStep.fields
              .filter((field) => isFieldVisible(field, answers))
              .map((field) => (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={values[currentStepId]?.[field.id]}
                  error={errors[field.id]}
                  onChange={updateField}
                />
              ))}
          </div>
        )}

        {errors.__step__ && (
          <p className="form-engine-error">{errors.__step__}</p>
        )}
      </div>

      <div className="form-actions">
        <PreviousButton
          onClick={() => goToStep(previousStepId())}
          disabled={previousStepId() === null || saving}
        />

        <SaveAndContinueButton
          label={isSummary ? config.finalStep.buttonLabel : "Enregistrer et continuer"}
          saving={saving}
          onClick={isSummary ? handleSubmit : handleSaveAndContinue}
        />
      </div>
    </div>
  );
}
