import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CameraOff, Pencil, Plus, Printer, QrCode, ScanLine, Search, Tags, Boxes } from "lucide-react";
import QrScanner from "qr-scanner";

import "../styles/equipements.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import api from "../services/api";
import { messageErreur } from "../accueil/api";
import { imprimer } from "../accueil/impression";
import ListeFiltrable from "../accueil/ListeFiltrable";
import Etiquette from "./Etiquette";
import { CLASSE_ETAT, dateFr, jetonDepuis } from "./commun";

/*
 * ============================================================
 * MODULE QR CODE ÉQUIPEMENTS
 * ============================================================
 *
 *   Parc         les appareils de l'hôpital, leur fiche, leur QR
 *   Étiquettes   choisir des appareils, imprimer la planche
 *   Scanner      lire une étiquette avec la caméra (ou saisir le code)
 *
 * Les données sont celles du module Maintenance : un appareil
 * scanné montre exactement ses interventions.
 * ============================================================
 */

const ECRANS = [
  { id: "parc", label: "Parc", icone: Boxes, titre: "Parc des équipements", sous: "Identifier chaque appareil de l'hôpital" },
  { id: "etiquettes", label: "Étiquettes", icone: Tags, titre: "Étiquettes QR", sous: "Imprimer les QR codes à coller sur les appareils" },
  { id: "scanner", label: "Scanner", icone: ScanLine, titre: "Scanner une étiquette", sous: "Ouvrir la fiche d'un appareil" },
];

export default function Equipements() {
  const [ecran, setEcran] = useState("parc");
  const [donnees, setDonnees] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get("/maintenance/equipements/").then(({ data }) => setDonnees(data)).catch(() => setDonnees(false));
  }, [version]);

  const rafraichir = () => setVersion((n) => n + 1);

  return (
    <Coquille ecrans={ECRANS} ecran={ecran} onEcran={setEcran}>
      {donnees === null ? <Chargement taille="grande" pleine texte="Chargement du parc…" />
        : donnees === false ? <p className="bandeau erreur">Le parc n'a pas pu être chargé.</p>
        : ecran === "parc" ? <Parc donnees={donnees} rafraichir={rafraichir} />
        : ecran === "etiquettes" ? <Etiquettes donnees={donnees} />
        : <Scanner donnees={donnees} />}
    </Coquille>
  );
}

/* ============================================================
   PARC
   ============================================================ */

const VIDE = {
  name: "", category: "", brand: "", model_name: "", serial_number: "", supplier: "", acquisition: "",
  installation_date: "", warranty_end: "", service: "", location: "", state: "En service",
  maintenance_interval_days: 90, notes: "",
};

function Parc({ donnees, rafraichir }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(null);   // { id?, ...champs }
  const [apercu, setApercu] = useState(null);

  return (
    <>
      <section className="bloc">
        <div className="bloc-tete">
          <div>
            <h2>Parc des équipements</h2>
            <p>{donnees.equipments.length} appareil(s) enregistré(s). Chacun a son code et son QR code.</p>
          </div>
          <button type="button" className="primary-button grand" onClick={() => setForm({ ...VIDE })}>
            <Plus size={18} strokeWidth={2} />Nouvel équipement
          </button>
        </div>

        <ListeFiltrable
          lignes={donnees.equipments}
          champs={(e) => `${e.code} ${e.name} ${e.brand} ${e.model} ${e.serialNumber} ${e.service} ${e.location} ${e.category}`}
          placeholder="Code, nom, marque, n° de série, service…"
          vide="Aucun équipement. Ajoutez le premier appareil du parc."
          limite={25}
        >{(visibles) => (
          <div className="tableau">
            <table>
              <thead>
                <tr><th>Code</th><th>Équipement</th><th>Service · Emplacement</th><th>Installation</th>
                  <th>État</th><th>Maintenance</th><th /></tr>
              </thead>
              <tbody>
                {visibles.map((e) => (
                  <tr key={e.id}>
                    <td><code>{e.code}</code></td>
                    <td><strong>{e.name}</strong><small>{[e.brand, e.model, e.category].filter(Boolean).join(" · ")}</small></td>
                    <td>{e.service || "—"}<small>{e.location || "—"}</small></td>
                    <td>{dateFr(e.installationDate)}<small>{e.supplier || "—"}</small></td>
                    <td>
                      <span className={`etat ${CLASSE_ETAT[e.state] || ""}`}>{e.state}</span>
                      {e.state === "En service" && e.status !== "Opérationnel" && (
                        <small className={`eq-alerte ${CLASSE_ETAT[e.status]}`}>{e.status}</small>
                      )}
                    </td>
                    <td>{e.lastMaintenance}<small>Prochaine : {e.nextMaintenance}</small></td>
                    <td>
                      <div className="eq-actions">
                        <button type="button" className="secondary-button" title="Voir le QR code" onClick={() => setApercu(e)}>
                          <QrCode size={16} strokeWidth={2} />
                        </button>
                        <button type="button" className="secondary-button" title="Modifier" onClick={() => setForm(versFormulaire(e))}>
                          <Pencil size={16} strokeWidth={2} />
                        </button>
                        <button type="button" className="primary-button" onClick={() => navigate(`/equipement/${e.token}`)}>
                          Fiche
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}</ListeFiltrable>
      </section>

      {form && <FormulaireEquipement form={form} donnees={donnees} onClose={() => setForm(null)}
        onSaved={() => { setForm(null); rafraichir(); }} />}

      {apercu && <ApercuQr equipement={apercu} hopital={donnees.hospital.name} onClose={() => setApercu(null)}
        onRegenere={() => { setApercu(null); rafraichir(); }} />}
    </>
  );
}

const versFormulaire = (e) => ({
  id: e.id, name: e.name, category: e.category, brand: e.brand, model_name: e.model, serial_number: e.serialNumber,
  supplier: e.supplier, acquisition: e.acquisition, installation_date: e.installationDate, warranty_end: e.warrantyEnd,
  service: e.service, location: e.location, state: e.state, maintenance_interval_days: e.maintenanceIntervalDays,
  notes: e.notes,
});

function FormulaireEquipement({ form: initial, donnees, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const modifier = (id) => (event) => setForm({ ...form, [id]: event.target.value });

  async function enregistrer() {
    setOccupe(true); setErreur("");
    const { id, ...champs } = form;
    // Une date vide part en null : le serveur ne connaît pas la chaîne vide.
    for (const cle of ["installation_date", "warranty_end"]) champs[cle] = champs[cle] || null;
    try {
      if (id) await api.patch(`/maintenance/equipements/${id}/`, champs);
      else await api.post("/maintenance/equipements/", champs);
      onSaved();
    } catch (e) {
      setErreur(messageErreur(e));
      document.querySelector(".pop-corps")?.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setOccupe(false); }
  }

  const champ = (id, label, { type = "text", requis = false, placeholder = "", span = 6 } = {}) => (
    <label className="field" style={{ gridColumn: `span ${span}` }}>
      <span>{label}{requis && <span className="required">*</span>}</span>
      <input type={type} value={form[id] ?? ""} placeholder={placeholder} onChange={modifier(id)} />
    </label>
  );
  const liste = (id, label, options, { requis = false, span = 6 } = {}) => (
    <label className="field" style={{ gridColumn: `span ${span}` }}>
      <span>{label}{requis && <span className="required">*</span>}</span>
      <select value={form[id] ?? ""} onChange={modifier(id)}>
        <option value="">Choisir…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !occupe && onClose()}>
      <div className="pop-boite" role="dialog" aria-modal="true" aria-label="Équipement">
        <header className="pop-tete">
          <div>
            <h2>{form.id ? "Modifier l'équipement" : "Nouvel équipement"}</h2>
            <p>{form.id ? "Le QR code reste le même." : "Un code et un QR code lui sont attribués à l'enregistrement."}</p>
          </div>
        </header>
        <div className="pop-corps">
          {/* En tête du formulaire : visible quel que soit l'endroit où l'on a défilé. */}
          {erreur && <p className="pop-erreur eq-erreur" role="alert">{erreur}</p>}
          <div className="eq-grille">
            {champ("name", "Nom de l'appareil", { requis: true, placeholder: "Échographe salle 3", span: 8 })}
            {liste("category", "Catégorie", donnees.categories, { requis: true, span: 4 })}
            {champ("brand", "Marque", { placeholder: "Mindray", span: 4 })}
            {champ("model_name", "Modèle", { placeholder: "DC-40", span: 4 })}
            {champ("serial_number", "N° de série", { span: 4 })}

            <h3 className="eq-intertitre">Origine et installation</h3>
            {champ("supplier", "Structure qui l'a fourni", { placeholder: "Fournisseur, donateur, ministère…", span: 8 })}
            {liste("acquisition", "Mode d'acquisition", donnees.acquisitions, { span: 4 })}
            {champ("installation_date", "Date d'installation", { type: "date", span: 4 })}
            {champ("warranty_end", "Fin de garantie", { type: "date", span: 4 })}
            {champ("maintenance_interval_days", "Entretien tous les (jours)", { type: "number", span: 4 })}

            <h3 className="eq-intertitre">Emplacement et état</h3>
            {champ("service", "Service", { placeholder: "Imagerie", span: 4 })}
            {champ("location", "Emplacement", { placeholder: "Bâtiment B, salle 3", span: 4 })}
            {liste("state", "État", donnees.states, { requis: true, span: 4 })}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Notes</span>
              <textarea rows={2} value={form.notes ?? ""} onChange={modifier("notes")} />
            </label>
          </div>
        </div>
        <footer className="pop-pied">
          <button type="button" className="secondary-button" onClick={onClose} disabled={occupe}>Annuler</button>
          <button type="button" className="primary-button" onClick={enregistrer}
            disabled={occupe || !form.name?.trim() || !form.category}>
            {occupe ? "Enregistrement…" : form.id ? "Enregistrer" : "Ajouter au parc"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ApercuQr({ equipement, hopital, onClose, onRegenere }) {
  const [occupe, setOccupe] = useState(false);

  async function regenerer() {
    if (!window.confirm("L'étiquette actuelle ne fonctionnera plus. Imprimer une nouvelle étiquette ?")) return;
    setOccupe(true);
    try { await api.post(`/maintenance/equipements/${equipement.id}/nouveau-qr/`); onRegenere(); }
    catch (e) { alert(messageErreur(e)); setOccupe(false); }
  }

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="QR code">
        <header className="pop-tete"><div><h2>{equipement.name}</h2><p>{equipement.code}</p></div></header>
        <div className="pop-corps eq-apercu">
          <Etiquette equipement={equipement} hopital={hopital} />
          <p className="pop-intro">Scannez avec l'appareil photo d'un téléphone : la fiche de l'appareil s'ouvre.</p>
        </div>
        <footer className="pop-pied">
          <button type="button" className="secondary-button" onClick={regenerer} disabled={occupe}>Nouvelle étiquette</button>
          <button type="button" className="primary-button" onClick={onClose}>Fermer</button>
        </footer>
      </div>
    </div>
  );
}

/* ============================================================
   ÉTIQUETTES — planche A4 de QR codes 50 × 50 mm
   ============================================================ */

function Etiquettes({ donnees }) {
  const [choix, setChoix] = useState(() => new Set());
  const [recherche, setRecherche] = useState("");
  const [planche, setPlanche] = useState(false);

  const visibles = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return donnees.equipments.filter((e) =>
      !terme || `${e.code} ${e.name} ${e.service} ${e.location}`.toLowerCase().includes(terme));
  }, [donnees.equipments, recherche]);

  const choisis = donnees.equipments.filter((e) => choix.has(e.id));
  const basculer = (id) => setChoix((c) => { const s = new Set(c); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toutVisible = visibles.length > 0 && visibles.every((e) => choix.has(e.id));

  /* La planche est montée, peinte, imprimée, puis retirée. */
  useEffect(() => {
    if (!planche) return undefined;
    const minuteur = setTimeout(() => { imprimer({ taille: "A4", marge: "10mm" }); setPlanche(false); }, 300);
    return () => clearTimeout(minuteur);
  }, [planche]);

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Étiquettes à imprimer</h2>
          <p>Cochez les appareils, puis imprimez : planche A4, étiquettes de 50 × 50 mm à découper.</p>
        </div>
        <button type="button" className="primary-button grand" disabled={!choisis.length} onClick={() => setPlanche(true)}>
          <Printer size={18} strokeWidth={2} />Imprimer {choisis.length ? `(${choisis.length})` : ""}
        </button>
      </div>

      <label className="recherche">
        <Search size={17} strokeWidth={2} aria-hidden="true" />
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Filtrer par code, nom, service…"
          aria-label="Filtrer les équipements" />
      </label>

      {visibles.length === 0 ? <p className="vide">Aucun équipement.</p> : (
        <>
          <label className="eq-tout">
            <input type="checkbox" checked={toutVisible}
              onChange={() => setChoix((c) => {
                const s = new Set(c);
                visibles.forEach((e) => (toutVisible ? s.delete(e.id) : s.add(e.id)));
                return s;
              })} />
            Tout sélectionner ({visibles.length})
          </label>
          <div className="eq-choix">
            {visibles.map((e) => (
              <label key={e.id} className={`eq-carte ${choix.has(e.id) ? "choisie" : ""}`}>
                <input type="checkbox" checked={choix.has(e.id)} onChange={() => basculer(e.id)} />
                <Etiquette equipement={e} />
              </label>
            ))}
          </div>
        </>
      )}

      {planche && (
        <div className="planche-etiquettes" aria-hidden="true">
          {choisis.map((e) => <Etiquette key={e.id} equipement={e} hopital={donnees.hospital.name} />)}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   SCANNER — caméra de la tablette ou du PC, ou code saisi
   ============================================================ */

function Scanner({ donnees }) {
  const navigate = useNavigate();
  const video = useRef(null);
  const lecteur = useRef(null);
  const [actif, setActif] = useState(false);
  const [erreur, setErreur] = useState("");
  const [code, setCode] = useState("");

  const ouvrir = (jeton) => navigate(`/equipement/${jeton}`);

  useEffect(() => () => lecteur.current?.destroy(), []);

  async function demarrer() {
    setErreur("");
    try {
      lecteur.current = new QrScanner(video.current, ({ data }) => {
        const jeton = jetonDepuis(data);
        if (jeton) { lecteur.current.stop(); ouvrir(jeton); }
        else setErreur("Ce QR code n'est pas une étiquette d'équipement MA SANTÉ.");
      }, { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: "environment" });
      await lecteur.current.start();
      setActif(true);
    } catch {
      setErreur(window.isSecureContext
        ? "Impossible d'accéder à la caméra. Autorisez-la dans le navigateur, ou saisissez le code ci-dessous."
        : "La caméra n'est disponible qu'en HTTPS. Saisissez le code de l'étiquette ci-dessous.");
    }
  }

  function arreter() {
    lecteur.current?.stop();
    setActif(false);
  }

  function chercher(event) {
    event.preventDefault();
    const saisi = code.trim().toUpperCase();
    const trouve = donnees.equipments.find((e) => e.code?.toUpperCase() === saisi);
    const jeton = trouve?.token || jetonDepuis(code);
    if (jeton) ouvrir(jeton);
    else setErreur(`Aucun appareil ne porte le code « ${code.trim()} ».`);
  }

  return (
    <section className="bloc eq-scanner">
      <div className="bloc-tete">
        <div>
          <h2>Scanner une étiquette</h2>
          <p>Au téléphone, l'appareil photo suffit : visez l'étiquette, la fiche s'ouvre. Ici, utilisez la caméra de l'ordinateur ou de la tablette.</p>
        </div>
        {actif
          ? <button type="button" className="secondary-button grand" onClick={arreter}><CameraOff size={18} strokeWidth={2} />Arrêter</button>
          : <button type="button" className="primary-button grand" onClick={demarrer}><Camera size={18} strokeWidth={2} />Activer la caméra</button>}
      </div>

      <div className={`eq-video ${actif ? "active" : ""}`}>
        <video ref={video} muted playsInline />
        {!actif && <div className="eq-video-repos"><ScanLine size={44} strokeWidth={1.6} /><span>Caméra inactive</span></div>}
      </div>

      <form className="eq-code" onSubmit={chercher}>
        <label className="field">
          <span>Ou saisissez le code de l'étiquette</span>
          <input value={code} onChange={(e) => { setCode(e.target.value); setErreur(""); }}
            placeholder={`EQ-${donnees.hospital.code}-0001`} />
        </label>
        <button type="submit" className="primary-button" disabled={!code.trim()}>Ouvrir la fiche</button>
      </form>

      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
    </section>
  );
}
