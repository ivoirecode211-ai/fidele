import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity, BedDouble, CalendarDays, FileText, FlaskConical, History, IdCard, KeyRound, Pencil,
  Pill, Receipt, Search, Stethoscope, TriangleAlert, Droplet, ArrowLeft, Lock, Copy, Merge, ChevronLeft, ChevronRight,
} from "lucide-react";

import "../styles/dossier.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { messageErreur } from "../accueil/api";

/*
 * ============================================================
 * DOSSIER PATIENT
 * ============================================================
 *
 * Tout ce que les modules savent d'un patient, au même endroit :
 * caisse, constantes, consultations, ordonnances, laboratoire,
 * hospitalisation, rendez-vous, documents, espace patient.
 * Rien n'est recopié : chaque section est lue dans son module.
 * Chacun ne voit que les sections de son métier ; chaque
 * ouverture de dossier est inscrite au journal d'audit.
 * ============================================================
 */

export default function Dossiers() {
  const { id } = useParams();
  return id ? <DossierOuvert id={id} /> : <Recherche />;
}

/* ============================================================
   RECHERCHE
   ============================================================ */

const LISTES = [
  { id: "recherche", label: "Rechercher", icone: Search, titre: "Dossiers patients", sous: "Tout l'historique d'un patient, tous modules confondus" },
  { id: "jour", label: "Patients du jour", icone: CalendarDays, titre: "Patients du jour", sous: "Passés à la caisse aujourd'hui" },
  { id: "recents", label: "Récemment ouverts", icone: History, titre: "Récemment ouverts", sous: "Les derniers dossiers que vous avez consultés" },
  { id: "hospitalises", label: "Hospitalisés", icone: BedDouble, titre: "Patients hospitalisés", sous: "Actuellement dans un lit" },
  { id: "doublons", label: "Doublons", icone: Copy, titre: "Dossiers en double", sous: "Même nom et même date de naissance, ou même téléphone" },
];

function Recherche() {
  const [ecran, setEcran] = useState("recherche");
  return (
    <Coquille ecrans={LISTES} ecran={ecran} onEcran={setEcran}>
      {ecran === "recherche" && <Rechercher />}
      {["jour", "recents", "hospitalises"].includes(ecran) && <Liste key={ecran} vue={ecran} />}
      {ecran === "doublons" && <Doublons />}
    </Coquille>
  );
}

function LignePatient({ p, extra }) {
  const navigate = useNavigate();
  return (
    <li>
      <button type="button" onClick={() => navigate(`/dossiers/${p.id}`)}>
        <span className="ds-avatar">{p.name.split(" ").map((m) => m[0]).join("").slice(0, 2)}</span>
        <div>
          <strong>{p.name}</strong>
          <span>{[p.sex, p.age !== null ? `${p.age} ans` : "", p.phone, extra].filter(Boolean).join(" · ")}</span>
        </div>
        <code>{p.code}</code>
        {p.allergies && <span className="ds-puce-alerte" title="Allergies signalées"><TriangleAlert size={15} /></span>}
      </button>
    </li>
  );
}

/* 20 lignes par page : tous les dossiers restent accessibles, sans liste sans fin. */
const PAR_PAGE = 20;

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <nav className="ds-pagination" aria-label="Pages">
      <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />Précédent
      </button>
      <span aria-live="polite">Page <strong>{page}</strong> sur {pages}</span>
      <button type="button" className="secondary-button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Suivant<ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </nav>
  );
}

function Rechercher() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/dossier/patients/", { params: { q, page } }).then(({ data }) => setDonnees(data))
        .catch(() => setDonnees({ total: 0, page: 1, pages: 1, patients: [] }));
    }, 250);
    return () => clearTimeout(t);
  }, [q, page]);

  const changerPage = (n) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Rechercher un dossier</h2>
          <p>{donnees ? `${donnees.total} dossier(s) dans l'hôpital.` : "…"} Nom, code patient, téléphone ou n° d'assuré.</p>
        </div>
      </div>
      <label className="recherche">
        <Search size={17} strokeWidth={2} aria-hidden="true" />
        <input value={q} autoFocus onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Ex. KONE, P26F46MAS, 07 00…" aria-label="Rechercher un patient" />
      </label>
      {!donnees ? <Chargement /> : donnees.patients.length === 0 ? <p className="vide">Aucun dossier ne correspond.</p> : (
        <>
          <ul className="ds-resultats">{donnees.patients.map((p) => <LignePatient key={p.id} p={p} />)}</ul>
          <Pagination page={donnees.page || 1} pages={donnees.pages || 1} onPage={changerPage} />
        </>
      )}
    </section>
  );
}

const VIDES = {
  jour: "Aucun patient n'est passé à la caisse aujourd'hui.",
  recents: "Vous n'avez encore ouvert aucun dossier.",
  hospitalises: "Aucun patient n'est hospitalisé en ce moment.",
};

function Liste({ vue }) {
  const [donnees, setDonnees] = useState(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
    api.get(`/dossier/listes/${vue}/`).then(({ data }) => setDonnees(data.patients)).catch(() => setDonnees([]));
  }, [vue]);
  const pages = Math.max(1, Math.ceil((donnees?.length || 0) / PAR_PAGE));
  const extra = (p) => (vue === "recents" ? `ouvert le ${p.ouvertLe}` : vue === "hospitalises" ? `lit ${p.lit}, depuis le ${p.depuis}` : "");
  return (
    <section className="bloc">
      {!donnees ? <Chargement /> : donnees.length === 0 ? <p className="vide">{VIDES[vue]}</p> : (
        <>
          <ul className="ds-resultats">
            {donnees.slice((page - 1) * PAR_PAGE, page * PAR_PAGE).map((p) => <LignePatient key={p.id} p={p} extra={extra(p)} />)}
          </ul>
          <Pagination page={page} pages={pages} onPage={(n) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        </>
      )}
    </section>
  );
}

function Doublons() {
  const { user } = useAuth();
  const peutFusionner = user?.is_superuser || [user?.role, ...(user?.roles || [])].some((r) => ["ADMIN", "DIRECTOR"].includes(r));
  const [groupes, setGroupes] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    api.get("/dossier/listes/doublons/").then(({ data }) => setGroupes(data.groupes)).catch(() => setGroupes([]));
  }, [version]);

  async function fusionner(garde, doublon) {
    if (!window.confirm(`Fusionner ${doublon.code} dans ${garde.code} ?\n\nTout ce qui est rattaché à ${doublon.code} (passages, consultations, ordonnances, documents…) passera dans ${garde.code}, puis ${doublon.code} sera supprimé. Cette opération est inscrite au journal et ne peut pas être annulée.`)) return;
    try { await api.post("/dossier/fusion/", { garde: garde.id, doublon: doublon.id }); setVersion((n) => n + 1); }
    catch (e) { alert(messageErreur(e)); }
  }

  if (!groupes) return <Chargement />;
  if (groupes.length === 0) return <section className="bloc"><p className="vide">Aucun dossier en double détecté.</p></section>;
  return (
    <div className="ds-doublons">
      {!peutFusionner && <p className="bandeau info"><span>Signalez ces doublons à l'administration : elle seule peut les fusionner.</span></p>}
      {groupes.map((g) => {
        const [garde, ...autres] = g.patients;
        return (
          <section key={g.patients.map((p) => p.id).join("-")} className="bloc ds-doublon">
            <p className="ds-doublon-critere">{g.critere}</p>
            <ul className="ds-resultats">
              {g.patients.map((p, i) => <LignePatient key={p.id} p={p} extra={`créé le ${p.createdAt}${i === 0 ? " · le plus ancien, gardé" : ""}`} />)}
            </ul>
            {peutFusionner && autres.map((d) => (
              <button key={d.id} type="button" className="secondary-button" onClick={() => fusionner(garde, d)}>
                <Merge size={16} strokeWidth={2} />Fusionner {d.code} dans {garde.code}
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/* ============================================================
   DOSSIER OUVERT
   ============================================================ */

const SECTIONS = [
  { id: "synthese", label: "Synthèse", icone: History, sous: "Chronologie de tout le parcours" },
  { id: "identite", label: "Identité", icone: IdCard, sous: "Coordonnées, contacts et informations médicales" },
  { id: "consultations", label: "Consultations", icone: Stethoscope, sous: "Motifs, diagnostics et traitements" },
  { id: "constantes", label: "Constantes", icone: Activity, sous: "Mesures prises en soins infirmiers" },
  { id: "ordonnances", label: "Ordonnances", icone: Pill, sous: "Prescriptions et délivrance en pharmacie" },
  { id: "laboratoire", label: "Laboratoire", icone: FlaskConical, sous: "Demandes et résultats d'analyses" },
  { id: "hospitalisations", label: "Hospitalisation", icone: BedDouble, sous: "Séjours, lits et sorties" },
  { id: "rendezVous", label: "Rendez-vous", icone: CalendarDays, sous: "À venir et passés" },
  { id: "passages", label: "Caisse", icone: Receipt, sous: "Passages, tickets et paiements" },
  { id: "documents", label: "Documents", icone: FileText, sous: "Pièces rattachées dans la GED" },
  { id: "espacePatient", label: "Espace patient", icone: KeyRound, sous: "Accès du patient à son espace" },
];

function DossierOuvert({ id }) {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState("");
  const [section, setSection] = useState("synthese");
  const [edition, setEdition] = useState(false);

  useEffect(() => {
    setD(null);
    api.get(`/dossier/patients/${id}/`).then(({ data }) => setD(data))
      .catch((e) => setErreur(e.response?.status === 404 ? "Ce dossier n'existe pas dans votre hôpital." : messageErreur(e)));
  }, [id]);

  const ecrans = SECTIONS
    .filter((s) => ["synthese", "identite"].includes(s.id) || d?.sections.includes(s.id))
    .map((s) => ({ ...s, titre: d ? `${d.identite.last_name} ${d.identite.first_names}` : "Dossier patient",
      sous: d ? `${d.identite.code} · ${s.sous}` : s.sous,
      compte: d && Array.isArray(d[s.id]) ? d[s.id].length : undefined }));

  return (
    <Coquille ecrans={ecrans} ecran={section} onEcran={setSection}
      actions={<Link to="/dossiers" className="secondary-button ds-retour"><ArrowLeft size={16} />Recherche</Link>}>
      {erreur ? <p className="bandeau erreur">{erreur}</p> : !d ? <Chargement taille="grande" pleine texte="Ouverture du dossier…" /> : (
        <>
          <Bandeau d={d} onModifier={() => setEdition(true)} />
          {section === "synthese" && <Synthese d={d} aller={setSection} />}
          {section === "identite" && <Identite d={d} />}
          {section === "consultations" && <Consultations lignes={d.consultations} />}
          {section === "constantes" && <Constantes lignes={d.constantes} />}
          {section === "ordonnances" && <Ordonnances lignes={d.ordonnances} />}
          {section === "laboratoire" && <Laboratoire lignes={d.laboratoire} />}
          {section === "hospitalisations" && <Hospitalisations lignes={d.hospitalisations} />}
          {section === "rendezVous" && <RendezVous lignes={d.rendezVous} />}
          {section === "passages" && <Passages lignes={d.passages} />}
          {section === "documents" && <Documents lignes={d.documents} />}
          {section === "espacePatient" && <EspacePatient e={d.espacePatient} />}
          {edition && <ModifierIdentite d={d} onClose={() => setEdition(false)} onSaved={(n) => { setD(n); setEdition(false); }} />}
        </>
      )}
    </Coquille>
  );
}

function Bandeau({ d, onModifier }) {
  const i = d.identite;
  return (
    <section className="ds-bandeau">
      <div className="ds-bandeau-identite">
        <span className="ds-avatar grand">{`${i.last_name[0] || ""}${i.first_names[0] || ""}`}</span>
        <div>
          <h2>{i.last_name} {i.first_names}</h2>
          <p><code>{i.code}</code>{[i.sexLabel, i.age !== null ? `${i.age} ans` : "", i.phone, i.insurance].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</p>
        </div>
      </div>
      <div className="ds-bandeau-alertes">
        {i.allergies && <span className="ds-alerte"><TriangleAlert size={15} />Allergies : {i.allergies}</span>}
        {i.blood_group && <span className="ds-groupe"><Droplet size={14} />{i.blood_group}</span>}
        {d.resume.hospitaliseLe && <span className="ds-hospit"><BedDouble size={14} />Hospitalisé depuis le {d.resume.hospitaliseLe}</span>}
      </div>
      {(d.peutModifierIdentite || d.peutModifierMedical) && (
        <button type="button" className="secondary-button ds-modifier" onClick={onModifier}><Pencil size={15} />Modifier</button>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- sections */

const TYPES = {
  passage: { icone: Receipt, classe: "caisse" },
  constantes: { icone: Activity, classe: "soins" },
  consultation: { icone: Stethoscope, classe: "consultation" },
  ordonnance: { icone: Pill, classe: "pharmacie" },
  laboratoire: { icone: FlaskConical, classe: "labo" },
  hospitalisation: { icone: BedDouble, classe: "hospit" },
  "rendez-vous": { icone: CalendarDays, classe: "rdv" },
  document: { icone: FileText, classe: "doc" },
};

function Synthese({ d, aller }) {
  const r = d.resume;
  return (
    <>
      <div className="chiffres quatre ds-chiffres">
        <div><span>Passages</span><strong>{r.passages}</strong></div>
        <div><span>Dernière visite</span><strong>{r.derniereVisite ? r.derniereVisite.slice(0, 10) : "—"}</strong></div>
        <div><span>Prochain rendez-vous</span><strong>{r.prochainRendezVous ? r.prochainRendezVous.slice(0, 10) : "—"}</strong></div>
        <div><span>Consultations</span><strong>{d.consultations ? d.consultations.length : "—"}</strong></div>
      </div>
      <section className="bloc">
        <div className="bloc-tete"><div><h2>Chronologie</h2><p>Tout le parcours du patient, du plus récent au plus ancien.</p></div></div>
        {d.chronologie.length === 0 ? <p className="vide">Aucun événement pour ce patient.</p> : (
          <ol className="ds-chrono">
            {d.chronologie.map((e, n) => {
              const t = TYPES[e.type] || TYPES.document;
              const Icone = t.icone;
              return (
                <li key={n} className={t.classe}>
                  <span className="ds-chrono-icone"><Icone size={15} strokeWidth={2} /></span>
                  <div>
                    <strong>{e.titre}</strong>
                    {e.detail && <p>{e.detail}</p>}
                    <small>{e.date}{e.par ? ` · ${e.par}` : ""}</small>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {d.sections.includes("passages") && <p className="ds-liens">Ouvrir : <button type="button" onClick={() => aller("passages")}>la caisse</button>{d.sections.includes("consultations") && <> · <button type="button" onClick={() => aller("consultations")}>les consultations</button></>}{d.sections.includes("ordonnances") && <> · <button type="button" onClick={() => aller("ordonnances")}>les ordonnances</button></>}</p>}
    </>
  );
}

function Champs({ lignes }) {
  return (
    <dl className="ds-champs">
      {lignes.map(([libelle, valeur]) => <div key={libelle}><dt>{libelle}</dt><dd>{valeur || "—"}</dd></div>)}
    </dl>
  );
}

function Identite({ d }) {
  const i = d.identite;
  const ant = Object.entries(i.antecedents || {}).filter(([, v]) => v === true || (typeof v === "string" && v.trim()));
  return (
    <>
      <section className="bloc"><div className="bloc-tete"><div><h2>État civil et coordonnées</h2></div></div>
        <Champs lignes={[["Nom", i.last_name], ["Prénoms", i.first_names], ["Sexe", i.sexLabel],
          ["Date de naissance", i.birth_date ? new Date(`${i.birth_date}T00:00:00`).toLocaleDateString("fr-FR") : ""],
          ["Nationalité", i.nationality], ["Situation familiale", i.marital_status], ["Profession", i.profession],
          ["Téléphone", i.phone], ["E-mail", i.email], ["Ville", i.city], ["Commune", i.locality], ["Domicile", i.address],
          ["Assurance", i.insurance], ["N° d'assuré", i.insurance_number], ["Dossier ouvert le", i.createdAt]]} />
      </section>
      <section className="bloc"><div className="bloc-tete"><div><h2>Personne à prévenir</h2></div></div>
        <Champs lignes={[["Nom", i.emergency_contact], ["Téléphone", i.emergency_phone], ["Lien", i.emergency_relationship]]} />
      </section>
      <section className="bloc"><div className="bloc-tete"><div><h2>Informations médicales</h2></div></div>
        <Champs lignes={[["Groupe sanguin", i.blood_group], ["Allergies", i.allergies], ["Antécédents", i.history]]} />
        {ant.length > 0 && <p className="ds-antecedents">{ant.map(([k, v]) => <span key={k}>{v === true ? k : `${k} : ${v}`}</span>)}</p>}
      </section>
    </>
  );
}

function Vide({ texte }) { return <section className="bloc"><p className="vide">{texte}</p></section>; }

function Consultations({ lignes }) {
  if (!lignes?.length) return <Vide texte="Aucune consultation." />;
  return lignes.map((c) => (
    <section key={c.id} className="bloc ds-carte">
      <div className="ds-carte-tete">
        <strong>{c.date}</strong><span>{c.specialite}</span><span>{c.medecin}</span>
        {c.confidentiel && <span className="etat critique"><Lock size={12} />Confidentielle</span>}
        <span className={`etat ${c.terminee ? "regle" : "attente"}`}>{c.terminee ? "Terminée" : "En cours"}</span>
      </div>
      {c.masque ? <p className="vide">Consultation confidentielle : son contenu est réservé aux médecins.</p> : (
        <Champs lignes={[["Motif", c.motif], ["Symptômes", c.symptomes], ["Diagnostic", c.diagnostic], ["Traitement", c.traitement],
          ["Observations", c.observations], ["Conseils", c.recommandations], ["Prochaine consultation", c.prochaineConsultation],
          ...(c.issue ? [["Issue", c.issue]] : [])].filter(([, v]) => v)} />
      )}
    </section>
  ));
}

function Tableau({ entetes, lignes, vide }) {
  if (!lignes?.length) return <Vide texte={vide} />;
  return (
    <section className="bloc"><div className="tableau"><table>
      <thead><tr>{entetes.map((e) => <th key={e}>{e}</th>)}</tr></thead>
      <tbody>{lignes}</tbody>
    </table></div></section>
  );
}

function Constantes({ lignes }) {
  return <Tableau vide="Aucune prise de constantes." entetes={["Date", "Temp.", "Tension", "Pouls", "SpO₂", "Glycémie", "Poids", "Par"]}
    lignes={lignes?.map((v) => (
      <tr key={v.id}><td>{v.date}</td><td>{v.temperature ?? "—"} °C</td><td>{v.tension || "—"}</td><td>{v.pouls ?? "—"}</td>
        <td>{v.spo2 ? `${v.spo2} %` : "—"}</td><td>{v.glycemie ?? "—"}</td><td>{v.poids ? `${v.poids} kg` : "—"}</td><td>{v.par}</td></tr>
    ))} />;
}

function Ordonnances({ lignes }) {
  if (!lignes?.length) return <Vide texte="Aucune ordonnance." />;
  return lignes.map((o) => (
    <section key={o.id} className="bloc ds-carte">
      <div className="ds-carte-tete"><strong>{o.date}</strong><span>{o.medecin}</span>
        <span className={`etat ${o.statut === "Servie" ? "regle" : "attente"}`}>{o.statut}</span>
        {o.serviePar && <span>Servie par {o.serviePar} le {o.servieLe}</span>}</div>
      <ul className="ds-medicaments">
        {o.medicaments.map((m, n) => <li key={n}><strong>{m.nom}</strong><span>{[m.posologie, m.duree, m.voie, m.quantite ? `${m.quantite} unité(s)` : ""].filter(Boolean).join(" · ")}</span></li>)}
      </ul>
    </section>
  ));
}

function Laboratoire({ lignes }) {
  if (!lignes?.length) return <Vide texte="Aucune analyse." />;
  return lignes.map((r) => (
    <section key={r.id} className="bloc ds-carte">
      <div className="ds-carte-tete"><strong>{r.date}</strong><span className={`etat ${r.statut === "Terminée" ? "regle" : "attente"}`}>{r.statut}</span>
        {r.priorite === "Urgente" && <span className="etat critique">Urgente</span>}<span>Demandée par {r.demandePar || "—"}</span></div>
      <div className="tableau"><table>
        <thead><tr><th>Examen</th><th>Résultat</th><th>Référence</th></tr></thead>
        <tbody>{r.resultats.map((x, n) => <tr key={n}><td>{x.examen}</td><td><strong>{x.resultat || "En attente"}</strong> {x.resultat && x.unite}</td><td>{x.reference || "—"}</td></tr>)}</tbody>
      </table></div>
      {r.observation && <p className="ds-note">{r.observation}</p>}
    </section>
  ));
}

function Hospitalisations({ lignes }) {
  return <Tableau vide="Aucun séjour." entetes={["Entrée", "Sortie", "Service", "Lit", "Médecin", "Motif"]}
    lignes={lignes?.map((h) => (
      <tr key={h.id}><td>{h.entree}</td><td>{h.enCours ? <span className="etat attente">En cours</span> : h.sortie}</td>
        <td>{h.service}</td><td>{h.lit}</td><td>{h.medecin || "—"}</td><td>{h.motif || "—"}</td></tr>
    ))} />;
}

function RendezVous({ lignes }) {
  return <Tableau vide="Aucun rendez-vous." entetes={["Date", "Professionnel", "Service", "Motif", "Statut"]}
    lignes={lignes?.map((a) => (
      <tr key={a.id}><td>{a.date}{a.aVenir && <small className="ds-avenir">À venir</small>}</td><td>{a.professionnel}</td><td>{a.service || "—"}</td>
        <td>{a.motif || "—"}</td><td>{a.statut}</td></tr>
    ))} />;
}

const argent = (v) => `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;

function Passages({ lignes }) {
  return <Tableau vide="Aucun passage en caisse." entetes={["Date", "Ticket", "Prestation", "Montant", "À payer", "Assurance", "Paiement", "Par"]}
    lignes={lignes?.map((a) => (
      <tr key={a.id}><td>{a.date}</td><td><code>{a.reference}</code></td><td>{a.prestation}</td><td>{argent(a.montant)}</td>
        <td><strong>{argent(a.aPayer)}</strong></td><td>{a.assurance || "—"}</td>
        <td><span className={`etat ${a.paiement === "Payé" || a.paiement.startsWith("Pris") ? "regle" : a.paiement === "Annulé" ? "critique" : "attente"}`}>{a.paiement}</span></td><td>{a.par}</td></tr>
    ))} />;
}

function Documents({ lignes }) {
  return <Tableau vide="Aucun document rattaché à ce patient." entetes={["Date", "Document", "Type"]}
    lignes={lignes?.map((x) => <tr key={x.id}><td>{x.date || "—"}</td><td><strong>{x.titre}</strong></td><td>{x.type || "—"}</td></tr>)} />;
}

function EspacePatient({ e }) {
  return (
    <section className="bloc">
      <div className="bloc-tete"><div><h2>Espace patient</h2><p>L'accès du patient à son dossier, ses médicaments et ses messages.</p></div>
        <Link to="/patient-space" className="primary-button"><KeyRound size={16} />Gérer l'accès</Link></div>
      <Champs lignes={[["Statut", e.statut], ["Dernière connexion", e.derniereConnexion || "Jamais"], ["Messages échangés", String(e.messages)]]} />
    </section>
  );
}

/* ---------------------------------------------------------------- modification */

const CHAMPS = [
  ["last_name", "Nom", "identite"], ["first_names", "Prénoms", "identite"], ["birth_date", "Date de naissance", "identite", "date"],
  ["sex", "Sexe", "identite", "sexe"], ["phone", "Téléphone", "identite"], ["email", "E-mail", "identite"],
  ["city", "Ville", "identite"], ["locality", "Commune", "identite"], ["address", "Domicile", "identite"],
  ["profession", "Profession", "identite"], ["nationality", "Nationalité", "identite"], ["marital_status", "Situation familiale", "identite"],
  ["emergency_contact", "Personne à prévenir", "identite"], ["emergency_phone", "Son téléphone", "identite"],
  ["emergency_relationship", "Lien", "identite"], ["insurance", "Assurance", "identite"], ["insurance_number", "N° d'assuré", "identite"],
  ["blood_group", "Groupe sanguin", "medical", "groupe"], ["allergies", "Allergies", "medical", "texte"], ["history", "Antécédents", "medical", "texte"],
];
const GROUPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function ModifierIdentite({ d, onClose, onSaved }) {
  const champs = CHAMPS.filter(([, , g]) => (g === "identite" ? d.peutModifierIdentite : d.peutModifierMedical));
  const [form, setForm] = useState(() => Object.fromEntries(champs.map(([k]) => [k, d.identite[k] ?? ""])));
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer() {
    setOccupe(true); setErreur("");
    const corps = { ...form };
    if ("birth_date" in corps) corps.birth_date = corps.birth_date || null;
    try { const { data } = await api.patch(`/dossier/patients/${d.identite.id}/`, corps); onSaved(data); }
    catch (e) { setErreur(messageErreur(e)); setOccupe(false); }
  }

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !occupe && onClose()}>
      <div className="pop-boite" role="dialog" aria-modal="true" aria-label="Modifier le dossier">
        <header className="pop-tete"><div><h2>Modifier le dossier</h2><p>{d.identite.code} — la modification se voit aussitôt dans tous les modules.</p></div></header>
        <div className="pop-corps">
          {erreur && <p className="pop-erreur" role="alert" style={{ margin: "0 0 14px" }}>{erreur}</p>}
          <div className="ds-form">
            {champs.map(([k, libelle, , type]) => (
              <label key={k} className={`field ${type === "texte" ? "large" : ""}`}>
                <span>{libelle}</span>
                {type === "sexe" ? (
                  <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
                    <option value="M">Masculin</option><option value="F">Féminin</option><option value="O">Autre</option>
                  </select>
                ) : type === "groupe" ? (
                  <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
                    {GROUPES.map((g) => <option key={g} value={g}>{g || "Non renseigné"}</option>)}
                  </select>
                ) : type === "texte" ? (
                  <textarea rows={2} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                ) : (
                  <input type={type === "date" ? "date" : "text"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                )}
              </label>
            ))}
          </div>
        </div>
        <footer className="pop-pied">
          <button type="button" className="secondary-button" onClick={onClose} disabled={occupe}>Annuler</button>
          <button type="button" className="primary-button" onClick={enregistrer} disabled={occupe}>{occupe ? "Enregistrement…" : "Enregistrer"}</button>
        </footer>
      </div>
    </div>
  );
}
