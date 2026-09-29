import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessagesSquare, Search, SendHorizontal, Sparkles, X } from "lucide-react";

import Chargement from "../components/Chargement";
import medecine, { erreurLisible, heure, jour } from "./api";

/*
 * ============================================================
 * ASSISTANT IA
 * ============================================================
 *
 * Deux vues dans le même panneau :
 *
 *   historique     les patients avec qui on a échangé, cherchables
 *                  par nom ou par n° de dossier
 *   conversation   un seul patient : l'assistant ne connaît que
 *                  son dossier, et chaque échange est enregistré
 *                  sur sa consultation
 *
 * Ouvert depuis une consultation, le panneau va droit à la
 * conversation du patient en cours ; depuis la barre latérale,
 * à l'historique.
 * ============================================================
 */

const SUGGESTIONS = [
  "Pourquoi ce diagnostic ?",
  "Quels signes de gravité rechercher ?",
  "Vérifie l'ordonnance pour ce patient.",
  "Quels examens pour confirmer ?",
];

/* Réponse en texte simple : paragraphes, listes à tirets, gras nettoyé. */
function Texte({ contenu }) {
  const blocs = [];
  let liste = null;
  for (const brute of contenu.replace(/\*\*/g, "").split("\n")) {
    const ligne = brute.trim();
    if (/^[-_*]{3,}$/.test(ligne)) { liste = null; continue; }
    const puce = ligne.match(/^([-•*]|\d+[.)])\s+(.*)$/);
    if (puce) {
      if (!liste) { liste = []; blocs.push(liste); }
      liste.push(puce[2]);
    } else {
      liste = null;
      if (ligne) blocs.push(ligne.replace(/^#+\s*/, ""));
    }
  }
  return blocs.map((b, i) => (Array.isArray(b)
    ? <ul key={i}>{b.map((l, j) => <li key={j}>{l}</li>)}</ul>
    : <p key={i}>{b}</p>));
}

export default function Assistant({ ouvert, onFermer, patientCourant, valeurs, question, onQuestionLue }) {
  const [vue, setVue] = useState(null);            // admissionId affiché, ou null pour l'historique
  const [liste, setListe] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [fil, setFil] = useState(null);            // { patient, numero, ageTexte, diagnostic, messages }
  const [saisie, setSaisie] = useState("");
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  const zone = useRef(null);
  const champ = useRef(null);

  /* À l'ouverture : la conversation du patient en cours, sinon l'historique. */
  useEffect(() => {
    if (ouvert) setVue(patientCourant || null);
  }, [ouvert, patientCourant]);

  /* L'historique, filtré côté serveur par nom ou n° de dossier. */
  useEffect(() => {
    if (!ouvert || vue) return undefined;
    const minuteur = setTimeout(() => {
      medecine.get("conversations/", { q: recherche }).then(setListe).catch(() => setListe([]));
    }, 250);
    return () => clearTimeout(minuteur);
  }, [ouvert, vue, recherche]);

  useEffect(() => {
    if (!ouvert || !vue) return;
    setFil(null); setErreur("");
    medecine.get(`${vue}/conversation/`).then(setFil).catch((e) => setErreur(erreurLisible(e).message));
  }, [ouvert, vue]);

  useEffect(() => { zone.current?.scrollTo({ top: zone.current.scrollHeight, behavior: "smooth" }); }, [fil, attente]);
  useEffect(() => { if (ouvert && vue && fil) champ.current?.focus({ preventScroll: true }); }, [ouvert, vue, fil]);

  /* « Pourquoi ? » depuis une rubrique : la question part toute seule, sur le patient en cours. */
  useEffect(() => {
    if (ouvert && question && fil && vue === patientCourant) { envoyer(question); onQuestionLue?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, question, fil]);

  useEffect(() => {
    const touche = (e) => { if (e.key === "Escape" && ouvert) onFermer(); };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ouvert, onFermer]);

  async function envoyer(texte) {
    const contenu = texte.trim();
    if (!contenu || attente || !fil) return;
    setFil((f) => ({ ...f, messages: [...f.messages, { role: "user", content: contenu }] }));
    setSaisie("");
    setErreur("");
    setAttente(true);
    try {
      const suite = await medecine.post(`${vue}/conversation/`, {
        question: contenu,
        valeurs: vue === patientCourant ? valeurs || {} : {},
      });
      setFil(suite);
    } catch (e) {
      setFil((f) => ({ ...f, messages: f.messages.slice(0, -1) }));
      setSaisie(contenu);
      setErreur(erreurLisible(e).message);
    } finally {
      setAttente(false);
    }
  }

  return (
    <aside className={`ia-panneau ${ouvert ? "ouvert" : ""}`} aria-label="Assistant IA" aria-hidden={!ouvert} inert={ouvert ? undefined : ""}>
      <header className="ia-panneau-tete">
        {vue ? (
          <button type="button" className="ia-retour" onClick={() => { setVue(null); setFil(null); }} aria-label="Toutes les conversations">
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
        ) : <span className="ia-marque"><Sparkles size={18} strokeWidth={2} aria-hidden="true" /></span>}
        <div>
          <h2>{vue ? (fil?.patient || "…") : "Assistant IA"}</h2>
          <p>{vue ? [fil?.numero, fil?.ageTexte, fil?.diagnostic].filter(Boolean).join(" · ") : "Conversations par patient"}</p>
        </div>
        <button type="button" className="pop-fermer" onClick={onFermer} aria-label="Fermer l'assistant">
          <X size={18} strokeWidth={2} />
        </button>
      </header>

      {!vue ? (
        <div className="ia-historique">
          <label className="ia-recherche">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom ou n° de dossier" aria-label="Rechercher une conversation" />
          </label>
          {patientCourant && (
            <button type="button" className="ia-courant" onClick={() => setVue(patientCourant)}>
              <Sparkles size={16} strokeWidth={2} aria-hidden="true" />Patient en consultation
            </button>
          )}
          {liste === null ? <Chargement taille="moyenne" /> : liste.length === 0 ? (
            <p className="ia-vide">{recherche ? "Aucune conversation trouvée." : "Aucune conversation."}</p>
          ) : (
            <ul className="ia-liste">
              {liste.map((c) => (
                <li key={c.admissionId}>
                  <button type="button" onClick={() => setVue(c.admissionId)}>
                    <span className="ia-liste-haut">
                      <strong>{c.patient}</strong>
                      <time>{jour(c.le)} · {heure(c.le)}</time>
                    </span>
                    <span className="ia-liste-code">{c.numero}{c.diagnostic ? ` · ${c.diagnostic}` : ""}</span>
                    <span className="ia-liste-dernier">{c.dernier}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="ia-fil" ref={zone} aria-live="polite">
            {!fil && !erreur && <Chargement taille="moyenne" />}
            {fil && fil.messages.length === 0 && !attente && (
              <>
                <div className="ia-message lui">
                  <p><MessagesSquare size={15} aria-hidden="true" /> Conversation sur {fil.patient}. Votre question ?</p>
                </div>
                <div className="ia-suggestions">
                  {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => envoyer(s)}>{s}</button>)}
                </div>
              </>
            )}
            {fil?.messages.map((m, i) => (
              <div key={i} className={`ia-message ${m.role === "user" ? "moi" : "lui"}`}>
                {m.role === "user" ? <p>{m.content}</p> : <Texte contenu={m.content} />}
              </div>
            ))}
            {attente && (
              <div className="ia-message lui attente">
                <Chargement taille="petite" centre={false} muet />
              </div>
            )}
            {erreur && <div className="ia-message lui erreur"><p>{erreur}</p></div>}
          </div>

          <form className="ia-saisie" onSubmit={(e) => { e.preventDefault(); envoyer(saisie); }}>
            <textarea ref={champ} rows={2} value={saisie} placeholder="Votre question…" aria-label="Votre question"
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(saisie); } }} />
            <button type="submit" className="primary-button" disabled={!saisie.trim() || attente || !fil} aria-label="Envoyer">
              <SendHorizontal size={17} strokeWidth={2} />
            </button>
          </form>
        </>
      )}
    </aside>
  );
}
