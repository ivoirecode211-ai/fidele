import LogoEtablissement from "../components/LogoEtablissement";
import { useEffect, useState } from "react";
import { Lock, Printer, Unlock } from "lucide-react";

import Chargement from "../components/Chargement";
import accueil, { argent, messageErreur, moment } from "./api";
import { A4, imprimer } from "./impression";
import ListeFiltrable from "./ListeFiltrable";
import Periode from "./Periode";

/*
 * ============================================================
 * BILAN DU CAISSIER
 * ============================================================
 *
 * Sa caisse, ses opérations, et un bilan sur la période de son
 * choix — imprimable et enregistrable en PDF depuis la fenêtre
 * d'impression du navigateur.
 *
 * Il n'y a ici rien de la régie : un caissier n'a pas à voir
 * les caisses des autres.
 * ============================================================
 */

export default function Bilan({ bilan, periode, setPeriode, rafraichir, etablissement, caissier }) {
  const [cloture, setCloture] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  const session = bilan.session;
  const encaisse = bilan.operations.reduce((t, f) => t + Number(f.montant_patient), 0);
  const ecart = cloture?.montant === "" ? null : Number(cloture?.montant) - encaisse;

  async function ouvrir() {
    setOccupe(true); setErreur("");
    try { await accueil.post("session", {}); rafraichir(); }
    catch (e) { setErreur(messageErreur(e)); }
    finally { setOccupe(false); }
  }

  async function fermer() {
    setOccupe(true); setErreur("");
    try {
      await accueil.patch("session", { montant_compte: cloture.montant, justificatif: cloture.justificatif });
      setCloture(null);
      rafraichir();
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setOccupe(false); }
  }

  const p = bilan.bilan_periode;

  return (
    <>
      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}

      {/* ── Ma caisse ── */}
      <section className="bloc no-print">
        <div className="bloc-tete">
          <div>
            <h2>Ma caisse</h2>
            <p>{session ? "Votre caisse est ouverte. Vous pouvez encaisser." : "Ouvrez votre caisse pour pouvoir encaisser les fiches."}</p>
          </div>
          {session
            ? <button type="button" className="secondary-button grand" onClick={() => setCloture({ montant: "", justificatif: "" })}>
                <Lock size={17} strokeWidth={2} />Clôturer ma caisse
              </button>
            : <button type="button" className="primary-button grand" onClick={ouvrir} disabled={occupe}>
                {occupe
                  ? <Chargement taille="petite" centre={false} couleur="currentColor" muet />
                  : <Unlock size={17} strokeWidth={2} />}
                {occupe ? "Ouverture…" : "Ouvrir ma caisse"}
              </button>}
        </div>

        {session ? (
          <div className="chiffres">
            <div><span>Ouverte à</span><strong>{new Date(session.ouverte_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
            <div><span>Opérations</span><strong>{bilan.operations.length}</strong></div>
            <div><span>Encaissé</span><strong className="vert">{argent(encaisse)}</strong></div>
          </div>
        ) : <p className="vide">Aucune caisse ouverte à votre nom.</p>}
      </section>

      {/* ── Bilan sur une période ── */}
      <section className="bloc" id="bilan-imprimable">
        <div className="bloc-tete">
          <div>
            <h2>Mon bilan</h2>
            <p className="no-print">Choisissez la période, puis imprimez ou enregistrez en PDF.</p>
            <p className="seulement-impression bilan-entete-impression">
              <LogoEtablissement logo={etablissement?.logo} size={30} nom={etablissement?.nom} />
              <span>{etablissement?.nom} · {caissier} · du {periode.du} au {periode.au}</span>
            </p>
          </div>
          <button type="button" className="secondary-button no-print" onClick={() => imprimer(A4)}>
            <Printer size={16} strokeWidth={2} />Imprimer / PDF
          </button>
        </div>

        <Periode periode={periode} setPeriode={setPeriode} className="no-print" />

        <div className="chiffres quatre">
          <div><span>Encaissé</span><strong className="vert">{argent(p.encaisse)}</strong></div>
          <div><span>Pris en charge</span><strong>{argent(p.pris_en_charge)}</strong></div>
          <div><span>Tickets</span><strong>{p.tickets}</strong></div>
          <div><span>Sessions</span><strong>{p.sessions}</strong></div>
        </div>

        {p.lignes.length === 0 ? <p className="vide">Aucun encaissement sur cette période.</p> : (
          <div className="tableau">
            <table>
              <thead><tr><th>Date</th><th>Ticket</th><th>Patient</th><th>Prestation</th><th>Assurance</th><th>Encaissé</th></tr></thead>
              <tbody>
                {p.lignes.map((f) => (
                  <tr key={f.id}>
                    <td>{moment(f.date_creation)}</td>
                    <td><code>{f.reference}</code></td>
                    <td>{f.patient_nom}<small>{f.patient_code}</small></td>
                    <td>{f.prestation_nom}</td>
                    <td>{argent(f.montant_assurance)}</td>
                    <td><strong>{argent(f.montant_patient)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={5}>Total encaissé</td><td><strong>{argent(p.encaisse)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="pied-impression seulement-impression">
          Édité le {new Date().toLocaleString("fr-FR")} · {etablissement?.mentions_legales}
        </p>
      </section>

      {/* ── Mes sessions ── */}
      <section className="bloc no-print">
        <div className="bloc-tete">
          <div><h2>Mes sessions</h2><p>Vos clôtures et leur suivi par le régisseur.</p></div>
        </div>
        <ListeFiltrable
          lignes={bilan.mes_sessions}
          champs={(s) => `${s.date_session} ${s.statut_display}`}
          placeholder="Date ou état…"
          vide="Aucune session enregistrée."
        >{(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Date</th><th>Ouverture</th><th>Clôture</th><th>Attendu</th><th>Compté</th><th>Écart</th><th>État</th></tr></thead>
              <tbody>
                {visibles.map((s) => {
                  const e = s.ecart === null ? null : Number(s.ecart);
                  return (
                    <tr key={s.id}>
                      <td>{s.date_session}</td>
                      <td>{new Date(s.ouverte_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{s.fermee_le ? new Date(s.fermee_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "En cours"}</td>
                      <td>{argent(s.montant_systeme)}</td>
                      <td>{s.montant_compte === null ? "—" : argent(s.montant_compte)}</td>
                      <td className={e ? (e < 0 ? "rouge" : "vert") : ""}>{e === null ? "—" : argent(e)}</td>
                      <td>
                        <span className={`etat ${s.statut === "validee" ? "regle" : s.statut === "en_attente" ? "attente" : ""}`}>
                          {s.statut_display}
                        </span>
                        {s.valide_par_nom && <small>par {s.valide_par_nom}</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}</ListeFiltrable>
      </section>

      {/* ── Clôture ── */}
      {cloture && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCloture(null)}>
          <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Clôturer la caisse">
            <header className="pop-tete"><div><h2>Clôturer ma caisse</h2><p>Comptez les espèces avant de confirmer.</p></div></header>
            <div className="pop-corps">
              <dl className="recap">
                <div><dt>Opérations</dt><dd>{bilan.operations.length}</dd></div>
                <div><dt>Montant attendu</dt><dd>{argent(encaisse)}</dd></div>
              </dl>
              <label className="field" style={{ marginTop: 18 }}>
                <span>Montant compté<span className="required">*</span></span>
                <input type="number" min={0} step="0.01" value={cloture.montant} autoFocus
                  onChange={(e) => setCloture({ ...cloture, montant: e.target.value })} />
              </label>
              {ecart !== null && !Number.isNaN(ecart) && (
                <p className={`ecart ${ecart === 0 ? "juste" : ecart < 0 ? "manque" : "excedent"}`}>
                  {ecart === 0 ? "Le compte est juste." : `Écart de ${argent(Math.abs(ecart))} ${ecart < 0 ? "en moins" : "en plus"}.`}
                </p>
              )}
              {ecart !== null && ecart !== 0 && !Number.isNaN(ecart) && (
                <label className="field" style={{ marginTop: 14 }}>
                  <span>Justification de l'écart<span className="required">*</span></span>
                  <textarea rows={3} value={cloture.justificatif}
                    onChange={(e) => setCloture({ ...cloture, justificatif: e.target.value })} />
                </label>
              )}
              <p className="pop-intro" style={{ marginTop: 16, marginBottom: 0 }}>
                Après la clôture, votre caisse passe en attente : c'est le régisseur qui la validera
                en recevant les fonds.
              </p>
            </div>
            <footer className="pop-pied">
              <button type="button" className="secondary-button" onClick={() => setCloture(null)} disabled={occupe}>Annuler</button>
              <button type="button" className="primary-button" onClick={fermer}
                disabled={occupe || cloture.montant === "" || (ecart !== 0 && !cloture.justificatif.trim())}>
                {occupe
                  ? <Chargement taille="petite" centre={false} couleur="currentColor" muet />
                  : <Lock size={16} strokeWidth={2} />}
                {occupe ? "Clôture…" : "Confirmer la clôture"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
