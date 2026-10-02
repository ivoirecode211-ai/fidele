import LogoEtablissement, { useEtablissement } from "../components/LogoEtablissement";
import { useEffect, useState } from "react";
import { KeyRound, Megaphone, Printer, Search, ShieldCheck, ShieldOff, Trash2, Unlock, UsersRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import "../styles/patient-personnel.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { messageErreur } from "../accueil/api";
import { imprimer } from "../accueil/impression";

/*
 * ============================================================
 * ESPACE PATIENTS — CÔTÉ PERSONNEL
 * ============================================================
 *
 *   Accès patients   l'accueil active l'espace d'un patient et
 *                    lui remet sa carte : QR code (son code
 *                    patient déjà rempli) + PIN provisoire
 *   Suivi des comptes  les espaces activés, par état : bloqués à
 *                    débloquer, jamais connectés, désactivés
 *   Annonces         une information pour tous les patients de
 *                    l'hôpital, dans leur espace et en notification
 *
 * La messagerie des médecins est dans le module Consultation
 * (medecine/Messagerie.jsx) : chacun n'y voit que ses patients.
 * ============================================================
 */

const ACCES = ["ADMIN", "DIRECTOR", "RECEPTION"];

export default function Personnel() {
  const { user } = useAuth();
  const roles = [user?.role, ...(user?.roles || [])];
  const peut = (liste) => user?.is_superuser || roles.some((r) => liste.includes(r));
  const ecrans = [
    peut(ACCES) && { id: "acces", label: "Accès patients", icone: KeyRound, titre: "Accès des patients", sous: "Activer l'espace patient et remettre la carte d'accès" },
    peut(ACCES) && { id: "suivi", label: "Suivi des comptes", icone: UsersRound, titre: "Suivi des comptes", sous: "Débloquer, désactiver, relancer les patients qui ne se connectent pas" },
    peut(ACCES) && { id: "annonces", label: "Annonces", icone: Megaphone, titre: "Annonces aux patients", sous: "Une information pour tous les patients de l'hôpital" },
  ].filter(Boolean);
  const demande = new URLSearchParams(window.location.search).get("vue");
  const [choix, setEcran] = useState(demande);
  // Le compte arrive après le premier affichage : l'écran actif se déduit à chaque fois.
  const ecran = ecrans.find((e) => e.id === choix)?.id || ecrans[0]?.id;

  if (!user) return <Chargement taille="grande" pleine />;
  return (
    <Coquille ecrans={ecrans} ecran={ecran} onEcran={setEcran}
      titre="Espace patients" sous="Réservé à l'accueil">
      {ecran === "acces" && <Acces />}
      {ecran === "suivi" && <Suivi />}
      {ecran === "annonces" && <Annonces />}
      {!ecrans.length && <p className="bandeau attention"><span>Cet espace est réservé à l'accueil.</span></p>}
    </Coquille>
  );
}

/* ============================================================
   ACCÈS PATIENTS
   ============================================================ */

function Acces() {
  const [q, setQ] = useState("");
  const [donnees, setDonnees] = useState(null);
  const [carte, setCarte] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/portail/acces/", { params: { q } }).then(({ data }) => setDonnees(data)).catch(() => setDonnees({ patients: [] }));
    }, 250);
    return () => clearTimeout(t);
  }, [q, version]);

  async function agir(patient, action) {
    if (action === "activer" && patient.status !== "Aucun accès"
        && !window.confirm("Un nouveau PIN provisoire va remplacer l'actuel. Le patient devra en choisir un nouveau. Continuer ?")) return;
    try {
      const { data } = await api.post(`/portail/acces/${patient.id}/${action}/`);
      if (data.temporaryPin) setCarte(data);
      setVersion((n) => n + 1);
    } catch (e) { alert(messageErreur(e)); }
  }

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Accès à l'espace patient</h2>
          <p>Le patient se connecte avec son code patient et un PIN de 6 chiffres. Remettez-lui sa carte : il scanne le QR code et tape son PIN.</p>
        </div>
      </div>
      <label className="recherche">
        <Search size={17} strokeWidth={2} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone ou code patient…" aria-label="Rechercher un patient" />
      </label>
      {!donnees ? <Chargement /> : donnees.patients.length === 0 ? <p className="vide">Aucun patient ne correspond.</p> : (
        <div className="tableau">
          <table>
            <thead><tr><th>Code</th><th>Patient</th><th>Téléphone</th><th>Espace patient</th><th>Dernière connexion</th><th /></tr></thead>
            <tbody>
              {donnees.patients.map((p) => (
                <tr key={p.id}>
                  <td><code>{p.code}</code></td>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.phone || "—"}</td>
                  <td><span className={`etat ${ETATS[p.status] || ""}`}>{p.status}</span></td>
                  <td>{p.lastLogin || "Jamais"}</td>
                  <td>
                    <div className="pp-actions">
                      <button type="button" className="primary-button" onClick={() => agir(p, "activer")}>
                        <KeyRound size={15} strokeWidth={2} />{p.status === "Aucun accès" ? "Activer" : "Nouveau PIN"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {carte && <CarteAcces carte={carte} hopital={donnees?.hospital} onClose={() => setCarte(null)} />}
    </section>
  );
}

const ETATS = { Actif: "regle", "PIN provisoire": "attente", Bloqué: "critique", Désactivé: "", "Aucun accès": "" };

function CarteAcces({ carte, hopital, onClose }) {
  const { logo } = useEtablissement();
  const adresse = `${window.location.origin}/patient?code=${encodeURIComponent(carte.code)}`;
  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Carte d'accès">
        <header className="pop-tete no-print">
          <div><h2>Carte d'accès</h2><p>Le PIN provisoire n'est affiché qu'une fois. Imprimez la carte ou dictez-le au patient.</p></div>
        </header>
        <div className="pop-corps">
          <article className="pp-carte" id="carte-acces">
            <header>
              {logo && <LogoEtablissement logo={logo} size={28} nom={hopital || carte.hospital} />}
              <strong>{hopital || carte.hospital}</strong><span>Mon espace patient</span>
            </header>
            <div className="pp-carte-corps">
              <QRCodeSVG value={adresse} level="M" marginSize={0} className="pp-carte-qr" />
              <div>
                <span>Nom</span><strong>{carte.name}</strong>
                <span>Code patient</span><strong className="pp-carte-code">{carte.code}</strong>
                <span>Code PIN provisoire</span><strong className="pp-carte-pin">{carte.temporaryPin}</strong>
              </div>
            </div>
            <ol>
              <li>Scannez le QR code avec l'appareil photo du téléphone.</li>
              <li>Tapez le code PIN provisoire.</li>
              <li>Choisissez votre code secret de 6 chiffres. Ne le donnez à personne.</li>
            </ol>
          </article>
        </div>
        <footer className="pop-pied no-print">
          <button type="button" className="secondary-button" onClick={onClose}>Fermer</button>
          <button type="button" className="primary-button" onClick={() => imprimer({ taille: "A6 landscape", marge: "5mm" })}>
            <Printer size={16} strokeWidth={2} />Imprimer la carte
          </button>
        </footer>
      </div>
    </div>
  );
}


/* ============================================================
   SUIVI DES COMPTES
   ============================================================ */

const FILTRES = [["tous", "Tous"], ["Actif", "Actifs"], ["PIN provisoire", "PIN provisoire"], ["Bloqué", "Bloqués"],
  ["jamais", "Jamais connectés"], ["Désactivé", "Désactivés"]];

function Suivi() {
  const [donnees, setDonnees] = useState(null);
  const [filtre, setFiltre] = useState("tous");
  const [q, setQ] = useState("");

  const charger = () => api.get("/portail/suivi/").then(({ data }) => setDonnees(data)).catch(() => setDonnees({ comptes: [], compteurs: {} }));
  useEffect(() => { charger(); }, []);

  async function agir(compte, action) {
    const questions = { desactiver: `Désactiver l'espace patient de ${compte.name} ? Il sera déconnecté tout de suite.` };
    if (questions[action] && !window.confirm(questions[action])) return;
    try {
      const { data } = await api.post(`/portail/suivi/${compte.id}/${action}/`);
      setDonnees((d) => ({ ...d, comptes: d.comptes.map((c) => (c.id === data.id ? data : c)) }));
      charger();
    } catch (e) { alert(messageErreur(e)); }
  }

  if (!donnees) return <Chargement />;
  const terme = q.trim().toLowerCase();
  const visibles = donnees.comptes
    .filter((c) => filtre === "tous" || (filtre === "jamais" ? c.neverConnected && c.status !== "Désactivé" : c.status === filtre))
    .filter((c) => !terme || `${c.name} ${c.code} ${c.phone}`.toLowerCase().includes(terme));
  const compte = (id) => (id === "tous" ? donnees.comptes.length : id === "jamais" ? donnees.compteurs["Jamais connecté"] : donnees.compteurs[id]) || 0;

  return (
    <section className="bloc">
      <div className="pp-filtres" role="radiogroup" aria-label="État du compte">
        {FILTRES.map(([id, nom]) => (
          <button key={id} type="button" role="radio" aria-checked={filtre === id} className={filtre === id ? "actif" : ""}
            onClick={() => setFiltre(id)}>{nom}<b>{compte(id)}</b></button>
        ))}
      </div>
      <label className="recherche">
        <Search size={17} strokeWidth={2} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone ou code patient…" aria-label="Rechercher un compte" />
      </label>
      {visibles.length === 0 ? <p className="vide">Aucun compte dans cette liste.</p> : (
        <div className="tableau">
          <table>
            <thead><tr><th>Code</th><th>Patient</th><th>État</th><th>Activé le</th><th>Dernière connexion</th><th /></tr></thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.id}>
                  <td><code>{c.code}</code></td>
                  <td><strong>{c.name}</strong><small>{c.phone || ""}</small></td>
                  <td><span className={`etat ${ETATS[c.status] || ""}`}>{c.status}</span></td>
                  <td>{c.activatedAt}<small>{c.activatedBy}</small></td>
                  <td>{c.lastLogin || "Jamais"}</td>
                  <td>
                    <div className="pp-actions">
                      {c.status === "Bloqué" && (
                        <button type="button" className="primary-button" onClick={() => agir(c, "debloquer")}>
                          <Unlock size={15} strokeWidth={2} />Débloquer
                        </button>
                      )}
                      {c.status === "Désactivé" ? (
                        <button type="button" className="secondary-button" onClick={() => agir(c, "reactiver")}>
                          <ShieldCheck size={15} strokeWidth={2} />Réactiver
                        </button>
                      ) : (
                        <button type="button" className="secondary-button" onClick={() => agir(c, "desactiver")}>
                          <ShieldOff size={15} strokeWidth={2} />Désactiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ============================================================
   ANNONCES
   ============================================================ */

function Annonces() {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState({ titre: "", texte: "", jusquAu: "" });
  const [envoi, setEnvoi] = useState(false);
  const [info, setInfo] = useState("");

  const charger = () => api.get("/portail/personnel/annonces/").then(({ data }) => setListe(data)).catch(() => setListe([]));
  useEffect(() => { charger(); }, []);

  async function publier(event) {
    event.preventDefault();
    if (!window.confirm("Publier cette annonce ? Tous les patients de l'hôpital la verront, et ceux qui ont activé les notifications la recevront sur leur téléphone.")) return;
    setEnvoi(true); setInfo("");
    try {
      const { data } = await api.post("/portail/personnel/annonces/", form);
      setForm({ titre: "", texte: "", jusquAu: "" });
      setInfo(`Annonce publiée. ${data.envoyees} notification${data.envoyees > 1 ? "s" : ""} envoyée${data.envoyees > 1 ? "s" : ""}.`);
      charger();
    } catch (e) { alert(messageErreur(e)); }
    finally { setEnvoi(false); }
  }

  async function retirer(a) {
    if (!window.confirm(`Retirer l'annonce « ${a.titre} » ? Elle disparaît de l'espace des patients.`)) return;
    try { await api.delete(`/portail/personnel/annonces/${a.id}/`); charger(); } catch (e) { alert(messageErreur(e)); }
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  return (
    <div className="pp-annonces">
      <section className="bloc">
        <h2>Nouvelle annonce</h2>
        <form className="pp-annonce-form" onSubmit={publier}>
          <label className="field"><span>Titre<span className="required">*</span></span>
            <input value={form.titre} maxLength={120} placeholder="Ex. Campagne de vaccination"
              onChange={(e) => setForm({ ...form, titre: e.target.value })} /></label>
          <label className="field"><span>Message<span className="required">*</span></span>
            <textarea rows={4} value={form.texte} maxLength={1000}
              onChange={(e) => setForm({ ...form, texte: e.target.value })} /></label>
          <label className="field pp-annonce-date"><span>Visible jusqu'au</span>
            <input type="date" value={form.jusquAu} min={aujourdhui} onChange={(e) => setForm({ ...form, jusquAu: e.target.value })} /></label>
          <button type="submit" className="primary-button" disabled={envoi || !form.titre.trim() || !form.texte.trim()}>
            <Megaphone size={16} strokeWidth={2} />{envoi ? "Publication…" : "Publier"}
          </button>
        </form>
        {info && <p className="bandeau succes" role="status"><span>{info}</span></p>}
      </section>

      <section className="bloc">
        <h2>Annonces publiées</h2>
        {!liste ? <Chargement /> : liste.length === 0 ? <p className="vide">Aucune annonce pour le moment.</p> : (
          <ul className="pp-annonce-liste">
            {liste.map((a) => (
              <li key={a.id} className={a.enCours ? "" : "terminee"}>
                <div>
                  <strong>{a.titre}</strong>
                  <p>{a.texte}</p>
                  <small>
                    {a.publieeLe}{a.auteur ? ` · ${a.auteur}` : ""}
                    {a.jusquAu ? ` · jusqu'au ${a.jusquAu.split("-").reverse().join("/")}` : ""}
                    {` · ${a.envoyees} notification${a.envoyees > 1 ? "s" : ""}`}
                  </small>
                </div>
                <div className="pp-annonce-etat">
                  <span className={`etat ${a.enCours ? "regle" : ""}`}>{a.enCours ? "En ligne" : a.retiree ? "Retirée" : "Terminée"}</span>
                  {a.enCours && (
                    <button type="button" className="secondary-button" title="Retirer" onClick={() => retirer(a)}>
                      <Trash2 size={15} strokeWidth={2} />Retirer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
