import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Save, Search, UserPlus } from "lucide-react";
import { action, cash, useResource, useTask } from "./api";
import { Alert, Button, Empty, Field, LoadState, Pager, Panel, Select, Table } from "./UI";
import { AdmissionTicket } from "./Documents";

const initial = { last_name: "", first_names: "", birth_date: "", sex: "", nationality: "Côte d’Ivoire", marital_status: "",
  city: "", locality: "", phone: "", emergency_contact: "", emergency_phone: "", emergency_relationship: "",
  insured: false, insurance_id: "", member_number: "", valid_until: "", holder: "" };
const marital = { SINGLE: "Célibataire", MARRIED: "Marié(e)", PARTNER: "En couple", DIVORCED: "Divorcé(e)", WIDOWED: "Veuf / veuve" };

export function Patients({ onAdmit, onVisit, onHistory, version, drafts, onResume, refresh }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const resource = useResource("patients", { q, page }, version);
  const task = useTask();
  async function visit(patient) {
    await task.run(async () => { const result = await action("visit", { patient_id: patient.id }); onVisit(result.visit_id); });
  }
  return <>
    <Panel title="Patients et admissions" subtitle="Retrouvez un dossier avant de créer une nouvelle admission."
      actions={<Button onClick={() => onAdmit(null)}><UserPlus size={18} />Nouveau patient</Button>}>
      <Field label="Rechercher un patient" placeholder="Nom, téléphone ou numéro de dossier" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <Alert>{task.error}</Alert>
      <LoadState resource={resource}>{resource.data?.results.length ? <Table label="Patients" headers={["Dossier", "Patient", "Téléphone", "Assurance", "Actions"]}>
        {resource.data?.results.map((p) => <tr key={p.id}><td><code>{p.patient_number}</code></td><td><strong>{p.full_name}</strong><small>{p.birth_date}</small></td>
          <td>{p.phone || "Non renseigné"}</td><td>{p.coverage?.name || "Sans assurance"}</td><td><div className="cd-actions">
            <Button busy={task.busy} onClick={() => visit(p)}>Nouvelle visite</Button>
            <Button secondary onClick={() => onAdmit(p)}>Modifier le dossier</Button>
            <Button secondary onClick={() => onHistory(p.id)}>Historique</Button></div></td></tr>)}
      </Table> : <Empty>Aucun patient trouvé. Vérifiez la recherche ou enregistrez un nouveau dossier.</Empty>}
      <Pager data={resource.data} onChange={setPage} /></LoadState>
    </Panel>
    {!!drafts?.length && <Panel title="Admissions en cours" subtitle="Reprenez un formulaire sauvegardé.">
      <div className="cd-records">{drafts.map((d) => <div className="cd-record" key={d.id}><div><strong>{`${d.data.last_name || ""} ${d.data.first_names || ""}`.trim() || "Nouveau dossier"}</strong><p>Étape {d.step + 1}</p></div>
        <Button secondary onClick={() => onResume(d)}>Reprendre</Button></div>)}</div>
    </Panel>}
  </>;
}

export default function Admission({ patient, draft, insurances, onCancel, onComplete, onSaved }) {
  const [values, setValues] = useState(() => draft?.data || (patient ? { ...initial, ...patient, patient_id: patient.id,
    insured: !!patient.coverage, insurance_id: patient.coverage?.insurance_id || "", member_number: patient.coverage?.member_number || "",
    valid_until: patient.coverage?.valid_until || "", holder: patient.coverage?.holder || "" } : { ...initial }));
  const [step, setStep] = useState(draft?.step || 0);
  const [draftId, setDraftId] = useState(draft?.id || null);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState(null);
  const task = useTask();
  const formRef = useRef(null);
  const dirty = useRef(false);
  const [matches, setMatches] = useState([]);
  useEffect(() => {
    if (patient || values.last_name.trim().length < 2) { setMatches([]); return; }
    let alive = true;
    const timer = setTimeout(() => cash.get("patients", { q: values.last_name }).then((r) => alive && setMatches(r.results)).catch(() => {}), 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [values.last_name, patient]);
  useEffect(() => {
    const before = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  function update(key, value) { dirty.current = true; setSaved(false); setValues((v) => ({ ...v, [key]: value })); }
  const input = (key) => ({ value: values[key] || "", onChange: (e) => update(key, e.target.value) });
  async function save(nextStep = step) {
    const body = { data: values, step: nextStep };
    const savedDraft = draftId ? await cash.patch(`drafts/${draftId}`, body) : await cash.post("drafts", body);
    setDraftId(savedDraft.id); setSaved(true); dirty.current = false; onSaved();
    return savedDraft.id;
  }
  async function next(e) {
    e.preventDefault();
    await task.run(async () => {
      const id = await save(step < 2 ? step + 1 : step);
      if (step < 2) { setStep(step + 1); return; }
      const body = Object.fromEntries(Object.keys(initial).map((k) => [k, values[k]]));
      body.draft_id = id;
      if (values.patient_id) body.patient_id = values.patient_id;
      body.insurance_id = values.insured ? Number(values.insurance_id) : null;
      body.valid_until = values.insured && values.valid_until ? values.valid_until : null;
      const response = await action("admit", body);
      dirty.current = false; setResult(response); onSaved(); onComplete(response.visit_id);
    });
  }
  if (result) return <Panel title="Patient enregistré" subtitle={`Admission ${result.number}`}>
    <Alert success>Le dossier est sauvegardé. Vous pouvez imprimer le ticket ou continuer vers le règlement.</Alert>
    <AdmissionTicket visitId={result.visit_id} />
    <Button onClick={() => onComplete(result.visit_id)}>Choisir les prestations et régler<ArrowRight size={18} /></Button>
  </Panel>;
  const insurance = insurances.find((i) => i.id === Number(values.insurance_id));
  return <Panel title={patient ? "Mettre à jour le dossier et ouvrir une visite" : "Enregistrer un patient"}>
    <ol className="cd-steps" aria-label="Étapes de l’admission">{["Identification", "Coordonnées et assurance", "Vérification"].map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <Alert>{task.error}</Alert><Alert success>{saved ? "Brouillon sauvegardé." : ""}</Alert>
    <form ref={formRef} onSubmit={next}>
      <fieldset disabled={task.busy}>
      {step === 0 && <><div className="cd-grid">
        <Field label="Nom" required {...input("last_name")} maxLength={120} autoComplete="family-name" />
        <Field label="Prénoms" required {...input("first_names")} maxLength={180} autoComplete="given-name" />
        <Field label="Date de naissance" required type="date" max={new Date().toISOString().slice(0, 10)} {...input("birth_date")} />
        <Select label="Sexe" required {...input("sex")}><option value="">Sélectionner</option><option value="M">Masculin</option><option value="F">Féminin</option><option value="O">Autre</option></Select>
        <Field label="Nationalité" required {...input("nationality")} maxLength={80} />
        <Select label="Situation matrimoniale" required {...input("marital_status")}><option value="">Sélectionner</option>{Object.entries(marital).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
      </div>{matches.length > 0 && <div className="cd-notice"><strong>Des dossiers portent ce nom</strong><p>{matches.slice(0, 4).map((m) => `${m.full_name} (${m.birth_date}, ${m.patient_number})`).join(" ; ")}</p><Button secondary onClick={onCancel}>Revenir à la recherche</Button></div>}</>}
      {step === 1 && <><div className="cd-grid">
        <Field label="Ville ou commune" required maxLength={120} {...input("city")} />
        <Field label="Commune ou localité" required maxLength={120} {...input("locality")} />
        <Field label="Téléphone mobile" required type="tel" maxLength={30} {...input("phone")} hint="Numéro du patient ou de son représentant." />
      </div><h3>Personne à contacter en cas d’urgence <small>Facultatif</small></h3><div className="cd-grid">
        <Field label="Nom du contact" maxLength={180} {...input("emergency_contact")} />
        <Field label="Téléphone du contact" type="tel" maxLength={30} {...input("emergency_phone")} />
        <Field label="Lien avec le patient" maxLength={80} {...input("emergency_relationship")} />
      </div><fieldset className="cd-choice"><legend>Le patient est-il assuré ?</legend>{[[false, "Non"], [true, "Oui"]].map(([value, label]) => <label key={label}><input type="radio" name="insured" checked={values.insured === value} onChange={() => update("insured", value)} />{label}</label>)}</fieldset>
      {values.insured && <div className="cd-grid cd-inset">
        <Select label="Assurance" required {...input("insurance_id")}><option value="">Sélectionner l’organisme</option>{insurances.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.name} ({i.rate} %)</option>)}</Select>
        <Field label="Numéro d’assuré" required maxLength={100} {...input("member_number")} />
        <Field label="Titulaire du contrat" maxLength={180} {...input("holder")} />
        <Field label="Couverture valable jusqu’au" type="date" {...input("valid_until")} hint="Facultatif si aucune échéance n’est communiquée." />
        {insurance && <p className="cd-notice">Prise en charge de {insurance.rate} % sur les prestations couvertes, sous réserve des règles du contrat.</p>}
      </div>}</>}
      {step === 2 && <div className="cd-summary"><h3>{values.last_name} {values.first_names}</h3><dl>
        <dt>Naissance</dt><dd>{values.birth_date}</dd><dt>Nationalité</dt><dd>{values.nationality}</dd>
        <dt>Situation matrimoniale</dt><dd>{marital[values.marital_status]}</dd><dt>Coordonnées</dt><dd>{values.city}, {values.locality} · {values.phone}</dd>
        <dt>Contact d’urgence</dt><dd>{[values.emergency_contact, values.emergency_phone, values.emergency_relationship].filter(Boolean).join(" · ") || "Non renseigné"}</dd>
        <dt>Assurance</dt><dd>{values.insured ? `${insurance?.name || "À vérifier"} · ${values.member_number}` : "Sans assurance"}</dd>
      </dl><p>Le dossier sera conservé avant de préparer les prestations et le règlement.</p></div>}
      <div className="cd-form-actions"><Button secondary onClick={() => { if (step > 0) setStep(step - 1); else onCancel(); }}><ArrowLeft size={16} />{step ? "Précédent" : "Retour"}</Button>
        <Button secondary onClick={() => task.run(() => save())}><Save size={16} />Sauvegarder le brouillon</Button>
        <Button type="submit" busy={task.busy}>{step === 2 ? "Enregistrer et continuer" : "Continuer"}<ArrowRight size={16} /></Button></div>
      </fieldset>
    </form>
  </Panel>;
}
