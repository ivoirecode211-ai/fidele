import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, CalendarClock, CircleAlert, Factory, History, MapPin, ShieldCheck, Wrench,
} from "lucide-react";

import "../styles/Caisse.css";
import "../styles/equipements.css";

import Chargement from "../components/Chargement";
import Logo from "../components/Logo";
import UserBadge from "../components/UserBadge";
import api from "../services/api";
import { messageErreur } from "../accueil/api";
import { argent, CLASSE_ETAT, dateFr } from "./commun";

/*
 * ============================================================
 * FICHE D'UN ÉQUIPEMENT — CE QUI S'OUVRE AU SCAN
 * ============================================================
 *
 * Pensée pour le téléphone d'abord : on est debout devant
 * l'appareil. En haut, ce qu'il est et s'il fonctionne ; puis
 * son origine ; puis tout son historique de maintenance, avec
 * qui a fait quoi. La maintenance peut ouvrir une intervention
 * ou en clôturer une avec son compte rendu, sans quitter la fiche.
 * ============================================================
 */

export default function FicheEquipement() {
  const { token } = useParams();
  const [fiche, setFiche] = useState(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [signalement, setSignalement] = useState(false);
  const [cloture, setCloture] = useState(null);

  const charger = () => api.get(`/maintenance/scan/${token}/`)
    .then(({ data }) => setFiche(data))
    .catch(() => setIntrouvable(true));

  useEffect(() => { charger(); }, [token]);

  return (
    <div className="fiche-page">
      <header className="fiche-barre">
        <Link to={fiche?.canEdit ? "/equipements" : "/modules"} className="fiche-retour" aria-label="Retour">
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <Logo size={30} />
        <strong>MA SANTÉ</strong>
        <div className="fiche-barre-droite"><UserBadge /></div>
      </header>

      <main className="fiche-contenu">
        {introuvable ? (
          <div className="fiche-vide">
            <CircleAlert size={40} strokeWidth={1.8} />
            <h1>Étiquette inconnue</h1>
            <p>Ce QR code ne correspond à aucun appareil de votre hôpital, ou son étiquette a été remplacée.</p>
            <Link to="/modules" className="primary-button">Retour aux modules</Link>
          </div>
        ) : !fiche ? <Chargement taille="grande" pleine texte="Ouverture de la fiche…" /> : (
          <>
            <Identite fiche={fiche} />

            {fiche.canEdit ? (
              <div className="fiche-actions">
                <button type="button" className="primary-button grand" onClick={() => setSignalement(true)}>
                  <Wrench size={18} strokeWidth={2} />Nouvelle intervention
                </button>
              </div>
            ) : (
              <p className="bandeau info"><span>Un problème sur cet appareil ? Prévenez le service maintenance en indiquant le code <strong>{fiche.code}</strong>.</span></p>
            )}

            <section className="fiche-bloc">
              <h2><Factory size={18} strokeWidth={2} />Origine et installation</h2>
              <dl className="fiche-infos">
                <Info libelle="Structure d'origine" valeur={fiche.supplier} />
                <Info libelle="Mode d'acquisition" valeur={fiche.acquisition} />
                <Info libelle="Date d'installation" valeur={dateFr(fiche.installationDate)} />
                <Info libelle="Fin de garantie" valeur={fiche.warrantyEnd ? (
                  <>{dateFr(fiche.warrantyEnd)} <span className={`etat ${fiche.underWarranty ? "regle" : "reforme"}`}>
                    {fiche.underWarranty ? "Sous garantie" : "Expirée"}</span></>
                ) : "—"} />
              </dl>
            </section>

            <section className="fiche-bloc">
              <h2><CalendarClock size={18} strokeWidth={2} />Entretien</h2>
              <dl className="fiche-infos quatre">
                <Info libelle="Dernière maintenance" valeur={fiche.lastMaintenance} />
                <Info libelle="Prochaine prévue" valeur={fiche.nextMaintenance} />
                <Info libelle="Interventions" valeur={fiche.interventionsCount} />
                <Info libelle="Coût total" valeur={argent(fiche.totalCost)} />
              </dl>
            </section>

            <section className="fiche-bloc">
              <h2><History size={18} strokeWidth={2} />Historique des maintenances</h2>
              {fiche.interventions.length === 0 ? <p className="vide">Aucune intervention enregistrée pour cet appareil.</p> : (
                <ol className="fiche-historique">
                  {fiche.interventions.map((i) => (
                    <Intervention key={i.id} item={i} peutCloturer={fiche.canEdit} onCloturer={() => setCloture(i)} />
                  ))}
                </ol>
              )}
            </section>

            {fiche.lastScans.length > 0 && (
              <p className="fiche-scans">
                Derniers scans : {fiche.lastScans.map((s) => `${s.user} (${s.date})`).join(" · ")}
              </p>
            )}
          </>
        )}
      </main>

      {signalement && <NouvelleIntervention fiche={fiche} onClose={() => setSignalement(false)}
        onSaved={() => { setSignalement(false); charger(); }} />}
      {cloture && <Cloture intervention={cloture} onClose={() => setCloture(null)}
        onSaved={(nouvelle) => { setCloture(null); setFiche({ ...nouvelle, canEdit: fiche.canEdit, lastScans: fiche.lastScans }); }} />}
    </div>
  );
}

function Info({ libelle, valeur }) {
  return <div><dt>{libelle}</dt><dd>{valeur || valeur === 0 ? valeur : "—"}</dd></div>;
}

export function Identite({ fiche }) {
  const enService = fiche.state === "En service";
  return (
    <section className="fiche-identite">
      <div className="fiche-titre">
        <code>{fiche.code}</code>
        <h1>{fiche.name}</h1>
        <p>{[fiche.brand, fiche.model, fiche.category].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="fiche-etats">
        <span className={`etat ${CLASSE_ETAT[fiche.state]}`}>{fiche.state}</span>
        {enService && <span className={`etat ${CLASSE_ETAT[fiche.status]}`}>{fiche.status}</span>}
      </div>
      {enService && fiche.issue && <p className="fiche-probleme"><CircleAlert size={16} strokeWidth={2} />{fiche.issue}</p>}
      <dl className="fiche-infos">
        <Info libelle="N° de série" valeur={fiche.serialNumber} />
        <Info libelle="Service" valeur={fiche.service} />
        <Info libelle={<><MapPin size={13} strokeWidth={2} /> Emplacement</>} valeur={fiche.location} />
        <Info libelle="Hôpital" valeur={fiche.hospital} />
      </dl>
      {fiche.notes && <p className="fiche-notes">{fiche.notes}</p>}
    </section>
  );
}

const CLASSE_PRIORITE = { Critique: "critique", Haute: "attente", Normale: "" };

export function Intervention({ item, peutCloturer, onCloturer }) {
  const terminee = item.status === "Terminée";
  const auteur = item.company
    ? `${item.technician} — ${item.company}`
    : item.technicianAccount || item.technician;
  return (
    <li className={`fiche-intervention ${terminee ? "terminee" : "ouverte"}`}>
      <div className="fiche-intervention-tete">
        <strong>{item.date}{item.time ? ` · ${item.time}` : ""}</strong>
        <span className="etat">{item.type}</span>
        {item.priority !== "Normale" && <span className={`etat ${CLASSE_PRIORITE[item.priority]}`}>{item.priority}</span>}
        <span className={`etat ${terminee ? "regle" : "attente"}`}>{item.status}</span>
      </div>
      <p className="fiche-intervention-qui"><Wrench size={14} strokeWidth={2} />{auteur}</p>
      {item.description && <p>{item.description}</p>}
      {terminee && (
        <dl className="fiche-compte-rendu">
          {item.diagnosis && <div><dt>Diagnostic</dt><dd>{item.diagnosis}</dd></div>}
          {item.workDone && <div><dt>Travaux</dt><dd>{item.workDone}</dd></div>}
          {item.parts && <div><dt>Pièces</dt><dd>{item.parts}</dd></div>}
          <div className="fiche-compte-rendu-ligne">
            {item.cost !== null && <span>Coût : <strong>{argent(item.cost)}</strong></span>}
            {item.durationMinutes !== null && <span>Durée : <strong>{item.durationMinutes} min</strong></span>}
            {item.completedAt && <span>Clôturée le {item.completedAt}{item.closedBy ? ` par ${item.closedBy}` : ""}</span>}
          </div>
        </dl>
      )}
      {!terminee && peutCloturer && (
        <button type="button" className="secondary-button" onClick={onCloturer}>
          <BadgeCheck size={16} strokeWidth={2} />Clôturer avec compte rendu
        </button>
      )}
    </li>
  );
}

export function Popup({ titre, sous, onClose, children, pied }) {
  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label={titre}>
        <header className="pop-tete"><div><h2>{titre}</h2>{sous && <p>{sous}</p>}</div></header>
        <div className="pop-corps">{children}</div>
        <footer className="pop-pied">{pied}</footer>
      </div>
    </div>
  );
}

export function NouvelleIntervention({ fiche, onClose, onSaved }) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ type: "Corrective", priority: "Normale", technician: "", company: "", description: "", date: aujourdhui });
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer() {
    setOccupe(true); setErreur("");
    try {
      await api.post("/maintenance/interventions/", {
        ...form, equipment: fiche.name, category: fiche.category, time: new Date().toTimeString().slice(0, 5),
      });
      onSaved();
    } catch (e) { setErreur(messageErreur(e)); setOccupe(false); }
  }

  const choix = (id, options) => (
    <div className="eq-segments" role="radiogroup">
      {options.map((o) => (
        <button key={o} type="button" className={form[id] === o ? "actif" : ""} onClick={() => setForm({ ...form, [id]: o })}>{o}</button>
      ))}
    </div>
  );

  return (
    <Popup titre="Nouvelle intervention" sous={`${fiche.code} · ${fiche.name}`} onClose={onClose}
      pied={<>
        <button type="button" className="secondary-button" onClick={onClose} disabled={occupe}>Annuler</button>
        <button type="button" className="primary-button" onClick={enregistrer} disabled={occupe || !form.technician.trim()}>
          {occupe ? "Enregistrement…" : "Enregistrer"}
        </button>
      </>}>
      <div className="eq-pile">
        <div className="field"><span>Type</span>{choix("type", ["Corrective", "Préventive"])}</div>
        <div className="field"><span>Priorité</span>{choix("priority", ["Normale", "Haute", "Critique"])}</div>
        <label className="field"><span>Technicien<span className="required">*</span></span>
          <input value={form.technician} placeholder="Nom du technicien" onChange={(e) => setForm({ ...form, technician: e.target.value })} />
        </label>
        <label className="field"><span>Entreprise (si sous-traitée)</span>
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </label>
        <label className="field"><span>Problème constaté</span>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
      </div>
      {erreur && <p className="pop-erreur" role="alert">{erreur}</p>}
    </Popup>
  );
}

export function Cloture({ intervention, onClose, onSaved }) {
  const [form, setForm] = useState({ diagnosis: "", work_done: "", parts: "", cost: "", duration_minutes: "" });
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const champ = (id) => (e) => setForm({ ...form, [id]: e.target.value });

  async function enregistrer() {
    setOccupe(true); setErreur("");
    try {
      const { data } = await api.post(`/maintenance/interventions/${intervention.id}/cloturer/`, {
        ...form, cost: form.cost === "" ? null : form.cost,
        duration_minutes: form.duration_minutes === "" ? null : form.duration_minutes,
      });
      onSaved(data);
    } catch (e) { setErreur(messageErreur(e)); setOccupe(false); }
  }

  return (
    <Popup titre="Compte rendu d'intervention" sous={`${intervention.date} · ${intervention.type}`} onClose={onClose}
      pied={<>
        <button type="button" className="secondary-button" onClick={onClose} disabled={occupe}>Annuler</button>
        <button type="button" className="primary-button" onClick={enregistrer} disabled={occupe || !form.work_done.trim()}>
          {occupe ? "Clôture…" : "Clôturer l'intervention"}
        </button>
      </>}>
      <div className="eq-pile">
        <label className="field"><span>Diagnostic</span><textarea rows={2} value={form.diagnosis} onChange={champ("diagnosis")} /></label>
        <label className="field"><span>Travaux réalisés<span className="required">*</span></span>
          <textarea rows={2} value={form.work_done} onChange={champ("work_done")} /></label>
        <label className="field"><span>Pièces remplacées</span><input value={form.parts} onChange={champ("parts")} /></label>
        <div className="eq-deux">
          <label className="field"><span>Coût (FCFA)</span><input type="number" min="0" value={form.cost} onChange={champ("cost")} /></label>
          <label className="field"><span>Durée (min)</span><input type="number" min="0" value={form.duration_minutes} onChange={champ("duration_minutes")} /></label>
        </div>
      </div>
      <p className="pop-intro" style={{ margin: "14px 0 0" }}><ShieldCheck size={14} strokeWidth={2} /> Une panne réparée remet l'appareil « En service ».</p>
      {erreur && <p className="pop-erreur" role="alert">{erreur}</p>}
    </Popup>
  );
}
