import { useState } from "react";
import { Download } from "lucide-react";
import { dateTime, modes, money, useResource } from "./api";
import { Button, Empty, Field, LoadState, Panel, Select, Table, Pager } from "./UI";
import { Printable } from "./Documents";

export function exportRows(rows, file) {
  const cell = (value) => { const text = String(value ?? ""); return `"${(/^[=+@-]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`; };
  const csv = "\ufeff" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = file; a.click(); URL.revokeObjectURL(url);
}

export default function Reports({ catalog, overview, version }) {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ start: `${today.slice(0, 8)}01`, end: today, cashier: "", service: "", benefit: "", insurance: "", mode: "" });
  const [printing, setPrinting] = useState(false);
  const resource = useResource("reports", filters, version);
  const set = (key, value) => { setFilters((v) => ({ ...v, [key]: value })); setPrinting(false); };
  const report = resource.data;
  const metrics = { billed: "Prestations facturées", patient_collected: "Encaissements patients", insurance_collected: "Règlements assurances reçus", refunded: "Remboursements", net_collected: "Encaissements nets", credits: "Avoirs émis", patient_outstanding: "Reste patient actuel", insurance_outstanding: "Reste assurance actuel" };
  const download = () => exportRows([
    ["Bilan", filters.start, filters.end], ...Object.entries(metrics).map(([k, l]) => [l, report.totals[k]]), [],
    ["Date", "Référence", "Facture", "Patient", "Caissier", "Payeur", "Mode", "Prestation", "Montant"],
    ...report.rows.map((r) => [dateTime(r.date), r.number, r.invoice, r.patient, r.cashier, r.payer === "PATIENT" ? "Patient" : "Assurance", modes[r.mode], r.prestation, r.amount]),
  ], `bilan-${filters.start}-${filters.end}.csv`);
  return <Panel title="Bilans de caisse" subtitle="Les encaissements suivent la date du règlement. Les créances restent séparées."
    actions={<><Button secondary disabled={!report || resource.loading} onClick={download}><Download size={17} />Exporter pour Excel</Button><Button secondary disabled={!report || resource.loading} onClick={() => setPrinting(!printing)}>Imprimer le bilan</Button></>}>
    <div className="cd-grid cd-filters"><Field label="Du" type="date" required value={filters.start} onChange={(e) => set("start", e.target.value)} /><Field label="Au" type="date" required value={filters.end} onChange={(e) => set("end", e.target.value)} />
      {overview.manager && <Select label="Caissier" value={filters.cashier} onChange={(e) => set("cashier", e.target.value)}><option value="">Tous les caissiers</option>{catalog.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>}
      <Select label="Service" value={filters.service} onChange={(e) => set("service", e.target.value)}><option value="">Tous les services</option>{catalog.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
      <Select label="Prestation" value={filters.benefit} onChange={(e) => set("benefit", e.target.value)}><option value="">Toutes les prestations</option>{catalog.benefits.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      <Select label="Assurance" value={filters.insurance} onChange={(e) => set("insurance", e.target.value)}><option value="">Avec ou sans assurance</option><option value="none">Sans assurance</option>{catalog.insurances.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
      <Select label="Mode de règlement" value={filters.mode} onChange={(e) => set("mode", e.target.value)}><option value="">Tous les modes</option>{Object.entries(modes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
    </div><p>Le filtre de règlement concerne les encaissements. Les soldes correspondent aux factures créées dans la période sélectionnée.</p>
    <LoadState resource={resource}>{report && <>
      <div className="cd-metrics">{Object.entries(metrics).map(([key, label]) => <div key={key}><span>{label}</span><strong>{money(report.totals[key])}</strong></div>)}</div>
      {report.rows.length ? <Table label="Journal des encaissements et remboursements" headers={["Date", "Référence", "Patient", "Prestation", "Mode", "Montant"]}>{report.rows.map((r, i) => <tr key={`${r.number}-${i}`}><td>{dateTime(r.date)}</td><td><code>{r.number}</code><small>{r.cashier}</small></td><td>{r.patient}</td><td>{r.prestation}</td><td>{modes[r.mode]}</td><td>{money(r.amount)}</td></tr>)}</Table> : <Empty>Aucun encaissement ou remboursement dans cette sélection.</Empty>}
      {printing && <Printable title="Bilan financier"><h2>Ma Santé</h2><p>Bilan du {filters.start} au {filters.end}</p><dl>{Object.entries(metrics).map(([k, l]) => <div key={k}><dt>{l}</dt><dd>{money(report.totals[k])}</dd></div>)}</dl>
        <table><thead><tr><th>Prestation</th><th>Encaissement net</th></tr></thead><tbody>{report.per_benefit.map((r) => <tr key={r.name}><td>{r.name}</td><td>{money(r.net)}</td></tr>)}</tbody></table></Printable>}
    </>}</LoadState>
  </Panel>;
}

export function Journal({ version }) {
  const [page, setPage] = useState(1);
  const resource = useResource("audit", { page }, version);
  return <Panel title="Journal des opérations" subtitle="Actions enregistrées et utilisateur responsable."><LoadState resource={resource}>
    {resource.data?.results.length ? <Table label="Journal des opérations" headers={["Date", "Utilisateur", "Opération", "Référence interne"]}>{resource.data.results.map((e) => <tr key={e.id}><td>{dateTime(e.created_at)}</td><td>{e.actor}</td><td>{e.action.replaceAll("_", " ")}</td><td>{e.object_id}</td></tr>)}</Table> : <Empty>Aucune opération enregistrée.</Empty>}
    <Pager data={resource.data} onChange={setPage} /></LoadState></Panel>;
}
