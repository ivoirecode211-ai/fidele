import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { action, dateTime, modes, money, useResource, useTask } from "./api";
import { Alert, Button, LoadState, Select } from "./UI";

export function Printable({ title, children, documentKey }) {
  const [format, setFormat] = useState("ticket");
  const [printed, setPrinted] = useState(false);
  const content = useRef(null);
  const task = useTask();
  function print() {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) { task.setError("Autorisez la fenêtre d’impression puis réessayez. Le règlement reste enregistré."); return; }
    task.run(async () => {
      let duplicate = printed;
      if (documentKey) {
        try { const r = await action("print", documentKey); duplicate = r.duplicate; }
        catch (error) { popup.close(); throw error; }
      }
      const html = content.current.outerHTML;
      const sheet = `<article>${duplicate ? "<p>Duplicata</p>" : ""}${html}</article>`;
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="fr"><head><title>Document Ma Santé</title><style>
        @page { size: ${format === "ticket" ? "80mm auto" : "A5 landscape"}; margin: 5mm; }
        body { font: 11px Arial,sans-serif; margin: 0; color: #111; }
        main { display: flex; gap: 8mm; } article { flex: 1; min-width: 0; }
        h2 { font-size: 16px; } h3 { font-size: 13px; } p { margin: 6px 0; }
        dl { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; } dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; } th, td { padding: 4px 1px; text-align: left; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
        .cd-print-copy { display: none; } .cd-document { border: 0; padding: 0; max-width: none; }
      </style></head><body><main>${sheet}${format === "a5" ? sheet : ""}</main></body></html>`);
      popup.document.close();
      popup.focus();
      popup.onafterprint = () => popup.close();
      setTimeout(() => popup.print(), 250);
      setPrinted(true);
    });
  }
  return <section className="cd-print-box"><div className="cd-section-head"><h3>{title}</h3><div className="cd-actions">
    <Select label="Format d’impression" value={format} onChange={(e) => setFormat(e.target.value)}><option value="ticket">Ticket 80 mm</option><option value="a5">A5, deux souches</option></Select>
    <Button secondary busy={task.busy} onClick={print}><Printer size={17} />{printed ? "Réimprimer" : "Imprimer"}</Button></div></div>
    <Alert>{task.error}</Alert><div ref={content} className="cd-document">{children}</div>
  </section>;
}

function Clinic({ clinic }) {
  return <><h2>{clinic?.name || "Ma Santé"}</h2>{clinic?.address && <p>{clinic.address}</p>}{clinic?.phone && <p>{clinic.phone}</p>}</>;
}

export function AdmissionTicket({ visitId }) {
  const resource = useResource(`visits/${visitId}`);
  const v = resource.data;
  return <LoadState resource={resource}>{v && <Printable title="Ticket d’admission" documentKey={{ kind: "admission", id: v.id }}>
    <Clinic clinic={v.clinic} /><h3>Admission {v.number}</h3><p>{v.patient.full_name}</p><p>Dossier {v.patient.patient_number}</p>
    <p>{dateTime(v.created_at)}</p><p>Enregistré par {v.created_by}</p><p>Ce ticket atteste l’enregistrement du dossier. Il ne vaut pas reçu de paiement.</p>
  </Printable>}</LoadState>;
}

export function BillDocument({ bill, paymentIds, creditId, refundId }) {
  const payments = bill.payments.filter((p) => paymentIds?.includes(p.id));
  const credit = bill.credits.find((c) => c.id === creditId);
  const refund = bill.refunds.find((r) => r.id === refundId);
  const title = credit ? "Avoir" : refund ? "Reçu de remboursement" : payments.length ? "Reçu de règlement" : "Facture";
  const key = { kind: credit ? "credit" : refund ? "refund" : payments.length ? "receipt" : "invoice", id: credit?.id || refund?.id || payments[0]?.id || bill.id };
  return <Printable title={title} documentKey={key}>
    <Clinic clinic={bill.clinic} /><h3>{title} {credit?.number || refund?.number || payments.map((p) => p.number).join(" / ") || bill.number}</h3>
    <p>{bill.patient.full_name} · {bill.patient.patient_number}</p><p>Facture {bill.number} · {dateTime(bill.created_at)}</p>
    {!!bill.insurance.name && <p>{bill.insurance.name} · Assuré {bill.insurance.member_number}</p>}
    <table><thead><tr><th>Prestation</th><th>Qté</th><th>Prix</th><th>Taux</th><th>Patient</th></tr></thead><tbody>
      {bill.lines.map((l) => <tr key={l.id}><td>{l.label}</td><td>{l.quantity}</td><td>{money(l.price)}</td><td>{l.rate} %</td><td>{money(l.patient_share)}</td></tr>)}
    </tbody></table>
    <dl><dt>Total facturé</dt><dd>{money(bill.total)}</dd><dt>Part assurance</dt><dd>{money(bill.insurance_share)}</dd><dt>Part patient</dt><dd>{money(bill.patient_share)}</dd>
      {(Number(bill.balances.patient_credit) + Number(bill.balances.insurance_credit)) > 0 && <><dt>Avoirs</dt><dd>{money(Number(bill.balances.patient_credit) + Number(bill.balances.insurance_credit))}</dd></>}
    </dl>
    {payments.map((p) => <div key={p.id}><p><strong>Encaissé {money(p.amount)}</strong> · {modes[p.mode]} · {p.payer === "INSURANCE" ? "Assurance" : "Patient"}</p>
      <p>{dateTime(p.created_at)} · {p.cashier}</p>{p.reference && <p>Référence {p.reference}</p>}{p.mode === "CASH" && <p>Remis {money(p.tendered)} · Monnaie {money(p.change)}</p>}</div>)}
    {credit && <><p>Avoir du {dateTime(credit.created_at)}</p><p>{credit.reason}</p><p>Part patient créditée {money(credit.patient_amount)} · Part assurance créditée {money(credit.insurance_amount)}</p></>}
    {refund && <><p>Remboursé {money(refund.amount)} · {modes[refund.mode]}</p><p>{dateTime(refund.created_at)} · {refund.cashier}</p><p>{refund.reason}</p></>}
    <p><strong>Reste patient actuel {money(bill.balances.patient_remaining)}</strong></p><p>Reste assurance actuel {money(bill.balances.insurance_remaining)}</p>
    {bill.coverage_confirmed && <p>Prise en charge validée, aucun montant encaissé auprès du patient.</p>}
    {bill.clinic.legal_info && <p>{bill.clinic.legal_info}</p>}
  </Printable>;
}
