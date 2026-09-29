import { Activity, ChevronDown, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";

/*
 * L'en-tête de la fenêtre de consultation, en deux bandes :
 *
 *   IdentitePatient     qui est le patient (en-tête de la fenêtre)
 *   ConstantesPatient   ce que l'infirmerie a mesuré, et ce qui doit alerter
 *
 * Rien à ressaisir : tout vient de la caisse et de l'infirmerie.
 */

/* Seuils repris des règles de l'IA (backend/ia/services.py). « alerte » : hors norme franche. */
function niveau(mesure, valeur, c) {
  if (valeur === null || valeur === undefined) return "";
  switch (mesure) {
    case "temperature": return valeur >= 38.5 ? "alerte" : valeur >= 37.8 ? "hors" : "";
    case "spo2": return valeur < 92 ? "alerte" : valeur < 95 ? "hors" : "";
    case "tension": {
      const [sys, dia] = String(valeur).split("/").map(Number);
      return sys >= 180 || dia >= 110 ? "alerte" : sys >= 140 || dia >= 90 || sys < 90 ? "hors" : "";
    }
    case "pouls": return valeur > 120 || valeur < 50 ? "alerte" : valeur > 100 ? "hors" : "";
    case "glycemie": return valeur > 2 || valeur < 0.6 ? "alerte" : valeur > 1.26 ? "hors" : "";
    case "imc": return c.imc >= 30 || c.imc < 17 ? "hors" : "";
    default: return "";
  }
}

const MESURES = [
  ["temperature", "Température", (v) => [v.toLocaleString("fr-FR"), "°C"]],
  ["tension", "Tension", (v) => [v, "mmHg"]],
  ["pouls", "Pouls", (v) => [v, "/min"]],
  ["spo2", "SpO₂", (v) => [v, "%"]],
  ["frequenceRespiratoire", "Fréq. resp.", (v) => [v, "/min"]],
  ["glycemie", "Glycémie", (v) => [v.toLocaleString("fr-FR"), "g/L"]],
  ["poids", "Poids", (v) => [v.toLocaleString("fr-FR"), "kg"]],
  ["taille", "Taille", (v) => [v.toLocaleString("fr-FR"), "cm"]],
  ["imc", "IMC", (v) => [v.toLocaleString("fr-FR"), ""]],
];


/* L'identité, pour l'en-tête du module : « H · 34 ans · P26JS2MAS ». */
export function identite(patient) {
  return [({ F: "F", M: "H" }[patient.sexe] || ""), patient.ageTexte, patient.numero].filter(Boolean).join(" · ");
}

/* Ce qui alerte : l'allergie et les constantes hors norme, en pastilles rouges. */
export function SignauxPatient({ dossier }) {
  const { patient, constantes } = dossier;
  const horsNorme = constantes
    ? MESURES.filter(([cle]) => constantes[cle] !== null && constantes[cle] !== undefined && niveau(cle, constantes[cle], constantes))
    : [];
  if (!patient.allergies && !horsNorme.length) return null;
  return (
    <ul className="mg-signaux-ligne">
      {patient.allergies && (
        <li><ShieldAlert size={14} strokeWidth={2.2} aria-hidden="true" />{patient.allergies}</li>
      )}
      {horsNorme.map(([cle, libelle, format]) => {
        const [valeur, unite] = format(constantes[cle]);
        return <li key={cle}>{libelle} {valeur}{unite && ` ${unite}`}</li>;
      })}
    </ul>
  );
}

/* Les outils, au bout de la barre des étapes. */
export function OutilsPatient({ onAssistant, constantesOuvertes, onConstantes }) {
  return (
    <div className="mg-outils">
      <button type="button" className={`mg-bouton-constantes ${constantesOuvertes ? "ouvert" : ""}`}
        aria-expanded={constantesOuvertes} onClick={onConstantes}>
        <Activity size={16} strokeWidth={2} aria-hidden="true" />
        <span className="mg-bouton-ia-texte">Constantes</span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <button type="button" className="mg-bouton-ia" onClick={onAssistant} aria-label="Assistant IA">
        <Sparkles size={16} strokeWidth={2} aria-hidden="true" /><span className="mg-bouton-ia-texte">Assistant IA</span>
      </button>
    </div>
  );
}

/* Le tableau complet, déplié à la demande. */
export function ConstantesPatient({ dossier }) {
  const { constantes, alertes = [] } = dossier;
  const mesures = constantes
    ? MESURES.filter(([cle]) => constantes[cle] !== null && constantes[cle] !== undefined && constantes[cle] !== "")
    : [];

  return (
    <section className="mg-bande" aria-label="Constantes">
      {mesures.length ? (
        <dl className="mg-constantes">
          {mesures.map(([cle, libelle, format]) => {
            const [valeur, unite] = format(constantes[cle]);
            return (
              <div key={cle} className={niveau(cle, constantes[cle], constantes)}>
                <dt>{libelle}</dt>
                <dd>{valeur}{unite && <small>{unite}</small>}</dd>
              </div>
            );
          })}
        </dl>
      ) : <p className="mg-sans">Constantes non prises</p>}

      {alertes.length > 0 && (
        <ul className="mg-signaux">
          {alertes.map((a) => (
            <li key={a.titre}><TriangleAlert size={14} strokeWidth={2.2} aria-hidden="true" />{a.titre}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
