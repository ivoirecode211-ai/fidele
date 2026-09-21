import { useState } from "react";
import { Plus } from "lucide-react";
import { cash, money, useTask } from "./api";
import { Alert, Button, Empty, Field, Panel, Select, Table } from "./UI";

const categories = { CONSULTATION: "Consultation", EXAM: "Examen", CARE: "Soin", STAY: "Hospitalisation", OTHER: "Autre" };

export function Insurances({ items, manager, refresh }) {
  const [editing, setEditing] = useState(null);
  const task = useTask();
  const set = (key, value) => setEditing((v) => ({ ...v, [key]: value }));
  async function save(e) {
    e.preventDefault();
    await task.run(async () => { await (editing.id ? cash.patch(`insurances/${editing.id}`, editing) : cash.post("insurances", editing)); setEditing(null); refresh(); });
  }
  return <Panel title="Assurances partenaires" subtitle="Les changements de taux s’appliquent aux nouvelles factures."
    actions={manager && <Button onClick={() => setEditing({ name: "", code: "", rate: "", phone: "", email: "", address: "", active: true })}><Plus size={18} />Nouvelle assurance</Button>}>
    <Alert>{task.error}</Alert>
    {editing && <form className="cd-inset" onSubmit={save}><h3>{editing.id ? "Modifier l’assurance" : "Créer une assurance"}</h3><fieldset disabled={task.busy}><div className="cd-grid">
      <Field label="Nom de l’organisme" required maxLength={150} value={editing.name} onChange={(e) => set("name", e.target.value)} />
      <Field label="Code" required maxLength={30} value={editing.code} onChange={(e) => set("code", e.target.value)} />
      <Field label="Taux de prise en charge (%)" required type="number" min={0} max={100} step="0.01" value={editing.rate} onChange={(e) => set("rate", e.target.value)} />
      <Field label="Téléphone" type="tel" maxLength={40} value={editing.phone} onChange={(e) => set("phone", e.target.value)} />
      <Field label="E-mail" type="email" value={editing.email} onChange={(e) => set("email", e.target.value)} />
      <Field label="Adresse" maxLength={250} value={editing.address} onChange={(e) => set("address", e.target.value)} />
    </div><label className="cd-check"><input type="checkbox" checked={editing.active} onChange={(e) => set("active", e.target.checked)} />Assurance active</label>
    <div className="cd-actions"><Button type="submit" busy={task.busy}>Enregistrer l’assurance</Button><Button secondary onClick={() => setEditing(null)}>Annuler</Button></div></fieldset></form>}
    {items.length ? <Table label="Assurances" headers={["Organisme", "Taux", "Contact", "État", "Action"]}>{items.map((i) => <tr key={i.id}><td><strong>{i.name}</strong><small>{i.code}</small></td><td>{i.rate} %</td><td>{i.phone || i.email || "Non renseigné"}</td><td>{i.active ? "Active" : "Désactivée"}</td><td>{manager && <Button secondary onClick={() => setEditing({ ...i })}>Modifier</Button>}</td></tr>)}</Table> : <Empty>Aucune assurance. Ajoutez les organismes partenaires avant de leur rattacher des patients.</Empty>}
  </Panel>;
}

export function Benefits({ benefits, services, insurances, rules, manager, refresh }) {
  const [editing, setEditing] = useState(null);
  const [service, setService] = useState(null);
  const [rule, setRule] = useState(null);
  const task = useTask();
  const save = (path, data, done) => task.run(async () => { await (data.id ? cash.patch(`${path}/${data.id}`, data) : cash.post(path, data)); done(null); refresh(); });
  return <>
    <Panel title="Prestations et tarifs" subtitle="Chaque prestation détermine son service et son prix."
      actions={manager && <Button onClick={() => setEditing({ name: "", code: "", service: "", category: "CONSULTATION", price: "", covered: true, active: true })}><Plus size={18} />Nouvelle prestation</Button>}>
      <Alert>{task.error}</Alert>
      {editing && <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); save("benefits", editing, setEditing); }}><h3>{editing.id ? "Modifier la prestation" : "Créer une prestation"}</h3><fieldset disabled={task.busy}><div className="cd-grid">
        <Field label="Libellé" required maxLength={150} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        <Field label="Code" required maxLength={30} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
        <Select label="Service" required value={editing.service} onChange={(e) => setEditing({ ...editing, service: Number(e.target.value) })}><option value="">Sélectionner</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}{!s.active ? " (désactivé)" : ""}</option>)}</Select>
        <Select label="Catégorie" required value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{Object.entries(categories).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Field label="Prix unitaire (FCFA)" required type="number" min={0} step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
      </div><label className="cd-check"><input type="checkbox" checked={editing.covered} onChange={(e) => setEditing({ ...editing, covered: e.target.checked })} />Prestation couverte par l’assurance</label>
        <label className="cd-check"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />Prestation active</label>
        <div className="cd-actions"><Button type="submit" busy={task.busy}>Enregistrer la prestation</Button><Button secondary onClick={() => setEditing(null)}>Annuler</Button></div></fieldset></form>}
      {benefits.length ? <Table label="Catalogue des prestations" headers={["Prestation", "Service", "Tarif", "Couverture", "État", "Action"]}>{benefits.map((b) => <tr key={b.id}><td><strong>{b.name}</strong><small>{b.code} · {categories[b.category]}</small></td><td>{b.service_name}</td><td>{money(b.price)}</td><td>{b.covered ? "Selon l’assurance" : "Non couverte"}</td><td>{b.active ? "Active" : "Désactivée"}</td><td>{manager && <Button secondary onClick={() => setEditing({ ...b })}>Modifier</Button>}</td></tr>)}</Table> : <Empty>Aucune prestation configurée. Commencez par créer un service.</Empty>}
    </Panel>
    <Panel title="Services" actions={manager && <Button secondary onClick={() => setService({ name: "", active: true })}>Ajouter un service</Button>}>
      {service && <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); save("services", service, setService); }}><Field label="Nom du service" required value={service.name} onChange={(e) => setService({ ...service, name: e.target.value })} />
        <label className="cd-check"><input type="checkbox" checked={service.active} onChange={(e) => setService({ ...service, active: e.target.checked })} />Service actif</label><div className="cd-actions"><Button busy={task.busy} type="submit">Enregistrer le service</Button><Button secondary onClick={() => setService(null)}>Annuler</Button></div></form>}
      <div className="cd-records">{services.map((s) => <div className="cd-record" key={s.id}><span>{s.name} · {s.active ? "Actif" : "Désactivé"}</span>{manager && <Button secondary onClick={() => setService({ ...s })}>Modifier</Button>}</div>)}</div>
    </Panel>
    <Panel title="Règles de couverture" subtitle="Un taux particulier remplace le taux de l’organisme pour une prestation. Un taux de 0 % l’exclut."
      actions={manager && <Button secondary onClick={() => setRule({ insurance: "", benefit: "", rate: "" })}>Ajouter une règle</Button>}>
      {rule && <form className="cd-inset" onSubmit={(e) => { e.preventDefault(); save("rules", rule, setRule); }}><div className="cd-grid">
        <Select label="Assurance" required value={rule.insurance} onChange={(e) => setRule({ ...rule, insurance: Number(e.target.value) })}><option value="">Sélectionner</option>{insurances.map((i) => <option value={i.id} key={i.id}>{i.name}</option>)}</Select>
        <Select label="Prestation" required value={rule.benefit} onChange={(e) => setRule({ ...rule, benefit: Number(e.target.value) })}><option value="">Sélectionner</option>{benefits.filter((b) => b.covered).map((b) => <option value={b.id} key={b.id}>{b.name}</option>)}</Select>
        <Field label="Taux spécifique (%)" required min={0} max={100} step="0.01" type="number" value={rule.rate} onChange={(e) => setRule({ ...rule, rate: e.target.value })} />
      </div><div className="cd-actions"><Button type="submit" busy={task.busy}>Enregistrer la règle</Button><Button secondary onClick={() => setRule(null)}>Annuler</Button></div></form>}
      {rules.length ? <Table label="Règles par assurance et prestation" headers={["Assurance", "Prestation", "Taux", "Action"]}>{rules.map((r) => <tr key={r.id}><td>{insurances.find((i) => i.id === r.insurance)?.name}</td><td>{benefits.find((b) => b.id === r.benefit)?.name}</td><td>{r.rate} %</td><td>{manager && <Button secondary onClick={() => setRule({ ...r })}>Modifier</Button>}</td></tr>)}</Table> : <Empty>Les taux généraux des assurances s’appliquent aux prestations couvertes.</Empty>}
    </Panel>
  </>;
}

export function ClinicForm({ settings, refresh }) {
  const [values, setValues] = useState(settings);
  const [saved, setSaved] = useState(false);
  const task = useTask();
  return <Panel title="Informations imprimées" subtitle="Les nouvelles factures conservent les informations de la clinique à leur date de création."><Alert>{task.error}</Alert><Alert success>{saved && "Informations enregistrées."}</Alert>
    <form onSubmit={(e) => { e.preventDefault(); task.run(async () => { await cash.patch("clinic", values); setSaved(true); refresh(); }); }}><fieldset disabled={task.busy}><div className="cd-grid">{[["name", "Nom de la clinique"], ["address", "Adresse"], ["phone", "Téléphone"], ["legal_info", "Mentions sur les documents"]].map(([k, label]) => <Field key={k} label={label} required={k === "name"} value={values[k]} onChange={(e) => { setValues({ ...values, [k]: e.target.value }); setSaved(false); }} />)}</div><Button type="submit" busy={task.busy}>Enregistrer les informations</Button></fieldset></form>
  </Panel>;
}
