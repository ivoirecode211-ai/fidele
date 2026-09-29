import { Play, RotateCw, StepForward, Thermometer } from "lucide-react";

import ListeFiltrable from "../accueil/ListeFiltrable";
import Periode from "../accueil/Periode";
import { attente, heure, jour } from "./api";

/*
 * ============================================================
 * LES LISTES DU MODULE
 * ============================================================
 * Une par entrée de la barre latérale. Mêmes tableaux, même
 * recherche, mêmes badges que la Caisse.
 * ============================================================
 */

const sexeAge = (p) => [{ F: "F", M: "H" }[p.sexe], p.age].filter(Boolean).join(" · ");
const recherchePatient = (l) => `${l.patient?.nom || l.patient} ${l.patient?.numero || l.numero || l.dossier || ""}`;

function Temperature({ valeur }) {
  if (valeur === null || valeur === undefined) return <span className="note">—</span>;
  const niveau = valeur >= 38.5 ? "alerte" : valeur >= 37.8 ? "attention" : "normale";
  return (
    <span className={`mg-temp ${niveau}`}>
      <Thermometer size={14} strokeWidth={2} aria-hidden="true" />
      {valeur.toLocaleString("fr-FR")} °C
    </span>
  );
}

function Alertes({ liste }) {
  if (!liste?.length) return null;
  return (
    <span className="mg-pastilles">
      {liste.map((a) => <span key={a.titre} className={`mg-pastille ${a.niveau === "danger" ? "alerte" : "attention"}`}>{a.titre}</span>)}
    </span>
  );
}

function Actualiser({ onActualiser }) {
  return (
    <button type="button" className="secondary-button" onClick={onActualiser}>
      <RotateCw size={15} strokeWidth={2} />Actualiser
    </button>
  );
}

/* ------------------------------------------------------------ */

export function FileAttente({ lignes, onConsulter, onActualiser }) {
  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>{lignes.length ? `${lignes.length} patient${lignes.length > 1 ? "s" : ""} à consulter` : "Aucun patient"}</h2>
        </div>
        <Actualiser onActualiser={onActualiser} />
      </div>

      <ListeFiltrable lignes={lignes} champs={recherchePatient} placeholder="Rechercher un patient (nom, n° de dossier)"
        vide="Aucun patient en attente.">
        {(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Patient</th><th>Arrivé</th><th>Température</th><th>Motif</th><th aria-label="Action" /></tr></thead>
              <tbody>
                {visibles.map((l) => (
                  <tr key={l.admissionId} className={l.alertes.some((a) => a.niveau === "danger") ? "mg-ligne-alerte" : ""}>
                    <td>
                      <strong>{l.patient.nom}</strong>
                      <small>{l.patient.numero} · {sexeAge(l.patient)}</small>
                    </td>
                    <td>{heure(l.arrivee)}<small>{attente(l.attenteMinutes)}</small></td>
                    <td><Temperature valeur={l.temperature} /></td>
                    <td>{l.motif}<small>{l.specialite}</small><Alertes liste={l.alertes} /></td>
                    <td className="mg-action">
                      {l.aDesDonnees ? (
                        <button type="button" className="secondary-button mg-poursuivre" onClick={() => onConsulter(l.admissionId)}>
                          <StepForward size={14} strokeWidth={2.4} />Poursuivre
                        </button>
                      ) : (
                        <button type="button" className="primary-button" onClick={() => onConsulter(l.admissionId)}>
                          <Play size={14} strokeWidth={2.4} />Consulter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}

export function Consultes({ lignes, periode, setPeriode, onConsulter }) {
  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Patients consultés</h2>
        </div>
      </div>
      <Periode periode={periode} setPeriode={setPeriode} />
      <ListeFiltrable lignes={lignes} champs={(l) => `${recherchePatient(l)} ${l.diagnostic}`}
        placeholder="Rechercher un patient ou un diagnostic" vide="Aucune consultation sur cette période.">
        {(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Terminée</th><th>Patient</th><th>Diagnostic</th><th>Issue</th><th aria-label="Action" /></tr></thead>
              <tbody>
                {visibles.map((l) => (
                  <tr key={l.admissionId}>
                    <td>{jour(l.termineeLe)}<small>{heure(l.termineeLe)}</small></td>
                    <td><strong>{l.patient.nom}</strong><small>{l.patient.numero} · {sexeAge(l.patient)}</small></td>
                    <td>{l.diagnostic}</td>
                    <td><span className="etat">{l.issue || "—"}</span></td>
                    <td className="mg-action">
                      <button type="button" className="secondary-button" onClick={() => onConsulter(l.admissionId)}>Ouvrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}

/* ------------------------------------------------------------ */

const STATUTS_ORDONNANCE = { TO_PREPARE: "attention", READY: "info", SERVED: "ok" };

export function Ordonnances({ lignes }) {
  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Ordonnances</h2>
        </div>
      </div>
      <ListeFiltrable lignes={lignes} champs={(l) => `${l.patient} ${l.numero} ${l.lignes.map((x) => x.medicament).join(" ")}`}
        placeholder="Rechercher un patient ou un médicament" vide="Aucune ordonnance.">
        {(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>N°</th><th>Date</th><th>Patient</th><th>Médicaments</th><th>Pharmacie</th></tr></thead>
              <tbody>
                {visibles.map((o) => (
                  <tr key={o.code}>
                    <td><code>{o.code}</code></td>
                    <td>{jour(o.date)}<small>{heure(o.date)}</small></td>
                    <td><strong>{o.patient}</strong><small>{o.numero}</small></td>
                    <td>
                      <ul className="mg-lignes">
                        {o.lignes.map((l, i) => <li key={i}><strong>{l.medicament}</strong> {l.posologie}{l.duree ? ` · ${l.duree}` : ""}</li>)}
                      </ul>
                    </td>
                    <td><span className={`mg-statut ${STATUTS_ORDONNANCE[o.statutCode]}`}>{o.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}

const STATUTS_EXAMEN = { "En attente": "attention", "En cours": "info", "Terminée": "ok" };

export function Examens({ lignes }) {
  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Examens demandés</h2>
        </div>
      </div>
      <ListeFiltrable lignes={lignes} champs={(l) => `${l.patient} ${l.id}`} vide="Aucun examen demandé.">
        {(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>N°</th><th>Demandé</th><th>Patient</th><th>Examens</th><th>Résultat</th><th>Statut</th></tr></thead>
              <tbody>
                {visibles.map((a) => (
                  <tr key={a.id}>
                    <td><code>{a.id}</code></td>
                    <td>{a.date}<small>{a.heure}</small></td>
                    <td><strong>{a.patient}</strong></td>
                    <td>{a.examens.map((e) => e.name).join(", ")}{a.priorite === "Urgente" && <span className="mg-pastille alerte">Urgent</span>}</td>
                    <td>{a.resultat || <span className="note">—</span>}</td>
                    <td><span className={`mg-statut ${STATUTS_EXAMEN[a.statut] || ""}`}>{a.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}

export function RendezVous({ lignes }) {
  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Rendez-vous à venir</h2>
        </div>
      </div>
      <ListeFiltrable lignes={lignes} champs={(l) => `${l.patient} ${l.patientId} ${l.motif}`} vide="Aucun rendez-vous à venir.">
        {(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Date</th><th>Patient</th><th>Motif</th><th>Statut</th></tr></thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}<small>{r.time}</small></td>
                    <td><strong>{r.patient}</strong><small>{r.patientId}{r.phone ? ` · ${r.phone}` : ""}</small></td>
                    <td>{r.motif}</td>
                    <td><span className="etat">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}

export function Sejours({ lignes }) {
  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Patients hospitalisés et en observation</h2>
        </div>
      </div>
      <ListeFiltrable lignes={lignes} champs={(l) => `${l.patient} ${l.dossier}`} vide="Aucun patient hospitalisé.">
        {(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Patient</th><th>Chambre</th><th>Admis le</th><th>Sortie prévue</th><th>Motif</th><th>Statut</th></tr></thead>
              <tbody>
                {visibles.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.patient}</strong><small>{s.dossier}{s.service ? ` · ${s.service}` : ""}</small></td>
                    <td>{s.chambre}<small>Lit {s.lit}</small></td>
                    <td>{s.admission}</td>
                    <td>{s.sortiePrevue}</td>
                    <td>{s.motif}</td>
                    <td><span className="etat">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}
