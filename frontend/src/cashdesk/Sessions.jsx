import { useState } from "react";
import { action, dateTime, modes, money, statuses, useResource, useTask } from "./api";
import { Alert, Button, Empty, Field, LoadState, Pager, Panel, Select, Table } from "./UI";
import { Printable } from "./Documents";

export function MySession({ overview, refresh }) {
  const [opening, setOpening] = useState(0);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [closing, setClosing] = useState(false);
  const [movement, setMovement] = useState(null);
  const task = useTask();
  const session = overview.session;
  const expected = Number(session?.totals.expected_cash || 0);
  const submit = (name, body, done) => task.run(async () => { await action(name, body); refresh(); done?.(); });
  return <Panel title="Ma caisse" subtitle={session ? `${session.number} · Ouverte le ${dateTime(session.opened_at)}` : "Une session ouverte est nécessaire pour encaisser."}>
    <Alert>{task.error}</Alert>
    {!session ? <form onSubmit={(e) => { e.preventDefault(); submit("open", { opening_float: opening }); }}>
      <Field label="Fonds de caisse initial (FCFA)" required type="number" min={0} step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} />
      <Button type="submit" busy={task.busy}>Ouvrir ma caisse</Button>
    </form> : <>
      <div className="cd-totals"><div>Fonds initial<strong>{money(session.opening_float)}</strong></div><div>Espèces attendues<strong>{money(expected)}</strong></div><div>Reçus enregistrés<strong>{session.totals.receipts}</strong></div></div>
      <Table label="Encaissements nets par mode" headers={["Moyen de règlement", "Encaissements moins remboursements"]}>{Object.entries(session.totals.by_mode).map(([k, v]) => <tr key={k}><td>{modes[k]}</td><td>{money(v)}</td></tr>)}</Table>
      <p>Les espèces attendues comprennent le fonds initial et les mouvements. Les paiements électroniques restent séparés.</p>
      <div className="cd-actions"><Button secondary onClick={() => setMovement({ kind: "HANDOVER", amount: "", reason: "" })}>Ajouter un mouvement</Button><Button onClick={() => setClosing(true)}>Préparer la clôture</Button></div>
      {movement && <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); submit("movement", movement, () => setMovement(null)); }}><h3>Mouvement d’espèces</h3><fieldset disabled={task.busy}><div className="cd-grid">
        <Select label="Type de mouvement" value={movement.kind} onChange={(e) => setMovement({ ...movement, kind: e.target.value })}><option value="HANDOVER">Versement intermédiaire</option>{overview.manager && <><option value="IN">Apport</option><option value="OUT">Sortie</option></>}</Select>
        <Field label="Montant" required min="0.01" step="0.01" type="number" value={movement.amount} onChange={(e) => setMovement({ ...movement, amount: e.target.value })} />
        <Field label="Motif et destinataire" required minLength={3} maxLength={1000} value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })} />
      </div><div className="cd-actions"><Button type="submit" busy={task.busy}>Confirmer le mouvement</Button><Button secondary onClick={() => setMovement(null)}>Annuler</Button></div></fieldset></form>}
      {closing && <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); submit("close", { counted_cash: counted, reason }, () => { setClosing(false); setCounted(""); setReason(""); }); }}><h3>Clôturer ma caisse</h3><fieldset disabled={task.busy}>
        <Field label="Espèces comptées physiquement (FCFA)" required type="number" min={0} step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} />
        {counted !== "" && <p>Écart <strong>{money(Number(counted) - expected)}</strong></p>}
        <Field label="Justificatif de l’écart" required={counted !== "" && Number(counted) !== expected} minLength={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        <p>La clôture verrouille cette session. Le versement sera contrôlé par un autre responsable.</p>
        <div className="cd-actions"><Button type="submit" busy={task.busy}>Confirmer la clôture</Button><Button secondary onClick={() => setClosing(false)}>Continuer ma session</Button></div></fieldset></form>}
      {!!session.movements.length && <Table label="Mouvements de caisse" headers={["Date", "Mouvement", "Montant", "Motif", "Réception"]}>{session.movements.map((m) => <tr key={m.id}><td>{dateTime(m.created_at)}</td><td>{{ IN: "Apport", OUT: "Sortie", HANDOVER: "Versement" }[m.kind]}</td><td>{money(m.amount)}</td><td>{m.reason}</td><td>{m.kind === "HANDOVER" ? m.received ? "Reçu" : "À confirmer" : "Sans objet"}</td></tr>)}</Table>}
    </>}
  </Panel>;
}

export function SessionHistory({ overview, version, refresh }) {
  const [page, setPage] = useState(1);
  const resource = useResource("sessions", { page }, version);
  const [selected, setSelected] = useState(null);
  return <Panel title="Versements et sessions" subtitle="Clôtures, réception des fonds et justificatifs.">
    <LoadState resource={resource}>{resource.data?.results.length ? <Table label="Sessions de caisse" headers={["Session", "Caissier", "État", "Compté", "Action"]}>{resource.data.results.map((s) => <tr key={s.id}><td><code>{s.number}</code><small>{dateTime(s.opened_at)}</small></td><td>{s.cashier}</td><td><span className="cd-badge">{statuses[s.status]}</span></td><td>{s.counted_cash === null ? "Session en cours" : money(s.counted_cash)}</td><td><Button secondary onClick={() => setSelected(s.id)}>Détail</Button></td></tr>)}</Table> : <Empty>Aucune session enregistrée.</Empty>}<Pager data={resource.data} onChange={setPage} /></LoadState>
    {selected && <SessionDetail key={`${selected}-${version}`} sessionId={selected} overview={overview} refresh={refresh} onClose={() => setSelected(null)} />}
  </Panel>;
}

function SessionDetail({ sessionId, overview, refresh, onClose }) {
  const resource = useResource(`sessions/${sessionId}`);
  const [received, setReceived] = useState("");
  const [reason, setReason] = useState("");
  const task = useTask();
  const s = resource.data;
  const canReceive = s && overview.manager && s.cashier_id !== overview.user_id;
  return <div className="cd-inset"><Button secondary onClick={onClose}>Fermer le détail</Button><Alert>{task.error}</Alert><LoadState resource={resource}>{s && <>
    <Printable title="Bilan de session"><h2>{s.number}</h2><p>{s.cashier} · {statuses[s.status]}</p><p>Ouverture {dateTime(s.opened_at)}</p><p>Clôture {dateTime(s.closed_at)}</p>
      <dl><dt>Fonds initial</dt><dd>{money(s.opening_float)}</dd><dt>Espèces attendues</dt><dd>{money(s.totals.expected_cash)}</dd><dt>Espèces comptées</dt><dd>{s.counted_cash === null ? "Non comptées" : money(s.counted_cash)}</dd>
        <dt>Écart</dt><dd>{s.counted_cash === null ? "Non calculé" : money(Number(s.counted_cash) - Number(s.totals.expected_cash))}</dd>
        {Object.entries(s.totals.by_mode || {}).map(([k, v]) => <div key={k}><dt>{modes[k]}</dt><dd>{money(v)}</dd></div>)}
      </dl><p>{s.closing_note}</p>{s.validated_by && <p>Reçu par {s.validated_by} · {money(s.received_cash)} · {s.validation_note}</p>}
    </Printable>
    {s.status === "CLOSED" && canReceive && <form onSubmit={(e) => { e.preventDefault(); task.run(async () => { await action("validate", { session_id: s.id, received_cash: received, reason }); refresh(); }); }}><h3>Valider la réception des fonds</h3>
      <Field label="Montant reçu physiquement" required type="number" min={0} step="0.01" value={received} onChange={(e) => setReceived(e.target.value)} />
      <Field label="Justificatif de l’écart" required={received !== "" && Number(received) !== Number(s.counted_cash)} minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button type="submit" busy={task.busy}>Confirmer la réception</Button></form>}
    {s.status === "CLOSED" && !canReceive && <p>La validation attend un autre responsable habilité.</p>}
    {s.movements.filter((m) => m.kind === "HANDOVER").map((m) => <div className="cd-record" key={m.id}><div><strong>Versement intermédiaire {money(m.amount)}</strong><p>{m.reason} · {m.received ? "Réception confirmée" : "En attente de réception"}</p></div>{canReceive && !m.received && <Button secondary busy={task.busy} onClick={() => task.run(async () => { await action("receive-movement", { movement_id: m.id }); refresh(); })}>Confirmer la réception</Button>}</div>)}
  </>}</LoadState></div>;
}
