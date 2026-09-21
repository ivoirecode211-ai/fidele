import { useState } from "react";
import { action, money, statuses, useResource, useTask } from "./api";
import { Alert, Button, Empty, Field, LoadState, Pager, Panel, Select, Table } from "./UI";
import { Printable } from "./Documents";

export default function Claims({ insurances, version, refresh, onBill }) {
  const [insurance, setInsurance] = useState("");
  const [page, setPage] = useState(1);
  const [batchPage, setBatchPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [support, setSupport] = useState("");
  const [dispute, setDispute] = useState(null);
  const [batch, setBatch] = useState(null);
  const claims = useResource("claims", { insurance, page }, version);
  const batches = useResource("batches", { page: batchPage }, version);
  const task = useTask();
  const submit = (name, body, done) => task.run(async () => { await action(name, body); refresh(); done?.(); });
  return <>
    <Panel title="Règlements des assurances" subtitle="Suivez les créances, les transmissions et les sommes réellement reçues.">
      <Select label="Organisme" value={insurance} onChange={(e) => { setInsurance(e.target.value); setSelected([]); setPage(1); }}><option value="">Toutes les assurances</option>{insurances.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
      <Alert>{task.error}</Alert>
      <LoadState resource={claims}>{claims.data?.results.length ? <Table label="Créances assurances" headers={["Sélection", "Facture et patient", "Organisme", "Reste dû", "État", "Actions"]}>
        {claims.data.results.map((b) => <tr key={b.id}><td><input type="checkbox" aria-label={`Sélectionner ${b.number}`} checked={selected.includes(b.id)}
          disabled={!insurance || b.claim_status !== "DUE" || Number(b.balances.insurance_remaining) === 0 || Number(b.balances.patient_remaining) > 0 || (Number(b.patient_share) === 0 && !b.coverage_confirmed)}
          onChange={(e) => setSelected(e.target.checked ? [...selected, b.id] : selected.filter((id) => id !== b.id))} /></td>
          <td><strong>{b.number}</strong><small>{b.patient.full_name}</small></td><td>{b.insurance.name}</td><td>{money(b.balances.insurance_remaining)}</td><td>{statuses[b.claim_status]}</td><td><div className="cd-actions">
            <Button secondary onClick={() => onBill(b.id, "INSURANCE")}>Détail et règlement</Button>
            {b.claim_status !== "DUE" && <Button secondary onClick={() => setDispute({ id: b.id, resolved: b.claim_status === "DISPUTED", reason: "" })}>{b.claim_status === "DISPUTED" ? "Résoudre le litige" : "Signaler un litige"}</Button>}
          </div></td></tr>)}
      </Table> : <Empty>Aucune créance assurance pour cette sélection.</Empty>}<Pager data={claims.data} onChange={setPage} /></LoadState>
      {selected.length > 0 && <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); submit("transmit", { insurance_id: Number(insurance), bill_ids: selected, supporting_reference: support }, () => { setSelected([]); setSupport(""); }); }}>
        <h3>Transmettre {selected.length} facture(s)</h3><Field label="Référence des justificatifs ou du dossier transmis" required minLength={3} maxLength={250} value={support} onChange={(e) => setSupport(e.target.value)} />
        <p>La référence permet de retrouver les pièces conservées dans vos archives. La transmission à l’organisme est effectuée par votre équipe.</p>
        <Button busy={task.busy} type="submit">Créer le bordereau et marquer transmis</Button></form>}
      {dispute && <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); submit("dispute", { bill_id: dispute.id, resolved: dispute.resolved, reason: dispute.reason }, () => setDispute(null)); }}><h3>{dispute.resolved ? "Résoudre la contestation" : "Signaler une contestation"}</h3>
        <Field label="Motif ou décision" required minLength={3} maxLength={1000} value={dispute.reason} onChange={(e) => setDispute({ ...dispute, reason: e.target.value })} />
        <p>Cette opération ne transfère aucune dette au patient.</p><div className="cd-actions"><Button type="submit" busy={task.busy}>Enregistrer le suivi</Button><Button secondary onClick={() => setDispute(null)}>Annuler</Button></div></form>}
    </Panel>
    <Panel title="Bordereaux transmis"><LoadState resource={batches}>
      {batches.data?.results.length ? <Table label="Bordereaux" headers={["Bordereau", "Assurance", "Factures", "Montant transmis", "Action"]}>{batches.data.results.map((b) => <tr key={b.id}><td>{b.number}</td><td>{b.insurance}</td><td>{b.rows.length}</td><td>{money(b.rows.reduce((sum, r) => sum + Number(r.amount), 0))}</td><td><Button secondary onClick={() => setBatch(b)}>Imprimer</Button></td></tr>)}</Table> : <Empty>Aucun bordereau transmis.</Empty>}
      <Pager data={batches.data} onChange={setBatchPage} />
    </LoadState>
    {batch && <Printable title="Bordereau assurance"><h2>{batch.number}</h2><p>{batch.insurance} · {batch.created_by}</p><p>Justificatifs {batch.supporting_reference}</p>
      <table><thead><tr><th>Facture</th><th>Patient</th><th>Assuré</th><th>Montant transmis</th></tr></thead><tbody>{batch.rows.map((r) => <tr key={r.bill_id}><td>{r.number}</td><td>{r.patient.full_name}</td><td>{r.insurance.member_number}</td><td>{money(r.amount)}</td></tr>)}</tbody></table>
      <p>Total {money(batch.rows.reduce((sum, r) => sum + Number(r.amount), 0))}</p></Printable>}
    </Panel>
  </>;
}
