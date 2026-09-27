import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, X } from "lucide-react";

import Chargement from "../components/Chargement";

import DynamicField from "./components/DynamicField";
import { evaluateCondition } from "./lib/conditions";
import { validateStep } from "./lib/validation";

/*
 * ============================================================
 * MOTEUR DE FORMULAIRE MULTI-ÉTAPES — EN POPUP
 * ============================================================
 *
 * Une seule interface, une étape à la fois, enregistrer, puis
 * continuer. La page dessous ne bouge pas : seul le contenu du
 * popup change à chaque étape.
 *
 * Le moteur ne connaît rien du métier. Il lit `config` :
 *
 *   {
 *     title, submitLabel,
 *     steps: [{ id, title, description, fields: [...] }]
 *   }
 *
 * et chaque champ :
 *
 *   { id, type, label, required, placeholder, helpText,
 *     options, visibleIf, validate, requiredMessage }
 *
 * Ajouter un formulaire = écrire une configuration. Aucun
 * fichier de ce dossier n'est à modifier.
 * ============================================================
 */

export default function StepModal({ config, initialValues = {}, onSubmit, onClose, renderSuccess, busy = false }) {
  const [values, setValues] = useState(initialValues);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [resultat, setResultat] = useState(null);
  const corps = useRef(null);

  /* Les étapes masquées par une condition sortent du parcours. */
  const steps = useMemo(
    () => config.steps.filter((step) => evaluateCondition(step.visibleIf, values)),
    [config.steps, values],
  );

  const step = steps[Math.min(index, steps.length - 1)];
  const dernier = index >= steps.length - 1;
  const occupe = saving || busy;

  const champVisible = (field) => evaluateCondition(field.visibleIf, values);

  /* Chaque étape s'ouvre en haut de la zone de contenu. */
  useEffect(() => {
    corps.current?.scrollTo({ top: 0 });
  }, [index]);

  /* Échap ferme le formulaire, comme n'importe quelle fenêtre. */
  useEffect(() => {
    const touche = (event) => { if (event.key === "Escape" && !occupe) onClose(); };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [onClose, occupe]);

  function modifier(id, valeur) {
    setValues((v) => ({ ...v, [id]: valeur }));
    if (errors[id]) {
      setErrors((e) => { const suite = { ...e }; delete suite[id]; return suite; });
    }
  }

  async function continuer() {
    const fautes = validateStep(step, values, champVisible);
    if (Object.keys(fautes).length) {
      setErrors(fautes);
      return;
    }

    if (!dernier) {
      setDone((d) => (d.includes(step.id) ? d : [...d, step.id]));
      setIndex(index + 1);
      return;
    }

    /*
     * Dernière étape : l'enregistrement se fait en arrière-plan et on
     * reste dans le popup. L'utilisateur voit la confirmation à la place
     * du formulaire, sans que la page derrière ait bougé.
     */
    setSaving(true);
    try {
      const retour = await onSubmit(values);
      if (renderSuccess) setResultat(retour ?? {});
      else onClose();
    } catch (erreur) {
      setErrors({ __form__: erreur?.message || "Impossible d'enregistrer. Réessayez." });
    } finally {
      setSaving(false);
    }
  }

  /* Confirmation — même popup, même cadre, seul le contenu a changé. */
  if (resultat) {
    return (
      <div className="pop" role="presentation">
        <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Enregistrement terminé">
          {renderSuccess(resultat, onClose)}
        </div>
      </div>
    );
  }

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !occupe && onClose()}>
      <div className="pop-boite" role="dialog" aria-modal="true" aria-label={config.title}>

        {/* En-tête fixe — il ne bouge pas d'une étape à l'autre. */}
        <header className="pop-tete">
          <div>
            <h2>{config.title}</h2>
            <p>{step.title}</p>
          </div>
          <button type="button" className="pop-fermer" onClick={onClose} disabled={occupe} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {/* Progression — toujours au même endroit. */}
        <nav className="pop-etapes" aria-label="Progression du formulaire">
          <ol>
            {steps.map((s, i) => {
              const etat = done.includes(s.id) ? "fait" : i === index ? "courant" : "avenir";
              return (
                <li key={s.id} className={etat}>
                  <span className="pop-pastille">{done.includes(s.id) ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                  <span className="pop-etape-nom">{s.title}</span>
                </li>
              );
            })}
          </ol>
          <div className="pop-compact">
            <span>Étape {index + 1} sur {steps.length}</span>
            <div className="pop-barre"><div style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
          </div>
        </nav>

        {/* Seule cette zone change d'une étape à l'autre. */}
        <div className="pop-corps" ref={corps}>
          {step.description && <p className="pop-intro">{step.description}</p>}

          <div className="form-grid">
            {step.fields.filter(champVisible).map((field) => (
              <div key={field.id} className={field.large ? "champ-large" : ""}>
                <DynamicField
                  field={field}
                  value={values[field.id]}
                  values={values}
                  error={errors[field.id]}
                  onChange={modifier}
                />
              </div>
            ))}
          </div>

          {errors.__form__ && <p className="pop-erreur" role="alert">{errors.__form__}</p>}
        </div>

        {/* Boutons — toujours au même endroit, eux aussi. */}
        <footer className="pop-pied">
          <button type="button" className="secondary-button" disabled={index === 0 || occupe}
            onClick={() => { setErrors({}); setIndex(index - 1); }}>
            <ChevronLeft size={16} strokeWidth={2} />Précédent
          </button>

          <button type="button" className="primary-button" onClick={continuer} disabled={occupe}>
            {occupe && <Chargement taille="petite" centre={false} couleur="currentColor" muet />}
            {occupe ? "Enregistrement…" : dernier ? (config.submitLabel || "Valider") : "Enregistrer et continuer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
