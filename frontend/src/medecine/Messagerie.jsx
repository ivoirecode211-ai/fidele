import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import "../styles/patient-personnel.css";

import Chargement from "../components/Chargement";
import api from "../services/api";
import { messageErreur } from "../accueil/api";

/*
 * ============================================================
 * MESSAGES DES PATIENTS — SOUS-MODULE DE CONSULTATION
 * ============================================================
 *
 * La boîte de réception du praticien connecté : les patients
 * qu'il a consultés lui écrivent depuis leur espace. Le serveur
 * ne renvoie que SES conversations ; aucun autre praticien ne
 * les voit. `onNonLus` remonte le nombre de messages non lus
 * pour la pastille de la barre latérale.
 * ============================================================
 */

/* Nombre de messages de patients non lus du praticien connecté. */
export const compterNonLus = () => api.get("/portail/medecin/messages/")
  .then(({ data }) => data.reduce((n, f) => n + (f.unread || 0), 0));

export default function Messagerie({ onNonLus }) {
  const [fils, setFils] = useState(null);
  const [choisi, setChoisi] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get("/portail/medecin/messages/").then(({ data }) => {
      setFils(data);
      onNonLus?.(data.reduce((n, f) => n + (f.unread || 0), 0));
    }).catch(() => setFils([]));
  }, [version, onNonLus]);

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
