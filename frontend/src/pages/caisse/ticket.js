import api from "../../services/api";

const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const money = (value) => new Intl.NumberFormat("fr-FR").format(Number(value || 0));

// Ticket A5 portrait, trois souches : clinique, patient, comptabilité.
const SOUCHES = ["Souche clinique", "Souche patient", "Souche comptabilité"];

export default async function printTicket(admissionId) {
  const win = window.open("", "_blank", "width=620,height=900");
  if (!win) return;
  win.document.write("<p style='font-family:system-ui;padding:24px'>Préparation du ticket…</p>");

  let t;
  try {
    t = (await api.post(`/parcours/caisse/patients/${admissionId}/ticket/`)).data;
  } catch {
    win.document.body.innerHTML = "<p style='font-family:system-ui;padding:24px'>Ticket indisponible.</p>";
    return;
  }

  const souche = (label) => `
    <section class="souche">
      <div class="head">
        <div><strong>${escape(t.etablissement.nom)}</strong><small>${escape(t.etablissement.slogan)}</small>
          <small>${escape([t.etablissement.adresse, t.etablissement.telephone].filter(Boolean).join(" · "))}</small></div>
        <div class="ref"><span>${escape(label)}</span><strong>${escape(t.reference)}</strong>
          ${t.duplicata ? "<em>DUPLICATA</em>" : ""}</div>
      </div>
      <table>
        <tr><td>Patient</td><td>${escape(t.patient)} <small>(${escape(t.dossier)})</small></td></tr>
        <tr><td>Prestation</td><td>${escape(t.prestation)}</td></tr>
        <tr><td>Tarif</td><td>${money(t.prix)} ${escape(t.etablissement.devise)}</td></tr>
        ${t.assurance ? `<tr><td>Assurance</td><td>${escape(t.assurance)} (${money(t.taux)} %) : − ${money(t.partAssurance)}</td></tr>` : ""}
        <tr class="total"><td>À payer</td><td>${money(t.aPayer)} ${escape(t.etablissement.devise)}</td></tr>
        <tr><td>Statut</td><td>${escape(t.statut)}</td></tr>
      </table>
      <footer>Émis le ${escape(t.date)}${t.encaisseLe ? ` · encaissé le ${escape(t.encaisseLe)}` : ""} · ${escape(t.caissier)}
        ${t.etablissement.agrement ? ` · Agrément ${escape(t.etablissement.agrement)}` : ""}</footer>
    </section>`;

  win.document.open();
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Ticket ${escape(t.reference)}</title>
  <style>
    @page { size: A5 portrait; margin: 8mm; }
    body { font-family: system-ui, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
    .souche { border: 1px solid #c2e0ff; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
    .souche + .souche { border-top: 2px dashed #98caf9; }
    .head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
    .head strong { color: #0b5d98; font-size: 13px; display: block; }
    .head small { display: block; color: #475569; }
    .ref { text-align: right; } .ref span { display: block; color: #475569; }
    .ref em { display: inline-block; margin-top: 2px; padding: 1px 6px; border: 1px solid #c94f4f; color: #c94f4f; font-style: normal; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 3px 0; border-bottom: 1px solid #e2e8f0; } td:first-child { color: #475569; width: 32%; }
    .total td { font-weight: 700; font-size: 12.5px; color: #0b5d98; }
    footer { margin-top: 5px; color: #475569; font-size: 10px; }
    .bar { margin: 10px; } @media print { .bar { display: none; } }
  </style></head><body>
  <div class="bar"><button onclick="window.print()">Imprimer</button></div>
  ${SOUCHES.map(souche).join("")}
  <script>window.onload = () => window.print();</script></body></html>`);
  win.document.close();
}
