import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Baby, Building2, Download, FileBarChart2, FileText, Printer, SlidersHorizontal, Users, Wallet } from "lucide-react";

import "../styles/Caisse.css";
import "../styles/rapports.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { messageErreur } from "../accueil/api";
import { A4, imprimer } from "../accueil/impression";
import {
  BarreRapport, bilanVersDocument, csvDocument, DocumentOfficiel, etatVersDocument, FenetreFiltres, imprimerDocument, moisEnCours, organiserPour,
} from "./commun";

/*
 * ============================================================
 * MODULE RAPPORTS (général)
 * ============================================================
 *
 * Réservé à la direction et à la gestion. Chaque praticien voit
 * ses propres rapports dans son module (RapportsPraticien.jsx).
 *
 *   Activités        les états remis au district (consultations
 *                    par tranche d'âge, pathologies, nutrition,
 *                    TDR, vaccination, laboratoire, références,
 *                    décès, contrôle du major) ; filtres : période,
 *                    service de santé, médecins, organiser par
 *   Par praticien    le bilan d'activité de chaque soignant
 *   Finances         caisses, prestations, assurances, services,
 *                    gratuités, bilan agrégé ; filtre : période
 *   Mensuel          la synthèse de chaque mois
 * ============================================================
 */

const DIRECTION = ["ADMIN", "DIRECTOR"];
const GESTION = ["ADMIN", "DIRECTOR", "ACCOUNTING", "HR", "REGISSEUR"];
const FINANCES = ["ADMIN", "DIRECTOR", "ACCOUNTING", "REGISSEUR"];

export default function ModuleRapports() {
  const { user } = useAuth();
  const roles = [user?.role, ...(user?.roles || [])].filter(Boolean);
  const peut = (liste) => user?.is_superuser || roles.some((r) => liste.includes(r));

  const ecrans = [
    peut(DIRECTION) && { id: "activites", label: "Activités", icone: Activity, titre: "États des activités", sous: "" },
    peut(DIRECTION) && { id: "maternite", label: "Maternité", icone: Baby, titre: "Santé maternelle (CPN, accouchement, CPON)", sous: "" },
    peut(DIRECTION) && { id: "praticiens", label: "Par praticien", icone: Users, titre: "Rapport par praticien", sous: "" },
    peut(FINANCES) && { id: "finances", label: "Finances", icone: Wallet, titre: "États financiers", sous: "" },
    peut(GESTION) && { id: "etablissement", label: "Mensuel", icone: Building2, titre: "Synthèse mensuelle", sous: "" },
  ].filter(Boolean);
  const [choix, setEcran] = useState(null);
  const ecran = ecrans.find((e) => e.id === choix)?.id || ecrans[0]?.id;

  if (!user) return <Chargement taille="grande" pleine />;
  return (
    <Coquille ecrans={ecrans} ecran={ecran} onEcran={setEcran} titre="Rapports">
      {ecran === "activites" && <Etats key="activites" groupe="activites" />}
      {ecran === "maternite" && <Etats key="maternite" groupe="maternite" />}
      {ecran === "praticiens" && <ParPraticien />}
      {ecran === "finances" && <Etats key="finances" groupe="finances" />}
      {ecran === "etablissement" && <Etablissement />}
      {!ecrans.length && <p className="bandeau attention"><span>Aucun rapport n'est ouvert à votre rôle.</span></p>}
    </Coquille>
  );
}

/* La barre commune : titre, Filtres, CSV, Imprimer. */
function Tete({ titre, sous, onFiltres, document }) {
  return (
    <header className="rp-page-tete no-print">
      <span className="rp-page-icone"><FileBarChart2 size={26} strokeWidth={1.8} /></span>
      <div><h2>{titre}</h2>{sous && <p>{sous}</p>}</div>
      <div className="rp-page-actions">
        <button type="button" className="secondary-button grand" onClick={onFiltres}>
          <SlidersHorizontal size={18} strokeWidth={2} />Filtres
        </button>
        <button type="button" className="secondary-button grand" disabled={!document} onClick={() => csvDocument(document)}>
          <Download size={18} strokeWidth={2} />CSV
        </button>
        <button type="button" className="primary-button grand" disabled={!document} onClick={imprimerDocument}>
          <Printer size={18} strokeWidth={2} />Imprimer
        </button>
      </div>
    </header>
  );
}

/* ============================================================
   ÉTATS (activités, finances)
   ============================================================ */

function Etats({ groupe }) {
  const initiaux = { ...moisEnCours(), organiser: "", service: "", medecins: [] };
  const [catalogue, setCatalogue] = useState(null);
  const [etat, setEtat] = useState("");
  const [filtres, setFiltres] = useState(initiaux);
  const [ouvert, setOuvert] = useState(false);
  const [doc, setDoc] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/reports/etats/").then(({ data }) => setCatalogue(data)).catch((e) => setErreur(messageErreur(e)));
  }, []);

  const liste = (catalogue?.etats || []).filter((e) => e.groupe === groupe);
  const courant = etat || liste[0]?.id;
  const typeOrganiser = liste.find((e) => e.id === courant)?.organiser;
  const activites = groupe !== "finances";

  useEffect(() => {
    if (!courant) return;
    setDoc("chargement"); setErreur("");
    api.get(`/reports/etats/${courant}/`, { params: {
      du: filtres.du, au: filtres.au, organiser: organiserPour(typeOrganiser, filtres.organiser),
      service: groupe === "activites" ? filtres.service || "" : "", medecins: (filtres.medecins || []).join(","),
    } })
      .then(({ data }) => setDoc(etatVersDocument(data)))
      .catch((e) => { setDoc(null); setErreur(messageErreur(e)); });
  }, [courant, filtres, typeOrganiser, groupe]);

  if (!catalogue) return erreur ? <p className="bandeau erreur" role="alert">{erreur}</p> : <Chargement taille="moyenne" />;

  return (
    <div className="rp-page">
      <BarreRapport types={liste} type={courant} onType={setEtat} onFiltres={() => setOuvert(true)}
        document={doc && doc !== "chargement" ? doc : null} />

      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
      {doc === "chargement" ? <Chargement taille="moyenne" /> : doc && <DocumentOfficiel doc={doc} />}

      {ouvert && (
        <FenetreFiltres valeurs={filtres}
          organiser={typeOrganiser}
          services={groupe === "activites" ? catalogue.services : null}
          medecins={activites ? catalogue.medecins : null}
          onFermer={() => setOuvert(false)}
          onAppliquer={(v) => { setFiltres(v); setOuvert(false); }}
          onAnnuler={() => { setFiltres(initiaux); setOuvert(false); }} />
      )}
    </div>
  );
}

/* ============================================================
   PAR PRATICIEN : le bilan d'activité de chaque soignant
   ============================================================ */

function ParPraticien() {
  const initiaux = moisEnCours();
  const [praticiens, setPraticiens] = useState(null);
  const [praticien, setPraticien] = useState("");
  const [entete, setEntete] = useState(null);
  const [filtres, setFiltres] = useState(initiaux);
  const [ouvert, setOuvert] = useState(false);
  const [doc, setDoc] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/reports/praticiens/").then(({ data }) => setPraticiens(data)).catch(() => setPraticiens([]));
    api.get("/reports/etats/filtres-praticien/").then(({ data }) => setEntete(data.entete)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!praticien) { setDoc(null); return; }
    setDoc("chargement"); setErreur("");
    api.get("/reports/praticien/", { params: { du: filtres.du, au: filtres.au, praticien } })
      .then(({ data }) => setDoc(bilanVersDocument(data, entete)))
      .catch((e) => { setDoc(null); setErreur(messageErreur(e)); });
  }, [praticien, filtres, entete]);

  return (
    <div className="rp-page">
      <Tete titre="Rapport d'activité d'un praticien" sous="Consultations, constantes, analyses ou ordonnances servies"
        onFiltres={() => setOuvert(true)} document={doc && doc !== "chargement" ? doc : null} />
      <label className="field rp-choix-praticien no-print"><span>Praticien</span>
        <select value={praticien} onChange={(e) => setPraticien(e.target.value)}>
          <option value="">{praticiens ? "Choisir un praticien…" : "Chargement…"}</option>
          {(praticiens || []).map((p) => (
            <option key={p.id} value={p.id}>{p.nom} · {p.specialites.length ? p.specialites.join(", ") : p.role}</option>
          ))}
        </select>
      </label>
      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
      {doc === "chargement" ? <Chargement taille="moyenne" /> : doc ? <DocumentOfficiel doc={doc} />
        : <p className="vide">Choisissez un praticien pour afficher son rapport.</p>}
      {ouvert && (
        <FenetreFiltres valeurs={filtres} organiser={null}
          onFermer={() => setOuvert(false)}
          onAppliquer={(v) => { setFiltres(v); setOuvert(false); }}
          onAnnuler={() => { setFiltres(initiaux); setOuvert(false); }} />
      )}
    </div>
  );
}

/* ============================================================
   SYNTHÈSE MENSUELLE
   ============================================================ */

function Etablissement() {
  const [donnees, setDonnees] = useState(null);
  const [periode, setPeriode] = useState("");
  const [type, setType] = useState("");
  const [ouvert, setOuvert] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/reports/overview/").then(({ data }) => { setDonnees(data); setPeriode(data.periods[0] || ""); })
      .catch((e) => setErreur(messageErreur(e)));
  }, []);

  function ouvrir(rapport) {
    setOuvert("chargement");
    api.get(`/reports/${encodeURIComponent(rapport.id)}/`).then(({ data }) => setOuvert(data))
      .catch((e) => { setOuvert(null); setErreur(messageErreur(e)); });
  }

  if (erreur) return <p className="bandeau erreur" role="alert">{erreur}</p>;
  if (!donnees) return <Chargement taille="moyenne" />;
  if (ouvert === "chargement") return <Chargement taille="moyenne" />;
  if (ouvert) {
    return (
      <>
        <button type="button" className="secondary-button rp-retour no-print" onClick={() => setOuvert(null)}>
          <ArrowLeft size={16} strokeWidth={2} />Tous les rapports
        </button>
        <Document titre={ouvert.title} sous={ouvert.service} periode={ouvert.period} genere={ouvert.generatedAt}
          figures={ouvert.figures} sections={ouvert.sections} fichier={ouvert.id} />
      </>
    );
  }

  const types = [...new Set(donnees.reports.map((r) => r.type))];
  const visibles = donnees.reports.filter((r) => (!periode || r.period === periode) && (!type || r.type === type));

  return (
    <section className="bloc">
      <div className="rp-filtres rp-filtres-ligne">
        <label className="field"><span>Mois</span>
          <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
            {donnees.periods.map((p) => <option key={p}>{p}</option>)}
            <option value="">Tous les mois</option>
          </select>
        </label>
        <div className="rp-periodes" role="radiogroup" aria-label="Type de rapport">
          <button type="button" role="radio" aria-checked={!type} className={!type ? "actif" : ""} onClick={() => setType("")}>Tous</button>
          {types.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={type === t} className={type === t ? "actif" : ""}
              onClick={() => setType(t)}>{t}</button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? <p className="vide">Aucun rapport pour ces critères.</p> : (
        <ul className="rp-liste">
          {visibles.map((r) => (
            <li key={r.id}>
              <button type="button" className="rp-carte" onClick={() => ouvrir(r)}>
                <span className="rp-carte-icone"><FileText size={20} strokeWidth={2} /></span>
                <span className="rp-carte-texte">
                  <strong>{r.title}</strong>
                  <small>{r.period} · {r.service}</small>
                </span>
                <span className="rp-carte-chiffres">
                  {r.figures.slice(0, 3).map((f) => <span key={f.label}><b>{f.value}</b>{f.label}</span>)}
                </span>
                <span className={`etat ${r.status === "Disponible" ? "regle" : "bleu"}`}>{r.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================
   UN RAPPORT : chiffres clés, puis le détail
   ============================================================ */

function csv(sections, figures) {
  const cellule = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lignes = [["Indicateur", "Valeur"], ...figures.map((f) => [f.label, f.value]), []];
  sections.forEach((s) => { lignes.push([s.title], s.columns, ...s.rows, []); });
  return "﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\n");
}

function Document({ titre, sous, periode, genere, hopital, figures, sections, fichier }) {
  function exporter() {
    const url = URL.createObjectURL(new Blob([csv(sections, figures)], { type: "text/csv;charset=utf-8" }));
    const lien = document.createElement("a");
    lien.href = url; lien.download = `${fichier}.csv`; lien.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="rp-document">
      <header className="rp-entete">
        <div>
          <h2>{titre}</h2>
          <p>{[sous, periode].filter(Boolean).join(" · ")}</p>
          <small>{hopital ? `${hopital} · ` : ""}Édité le {genere}</small>
        </div>
        <div className="rp-actions no-print">
          <button type="button" className="secondary-button" onClick={exporter}><Download size={16} strokeWidth={2} />CSV</button>
          <button type="button" className="primary-button" onClick={() => imprimer(A4)}><Printer size={16} strokeWidth={2} />Imprimer</button>
        </div>
      </header>

      {figures.length > 0 && (
        <dl className="rp-chiffres">
          {figures.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
      )}

      {sections.map((s) => (
        <section key={s.title} className="rp-section">
          <h3>{s.title} <span>{s.rows.length}</span></h3>
          {s.rows.length === 0 ? <p className="vide">Rien sur cette période.</p> : (
            <div className="tableau">
              <table>
                <thead><tr>{s.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{s.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
