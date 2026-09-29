import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CloudOff, LoaderCircle, X } from "lucide-react";

import Chargement from "../components/Chargement";

import DynamicField from "./components/DynamicField";
import { evaluateCondition } from "./lib/conditions";
import { validateStep } from "./lib/validation";

/*
 * ============================================================
 * MOTEUR DE FORMULAIRE MULTI-ÉTAPES — FENÊTRE DE TRAVAIL
 * ============================================================
 *
 * Le frère de StepModal, même fenêtre, mêmes champs, même
 * grille, pour les longs formulaires qu'on reprend (une
 * consultation) :
 *
 *   - navigation libre entre les étapes (config.navigation !==
 *     "lineaire") ;
 *   - sauvegarde progressive : « Enregistrer et continuer »
 *     enregistre l'étape, et la saisie s'enregistre seule après
 *     un court silence (onSaveStep) ;
 *   - rien ne se perd en fermant : croix, Échap ou clic à côté
 *     enregistrent d'abord ; si l'enregistrement échoue, la
 *     fenêtre reste ouverte ;
 *   - les champs obligatoires de TOUT le formulaire ne sont
 *     vérifiés qu'à la fin (onSubmit) ; une erreur ramène à
 *     l'étape et au champ concernés, y compris un refus du
 *     serveur (`erreur.champs = { id: message }`).
 *
 *   enPage                 posé dans la page plutôt qu'en fenêtre
 *   entete                 contenu de l'en-tête (à la place du titre)
 *   outils                 boutons au bout de la barre des étapes
 *   bandeau                une bande sous l'en-tête (les constantes, par exemple)
 *
 * Les champs sont posés dans des cartes : une `section` ouvre une
 * carte titrée, un `disclosure` une carte repliable. Une carte
 * marquée `colonne: "gauche" | "droite"` se range sur deux colonnes
 * quand l'écran le permet.
 *   fieldAddon(field, ctx) outil posé sur un champ (l'IA, par exemple)
 *   step.resume(values)    → { titre, texte } : aperçu en direct
 * ============================================================
 */

const STRUCTURE = ["section", "disclosure"];

/* Une section ouvre une carte titrée, un disclosure une carte repliable ; les champs suivants s'y rangent. */
function grouper(champs) {
  const groupes = [];
  let courant = { tete: null, champs: [] };
  for (const champ of champs) {
    if (STRUCTURE.includes(champ.type)) {
      if (courant.tete || courant.champs.length) groupes.push(courant);
      courant = { tete: champ, champs: [] };
    } else {
      courant.champs.push(champ);
    }
  }
  if (courant.tete || courant.champs.length) groupes.push(courant);
  return groupes;
}

/* Les cartes marquées `colonne: "gauche" | "droite"` se rangent côte à côte ; les autres prennent toute la largeur. */
function disposer(groupes) {
  const blocs = [];
  let paire = null;
  for (const groupe of groupes) {
    const colonne = groupe.tete?.colonne;
    if (colonne === "gauche" || colonne === "droite") {
      if (!paire) { paire = { gauche: [], droite: [] }; blocs.push({ paire }); }
      paire[colonne].push(groupe);
    } else {
      paire = null;
      blocs.push({ seul: groupe });
    }
  }
  return blocs;
}
const SELECTEUR_CHAMP = "input:not([type=radio]):not([type=checkbox]), select, textarea";
const heure = (date) => date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function StepForm({
  config,
  initialValues = {},
  initialStep,
  initialDone = [],
  onSaveStep,
  onSubmit,
  onChange,
  onClose,
  entete,
  outils,
  bandeau,
  enPage = false,
  fieldAddon,
  autosaveDelay = 1500,
}) {
  const [values, setValues] = useState(initialValues);
  const [stepId, setStepId] = useState(initialStep || config.steps[0].id);
  const [done, setDone] = useState(initialDone);
  const [errors, setErrors] = useState({});
  const [etat, setEtat] = useState({ statut: "repos" });
  const [envoi, setEnvoi] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [sens, setSens] = useState("avant");

  const corps = useRef(null);
  const valeursRef = useRef(values);
  const stepRef = useRef(stepId);
  const sale = useRef(false);                 // des modifications attendent d'être envoyées
  const file = useRef(Promise.resolve());     // une sauvegarde à la fois, dans l'ordre
  const premierRendu = useRef(true);
  valeursRef.current = values;
  stepRef.current = stepId;

  const steps = useMemo(
    () => config.steps.filter((s) => evaluateCondition(s.visibleIf, values)),
    [config.steps, values],
  );
  const index = Math.max(steps.findIndex((s) => s.id === stepId), 0);
  const step = steps[index];
  const dernier = index === steps.length - 1;
  const libre = config.navigation !== "lineaire";
  const champVisible = (field) => evaluateCondition(field.visibleIf, values);
  const resume = step.resume?.(values);

  const etapeDuChamp = useCallback(
    (id) => steps.find((s) => s.fields.some((f) => f.id === id))?.id,
    [steps],
  );
  const etapesEnErreur = new Set(Object.keys(errors).map(etapeDuChamp).filter(Boolean));

  useEffect(() => { onChange?.(values); }, [values, onChange]);

  const sauver = useCallback((id, complete) => {
    if (!onSaveStep) return Promise.resolve();
    const instantane = valeursRef.current;
    sale.current = false;
    setEtat({ statut: "enregistrement" });
    const tache = file.current.then(() => onSaveStep(id, instantane, complete));
    file.current = tache.catch(() => {});
    return tache.then(
      () => setEtat(sale.current ? { statut: "modifie" } : { statut: "enregistre", le: new Date() }),
      (erreur) => { sale.current = true; setEtat({ statut: "erreur" }); throw erreur; },
    );
  }, [onSaveStep]);

  /* Enregistrement automatique : après un court silence dans la saisie. */
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return undefined; }
    sale.current = true;
    setEtat((e) => (e.statut === "enregistrement" ? e : { statut: "modifie" }));
    const minuteur = setTimeout(() => sauver(stepRef.current, false).catch(() => {}), autosaveDelay);
    return () => clearTimeout(minuteur);
  }, [values, sauver, autosaveDelay]);

  /* Onglet fermé, page rechargée : le navigateur prévient ; en quittant, on enregistre. */
  useEffect(() => {
    const avertir = (event) => { if (sale.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", avertir);
    return () => {
      window.removeEventListener("beforeunload", avertir);
      if (sale.current && onSaveStep) onSaveStep(stepRef.current, valeursRef.current, false).catch(() => {});
    };
  }, [onSaveStep]);

  /* Fermer, de quelque façon que ce soit : on enregistre d'abord. */
  const fermer = useCallback(async () => {
    if (envoi) return;
    if (sale.current || etat.statut === "enregistrement") {
      try {
        if (sale.current) await sauver(stepRef.current, false);
        else await file.current;
      } catch {
        setErrors({ __form__: "Enregistrement impossible : vérifiez la connexion, puis réessayez." });
        return;
      }
    }
    onClose?.();
  }, [envoi, etat.statut, sauver, onClose]);

  useEffect(() => {
    if (enPage) return undefined;
    const touche = (event) => { if (event.key === "Escape" && !document.querySelector(".ia-panneau.ouvert")) fermer(); };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [fermer, enPage]);

  /* Chaque étape s'ouvre en haut, le curseur dans son premier champ. */
  useEffect(() => {
    if (enPage) {
      const haut = corps.current?.closest(".sf")?.getBoundingClientRect().top ?? 0;
      if (haut < 0) window.scrollBy({ top: haut - 12, behavior: "smooth" });
    } else {
      corps.current?.scrollTo({ top: 0 });
    }
    corps.current?.querySelector(SELECTEUR_CHAMP)?.focus({ preventScroll: true });
  }, [stepId]);

  /* Une erreur : on amène le regard, et le curseur, sur la première. */
  useEffect(() => {
    const champ = corps.current?.querySelector(".field-error");
    if (!champ) return;
    champ.scrollIntoView({ block: "center", behavior: "smooth" });
    champ.querySelector("input, select, textarea, button")?.focus({ preventScroll: true });
  }, [tentative]);

  function modifier(id, valeur) {
    setValues((v) => ({ ...v, [id]: valeur }));
    if (errors[id]) setErrors((e) => { const suite = { ...e }; delete suite[id]; return suite; });
  }

  function aller(id) {
    if (id === stepId) return;
    if (sale.current) sauver(stepId, false).catch(() => {});
    setErrors((e) => { const { __form__, ...reste } = e; return reste; });
    versEtape(id);
  }

  function signaler(fautes) {
    setErrors(fautes);
    const cible = Object.keys(fautes).map(etapeDuChamp).find(Boolean);
    if (cible && cible !== stepId) versEtape(cible);
    setTentative((n) => n + 1);
  }

  async function continuer() {
    const fautes = validateStep(step, values, champVisible);
    if (Object.keys(fautes).length) { signaler(fautes); return; }
    try {
      await sauver(step.id, true);
    } catch {
      setErrors({ __form__: "Enregistrement impossible : vérifiez la connexion, puis réessayez." });
      return;
    }
    setDone((d) => (d.includes(step.id) ? d : [...d, step.id]));
    if (!dernier) versEtape(steps[index + 1].id);
  }

  async function terminer() {
    const fautes = steps.reduce((toutes, s) => ({ ...toutes, ...validateStep(s, values, champVisible) }), {});
    if (Object.keys(fautes).length) { signaler(fautes); return; }
    setEnvoi(true);
    setErrors({});
    try {
      await file.current;
      await onSubmit(values);
      sale.current = false;
      setDone(steps.map((s) => s.id));
      setEtat({ statut: "enregistre", le: new Date() });
    } catch (erreur) {
      if (erreur?.champs) signaler(erreur.champs);
      else setErrors({ __form__: erreur?.message || "Enregistrement impossible. Réessayez." });
    } finally {
      setEnvoi(false);
    }
  }

  function clavier(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (dernier) terminer(); else continuer();
    }
  }

  /* Changer d'étape : le contenu arrive du côté où l'on va. */
  function versEtape(id) {
    setSens(steps.findIndex((s) => s.id === id) < index ? "arriere" : "avant");
    setStepId(id);
  }

  const hint = (h) => (typeof h === "function" ? h(values) : h);

  /* Une carte : sa tête (titre, ou bouton qui la replie), puis ses champs. */
  const carte = (groupe, g) => {
    const pliable = groupe.tete?.type === "disclosure";
    const ouvert = !pliable || Boolean(values[groupe.tete.id]);
    return (
      <section key={groupe.tete?.id || g} className={`sf-groupe ${pliable ? "pliable" : ""} ${ouvert ? "" : "ferme"}`}>
        {groupe.tete && (pliable ? (
          <button type="button" className="sf-groupe-tete" aria-expanded={ouvert}
            onClick={() => modifier(groupe.tete.id, !values[groupe.tete.id])}>
            <h3>{groupe.tete.label}</h3>
            {groupe.tete.hint && hint(groupe.tete.hint) && <small>{hint(groupe.tete.hint)}</small>}
            <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : (
          <header className="sf-groupe-tete">
            <h3>{groupe.tete.label}</h3>
            {groupe.tete.hint && hint(groupe.tete.hint) && <small>{hint(groupe.tete.hint)}</small>}
          </header>
        ))}
        {groupe.champs.length > 0 && (
          <div className="form-grid">
            {groupe.champs.map((field) => (
              <div key={field.id}
                className={`champ champ-${field.type} ${field.large ? "champ-large" : ""} ${field.variant ? `variante-${field.variant}` : ""}`}
                style={{ "--span": field.span || (field.large ? 12 : 6), "--span-m": field.spanMobile || 2 }}>
                <DynamicField field={field} value={values[field.id]} values={values}
                  error={errors[field.id]} onChange={modifier} />
                {fieldAddon?.(field, { values, setValue: modifier })}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className={enPage ? "sf-page" : "pop"} role="presentation"
      onMouseDown={(e) => !enPage && e.target === e.currentTarget && fermer()}>
      <div className={`pop-boite sf ${enPage ? "en-page" : ""}`} role={enPage ? "region" : "dialog"}
        aria-modal={enPage ? undefined : "true"} aria-label={config.title} onKeyDown={clavier}>
        {/* En page, le module porte déjà le patient : pas d'en-tête, une seule barre. */}
        {!enPage && (
          <header className="pop-tete">
            {entete || <div><h2>{config.title}</h2></div>}
            <button type="button" className="pop-fermer" onClick={fermer} disabled={envoi} aria-label="Fermer">
              <X size={18} strokeWidth={2} />
            </button>
          </header>
        )}


        <nav className="pop-etapes sf-etapes" aria-label="Étapes">
          {enPage && (
            <button type="button" className="sf-retour" onClick={fermer} disabled={envoi} aria-label="Retour à la liste">
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
          )}
          <ol>
            {steps.map((s, i) => {
              const fait = done.includes(s.id);
              const courant = s.id === step.id;
              const accessible = libre || fait || i <= index;
              const classe = etapesEnErreur.has(s.id) ? "en-erreur" : courant ? "courant" : fait ? "fait" : "avenir";
              return (
                <li key={s.id} className={classe}>
                  <button type="button" disabled={!accessible} aria-current={courant ? "step" : undefined}
                    onClick={() => aller(s.id)}>
                    <span className="pop-pastille">{fait && !courant ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                    <span className="pop-etape-nom">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {outils}
        </nav>

        {bandeau}

        <div className="pop-corps sf-corps" ref={corps}>
          <div key={step.id} className={`sf-etape-contenu ${sens === "arriere" ? "arriere" : ""}`}>
            {disposer(grouper(step.fields.filter(champVisible))).map((bloc, b) => (bloc.seul
              ? carte(bloc.seul, b)
              : (
                <div key={`colonnes-${b}`} className="sf-colonnes">
                  <div className="sf-pile">{bloc.paire.gauche.map(carte)}</div>
                  <div className="sf-pile">{bloc.paire.droite.map(carte)}</div>
                </div>
              )))}

          {resume?.texte && (
            <div className="sf-resume" aria-live="polite">
              <strong>{resume.titre}</strong>
              <p>{resume.texte}</p>
            </div>
          )}

            {errors.__form__ && <p className="pop-erreur" role="alert">{errors.__form__}</p>}
          </div>
        </div>

        <footer className="pop-pied">
          <button type="button" className="secondary-button" disabled={index === 0 || envoi}
            onClick={() => aller(steps[index - 1].id)}>
            <ChevronLeft size={16} strokeWidth={2} />Précédent
          </button>

          {/* À gauche des boutons, largeur fixe : rien ne bouge quand l'état change. */}
          <Sauvegarde etat={etat} onReessayer={() => sauver(stepId, false).catch(() => {})} />

          <div className="sf-pied-droite">
            {!dernier && (
              <button type="button" className="secondary-button sf-terminer-tot" disabled={envoi} onClick={terminer}>
                {config.submitLabel || "Terminer"}
              </button>
            )}
            <button type="button" className="primary-button" disabled={envoi} onClick={dernier ? terminer : continuer}>
              {envoi && <Chargement taille="petite" centre={false} couleur="currentColor" muet />}
              {envoi ? "Enregistrement…" : dernier ? (config.submitLabel || "Terminer") : <>Continuer<ChevronRight size={16} strokeWidth={2} /></>}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* L'état de l'enregistrement : une icône et une heure, rien de plus. */
function Sauvegarde({ etat, onReessayer }) {
  if (etat.statut === "enregistrement") {
    return <span className="sf-sauvegarde"><LoaderCircle size={14} className="spin" aria-hidden="true" />Enregistrement…</span>;
  }
  if (etat.statut === "enregistre") {
    return <span className="sf-sauvegarde ok"><CircleCheck size={14} aria-hidden="true" />{heure(etat.le)}</span>;
  }
  if (etat.statut === "erreur") {
    return (
      <button type="button" className="sf-sauvegarde ko" onClick={onReessayer}>
        <CloudOff size={14} aria-hidden="true" />Réessayer
      </button>
    );
  }
  return <span className="sf-sauvegarde" />;
}
