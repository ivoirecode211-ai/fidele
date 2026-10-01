import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock3,
  FolderOpen,
  History,
  Info,
  Search,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Chargement from "../components/Chargement";
import { useModuleView } from "../layouts/AppLayout";
import api from "../services/api";
import "../styles/ia.css";

/*
 * ============================================================
 * INTELLIGENCE ARTIFICIELLE
 * ============================================================
 *
 * Trois sous-modules, tous servis par /api/ia/ pour l'hôpital
 * de l'utilisateur :
 *
 *   Assistant      questions sur le logiciel, et « où se trouve
 *                  ce patient ? » (la recherche et la situation
 *                  sont calculées par le serveur ; ni nom ni
 *                  numéro ne partent chez le fournisseur d'IA)
 *   Interventions  tout ce que l'IA a proposé, patient par patient
 *   Alertes        règles cliniques appliquées aux constantes
 * ============================================================
 */

const erreurApi = (e, defaut) => e?.response?.data?.detail || defaut;

/* Gras (**…**), listes (1. / - ) et paragraphes : ce que l'assistant écrit. */
function Texte({ contenu }) {
  const enLigne = (ligne) => ligne.split(/(\*\*[^*]+\*\*)/g).map((morceau, i) =>
    morceau.startsWith("**") && morceau.endsWith("**")
      ? <strong key={i}>{morceau.slice(2, -2)}</strong>
      : <Fragment key={i}>{morceau}</Fragment>);
  const blocs = [];
  let liste = null;
  contenu.split("\n").forEach((brute) => {
    const ligne = brute.trim();
    const puce = ligne.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (puce) {
      const ordonnee = /^\d/.test(ligne);
      if (!liste || liste.ordonnee !== ordonnee) {
        liste = { ordonnee, items: [] };
        blocs.push(liste);
      }
      liste.items.push(puce[1]);
      return;
    }
    liste = null;
    if (ligne) blocs.push(ligne);
  });
  return (
    <div className="ia-texte">
      {blocs.map((bloc, i) => {
        if (typeof bloc === "string") return <p key={i}>{enLigne(bloc)}</p>;
        const Balise = bloc.ordonnee ? "ol" : "ul";
        return <Balise key={i}>{bloc.items.map((item, j) => <li key={j}>{enLigne(item)}</li>)}</Balise>;
      })}
    </div>
  );
}

/* ============================================================
   ASSISTANT
   ============================================================ */

const EXEMPLES = [
  "Comment un patient passe-t-il de la caisse à la consultation ?",
  "Où se trouve le patient … ?",
  "Comment valider la clôture d'une caisse ?",
  "Comment imprimer le reçu d'une ordonnance délivrée ?",
];

function FichePatient({ fiche }) {
  return (
    <article className="ia-fiche">
      <header>
        <span className="ia-fiche-icone"><UserRound size={16} /></span>
        <div>
          <strong>{fiche.nom}</strong>
          <span>{fiche.numero}{fiche.dernierPassage && ` · dernier passage le ${fiche.dernierPassage}`}</span>
        </div>
        <Link to={fiche.dossier} className="ia-lien"><FolderOpen size={14} />Dossier</Link>
      </header>
      <ul>
        {fiche.etapes.map((etape, i) => (
          <li key={i}>
            <span className="ia-etape-module">{etape.module}</span>
            <span className="ia-etape-etat">{etape.etat}</span>
            <Link to={etape.lien} className="ia-lien" aria-label={`Ouvrir ${etape.module}`}>
              Ouvrir<ArrowRight size={13} />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Assistant({ configure }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const fil = useRef(null);

  useEffect(() => {
    fil.current?.scrollTo({ top: fil.current.scrollHeight, behavior: "smooth" });
  }, [messages, envoi]);

  const envoyer = async (texte) => {
    const q = (texte ?? question).trim();
    if (!q || envoi) return;
    setErreur("");
    setQuestion("");
    const historique = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setEnvoi(true);
    try {
      const { data } = await api.post("/ia/assistant/", { question: q, historique });
      setMessages((m) => [...m, { role: "assistant", content: data.reponse, patients: data.patients }]);
    } catch (e) {
      setErreur(erreurApi(e, "L'assistant n'a pas pu répondre. Réessayez."));
      setMessages((m) => m.slice(0, -1));
      setQuestion(q);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="ia-carte ia-chat">
      <header className="ia-carte-tete">
        <div>
          <h2>Assistant MA SANTÉ</h2>
          <p>Posez une question sur le logiciel, ou demandez où se trouve un patient (nom ou n° de dossier).</p>
        </div>
        <span className={`ia-etat ${configure ? "actif" : "inactif"}`}>
          <span aria-hidden="true" />{configure ? "Connecté" : "Non configuré"}
        </span>
      </header>

      <div className="ia-fil" ref={fil} aria-live="polite">
        {messages.length === 0 && (
          <div className="ia-accueil">
            <span className="ia-accueil-icone"><Bot size={26} /></span>
            <p>Exemples de questions :</p>
            <div className="ia-exemples">
              {EXEMPLES.map((exemple) => (
                <button key={exemple} type="button" onClick={() => exemple.includes("…") ? setQuestion("Où se trouve le patient ") : envoyer(exemple)}>
                  {exemple}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ia-message ${m.role}`}>
            {m.role === "assistant" ? <Texte contenu={m.content} /> : <p>{m.content}</p>}
            {m.patients?.map((fiche) => <FichePatient key={fiche.id} fiche={fiche} />)}
          </div>
        ))}
        {envoi && <div className="ia-message assistant"><Chargement taille="petite" centre={false} texte="L'assistant réfléchit…" /></div>}
      </div>

      {erreur && <p className="ia-erreur" role="alert">{erreur}</p>}

      <form className="ia-saisie" onSubmit={(e) => { e.preventDefault(); envoyer(); }}>
        <textarea
          rows={1}
          value={question}
          placeholder="Votre question…"
          aria-label="Votre question"
          maxLength={1500}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); }
          }}
        />
        <button type="submit" className="ia-envoyer" disabled={envoi || !question.trim()} aria-label="Envoyer">
          <Send size={17} />
        </button>
      </form>
      <p className="ia-note"><ShieldCheck size={13} />Les noms et numéros de dossier restent sur le serveur de l'hôpital.</p>
    </section>
  );
}

/* ============================================================
   INTERVENTIONS PAR PATIENT
   ============================================================ */

function Reponse({ nature, reponse, demande }) {
  if (nature === "conversation") {
    return (
      <>
        <p className="ia-demande"><strong>Question :</strong> {demande}</p>
        <Texte contenu={reponse.texte || ""} />
      </>
    );
  }
  if (nature === "diagnostic") {
    return (
      <dl className="ia-details">
        <dt>Diagnostic</dt><dd>{reponse.diagnostic || "—"}</dd>
        {reponse.hypotheses?.length > 0 && <><dt>Hypothèses</dt><dd>{reponse.hypotheses.join(" · ")}</dd></>}
        {reponse.justification && <><dt>Justification</dt><dd>{reponse.justification}</dd></>}
        {reponse.gravite && <><dt>Signes de gravité</dt><dd>{reponse.gravite}</dd></>}
      </dl>
    );
  }
  if (nature === "examens") {
    return (
      <dl className="ia-details">
        <dt>Examens</dt><dd>{(reponse.examensNoms || []).join(" · ") || "Aucun"}</dd>
        {reponse.justification && <><dt>Justification</dt><dd>{reponse.justification}</dd></>}
      </dl>
    );
  }
  if (nature === "ordonnance") {
    return (
      <>
        <ul className="ia-ordonnance">
          {(reponse.ordonnance || []).map((l, i) => (
            <li key={i}><strong>{l.medicament}</strong> — {[l.posologie, l.duree && `${l.duree} j`, l.voie].filter(Boolean).join(" · ")}</li>
          ))}
        </ul>
        {reponse.retraits?.length > 0 && <p className="ia-retraits">Retiré par le serveur : {reponse.retraits.join(" ")}</p>}
        {reponse.precautions && <p><strong>Précautions :</strong> {reponse.precautions}</p>}
      </>
    );
  }
  return <Texte contenu={reponse.conseils || ""} />;
}

function Interventions() {
  const { search } = useLocation();
  const [q, setQ] = useState("");
  const [liste, setListe] = useState(null);
  const [choisi, setChoisi] = useState(() => Number(new URLSearchParams(search).get("patient")) || null);
  const [detail, setDetail] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const minuteur = setTimeout(() => {
      api.get("/ia/interventions/", { params: q ? { q } : {} })
        .then((r) => setListe(r.data))
        .catch((e) => setErreur(erreurApi(e, "Impossible de charger les interventions.")));
    }, 250);
    return () => clearTimeout(minuteur);
  }, [q]);

  useEffect(() => {
    if (!choisi) return;
    setDetail(null);
    api.get(`/ia/interventions/${choisi}/`)
      .then((r) => setDetail(r.data))
      .catch((e) => setErreur(erreurApi(e, "Impossible de charger ce patient.")));
  }, [choisi]);

  return (
    <div className="ia-interventions">
      <section className="ia-carte ia-patients">
        <header className="ia-carte-tete">
          <div><h2>Patients</h2><p>Ceux sur qui l'IA est intervenue, du plus récent au plus ancien.</p></div>
        </header>
        <label className="ia-recherche">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou n° de dossier" aria-label="Rechercher un patient" />
        </label>
        {erreur && <p className="ia-erreur" role="alert">{erreur}</p>}
        {!liste ? <Chargement taille="moyenne" /> : liste.length === 0 ? (
          <p className="ia-vide">Aucune intervention de l'IA{q && " pour cette recherche"}.</p>
        ) : (
          <ul className="ia-liste-patients">
            {liste.map((p) => (
              <li key={p.id}>
                <button type="button" className={choisi === p.id ? "actif" : ""} onClick={() => setChoisi(p.id)}>
                  <strong>{p.nom}</strong>
                  <span>{p.numero} · {p.interventions} intervention{p.interventions > 1 ? "s" : ""}</span>
                  <small>Dernière : {p.derniere}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ia-carte ia-journal">
        {!choisi ? (
          <div className="ia-vide grand"><History size={26} /><p>Choisissez un patient pour voir chaque intervention de l'IA.</p></div>
        ) : !detail ? <Chargement taille="moyenne" /> : (
          <>
            <header className="ia-carte-tete">
              <div><h2>{detail.patient.nom}</h2><p>{detail.patient.numero}</p></div>
              <Link to={detail.patient.dossier} className="ia-lien"><FolderOpen size={14} />Dossier patient</Link>
            </header>
            <ol className="ia-chronologie">
              {detail.interventions.map((i) => (
                <li key={i.id}>
                  <div className="ia-chrono-tete">
                    <span className={`ia-nature ${i.nature}`}>{i.libelle}</span>
                    <span>{i.le} · {i.par}</span>
                  </div>
                  <Reponse nature={i.nature} reponse={i.reponse} demande={i.demande} />
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   ALERTES CLINIQUES
   ============================================================ */

function LigneAlerte({ s }) {
  return (
    <li className={s.type}>
      <span className="ia-alerte-icone">{s.type === "info" ? <Clock3 size={15} /> : <AlertTriangle size={15} />}</span>
      <div><strong>{s.title}</strong><span>{s.patient}</span></div>
      <small>{s.le}</small>
      <Link to={`/dossiers/${s.patientId}`} className="ia-lien"><FolderOpen size={14} />Dossier</Link>
    </li>
  );
}

const ATTENTES_VISIBLES = 5;

function Alertes({ donnees }) {
  const [toutes, setToutes] = useState(false);
  const max = Math.max(4, ...donnees.analysis.flatMap((d) => [d.reel, d.prediction]));
  const constantes = donnees.suggestions.filter((s) => s.type !== "info");
  const attentes = donnees.suggestions.filter((s) => s.type === "info");
  return (
    <div className="ia-alertes">
      <div className="ia-colonne">
        <section className="ia-carte">
          <header className="ia-carte-tete">
            <div>
              <h2>Constantes hors seuils <span className="ia-compte">{constantes.length}</span></h2>
              <p>Seuils médicaux appliqués aux dernières constantes de chaque patient (7 derniers jours).</p>
            </div>
          </header>
          {constantes.length === 0 ? (
            <p className="ia-vide">Aucune constante récente ne dépasse un seuil.</p>
          ) : (
            <ul className="ia-liste-alertes">{constantes.map((s) => <LigneAlerte key={s.id} s={s} />)}</ul>
          )}
        </section>

        <section className="ia-carte">
          <header className="ia-carte-tete">
            <div>
              <h2>Attente de plus de 2 h <span className="ia-compte">{attentes.length}</span></h2>
              <p>Patients aux constantes prises qui attendent encore le médecin, la plus ancienne attente d'abord.</p>
            </div>
          </header>
          {attentes.length === 0 ? (
            <p className="ia-vide">Aucun patient n'attend depuis plus de 2 heures.</p>
          ) : (
            <>
              <ul className="ia-liste-alertes">
                {(toutes ? attentes : attentes.slice(0, ATTENTES_VISIBLES)).map((s) => <LigneAlerte key={s.id} s={s} />)}
              </ul>
              {attentes.length > ATTENTES_VISIBLES && (
                <button type="button" className="ia-plus" onClick={() => setToutes(!toutes)}>
                  {toutes ? "Réduire la liste" : `Voir les ${attentes.length - ATTENTES_VISIBLES} autres`}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <section className="ia-carte">
        <header className="ia-carte-tete">
          <div>
            <h2>Activité de l'infirmerie</h2>
            <p>Constantes prises par jour, et la tendance (moyenne des trois jours précédents).</p>
          </div>
        </header>
        <div className="ia-barres" role="img" aria-label="Constantes prises par jour">
          {donnees.analysis.map((d) => (
            <div key={d.date} className="ia-barre">
              <span className="ia-barre-valeur">{d.reel}</span>
              <div className="ia-barre-piste">
                <div className="ia-barre-reel" style={{ height: `${(d.reel / max) * 100}%` }} />
                <div className="ia-barre-tendance" style={{ bottom: `${(d.prediction / max) * 100}%` }} title={`Tendance : ${d.prediction}`} />
              </div>
              <span className="ia-barre-date">{d.date}</span>
            </div>
          ))}
        </div>
        <div className="ia-legende">
          <span><i className="reel" />Constantes prises</span>
          <span><i className="tendance" />Tendance</span>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function Ia() {
  const vue = useModuleView("/ia");
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/ia/overview/")
      .then((r) => setDonnees(r.data))
      .catch((e) => setErreur(erreurApi(e, "Impossible de charger le module IA.")));
  }, []);

  return (
    <div className="ia-page">
      {erreur && <p className="ia-erreur" role="alert">{erreur}</p>}
      {!donnees && !erreur && <Chargement taille="grande" pleine />}
      {donnees && vue?.id === "assistant" && <Assistant configure={donnees.assistantConfigure} />}
      {donnees && vue?.id === "interventions" && <Interventions />}
      {donnees && vue?.id === "alertes" && <Alertes donnees={donnees} />}
      <p className="ia-avertissement">
        <Info size={15} />
        Les propositions de l'IA aident à la décision ; elles ne remplacent pas le jugement d'un professionnel de santé.
      </p>
    </div>
  );
}
