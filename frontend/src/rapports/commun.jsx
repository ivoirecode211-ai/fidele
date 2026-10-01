import { useState } from "react";
import { Download, Printer, Search, SlidersHorizontal, X } from "lucide-react";

import { A4, imprimer } from "../accueil/impression";

/*
 * ============================================================
 * BRIQUES COMMUNES DES RAPPORTS (module du praticien, module général)
 * ============================================================
 *
 *   FenetreFiltres     « Filtres sur les données », comme le DPI :
 *                      période (date de début, date de fin),
 *                      organiser par, et — dans le module général
 *                      seulement — service de santé et médecins
 *   DocumentOfficiel   en-tête Ministère / établissement /
 *                      République, titre, tableaux quadrillés
 *   imprimerDocument   le document seul, en A4
 * ============================================================
 */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* Par défaut : du premier du mois à aujourd'hui. */
export function moisEnCours() {
  const aujourdhui = new Date();
  return { du: iso(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1)), au: iso(aujourdhui) };
}

const dateFr = (valeur) => valeur.split("-").reverse().join("/");

/* « Organiser par » : les choix selon le type de rapport (catalogue du serveur). */
export const ORGANISER = {
  age_genre: [["age", "Tranche d'âge uniquement"], ["genre", "Tranche d'âge et genre"]],
  total_age: [["total", "Par total uniquement"], ["age", "Par tranche d'âge"]],
};

/* La valeur à envoyer, toujours parmi les choix permis par le rapport. */
export function organiserPour(type, choisi) {
  const choix = ORGANISER[type];
  if (!choix) return type === "age" ? "age" : "";
  return choix.some(([v]) => v === choisi) ? choisi : choix[0][0];
}

/* ---------------------------------------------------------------- filtres */

export function FenetreFiltres({ valeurs, organiser, services, medecins, professionnels, onFermer, onAppliquer, onAnnuler }) {
  // `organiser` : "age_genre", "total_age" ou rien (pas de choix pour ce rapport).
  const choixOrganiser = ORGANISER[organiser];
  const [v, setV] = useState(valeurs);
  const [cherche, setCherche] = useState("");
  const choisis = v.medecins || [];
  const basculer = (id) => setV({ ...v, medecins: choisis.includes(id) ? choisis.filter((x) => x !== id) : [...choisis, id] });
  const visibles = (medecins || []).filter((m) => `${m.nom} ${m.specialites.join(" ")}`.toLowerCase().includes(cherche.toLowerCase()));

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onFermer()}>
      <div className="pop-boite rp-filtres-boite" role="dialog" aria-modal="true" aria-label="Filtres sur les données">
        <header className="pop-tete">
          <div><h2>Filtres sur les données</h2></div>
          <button type="button" className="pop-fermer" aria-label="Fermer" onClick={onFermer}><X size={20} strokeWidth={2} /></button>
        </header>

        <div className="pop-corps rp-filtres-corps">
          <section>
            <h3>Spécifier une période</h3>
            <div className="rp-deux">
              <label className="field"><span>Date de début</span>
                <input type="date" value={v.du} max={v.au} onChange={(e) => setV({ ...v, du: e.target.value })} /></label>
              <label className="field"><span>Date de fin</span>
                <input type="date" value={v.au} min={v.du} onChange={(e) => setV({ ...v, au: e.target.value })} /></label>
            </div>
          </section>

          {services && (
            <section>
              <h3>Sélectionner un service de santé</h3>
              <select value={v.service || ""} onChange={(e) => setV({ ...v, service: e.target.value })}>
                <option value="">Tous les services</option>
                {services.map((s) => <option key={s.code} value={s.code}>{s.nom}</option>)}
              </select>
            </section>
          )}

          {choixOrganiser && (
            <section>
              <h3>Organiser par</h3>
              <select value={organiserPour(organiser, v.organiser)} onChange={(e) => setV({ ...v, organiser: e.target.value })}>
                {choixOrganiser.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </section>
          )}

          {professionnels && (
            <section>
              <h3>Professionnel de santé</h3>
              <select value={v.professionnel || ""} onChange={(e) => setV({ ...v, professionnel: e.target.value })}>
                <option value="">Tous les professionnels du service</option>
                {professionnels.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </section>
          )}

          {medecins && (
            <section>
              <h3>Sélectionner un médecin</h3>
              <div className="rp-choix-medecins">
                <label className="rp-choix-recherche">
                  <Search size={17} strokeWidth={2} aria-hidden="true" />
                  <input value={cherche} placeholder="Rechercher un médecin…" onChange={(e) => setCherche(e.target.value)} />
                </label>
                <ul>
                  {visibles.map((m) => (
                    <li key={m.id}>
                      <label>
                        <input type="checkbox" checked={choisis.includes(m.id)} onChange={() => basculer(m.id)} />
                        <span>{m.nom}<small>{m.specialites.join(", ")}</small></span>
                      </label>
                    </li>
                  ))}
                  {visibles.length === 0 && <li className="vide">Aucun médecin.</li>}
                </ul>
                <p className="rp-choix-resume">{choisis.length === 0 ? "Tous les médecins" : `${choisis.length} médecin${choisis.length > 1 ? "s" : ""} sélectionné${choisis.length > 1 ? "s" : ""}`}</p>
              </div>
            </section>
          )}
        </div>

        <footer className="pop-pied">
          <button type="button" className="secondary-button" onClick={onAnnuler}><X size={16} strokeWidth={2} />Annuler les filtres</button>
          <button type="button" className="primary-button" onClick={() => onAppliquer(v)}>Afficher le résultat</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- documents */

/* Un état du serveur (reports/etats.py) → document officiel. */
export function etatVersDocument(etat) {
  const precisions = [];
  if (etat.service) precisions.push(["Service", etat.service]);
  if (etat.medecins?.length) precisions.push(["Médecin(s)", etat.medecins.join(", ")]);
  const titre = etat.tableaux.length === 1 ? etat.tableaux[0].titre : etat.titre;
  return {
    entete: etat.entete,
    titre: `${titre} du ${dateFr(etat.du)} au ${dateFr(etat.au)}`,
    precisions,
    tableaux: etat.tableaux,
    edite: etat.generatedAt,
    fichier: `${etat.id}-${etat.du}-${etat.au}`,
  };
}

/* Le bilan d'un praticien (reports/praticien.py) → document officiel. */
export function bilanVersDocument(b, entete) {
  const tableaux = [];
  if (b.figures.length) {
    tableaux.push({ titre: "Synthèse", entete: "Indicateur", colonnes: [{ label: "Nombre" }],
      lignes: b.figures.map((f) => ({ libelle: f.label, valeurs: [f.value], type: "normal" })) });
  }
  b.sections.forEach((s) => tableaux.push({
    titre: s.title, entete: s.columns[0], colonnes: s.columns.slice(1).map((label) => ({ label })),
    lignes: s.rows.map((r) => ({ libelle: r[0], valeurs: r.slice(1), type: "normal" })),
  }));
  return {
    entete: entete || { ministere: "", republique: "", devise: "", etablissement: b.hopital, contacts: [] },
    titre: `Rapport d'activité du ${dateFr(b.du)} au ${dateFr(b.au)}`,
    precisions: [["Professionnel de santé", b.praticien.nom], b.praticien.poste && ["Fonction", b.praticien.poste]].filter(Boolean),
    tableaux,
    edite: b.generatedAt,
    fichier: `rapport-${b.praticien.nom}-${b.du}-${b.au}`,
  };
}

export function csvDocument(doc) {
  const cellule = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lignes = [[doc.titre], ...doc.precisions.map(([c, v]) => [c, v])];
  doc.tableaux.forEach((t) => {
    const entetes = [t.entete];
    t.colonnes.forEach((c) => (c.sous ? c.sous.forEach((x) => entetes.push(`${c.label} ${x}`)) : entetes.push(c.label)));
    lignes.push([], [t.titre], entetes, ...t.lignes.map((l) => [l.libelle, ...(l.type === "groupe" ? [] : l.valeurs)]));
  });
  const url = URL.createObjectURL(new Blob(["﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\n")], { type: "text/csv;charset=utf-8" }));
  const lien = document.createElement("a");
  lien.href = url; lien.download = `${doc.fichier}.csv`; lien.click();
  URL.revokeObjectURL(url);
}

/* Chaque module a sa mise en page : on imprime une copie du document seul,
   l'application étant retirée du flux le temps de l'impression. */
export function imprimerDocument() {
  const source = document.querySelector(".rp-doc-officiel");
  if (!source) return;
  const copie = document.createElement("div");
  copie.id = "rp-impression";
  copie.innerHTML = source.outerHTML;
  document.body.appendChild(copie);
  document.body.classList.add("rp-impression-active");
  const nettoyer = () => {
    copie.remove();
    document.body.classList.remove("rp-impression-active");
    window.removeEventListener("afterprint", nettoyer);
  };
  window.addEventListener("afterprint", nettoyer);
  imprimer(A4);
}

export function DocumentOfficiel({ doc }) {
  const e = doc.entete;
  return (
    <article className="rp-document rp-officiel rp-doc-officiel">
      <header className="rp-officiel-entete">
        <div><strong>{e.ministere}</strong><span>★★★★★</span></div>
        <div className="rp-officiel-centre"><strong>{e.etablissement}</strong>{e.contacts.map((c) => <span key={c}>{c}</span>)}</div>
        <div><strong>{e.republique}</strong><span>{e.devise}</span><span>★★★★★</span></div>
      </header>

      <div className="rp-officiel-intro">
        <h2 className="rp-officiel-titre">{doc.titre}</h2>
        {doc.precisions.map(([cle, val]) => <p key={cle}><b>{cle} :</b> <span>{val}</span></p>)}
      </div>

      {doc.tableaux.map((t) => (
        <section key={t.titre} className="rp-section">
          <h3 className="rp-officiel-sous">{t.titre}</h3>
          {t.lignes.length === 0 ? <p className="vide">Rien sur cette période.</p> : (
            <div className="tableau rp-grille rp-grille-officielle">
              <table>
                <thead>
                  <tr>
                    <th rowSpan={t.colonnes.some((c) => c.sous) ? 2 : 1}>{t.entete}</th>
                    {t.colonnes.map((c) => (
                      <th key={c.label} colSpan={c.sous ? c.sous.length : 1} rowSpan={!c.sous && t.colonnes.some((x) => x.sous) ? 2 : 1}>{c.label}</th>
                    ))}
                  </tr>
                  {t.colonnes.some((c) => c.sous) && (
                    <tr>{t.colonnes.flatMap((c) => (c.sous || []).map((x) => <th key={`${c.label}-${x}`} className="rp-sous">{x}</th>))}</tr>
                  )}
                </thead>
                <tbody>
                  {t.lignes.map((l, i) => (
                    <tr key={i} className={`rp-ligne-${l.type}`}>
                      {l.type === "groupe"
                        ? <td colSpan={1 + l.valeurs.length}>{l.libelle}</td>
                        : <><td>{l.libelle}</td>{l.valeurs.map((val, j) => (
                          <td key={j} className={j === l.valeurs.length - 1 ? "rp-nombre rp-total-col" : "rp-nombre"}>{val}</td>
                        ))}</>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      <p className="rp-officiel-pied">Édité le {doc.edite} · MA SANTÉ</p>
    </article>
  );
}


/* La barre du DPI : « Sélectionner un type de rapport » (liste déroulante), puis Filtres, CSV, Imprimer. */
export function BarreRapport({ types, type, onType, onFiltres, document, csv = true }) {
  const services = [...new Set(types.map((t) => t.service || ""))];
  return (
    <div className="rp-barre no-print">
      <label className="field rp-type">
        <span>Sélectionner un type de rapport</span>
        <select value={type || ""} onChange={(e) => onType(e.target.value)}>
          {services.length > 1
            ? services.map((srv) => (
              <optgroup key={srv || "-"} label={srv || "Rapports"}>
                {types.filter((t) => (t.service || "") === srv).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
            ))
            : types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      <div className="rp-page-actions">
        <button type="button" className="secondary-button grand" onClick={onFiltres}>
          <SlidersHorizontal size={18} strokeWidth={2} />Filtres
        </button>
        {csv && (
          <button type="button" className="secondary-button grand" disabled={!document} onClick={() => csvDocument(document)}>
            <Download size={18} strokeWidth={2} />CSV
          </button>
        )}
        <button type="button" className="primary-button grand" disabled={!document} onClick={imprimerDocument}>
          <Printer size={18} strokeWidth={2} />Imprimer
        </button>
      </div>
    </div>
  );
}
