import { useEffect, useState } from "react";
import { Lock, LockOpen } from "lucide-react";

import api from "../../services/api";
import CaisseModal, { apiMessage, fcfa } from "./CaisseModal";

/* Ma caisse : ouverture et clôture (montant compté, écart justifié). */
export default function CaisseSessionBar({ onChange }) {
  const [info, setInfo] = useState({ session: null, regisseur: false });
  const [closing, setClosing] = useState(false);
  const [counted, setCounted] = useState("");
  const [justification, setJustification] = useState("");

  const load = () =>
    api.get("/parcours/caisse/session/").then(({ data }) => {
      setInfo(data);
      onChange?.(data);
    });

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const open = async () => {
    try {
      await api.post("/parcours/caisse/session/");
      await load();
    } catch (error) {
      alert(apiMessage(error, "Impossible d'ouvrir la caisse."));
    }
  };

  const close = async () => {
    try {
      await api.patch("/parcours/caisse/session/", { montantCompte: counted, justification });
      setClosing(false);
      setCounted("");
      setJustification("");
      await load();
      alert("Caisse clôturée. Elle attend maintenant la validation du régisseur.");
    } catch (error) {
      alert(apiMessage(error, "Clôture impossible."));
    }
  };

  const session = info.session;
  const gap = counted === "" || !session ? null : Number(counted) - Number(session.attendu || 0);

  return (
    <>
      <div className="co-session">
        <div className="co-session-state">
          <span className={`co-dot ${session ? "open" : ""}`} />
          {session ? (
            <span>
              <strong>Caisse ouverte</strong> depuis le {session.ouverteLe} · {session.tickets} ticket(s) encaissé(s) ·{" "}
              <strong>{fcfa(session.attendu)}</strong>
            </span>
          ) : (
            <span>
              <strong>Caisse fermée</strong> — ouvrez-la pour encaisser.
            </span>
          )}
        </div>
        {session ? (
          <button type="button" className="co-btn co-btn-ghost" onClick={() => setClosing(true)}>
            <Lock size={16} /> Clôturer ma caisse
          </button>
        ) : (
          <button type="button" className="co-btn co-btn-success" onClick={open}>
            <LockOpen size={16} /> Ouvrir ma caisse
          </button>
        )}
      </div>

      {closing && session && (
        <CaisseModal
          title="Clôturer ma caisse"
          subtitle="Comptez les espèces avant de clôturer."
          onClose={() => setClosing(false)}
          actions={
            <>
              <button type="button" className="co-btn co-btn-ghost" onClick={() => setClosing(false)}>Annuler</button>
              <button type="button" className="co-btn co-btn-primary" onClick={close} disabled={counted === ""}>
                <Lock size={16} /> Clôturer
              </button>
            </>
          }
        >
          <div className="co-summary">
            <div><span>Montant attendu</span><strong>{fcfa(session.attendu)}</strong></div>
            <div><span>Tickets encaissés</span><strong>{session.tickets}</strong></div>
            {gap !== null && (
              <div>
                <span>Écart</span>
                <strong className={gap < 0 ? "co-gap-negative" : ""}>{fcfa(gap)}</strong>
              </div>
            )}
          </div>
          <label className="co-field">
            <span>Montant compté (FCFA)</span>
            <input type="number" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} autoFocus />
          </label>
          {gap !== null && gap !== 0 && (
            <label className="co-field">
              <span>Justification de l'écart (obligatoire)</span>
              <textarea value={justification} onChange={(e) => setJustification(e.target.value)} />
            </label>
          )}
        </CaisseModal>
      )}
    </>
  );
}
