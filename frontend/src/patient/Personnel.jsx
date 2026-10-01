import LogoEtablissement, { useEtablissement } from "../components/LogoEtablissement";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, MessageCircle, Printer, Search, Send, ShieldOff } from "lucide-react";
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
 *   Messages         le médecin lit et répond à ses patients
 * ============================================================
 */

const ACCES = ["ADMIN", "DIRECTOR", "RECEPTION"];
const MEDECINS = ["ADMIN", "DIRECTOR", "DOCTOR"];

export default function Personnel() {
  const { user } = useAuth();
  const roles = [user?.role, ...(user?.roles || [])];
  const peut = (liste) => user?.is_superuser || roles.some((r) => liste.includes(r));
  const ecrans = [
    peut(ACCES) && { id: "acces", label: "Accès patients", icone: KeyRound, titre: "Accès des patients", sous: "Activer l'espace patient et remettre la carte d'accès" },
    peut(MEDECINS) && { id: "messages", label: "Messages", icone: MessageCircle, titre: "Messages des patients", sous: "Échanger avec les patients que vous avez consultés" },
  ].filter(Boolean);
  const demande = new URLSearchParams(window.location.search).get("vue");
  const [choix, setEcran] = useState(demande);
  // Le compte arrive après le premier affichage : l'écran actif se déduit à chaque fois.
  const ecran = ecrans.find((e) => e.id === choix)?.id || ecrans[0]?.id;

  if (!user) return <Chargement taille="grande" pleine />;
  return (
    <Coquille ecrans={ecrans} ecran={ecran} onEcran={setEcran}
      titre="Espace patients" sous="Réservé à l'accueil et aux médecins">
      {ecran === "acces" && <Acces />}
      {ecran === "messages" && <Messagerie />}
      {!ecrans.length && <p className="bandeau attention"><span>Cet espace est réservé à l'accueil et aux médecins.</span></p>}
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
    if (action === "desactiver" && !window.confirm(`Désactiver l'espace patient de ${patient.name} ?`)) return;
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
                      {!["Aucun accès", "Désactivé"].includes(p.status) && (
                        <button type="button" className="secondary-button" title="Désactiver" onClick={() => agir(p, "desactiver")}>
                          <ShieldOff size={15} strokeWidth={2} />
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
   MESSAGERIE DU MÉDECIN
   ============================================================ */

export function Messagerie() {
  const [fils, setFils] = useState(null);
  const [choisi, setChoisi] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get("/portail/medecin/messages/").then(({ data }) => setFils(data)).catch(() => setFils([]));
  }, [version]);

  return (
    <section className="bloc pp-messagerie">
      <div className="pp-fils">
        <h2>Conversations</h2>
        {!fils ? <Chargement /> : fils.length === 0 ? (
          <p className="vide">Aucun message. Vos patients peuvent vous écrire depuis leur espace après une consultation.</p>
        ) : (
          <ul>
            {fils.map((f) => (
              <li key={f.patientId}>
                <button type="button" className={choisi === f.patientId ? "actif" : ""} onClick={() => setChoisi(f.patientId)}>
                  <strong>{f.patient}</strong>
                  <span>{f.lastMessage.fromPatient ? "" : "Vous : "}{f.lastMessage.text}</span>
                  <small>{f.code} · {f.lastMessage.sentAt}</small>
                  {f.unread > 0 && <b>{f.unread}</b>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="pp-fil">
        {choisi ? <Fil patientId={choisi} onChange={() => setVersion((n) => n + 1)} />
          : <p className="vide">Choisissez une conversation.</p>}
      </div>
    </section>
  );
}

function Fil({ patientId, onChange }) {
  const [fil, setFil] = useState(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const bas = useRef(null);

  const charger = useCallback(() => api.get(`/portail/medecin/messages/${patientId}/`)
    .then(({ data }) => { setFil(data); onChange(); }).catch(() => {}), [patientId]);

  useEffect(() => { setFil(null); charger(); const t = setInterval(charger, 20000); return () => clearInterval(t); }, [charger]);
  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [fil?.messages.length]);

  async function envoyer(event) {
    event.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true);
    try { await api.post(`/portail/medecin/messages/${patientId}/`, { text: texte }); setTexte(""); await charger(); }
    catch (e) { alert(messageErreur(e)); }
    finally { setEnvoi(false); }
  }

  if (!fil) return <Chargement />;
  return (
    <>
      <header className="pp-fil-tete"><strong>{fil.patient}</strong><code>{fil.code}</code></header>
      <div className="pp-bulles">
        {fil.messages.map((m) => (
          <div key={m.id} className={`pp-bulle ${m.fromPatient ? "patient" : "medecin"}`}>
            <p>{m.text}</p><span>{m.sentAt}</span>
          </div>
        ))}
        <div ref={bas} />
      </div>
      <form className="pp-saisie" onSubmit={envoyer}>
        <textarea rows={2} value={texte} maxLength={2000} placeholder="Votre réponse… (le patient est prévenu sur son téléphone)"
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) envoyer(e); }} />
        <button type="submit" className="primary-button" disabled={envoi || !texte.trim()}><Send size={16} />Envoyer</button>
      </form>
    </>
  );
}
