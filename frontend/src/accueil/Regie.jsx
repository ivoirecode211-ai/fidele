import { useState } from "react";
import { BadgeCheck, Lock, ShieldAlert, Trash2 } from "lucide-react";

import Chargement from "../components/Chargement";
import accueil, { argent, messageErreur, moment } from "./api";
import ListeFiltrable from "./ListeFiltrable";
import Periode from "./Periode";

/*
 * ============================================================
 * RÉGIE
 * ============================================================
 *
 * Ce que le régisseur, et lui seul, doit voir :
 * les clôtures à valider, les caisses de l'établissement,
 * les tickets émis, la corbeille — avec leurs totaux.
 *
 * Aucun écran de travail de la caisse ici : un régisseur qui
 * ne tient pas de caisse n'a pas à en être encombré.
 * ============================================================
 */

export default function Regie({ bilan, periode, setPeriode, rafraichir }) {
  const [aValider, setAValider] = useState(null);
  const [aCloturer, setACloturer] = useState(null);
  const [aAnnuler, setAAnnuler] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  const t = bilan.totaux;

  function agir(action) {
    return async () => {
      setOccupe(true); setErreur("");
      try { await action(); rafraichir(); }
      catch (e) { setErreur(messageErreur(e)); }
      finally { setOccupe(false); }
    };
  }

  const valider = agir(async () => {
    await accueil.post(`sessions/${aValider.session.id}/valider`,
      { montant_recu: aValider.montant, note: aValider.note });
    setAValider(null);
  });

  const cloturer = agir(async () => {
    await accueil.post(`sessions/${aCloturer.session.id}/cloturer`,
      { montant_compte: aCloturer.montant, justificatif: aCloturer.justificatif });
    setACloturer(null);
  });

  const annuler = agir(async () => {
    await accueil.post(`fiches/${aAnnuler.fiche.id}/annuler`, { motif: aAnnuler.motif });
    setAAnnuler(null);
  });

  const ecartValidation = aValider && aValider.montant !== ""
    ? Number(aValider.montant) - Number(aValider.session.montant_compte || 0) : null;

  return (
    <>
      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}

      {/* ── Totaux : le régisseur pilote par les chiffres, pas par les lignes ── */}
      <section className="bloc">
        <div className="bloc-tete">
          <div>
            <h2>Vue d'ensemble</h2>
            <p>Tous caissiers confondus, sur la période choisie.</p>
          </div>
          <span className="etat regie"><ShieldAlert size={14} strokeWidth={2} />Régie</span>
        </div>

        <Periode periode={periode} setPeriode={setPeriode} />

        <div className="chiffres quatre">
          <div><span>Encaissé</span><strong className="vert">{argent(t.encaisse)}</strong></div>
          <div><span>Pris en charge</span><strong>{argent(t.pris_en_charge)}</strong></div>
          <div><span>Annulé</span><strong className="rouge">{argent(t.annule)}</strong></div>
          <div><span>Écarts de caisse</span><strong className={Number(t.ecarts) ? "rouge" : ""}>{argent(t.ecarts)}</strong></div>
        </div>

        {bilan.totaux_par_caissier.length > 0 && (
          <div className="tableau">
            <table>
              <thead><tr><th>Caissier</th><th>Sessions</th><th>Attendu</th><th>Compté</th><th>Écart</th></tr></thead>
              <tbody>
                {bilan.totaux_par_caissier.map((c) => (
                  <tr key={c.caissier}>
                    <td><strong>{c.caissier}</strong></td>
                    <td>{c.sessions}</td>
                    <td>{argent(c.attendu)}</td>
                    <td>{argent(c.compte)}</td>
                    <td className={Number(c.ecart) ? (Number(c.ecart) < 0 ? "rouge" : "vert") : ""}>{argent(c.ecart)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Clôtures à valider : le cœur du travail du régisseur ── */}
      <section className="bloc">
        <div className="bloc-tete">
          <div>
            <h2>Clôtures à valider</h2>
            <p>Recevez les fonds, puis validez. Tant que ce n'est pas fait, la caisse reste en attente.</p>
          </div>
        </div>
        {bilan.clotures_a_valider.length === 0 ? <p className="vide">Aucune clôture en attente de validation.</p> : (
          <div className="tableau">
            <table>
              <thead><tr><th>Caissier</th><th>Date</th><th>Clôturée à</th><th>Attendu</th><th>Compté</th><th>Écart</th><th>Justification</th><th /></tr></thead>
              <tbody>
                {bilan.clotures_a_valider.map((s) => {
                  const e = Number(s.ecart || 0);
                  return (
                    <tr key={s.id}>
                      <td><strong>{s.ouverte_par_nom}</strong></td>
                      <td>{s.date_session}</td>
                      <td>{s.fermee_le ? new Date(s.fermee_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td>{argent(s.montant_systeme)}</td>
                      <td>{argent(s.montant_compte)}</td>
                      <td className={e ? (e < 0 ? "rouge" : "vert") : ""}>{argent(e)}</td>
                      <td>{s.justificatif || "—"}</td>
                      <td>
                        <button type="button" className="primary-button"
                          onClick={() => setAValider({ session: s, montant: s.montant_compte || "", note: "" })}>
                          <BadgeCheck size={15} strokeWidth={2} />Valider
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Caisses encore ouvertes ── */}
      <section className="bloc">
        <div className="bloc-tete">
          <div><h2>Caisses ouvertes</h2><p>Les caissiers en poste en ce moment.</p></div>
        </div>
        {bilan.caisses_ouvertes.length === 0 ? <p className="vide">Aucune caisse ouverte actuellement.</p> : (
          <div className="tableau">
            <table>
              <thead><tr><th>Caissier</th><th>Ouverte depuis</th><th>Date</th><th>Encaissé</th><th /></tr></thead>
              <tbody>
                {bilan.caisses_ouvertes.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.ouverte_par_nom}</strong></td>
                    <td>{new Date(s.ouverte_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{s.date_session}</td>
                    <td>{argent(s.montant_systeme)}</td>
                    <td>
                      <button type="button" className="secondary-button"
                        onClick={() => setACloturer({ session: s, montant: "", justificatif: "" })}>
                        <Lock size={15} strokeWidth={2} />Clôturer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Historique ── */}
      <section className="bloc">
        <div className="bloc-tete">
          <div><h2>Historique des caisses</h2><p>Toutes les sessions de la période, tous caissiers confondus.</p></div>
        </div>
        <ListeFiltrable
          lignes={bilan.toutes_sessions}
          champs={(s) => `${s.ouverte_par_nom} ${s.date_session} ${s.statut_display}`}
          placeholder="Caissier, date ou état…"
          vide="Aucune session sur cette période."
        >{(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Caissier</th><th>Date</th><th>Attendu</th><th>Compté</th><th>Écart</th><th>Reçu</th><th>État</th></tr></thead>
              <tbody>
                {visibles.map((s) => {
                  const e = s.ecart === null ? null : Number(s.ecart);
                  return (
                    <tr key={s.id}>
                      <td><strong>{s.ouverte_par_nom}</strong></td>
                      <td>{s.date_session}</td>
                      <td>{argent(s.montant_systeme)}</td>
                      <td>{s.montant_compte === null ? "—" : argent(s.montant_compte)}</td>
                      <td className={e ? (e < 0 ? "rouge" : "vert") : ""}>{e === null ? "—" : argent(e)}</td>
                      <td>{s.montant_recu === null ? "—" : argent(s.montant_recu)}</td>
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

      {/* ── Tickets émis ── */}
      <section className="bloc">
        <div className="bloc-tete">
          <div><h2>Tickets émis</h2><p>{t.tickets} ticket(s) sur la période. Vous pouvez annuler un ticket erroné.</p></div>
        </div>
        <ListeFiltrable
          lignes={bilan.toutes_fiches}
          champs={(f) => `${f.reference} ${f.patient_nom} ${f.patient_code} ${f.prestation_nom} ${f.creee_par_nom}`}
          placeholder="Ticket, patient, n° de dossier ou prestation…"
          vide="Aucun ticket sur cette période."
        >{(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Ticket</th><th>Patient</th><th>Prestation</th><th>Montant</th><th>État</th><th>Émis</th><th /></tr></thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id}>
                    <td><code>{f.reference}</code></td>
                    <td><strong>{f.patient_nom}</strong><small>{f.patient_code}</small></td>
                    <td>{f.prestation_nom}</td>
                    <td><strong>{argent(f.montant_patient)}</strong></td>
                    <td><span className={`etat ${f.statut === "en_attente" ? "attente" : "regle"}`}>{f.statut_display}</span></td>
                    <td>{moment(f.date_creation)}<small>{f.creee_par_nom}</small></td>
                    <td>
                      <button type="button" className="danger-button" onClick={() => setAAnnuler({ fiche: f, motif: "" })}>
                        <Trash2 size={15} strokeWidth={2} />Annuler
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Total encaissé</td><td><strong>{argent(t.encaisse)}</strong></td><td colSpan={3} /></tr>
              </tfoot>
            </table>
          </div>
        )}</ListeFiltrable>
      </section>

      {/* ── Corbeille ── */}
      <section className="bloc">
        <div className="bloc-tete">
          <div>
            <h2>Corbeille</h2>
            <p>{t.tickets_annules} ticket(s) annulé(s) pour {argent(t.annule)}. Ils ne comptent plus nulle part, mais restent consultables.</p>
          </div>
        </div>
        <ListeFiltrable
          lignes={bilan.corbeille}
          champs={(f) => `${f.reference} ${f.patient_nom} ${f.patient_code} ${f.annulee_par_nom} ${f.motif_annulation}`}
          placeholder="Ticket, patient, motif ou auteur de l'annulation…"
          vide="La corbeille est vide."
        >{(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Ticket</th><th>Patient</th><th>Montant</th><th>Annulé le</th><th>Par</th><th>Motif</th></tr></thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id} className="annulee">
                    <td><code>{f.reference}</code></td>
                    <td>{f.patient_nom}<small>{f.patient_code}</small></td>
                    <td>{argent(f.montant_patient)}</td>
                    <td>{moment(f.annulee_le)}</td>
                    <td>{f.annulee_par_nom}</td>
                    <td>{f.motif_annulation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}</ListeFiltrable>
      </section>

      {/* ── Validation d'une clôture ── */}
      {aValider && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setAValider(null)}>
          <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Valider la clôture">
            <header className="pop-tete"><div><h2>Valider la clôture</h2><p>{aValider.session.ouverte_par_nom}</p></div></header>
            <div className="pop-corps">
              <p className="pop-intro">Comptez les fonds remis, puis confirmez. La session sera soldée.</p>
              <dl className="recap">
                <div><dt>Attendu par le système</dt><dd>{argent(aValider.session.montant_systeme)}</dd></div>
                <div><dt>Compté par le caissier</dt><dd>{argent(aValider.session.montant_compte)}</dd></div>
                {aValider.session.justificatif && (
                  <div><dt>Sa justification</dt><dd>{aValider.session.justificatif}</dd></div>
                )}
              </dl>
              <label className="field" style={{ marginTop: 18 }}>
                <span>Montant que vous recevez<span className="required">*</span></span>
                <input type="number" min={0} step="0.01" autoFocus value={aValider.montant}
                  onChange={(e) => setAValider({ ...aValider, montant: e.target.value })} />
              </label>
              {ecartValidation !== null && !Number.isNaN(ecartValidation) && (
                <p className={`ecart ${ecartValidation === 0 ? "juste" : ecartValidation < 0 ? "manque" : "excedent"}`}>
                  {ecartValidation === 0
                    ? "Le montant reçu correspond au montant compté."
                    : `Écart de ${argent(Math.abs(ecartValidation))} ${ecartValidation < 0 ? "en moins" : "en plus"} par rapport au comptage.`}
                </p>
              )}
              {ecartValidation !== 0 && (
                <label className="field" style={{ marginTop: 14 }}>
                  <span>Justification de l'écart<span className="required">*</span></span>
                  <textarea rows={3} value={aValider.note}
                    onChange={(e) => setAValider({ ...aValider, note: e.target.value })} />
                </label>
              )}
            </div>
            <footer className="pop-pied">
              <button type="button" className="secondary-button" onClick={() => setAValider(null)} disabled={occupe}>Annuler</button>
              <button type="button" className="primary-button" onClick={valider}
                disabled={occupe || aValider.montant === "" || (ecartValidation !== 0 && !aValider.note.trim())}>
                {occupe
                  ? <Chargement taille="petite" centre={false} couleur="currentColor" muet />
                  : <BadgeCheck size={16} strokeWidth={2} />}
                {occupe ? "Validation…" : "Valider et solder"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ── Clôture d'une caisse tierce ── */}
      {aCloturer && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setACloturer(null)}>
          <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Clôturer cette caisse">
            <header className="pop-tete"><div><h2>Clôturer cette caisse</h2><p>{aCloturer.session.ouverte_par_nom}</p></div></header>
            <div className="pop-corps">
              <p className="pop-intro">
                À utiliser quand le caissier a quitté son poste sans fermer. La session reste
                à son nom : vous ne faites que la clôturer.
              </p>
              <dl className="recap">
                <div><dt>Ouverte à</dt><dd>{new Date(aCloturer.session.ouverte_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</dd></div>
                <div><dt>Montant attendu</dt><dd>{argent(aCloturer.session.montant_systeme)}</dd></div>
              </dl>
              <label className="field" style={{ marginTop: 18 }}>
                <span>Montant compté<span className="required">*</span></span>
                <input type="number" min={0} step="0.01" autoFocus value={aCloturer.montant}
                  onChange={(e) => setACloturer({ ...aCloturer, montant: e.target.value })} />
              </label>
              <label className="field" style={{ marginTop: 14 }}>
                <span>Justification (obligatoire en cas d'écart)</span>
                <textarea rows={3} value={aCloturer.justificatif}
                  onChange={(e) => setACloturer({ ...aCloturer, justificatif: e.target.value })} />
              </label>
            </div>
            <footer className="pop-pied">
              <button type="button" className="secondary-button" onClick={() => setACloturer(null)} disabled={occupe}>Annuler</button>
              <button type="button" className="primary-button" onClick={cloturer} disabled={occupe || aCloturer.montant === ""}>
                {occupe
                  ? <Chargement taille="petite" centre={false} couleur="currentColor" muet />
                  : <Lock size={16} strokeWidth={2} />}
                {occupe ? "Clôture…" : "Confirmer la clôture"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ── Annulation d'un ticket ── */}
      {aAnnuler && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setAAnnuler(null)}>
          <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Annuler le ticket">
            <header className="pop-tete"><div><h2>Annuler ce ticket</h2><p>{aAnnuler.fiche.reference}</p></div></header>
            <div className="pop-corps">
              <div className="avertissement" role="alert">
                <ShieldAlert size={20} strokeWidth={2} aria-hidden="true" />
                <div>
                  <strong>Cette annulation est irréversible.</strong>
                  <p>
                    Le ticket sera placé en corbeille pour la traçabilité : il ne sera pas
                    effacé, mais il sortira aussitôt des encaissements et tous les bilans
                    seront recalculés.
                  </p>
                </div>
              </div>
              <dl className="recap">
                <div><dt>Patient</dt><dd>{aAnnuler.fiche.patient_nom}</dd></div>
                <div><dt>Prestation</dt><dd>{aAnnuler.fiche.prestation_nom}</dd></div>
                <div><dt>Montant retiré</dt><dd>{argent(aAnnuler.fiche.montant_patient)}</dd></div>
              </dl>
              <label className="field" style={{ marginTop: 18 }}>
                <span>Motif de l'annulation<span className="required">*</span></span>
                <textarea rows={3} autoFocus value={aAnnuler.motif}
                  placeholder="Ce motif restera attaché au ticket."
                  onChange={(e) => setAAnnuler({ ...aAnnuler, motif: e.target.value })} />
              </label>
            </div>
            <footer className="pop-pied">
              <button type="button" className="secondary-button" onClick={() => setAAnnuler(null)} disabled={occupe}>
                Conserver le ticket
              </button>
              <button type="button" className="danger-button" onClick={annuler}
                disabled={occupe || aAnnuler.motif.trim().length < 5}>
                {occupe
                  ? <Chargement taille="petite" centre={false} couleur="currentColor" muet />
                  : <Trash2 size={16} strokeWidth={2} />}
                {occupe ? "Annulation…" : "Annuler définitivement"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
