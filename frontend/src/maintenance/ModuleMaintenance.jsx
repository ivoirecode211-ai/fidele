import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Boxes, History, Play, ScanLine, Wrench } from "lucide-react";

import "../styles/Caisse.css";
import "../styles/equipements.css";
import "../styles/maintenance.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import api from "../services/api";
import { messageErreur } from "../accueil/api";
import ListeFiltrable from "../accueil/ListeFiltrable";
import { Scanner } from "../equipements/Equipements";
import { Cloture, Identite, Intervention, NouvelleIntervention, Popup } from "../equipements/FicheEquipement";
import { argent, CLASSE_ETAT } from "../equipements/commun";

/*
 * ============================================================
 * MODULE MAINTENANCE
 * ============================================================
 *
 *   Interventions   ce qui est ouvert : démarrer, clôturer
 *                   avec son compte rendu
 *   Historique      tout ce qui a été fait, filtré par appareil,
 *                   type et période
 *   Appareils       le parc et l'état de chaque appareil
 *   Scanner         viser l'étiquette QR : la fiche et tout
 *                   l'historique de l'appareil s'ouvrent ici
 *
 * Les données sont celles du module QR Code Équipements.
 * ============================================================
 */

// Charte : bleu pour ce qui est en cours, rouge pour l'urgence, vert pour ce qui est fait ; jamais de jaune.
const CLASSE_PRIORITE = { Critique: "critique", Haute: "bleu", Normale: "" };
const CLASSE_STATUT = { "En attente": "bleu", "En cours": "bleu", Terminée: "regle" };

export default function ModuleMaintenance() {
  const [ecran, setEcran] = useState("interventions");
  const [apercu, setApercu] = useState(null);       // /maintenance/overview/
  const [parc, setParc] = useState(null);           // /maintenance/equipements/
  const [version, setVersion] = useState(0);
  const [appareil, setAppareil] = useState(null);   // fiche ouverte (historique d'un appareil)
  const [erreur, setErreur] = useState("");

  const rafraichir = () => setVersion((n) => n + 1);

  useEffect(() => {
    Promise.all([api.get("/maintenance/overview/"), api.get("/maintenance/equipements/")])
      .then(([o, e]) => { setApercu(o.data); setParc(e.data); })
      .catch(() => setErreur("Les données de maintenance n'ont pas pu être chargées."));
  }, [version]);

  const ouvertes = (apercu?.interventions || []).filter((i) => i.status !== "Terminée");

  const ECRANS = [
    { id: "interventions", label: "Interventions", icone: Wrench, titre: "Interventions en cours", sous: "", compte: ouvertes.length },
    { id: "historique", label: "Historique", icone: History, titre: "Historique des maintenances", sous: "" },
    { id: "appareils", label: "Appareils", icone: Boxes, titre: "Appareils", sous: "" },
    { id: "scanner", label: "Scanner", icone: ScanLine, titre: "Scanner une étiquette", sous: "" },
  ];

  function ouvrirAppareil(id) {
    setAppareil("chargement");
    api.get(`/maintenance/equipements/${id}/`).then(({ data }) => setAppareil(data)).catch(() => setAppareil(null));
  }

  function ouvrirParJeton(jeton) {
    setAppareil("chargement");
    api.get(`/maintenance/scan/${jeton}/`).then(({ data }) => setAppareil(data))
      .catch(() => { setAppareil(null); setErreur("Cette étiquette ne correspond à aucun appareil de l'hôpital."); });
  }

  function choisirEcran(id) {
    setAppareil(null);
    setErreur("");
    setEcran(id);
  }

  const ecrans = appareil && appareil !== "chargement"
    ? ECRANS.map((e) => (e.id === ecran ? { ...e, titre: appareil.name, sous: `${appareil.code} · ${appareil.category}` } : e))
    : ECRANS;

  return (
    <Coquille ecrans={ecrans} ecran={ecran} onEcran={choisirEcran}>
      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
      {!apercu || !parc ? (!erreur && <Chargement taille="grande" pleine texte="Chargement de la maintenance…" />)
        : appareil === "chargement" ? <Chargement taille="moyenne" />
        : appareil ? (
          <FicheAppareil fiche={appareil} onRetour={() => setAppareil(null)}
            onChange={(fiche) => { setAppareil(fiche); rafraichir(); }} />
        )
        : ecran === "interventions" ? <Interventions lignes={ouvertes} parc={parc} onOuvrir={ouvrirAppareil} rafraichir={rafraichir} />
        : ecran === "historique" ? <Historique lignes={apercu.interventions} parc={parc} onOuvrir={ouvrirAppareil} />
        : ecran === "appareils" ? <Appareils parc={parc} onOuvrir={ouvrirAppareil} />
        : <Scanner donnees={parc} onJeton={ouvrirParJeton} />}
    </Coquille>
  );
}

/* ============================================================
   INTERVENTIONS EN COURS
   ============================================================ */

function Interventions({ lignes, parc, onOuvrir, rafraichir }) {
  const [nouvelle, setNouvelle] = useState(null);   // null | "choisir" | fiche de l'appareil
  const [cloture, setCloture] = useState(null);
  const [filtre, setFiltre] = useState("toutes");

  const visibles = lignes.filter((i) => filtre === "toutes" || i.status === filtre);

  async function demarrer(i) {
    try { await api.post(`/maintenance/interventions/${i.id}/statut/`, { status: "En cours" }); rafraichir(); }
    catch (e) { alert(messageErreur(e)); }
  }

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div className="mt-segments" role="radiogroup" aria-label="Statut">
          {[["toutes", "Toutes"], ["En attente", "En attente"], ["En cours", "En cours"]].map(([id, nom]) => (
            <button key={id} type="button" role="radio" aria-checked={filtre === id}
              className={filtre === id ? "actif" : ""} onClick={() => setFiltre(id)}>{nom}</button>
          ))}
        </div>
        <button type="button" className="primary-button grand" onClick={() => setNouvelle("choisir")}>
          <Wrench size={18} strokeWidth={2} />Nouvelle intervention
        </button>
      </div>

      <ListeFiltrable lignes={visibles} limite={25}
        champs={(i) => `${i.code} ${i.equipment} ${i.technician} ${i.description} ${i.category}`}
        placeholder="Appareil, code, technicien…" vide="Aucune intervention en cours.">
        {(rangs) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Date</th><th>Appareil</th><th>Problème</th><th>Priorité</th><th>Technicien</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {rangs.map((i) => (
                  <tr key={i.id}>
                    <td>{i.date}<small>{i.time || ""}</small></td>
                    <td><button type="button" className="mt-lien" onClick={() => onOuvrir(i.equipmentId)}>
                      <strong>{i.equipment}</strong></button><small>{[i.code, i.category].filter(Boolean).join(" · ")}</small></td>
                    <td className="mt-texte">{i.description || "—"}<small>{i.type}</small></td>
                    <td>{i.priority === "Normale" ? "Normale" : <span className={`etat ${CLASSE_PRIORITE[i.priority]}`}>{i.priority}</span>}</td>
                    <td>{i.company ? `${i.technician}` : i.technician}<small>{i.company || ""}</small></td>
                    <td><span className={`etat ${CLASSE_STATUT[i.status]}`}>{i.status}</span></td>
                    <td>
                      <div className="eq-actions">
                        {i.status === "En attente" && (
                          <button type="button" className="secondary-button" onClick={() => demarrer(i)}>
                            <Play size={15} strokeWidth={2} />Démarrer
                          </button>
                        )}
                        <button type="button" className="primary-button" onClick={() => setCloture(i)}>Clôturer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>

      {nouvelle === "choisir" && <ChoixAppareil parc={parc} onClose={() => setNouvelle(null)} onChoix={setNouvelle} />}
      {nouvelle && nouvelle !== "choisir" && (
        <NouvelleIntervention fiche={nouvelle} onClose={() => setNouvelle(null)}
          onSaved={() => { setNouvelle(null); rafraichir(); }} />
      )}
      {cloture && <Cloture intervention={cloture} onClose={() => setCloture(null)}
        onSaved={() => { setCloture(null); rafraichir(); }} />}
    </section>
  );
}

function ChoixAppareil({ parc, onClose, onChoix }) {
  const [id, setId] = useState("");
  const choisi = parc.equipments.find((e) => String(e.id) === id);
  return (
    <Popup titre="Nouvelle intervention" sous="Sur quel appareil ?" onClose={onClose}
      pied={<>
        <button type="button" className="secondary-button" onClick={onClose}>Annuler</button>
        <button type="button" className="primary-button" disabled={!choisi} onClick={() => onChoix(choisi)}>Continuer</button>
      </>}>
      <label className="field"><span>Appareil<span className="required">*</span></span>
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Choisir…</option>
          {parc.equipments.map((e) => <option key={e.id} value={e.id}>{e.code} · {e.name}{e.location ? ` (${e.location})` : ""}</option>)}
        </select>
      </label>
    </Popup>
  );
}

/* ============================================================
   HISTORIQUE
   ============================================================ */

function Historique({ lignes, parc, onOuvrir }) {
  const [appareil, setAppareil] = useState("");
  const [type, setType] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");

  const faites = useMemo(() => lignes.filter((i) => i.status === "Terminée"
    && (!appareil || String(i.equipmentId) === appareil)
    && (!type || i.type === type)
    && (!du || i.isoDate >= du) && (!au || i.isoDate <= au)), [lignes, appareil, type, du, au]);
  const cout = faites.reduce((total, i) => total + (i.cost || 0), 0);

  return (
    <section className="bloc">
      <div className="mt-filtres">
        <label className="field"><span>Appareil</span>
          <select value={appareil} onChange={(e) => setAppareil(e.target.value)}>
            <option value="">Tous les appareils</option>
            {parc.equipments.map((e) => <option key={e.id} value={e.id}>{e.code} · {e.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous</option><option>Préventive</option><option>Corrective</option>
          </select>
        </label>
        <label className="field"><span>Du</span><input type="date" value={du} onChange={(e) => setDu(e.target.value)} /></label>
        <label className="field"><span>Au</span><input type="date" value={au} onChange={(e) => setAu(e.target.value)} /></label>
      </div>
      <p className="mt-resume">{faites.length} intervention{faites.length > 1 ? "s" : ""} terminée{faites.length > 1 ? "s" : ""}
        {cout > 0 && <> · coût total <strong>{argent(cout)}</strong></>}</p>

      <ListeFiltrable lignes={faites} limite={30}
        champs={(i) => `${i.code} ${i.equipment} ${i.technician} ${i.company} ${i.workDone} ${i.diagnosis} ${i.parts}`}
        placeholder="Appareil, technicien, travaux, pièce…" vide="Aucune intervention terminée sur ces critères.">
        {(rangs) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Date</th><th>Appareil</th><th>Type</th><th>Travaux réalisés</th><th>Technicien</th><th>Coût</th></tr></thead>
              <tbody>
                {rangs.map((i) => (
                  <tr key={i.id}>
                    <td>{i.date}<small>{i.completedAt ? `Clôturée le ${i.completedAt.slice(0, 10)}` : ""}</small></td>
                    <td><button type="button" className="mt-lien" onClick={() => onOuvrir(i.equipmentId)}>
                      <strong>{i.equipment}</strong></button><small>{i.code}</small></td>
                    <td>{i.type}{i.priority !== "Normale" && <small>{i.priority}</small>}</td>
                    <td className="mt-texte">{i.workDone || i.description || "—"}
                      {(i.diagnosis || i.parts) && <small>{[i.diagnosis, i.parts && `Pièces : ${i.parts}`].filter(Boolean).join(" · ")}</small>}</td>
                    <td>{i.technician}<small>{i.company || i.closedBy || ""}</small></td>
                    <td>{i.cost !== null && i.cost !== undefined ? argent(i.cost) : "—"}
                      {i.durationMinutes ? <small>{i.durationMinutes} min</small> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}

/* ============================================================
   APPAREILS
   ============================================================ */

function Appareils({ parc, onOuvrir }) {
  return (
    <section className="bloc">
      <ListeFiltrable lignes={parc.equipments} limite={30}
        champs={(e) => `${e.code} ${e.name} ${e.brand} ${e.model} ${e.service} ${e.location} ${e.category}`}
        placeholder="Code, nom, service…" vide="Aucun appareil dans le parc.">
        {(rangs) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Code</th><th>Appareil</th><th>Emplacement</th><th>État</th><th>Maintenance</th><th>Interventions</th><th /></tr></thead>
              <tbody>
                {rangs.map((e) => (
                  <tr key={e.id}>
                    <td><code>{e.code}</code></td>
                    <td><strong>{e.name}</strong><small>{[e.brand, e.model, e.category].filter(Boolean).join(" · ")}</small></td>
                    <td>{e.location || e.service || "—"}</td>
                    <td>
                      <span className={`etat ${CLASSE_ETAT[e.state] || ""}`}>{e.state}</span>
                      {e.state === "En service" && e.status !== "Opérationnel" && <small className={`eq-alerte ${CLASSE_ETAT[e.status]}`}>{e.status}</small>}
                    </td>
                    <td>{e.lastMaintenance}<small>Prochaine : {e.nextMaintenance}</small></td>
                    <td>{e.interventionsCount}</td>
                    <td><button type="button" className="primary-button" onClick={() => onOuvrir(e.id)}>
                      <History size={15} strokeWidth={2} />Historique</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListeFiltrable>
    </section>
  );
}

/* ============================================================
   FICHE D'UN APPAREIL (depuis la liste ou le scanner)
   ============================================================ */

function FicheAppareil({ fiche, onRetour, onChange }) {
  const [signalement, setSignalement] = useState(false);
  const [cloture, setCloture] = useState(null);

  const recharger = () => api.get(`/maintenance/equipements/${fiche.id}/`).then(({ data }) => onChange(data)).catch(() => {});

  return (
    <div className="mt-fiche">
      <div className="mt-fiche-barre">
        <button type="button" className="secondary-button" onClick={onRetour}><ArrowLeft size={16} strokeWidth={2} />Retour</button>
        <button type="button" className="primary-button" onClick={() => setSignalement(true)}>
          <Wrench size={16} strokeWidth={2} />Nouvelle intervention
        </button>
      </div>

      <Identite fiche={fiche} />

      <section className="fiche-bloc">
        <dl className="fiche-infos quatre">
          <div><dt>Dernière maintenance</dt><dd>{fiche.lastMaintenance}</dd></div>
          <div><dt>Prochaine prévue</dt><dd>{fiche.nextMaintenance}</dd></div>
          <div><dt>Interventions</dt><dd>{fiche.interventionsCount}</dd></div>
          <div><dt>Coût total</dt><dd>{argent(fiche.totalCost)}</dd></div>
        </dl>
      </section>

      <section className="fiche-bloc">
        <h2><History size={18} strokeWidth={2} />Historique des maintenances</h2>
        {fiche.interventions.length === 0 ? <p className="vide">Aucune intervention enregistrée pour cet appareil.</p> : (
          <ol className="fiche-historique">
            {fiche.interventions.map((i) => <Intervention key={i.id} item={i} peutCloturer onCloturer={() => setCloture(i)} />)}
          </ol>
        )}
      </section>

      {signalement && <NouvelleIntervention fiche={fiche} onClose={() => setSignalement(false)}
        onSaved={() => { setSignalement(false); recharger(); }} />}
      {cloture && <Cloture intervention={cloture} onClose={() => setCloture(null)}
        onSaved={(nouvelle) => { setCloture(null); onChange({ ...nouvelle, lastScans: fiche.lastScans }); }} />}
    </div>
  );
}
