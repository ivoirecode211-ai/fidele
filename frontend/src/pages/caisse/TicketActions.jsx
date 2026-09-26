import { useState } from "react";
import { Ban, Printer, Wallet } from "lucide-react";

import api from "../../services/api";
import CaisseModal, { apiMessage } from "./CaisseModal";
import printTicket from "./ticket";

/* Actions d'une ligne : encaisser, imprimer le ticket, annuler (régisseur). */
export default function TicketActions({ item, regisseur, onChanged }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  const pay = async () => {
    try {
      await api.post(`/parcours/caisse/patients/${item.admissionId}/encaisser/`);
      onChanged?.();
      if (window.confirm(`Encaissé : ${item.patient}. Imprimer le ticket ?`)) printTicket(item.admissionId);
    } catch (error) {
      alert(apiMessage(error, "Encaissement impossible."));
    }
  };

  const cancel = async () => {
    try {
      await api.post(`/parcours/caisse/patients/${item.admissionId}/annuler/`, { motif: reason });
      setCancelling(false);
      setReason("");
      onChanged?.();
    } catch (error) {
      alert(apiMessage(error, "Annulation impossible."));
    }
  };

  const cancelled = item.paymentStatus === "annule";

  return (
    <div className="co-row-actions">
      {item.paymentStatus === "en_attente" && (
        <button type="button" className="co-btn co-btn-success co-btn-small" onClick={pay} title="Encaisser">
          <Wallet size={14} /> Encaisser
        </button>
      )}
      {!cancelled && (
        <button type="button" className="co-btn co-btn-ghost co-btn-small" onClick={() => printTicket(item.admissionId)} title="Imprimer le ticket">
          <Printer size={14} />
        </button>
      )}
      {regisseur && !cancelled && (
        <button type="button" className="co-btn co-btn-ghost co-btn-small" onClick={() => setCancelling(true)} title="Annuler le ticket">
          <Ban size={14} />
        </button>
      )}

      {cancelling && (
        <CaisseModal
          title="Annuler ce ticket"
          subtitle={`${item.reference} — ${item.patient}`}
          onClose={() => setCancelling(false)}
          actions={
            <>
              <button type="button" className="co-btn co-btn-ghost" onClick={() => setCancelling(false)}>Retour</button>
              <button type="button" className="co-btn co-btn-danger" onClick={cancel} disabled={reason.trim().length < 5}>
                <Ban size={16} /> Annuler le ticket
              </button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--ink-faint)", fontSize: 13 }}>
            Le ticket n'est pas effacé : il passe en corbeille, horodaté et signé, et sort des recettes.
          </p>
          <label className="co-field">
            <span>Motif de l'annulation (5 caractères minimum)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </label>
        </CaisseModal>
      )}
    </div>
  );
}
