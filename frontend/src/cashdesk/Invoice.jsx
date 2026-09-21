import { useState } from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { action, cash, dateTime, modes, money, statuses, useResource, useTask } from "./api";
import { Alert, Button, Empty, Field, LoadState, Panel, Select, Table } from "./UI";
import { AdmissionTicket, BillDocument } from "./Documents";

export function BillComposer({ visitId, benefits, services, onComplete, onBack }) {
  const resource = useResource(`visits/${visitId}`);
  const [lines, setLines] = useState([{ benefit: "", quantity: 1 }]);
  const [service, setService] = useState("");
  const [quote, setQuote] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const task = useTask();
  const setLine = (i, key, value) => { setQuote(null); setLines((r) => r.map((l, n) => n === i ? { ...l, [key]: value } : l)); };
  async function calculate(e) {
    e.preventDefault();
    await task.run(async () => setQuote(await cash.post("quote", { visit_id: visitId, lines })));
  }
  async function confirm() {
    await task.run(async () => { const result = await action("invoice", { visit_id: visitId, lines, quote }); onComplete(result.bill_id); });
  }
  return <Panel title="Prestations et règlement" subtitle="Les prix et la prise en charge sont calculés à partir du catalogue."
    actions={<Button secondary onClick={onBack}><ArrowLeft size={16} />Patients</Button>}>
    <LoadState resource={resource}>{resource.data && <div className="cd-patient-banner"><div><strong>{resource.data.patient.full_name}</strong><p>{resource.data.patient.patient_number} · {resource.data.number}</p></div>
      <Button secondary onClick={() => setShowTicket(!showTicket)}>{showTicket ? "Masquer le ticket" : "Ticket d’admission"}</Button></div>}</LoadState>
    {showTicket && <AdmissionTicket visitId={visitId} />}
    <Alert>{task.error}</Alert>
    <form onSubmit={calculate}><fieldset disabled={task.busy}><Select label="Filtrer les prestations par service" value={service} onChange={(e) => setService(e.target.value)}><option value="">Tous les services</option>{services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
      <div className="cd-line-list">{lines.map((line, index) => <div className="cd-line-input" key={index}>
        <Select label={`Prestation ${index + 1}`} required value={line.benefit} onChange={(e) => setLine(index, "benefit", Number(e.target.value))}>
          <option value="">Sélectionner une prestation</option>{benefits.filter((p) => p.active && (!service || p.service === Number(service) || p.id === line.benefit)).map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
        </Select><Field label="Quantité" type="number" min={1} max={1000} required value={line.quantity} onChange={(e) => setLine(index, "quantity", Number(e.target.value))} />
        <Button secondary disabled={lines.length === 1} aria-label={`Retirer la prestation ${index + 1}`} onClick={() => { setLines((ls) => ls.filter((_, i) => i !== index)); setQuote(null); }}><Trash2 size={18} /></Button>
      </div>)}</div><div className="cd-actions"><Button secondary onClick={() => { setLines([...lines, { benefit: "", quantity: 1 }]); setQuote(null); }}><Plus size={17} />Ajouter une prestation</Button><Button type="submit" busy={task.busy}>Calculer le montant</Button></div>
    </fieldset></form>
    {!benefits.some((b) => b.active) && <Empty>Le catalogue est vide. Un responsable doit créer les prestations et leurs tarifs.</Empty>}
    {quote && <><Table label="Détail du calcul" headers={["Prestation", "Quantité", "Total", "Taux", "Assurance", "Patient"]}>{quote.lines.map((l) => <tr key={l.benefit}><td>{l.name}<small>{l.service_name}</small></td><td>{l.quantity}</td><td>{money(l.total)}</td><td>{l.rate} %</td><td>{money(l.insurance_share)}</td><td>{money(l.patient_share)}</td></tr>)}</Table>
      <div className="cd-totals"><div>Total<strong>{money(quote.total)}</strong></div><div>Assurance<strong>{money(quote.insurance_share)}</strong></div><div>À régler par le patient<strong>{money(quote.patient_share)}</strong></div></div>
      <Button busy={task.busy} onClick={confirm}>Valider la facture et passer au règlement</Button></>}
  </Panel>;
}

export default function BillDetail({ billId, overview, refresh, onSession, onBack, payer = "PATIENT" }) {
  const [version, setVersion] = useState(0);
  const resource = useResource(`bills/${billId}`, {}, version);
  const [document, setDocument] = useState(null);
  const [operation, setOperation] = useState("");
  const task = useTask();
  const updated = (result) => { setVersion((v) => v + 1); refresh(); setOperation(""); if (result?.payment_ids) setDocument({ paymentIds: result.payment_ids }); };
  const bill = resource.data;
  return <LoadState resource={resource}>{bill && <>
    <Panel title={bill.number} subtitle={`${bill.patient.full_name} · ${bill.patient.patient_number}`} actions={<Button secondary onClick={onBack}><ArrowLeft size={16} />Retour</Button>}>
      <Alert>{task.error}</Alert><div className="cd-record"><p>Part patient <span className="cd-badge">{statuses[bill.balances.patient_status]}</span></p><p>{bill.insurance.name ? `${bill.insurance.name} · ${statuses[bill.claim_status]}` : "Sans assurance"}</p></div>
      <Table label="Prestations facturées" headers={["Prestation", "Qté", "Prix", "Taux", "Part patient", "Orientation"]}>
        {bill.lines.map((l) => <tr key={l.id}><td>{l.label}<small>{l.service_name}{l.credited_quantity > 0 ? ` · ${l.credited_quantity} annulée(s)` : ""}</small></td><td>{l.quantity}</td><td>{money(l.price)}</td><td>{l.rate} %</td><td>{money(l.patient_share)}</td><td>{statuses[l.queue] || "Après règlement"}</td></tr>)}
      </Table><div className="cd-totals"><div>Total initial<strong>{money(bill.total)}</strong></div><div>Reste patient<strong>{money(bill.balances.patient_remaining)}</strong></div><div>Reste assurance<strong>{money(bill.balances.insurance_remaining)}</strong></div></div>
      <div className="cd-actions"><Button secondary onClick={() => setDocument(document ? null : {})}>{document ? "Masquer le document" : "Facture et impression"}</Button>
        {overview.manager && !bill.balances.cancelled && <Button secondary onClick={() => setOperation(operation === "credit" ? "" : "credit")}>Créer un avoir</Button>}
      </div>
      {operation === "credit" && <CreditForm bill={bill} onSuccess={(r) => { updated(r); setDocument({ creditId: r.credit_id }); }} onCancel={() => setOperation("")} />}
      {document && <BillDocument bill={bill} {...document} />}
    </Panel>
    {!bill.balances.cancelled && Number(bill.balances[`${payer.toLowerCase()}_remaining`]) > 0 && <Panel title={payer === "INSURANCE" ? "Enregistrer le règlement de l’assurance" : "Encaisser la part patient"}>
      {!overview.session ? <><p>Ouvrez votre caisse avant d’enregistrer un règlement.</p><Button onClick={onSession}>Ouvrir ma caisse</Button></> : <PaymentForm key={`${bill.id}-${version}-${payer}`} bill={bill} payer={payer} onSuccess={updated} />}
    </Panel>}
    {!bill.balances.cancelled && Number(bill.patient_share) === 0 && !bill.coverage_confirmed && <Panel title="Valider la prise en charge"><p>Aucun règlement patient n’est nécessaire. La confirmation permet d’orienter les prestations vers les services.</p>
      {overview.session ? <Button busy={task.busy} onClick={() => task.run(async () => updated(await action("coverage", { bill_id: bill.id })))}>Confirmer la prise en charge</Button> : <Button onClick={onSession}>Ouvrir ma caisse</Button>}</Panel>}
    <Panel title="Règlements et corrections">
      {bill.payments.length ? <Table label="Règlements" headers={["Reçu", "Date et caissier", "Payeur", "Mode", "Montant", "Actions"]}>
        {bill.payments.map((p) => <tr key={p.id}><td><code>{p.number}</code></td><td>{dateTime(p.created_at)}<small>{p.cashier}</small></td><td>{p.payer === "PATIENT" ? "Patient" : "Assurance"}</td><td>{modes[p.mode]}</td><td>{money(p.amount)}{Number(p.refunded) > 0 && <small>Remboursé {money(p.refunded)}</small>}</td><td><div className="cd-actions"><Button secondary onClick={() => setDocument({ paymentIds: [p.id] })}>Reçu</Button>
          {overview.manager && Number(bill.balances[`${p.payer.toLowerCase()}_refundable`]) > 0 && Number(p.refunded) < Number(p.amount) && <Button secondary onClick={() => setOperation(`refund-${p.id}`)}>Rembourser</Button>}</div></td></tr>)}
      </Table> : <Empty>Aucun encaissement enregistré pour cette facture.</Empty>}
      {operation.startsWith("refund-") && <RefundForm bill={bill} payment={bill.payments.find((p) => p.id === Number(operation.split("-")[1]))}
        hasSession={!!overview.session} onSession={onSession} onCancel={() => setOperation("")} onSuccess={(r) => { updated(r); setDocument({ refundId: r.refund_id }); }} />}
      {bill.credits.map((c) => <div className="cd-record" key={c.id}><div><strong>{c.number}</strong><p>{c.reason} · Patient {money(c.patient_amount)} · Assurance {money(c.insurance_amount)}</p></div><Button secondary onClick={() => setDocument({ creditId: c.id })}>Imprimer l’avoir</Button></div>)}
      {bill.refunds.map((r) => <div className="cd-record" key={r.id}><div><strong>{r.number}</strong><p>{money(r.amount)} · {r.reason}</p></div><Button secondary onClick={() => setDocument({ refundId: r.id })}>Reçu de remboursement</Button></div>)}
    </Panel>
  </>}</LoadState>;
}

function PaymentForm({ bill, payer, onSuccess }) {
  const remaining = bill.balances[`${payer.toLowerCase()}_remaining`];
  const [rows, setRows] = useState([{ mode: "CASH", amount: remaining, tendered: remaining, reference: "", confirmed: false }]);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const task = useTask();
  const set = (index, field, value) => { setConfirmed(false); setRows((ls) => ls.map((l, i) => i === index ? { ...l, [field]: value } : l)); };
  const paid = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  async function submit(e) {
    e.preventDefault();
    if (!confirmed) { setConfirmed(true); return; }
    await task.run(async () => onSuccess(await action("collect", { bill_id: bill.id, payer, payments: rows, partial_reason: reason })));
  }
  return <form onSubmit={submit}><Alert>{task.error}</Alert><fieldset disabled={task.busy}>
    <p className="cd-amount-due">Reste à payer <strong>{money(remaining)}</strong></p>
    {rows.map((r, i) => <div className="cd-payment-row" key={i}><div className="cd-grid">
      <Select label="Mode de règlement" value={r.mode} onChange={(e) => set(i, "mode", e.target.value)}>{Object.entries(modes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      <Field label="Montant encaissé" required type="number" min="0.01" step="0.01" max={remaining} value={r.amount} onChange={(e) => set(i, "amount", e.target.value)} />
      {r.mode === "CASH" ? <><Field label="Montant remis" required type="number" min={r.amount} step="0.01" value={r.tendered} onChange={(e) => set(i, "tendered", e.target.value)} /><p>Monnaie à rendre <strong>{money(Math.max(0, Number(r.tendered) - Number(r.amount)))}</strong></p></>
        : <><Field label="Référence de transaction" required maxLength={100} value={r.reference} onChange={(e) => set(i, "reference", e.target.value)} /><label className="cd-check"><input type="checkbox" required checked={r.confirmed} onChange={(e) => set(i, "confirmed", e.target.checked)} />J’ai vérifié la réception du paiement</label></>}
    </div>{rows.length > 1 && <Button secondary onClick={() => { setRows(rows.filter((_, n) => n !== i)); setConfirmed(false); }}>Retirer ce moyen de règlement</Button>}</div>)}
    <div className="cd-actions"><Button secondary disabled={rows.length >= 4} onClick={() => { setRows([...rows, { mode: "MOBILE", amount: "", reference: "", confirmed: false }]); setConfirmed(false); }}><Plus size={17} />Répartir sur un autre moyen</Button></div>
    {paid < Number(remaining) && <Field label="Motif du paiement partiel" required minLength={3} value={reason} onChange={(e) => { setReason(e.target.value); setConfirmed(false); }} />}
    <p>Total à enregistrer <strong>{money(paid)}</strong> · Reste après ce règlement <strong>{money(Math.max(0, Number(remaining) - paid))}</strong></p>
    {confirmed && <div className="cd-notice">Confirmez la réception de {money(paid)} pour {bill.patient.full_name}. Le règlement sera enregistré dans votre session.</div>}
    <div className="cd-actions"><Button type="submit" busy={task.busy} disabled={paid <= 0 || paid > Number(remaining)}><Check size={18} />{confirmed ? "Confirmer l’encaissement" : "Vérifier le règlement"}</Button>{confirmed && <Button secondary onClick={() => setConfirmed(false)}>Revenir à la saisie</Button>}</div>
  </fieldset></form>;
}

function CreditForm({ bill, onSuccess, onCancel }) {
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState("");
  const task = useTask();
  return <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); task.run(async () => onSuccess(await action("credit", { bill_id: bill.id, reason, lines: Object.entries(quantities).filter(([, q]) => Number(q) > 0).map(([line, quantity]) => ({ line: Number(line), quantity: Number(quantity) })) }))); }}>
    <h3>Annuler des prestations par un avoir</h3><p>L’avoir conserve la facture et ouvre un remboursement si une somme a déjà été reçue.</p><Alert>{task.error}</Alert><fieldset disabled={task.busy}><div className="cd-grid">
      {bill.lines.filter((l) => l.quantity > l.credited_quantity).map((l) => <Field key={l.id} label={`${l.label} · quantité à annuler`} type="number" min={0} max={l.quantity - l.credited_quantity} value={quantities[l.id] || 0} onChange={(e) => setQuantities({ ...quantities, [l.id]: e.target.value })} />)}
    </div><Field label="Motif de l’avoir" required minLength={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /><div className="cd-actions"><Button danger type="submit" busy={task.busy}>Confirmer l’avoir</Button><Button secondary onClick={onCancel}>Annuler</Button></div></fieldset>
  </form>;
}

function RefundForm({ bill, payment, hasSession, onSession, onSuccess, onCancel }) {
  const [amount, setAmount] = useState(Math.min(Number(bill.balances[`${payment.payer.toLowerCase()}_refundable`]), Number(payment.amount) - Number(payment.refunded)));
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const task = useTask();
  if (!hasSession) return <div className="cd-inset"><p>Ouvrez votre caisse pour enregistrer le remboursement.</p><Button onClick={onSession}>Ma caisse</Button></div>;
  return <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); task.run(async () => onSuccess(await action("refund", { payment_id: payment.id, amount, reason, reference, confirmed }))); }}>
    <h3>Rembourser {payment.number}</h3><p>Remboursement par {modes[payment.mode]}.</p><Alert>{task.error}</Alert><fieldset disabled={task.busy}>
      <div className="cd-grid"><Field label="Montant à rembourser" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Field label="Motif du remboursement" minLength={3} maxLength={1000} required value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      {payment.mode !== "CASH" && <Field label="Référence du remboursement" required value={reference} onChange={(e) => setReference(e.target.value)} />}
      <label className="cd-check"><input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Je confirme avoir remis ou transféré cette somme au payeur</label>
      <div className="cd-actions"><Button danger type="submit" busy={task.busy}>Enregistrer le remboursement</Button><Button secondary onClick={onCancel}>Annuler</Button></div>
    </fieldset></form>;
}
