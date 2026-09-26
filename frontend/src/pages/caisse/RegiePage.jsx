import { useEffect, useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";

import api from "../../services/api";
import CaisseModal, { apiMessage, fcfa } from "./CaisseModal";
import TicketActions from "./TicketActions";

const today = () => new Date().toISOString().slice(0, 10);

/* Régie : clôtures à valider, caisses ouvertes, historique, tickets et corbeille. */
export default function RegiePage({ regisseur }) {
  const [period, setPeriod] = useState({ du: today(), au: today() });
  const [data, setData] = useState(null);
  const [action, setAction] = useState(null); // { type: "valider" | "cloturer", session }
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const load = () =>
    api
      .get("/parcours/caisse/regie/", { params: period })
      .then(({ data: payload }) => setData(payload))
      .catch((error) => alert(apiMessage(error, "Impossible de charger la régie.")));

  useEffect(() => {
    load();
  }, [period.du, period.au]);

  const submit = async () => {
    const { type, session } = action;
    const body = type === "valider" ? { montantRecu: amount, note } : { montantCompte: amount, justification: note };
    try {
      await api.post(`/parcours/caisse/regie/sessions/${session.id}/${type}/`, body);
      setAction(null);
      setAmount("");
      setNote("");
      load();
    } catch (error) {
      alert(apiMessage(error, "Opération impossible."));
    }
  };

  if (!data) return <section className="caisse-main"><p>Chargement de la régie…</p></section>;

  const t = data.totaux;
  const reference = action?.type === "valider" ? action.session.compte : action?.session.attendu;
  const gap = amount === "" || !action ? null : Number(amount) - Number(reference || 0);

  const sessionRows = (rows, withAction) =>
    rows.length === 0 ? (
      <tr><td colSpan="8" className="co-empty">Rien à afficher.</td></tr>
    ) : (
      rows.map((s) => (
        <tr key={s.id}>
          <td>{s.caissier}</td>
          <td>{s.ouverteLe}</td>
          <td>{s.fermeeLe}</td>
          <td>{fcfa(s.attendu)}</td>
          <td>{s.compte === null ? "—" : fcfa(s.compte)}</td>
          <td className={s.ecart < 0 ? "co-gap-negative" : ""}>{s.ecart === null ? "—" : fcfa(s.ecart)}</td>
          <td>{s.statutLibelle}{s.valideePar ? ` · ${s.valideePar}` : ""}</td>
          <td>{withAction && regisseur ? withAction(s) : s.justification || ""}</td>
        </tr>
      ))
    );

  const sessionHead = (
    <tr>
      <th>Caissier</th><th>Ouverte</th><th>Fermée</th><th>Attendu</th><th>Compté</th><th>Écart</th><th>Statut</th><th />
    </tr>
  );

  return (
    <section className="caisse-main">
      <div className="co-period">
        <label className="co-field"><span>Du</span>
          <input type="date" value={period.du} onChange={(e) => setPeriod({ ...period, du: e.target.value })} />
        </label>
        <label className="co-field"><span>Au</span>
          <input type="date" value={period.au} onChange={(e) => setPeriod({ ...period, au: e.target.value })} />
        </label>
      </div>

      <div className="co-summary" style={{ marginBottom: 22 }}>
        <div><span>Encaissé</span><strong>{fcfa(t.encaisse)}</strong></div>
        <div><span>Pris en charge (assurances)</span><strong>{fcfa(t.prisEnCharge)}</strong></div>
        <div><span>Reste à payer</span><strong>{fcfa(t.aPayer)}</strong></div>
        <div><span>Tickets</span><strong>{t.tickets}</strong></div>
        <div><span>Annulés</span><strong className="co-gap-negative">{t.ticketsAnnules} · {fcfa(t.annule)}</strong></div>
      </div>

      <div className="co-section">
        <h3>Clôtures à valider</h3>
        <p>Recevez les fonds et soldez la caisse. Un caissier ne valide jamais sa propre caisse.</p>
        <div className="co-table-wrap"><table className="co-table"><thead>{sessionHead}</thead><tbody>
          {sessionRows(data.cloturesAValider, (s) => (
            <button type="button" className="co-btn co-btn-primary co-btn-small" onClick={() => { setAction({ type: "valider", session: s }); setAmount(String(s.compte ?? "")); }}>
              <CheckCircle2 size={14} /> Valider
            </button>
          ))}
        </tbody></table></div>
      </div>

      <div className="co-section">
        <h3>Caisses ouvertes</h3>
        <p>Les caissiers en poste. Clôturez à leur place une caisse restée ouverte.</p>
        <div className="co-table-wrap"><table className="co-table"><thead>{sessionHead}</thead><tbody>
          {sessionRows(data.caissesOuvertes, (s) => (
            <button type="button" className="co-btn co-btn-ghost co-btn-small" onClick={() => setAction({ type: "cloturer", session: s })}>
              <Lock size={14} /> Clôturer
            </button>
          ))}
        </tbody></table></div>
      </div>

      <div className="co-section">
        <h3>Historique des caisses</h3>
        <p>Toutes les sessions de la période.</p>
        <div className="co-table-wrap"><table className="co-table"><thead>{sessionHead}</thead><tbody>
          {sessionRows(data.historique)}
        </tbody></table></div>
      </div>

      <div className="co-section">
        <h3>Tickets émis</h3>
        <p>{t.tickets} ticket(s) sur la période.</p>
        <div className="co-table-wrap"><table className="co-table">
          <thead><tr><th>Ticket</th><th>Date</th><th>Patient</th><th>Prestation</th><th>Montant</th><th>Paiement</th><th /></tr></thead>
          <tbody>
            {data.tickets.length === 0 && <tr><td colSpan="7" className="co-empty">Aucun ticket.</td></tr>}
            {data.tickets.map((row) => (
              <tr key={row.admissionId}>
                <td>{row.reference}</td>
                <td>{new Date(row.dateEnregistrement).toLocaleString("fr-FR")}</td>
                <td>{row.patient}</td>
                <td>{row.service}</td>
                <td>{fcfa(row.cost)}</td>
                <td><span className={`co-badge ${row.paymentStatus}`}>{row.statutPaiement}</span></td>
                <td><TicketActions item={row} regisseur={regisseur} onChanged={load} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div className="co-section">
        <h3>Corbeille</h3>
        <p>{t.ticketsAnnules} ticket(s) annulé(s). Ils ne comptent plus dans aucun total.</p>
        <div className="co-table-wrap"><table className="co-table">
          <thead><tr><th>Ticket</th><th>Patient</th><th>Montant</th><th>Annulé le</th><th>Par</th><th>Motif</th></tr></thead>
          <tbody>
            {data.corbeille.length === 0 && <tr><td colSpan="6" className="co-empty">Corbeille vide.</td></tr>}
            {data.corbeille.map((row) => (
              <tr key={row.admissionId}>
                <td>{row.reference}</td><td>{row.patient}</td><td>{fcfa(row.cost)}</td>
                <td>{row.annuleLe}</td><td>{row.annulePar}</td><td>{row.motifAnnulation}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {action && (
        <CaisseModal
          title={action.type === "valider" ? "Valider la clôture" : "Clôturer cette caisse"}
          subtitle={`${action.session.caissier} — ouverte le ${action.session.ouverteLe}`}
          onClose={() => setAction(null)}
          actions={
            <>
              <button type="button" className="co-btn co-btn-ghost" onClick={() => setAction(null)}>Annuler</button>
              <button type="button" className="co-btn co-btn-primary" onClick={submit} disabled={amount === ""}>
                {action.type === "valider" ? "Valider" : "Clôturer"}
              </button>
            </>
          }
        >
          <div className="co-summary">
            <div><span>Attendu</span><strong>{fcfa(action.session.attendu)}</strong></div>
            {action.type === "valider" && <div><span>Compté par le caissier</span><strong>{fcfa(action.session.compte)}</strong></div>}
            {gap !== null && <div><span>Écart</span><strong className={gap < 0 ? "co-gap-negative" : ""}>{fcfa(gap)}</strong></div>}
          </div>
          <label className="co-field">
            <span>{action.type === "valider" ? "Montant réellement reçu (FCFA)" : "Montant compté (FCFA)"}</span>
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </label>
          {gap !== null && gap !== 0 && (
            <label className="co-field">
              <span>Justification de l'écart (obligatoire)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          )}
        </CaisseModal>
      )}
    </section>
  );
}
