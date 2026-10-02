import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BellRing, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Droplet, House, LogOut, Megaphone, MessageCircle, Pill, Send, Stethoscope, TriangleAlert } from "lucide-react";

import "../styles/patient.css";

import Chargement from "../components/Chargement";
import Logo from "../components/Logo";
import portail, { erreur, lireJeton, oublierJeton } from "./api";

/*
 * ============================================================
 * ESPACE PATIENT
 * ============================================================
 *
 * Cinq onglets, comme une application de téléphone : l'accueil
 * (ce qui compte aujourd'hui), le dossier, les médicaments et
 * leurs rappels, les rendez-vous, les messages avec les médecins.
 * Barre d'onglets en bas au téléphone, barre latérale à l'écran.
 * ============================================================
 */

const ONGLETS = [
  { id: "accueil", label: "Accueil", icone: House },
  { id: "dossier", label: "Dossier", icone: ClipboardList },
  { id: "medicaments", label: "Médicaments", icone: Pill },
  { id: "rendez-vous", label: "Rendez-vous", icone: CalendarDays },
  { id: "messages", label: "Messages", icone: MessageCircle },
];

export default function Espace() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const onglet = ONGLETS.some((o) => o.id === params.get("onglet")) ? params.get("onglet") : "accueil";
  const [accueil, setAccueil] = useState(null);
  const [version, setVersion] = useState(0);

  const aller = (id) => setParams(id === "accueil" ? {} : { onglet: id });
  const rafraichir = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => { if (!lireJeton()) navigate("/patient", { replace: true }); }, [navigate]);

  /* L'accueil porte l'identité et le compteur des messages : rechargé à chaque retour. */
  useEffect(() => {
    portail.get("/accueil/").then(({ data }) => setAccueil(data)).catch(() => {});
  }, [version, onglet]);

  /* Le téléphone installe l'espace comme une application (manifeste + service worker). */
  useEffect(() => {
    let lien = document.querySelector('link[rel="manifest"]');
    if (!lien) {
      lien = document.createElement("link");
      lien.rel = "manifest";
      document.head.appendChild(lien);
    }
    lien.href = "/manifest-patient.webmanifest";
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw-patient.js").catch(() => {});
  }, []);

  function deconnecter() {
    oublierJeton();
    navigate("/patient", { replace: true });
  }

  const patient = accueil?.patient;
  const nonLus = accueil?.unreadMessages || 0;

  return (
    <div className="pt-espace">
      <aside className="pt-lateral">
        <div className="pt-marque"><Logo size={34} inverted /><div><strong>MA SANTÉ</strong><span>Mon espace patient</span></div></div>
        <nav>
          {ONGLETS.map(({ id, label, icone: Icone }) => (
            <button key={id} type="button" className={onglet === id ? "actif" : ""} onClick={() => aller(id)}>
              <Icone size={20} strokeWidth={2} /><span>{label}</span>
              {id === "messages" && nonLus > 0 && <b>{nonLus}</b>}
            </button>
          ))}
        </nav>
        <button type="button" className="pt-deconnexion" onClick={deconnecter}><LogOut size={19} strokeWidth={2} />Se déconnecter</button>
      </aside>

      <div className="pt-principal">
        <header className="pt-tete">
          <div className="pt-tete-marque"><Logo size={30} /></div>
          <div className="pt-tete-texte">
            <strong>{patient ? `Bonjour ${patient.firstNames.split(" ")[0]}` : "Mon espace"}</strong>
            <span>{patient ? `${patient.code} · ${patient.hospital}` : ""}</span>
          </div>
          <button type="button" className="pt-tete-sortie" onClick={deconnecter} aria-label="Se déconnecter">
            <LogOut size={20} strokeWidth={2} />
          </button>
        </header>

        <main className="pt-contenu">
          {onglet === "accueil" && <Accueil donnees={accueil} aller={aller} rafraichir={rafraichir} />}
          {onglet === "dossier" && <Dossier />}
          {onglet === "medicaments" && <Medicaments rafraichir={rafraichir} />}
          {onglet === "rendez-vous" && <RendezVous />}
          {onglet === "messages" && <Messages rafraichir={rafraichir} />}
        </main>
      </div>

      <nav className="pt-onglets" aria-label="Sections de l'espace patient">
        {ONGLETS.map(({ id, label, icone: Icone }) => (
          <button key={id} type="button" className={onglet === id ? "actif" : ""} onClick={() => aller(id)}
            aria-current={onglet === id ? "page" : undefined}>
            <span className="pt-onglet-icone"><Icone size={22} strokeWidth={2} />{id === "messages" && nonLus > 0 && <b>{nonLus}</b>}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* Charge une section ; rien n'est gardé hors de la session. */
function useSection(chemin, version = 0) {
  const [donnees, setDonnees] = useState(null);
  const [probleme, setProbleme] = useState("");
  useEffect(() => {
    portail.get(chemin).then(({ data }) => setDonnees(data)).catch((e) => setProbleme(erreur(e)));
  }, [chemin, version]);
  return [donnees, setDonnees, probleme];
}

function Titre({ children, sous }) {
  return <div className="pt-titre"><h1>{children}</h1>{sous && <p>{sous}</p>}</div>;
}

/* ============================================================
   ACCUEIL
   ============================================================ */

function Accueil({ donnees, aller, rafraichir }) {
  if (!donnees) return <Chargement taille="grande" pleine texte="Ouverture de votre espace…" />;
  const { todayIntakes: prises, nextAppointment: rdv, unreadMessages, lastConsultation, annonces = [] } = donnees;
  return (
    <>
      <Titre sous="Ce qui compte pour vous aujourd'hui.">Bienvenue</Titre>
      <ActiverRappels />

      {annonces.map((a) => (
        <section key={a.id} className="pt-carte pt-annonce" role="note">
          <div className="pt-carte-tete"><Megaphone size={20} strokeWidth={2} /><h2>{a.titre}</h2></div>
          <p>{a.texte}</p>
          <small>Votre hôpital · {a.publieeLe.slice(0, 10)}</small>
        </section>
      ))}

      <section className="pt-carte">
        <div className="pt-carte-tete"><Pill size={20} strokeWidth={2} /><h2>Médicaments d'aujourd'hui</h2></div>
        {prises.length === 0 ? (
          <p className="pt-vide">Aucune prise prévue aujourd'hui. <button type="button" className="pt-lien" onClick={() => aller("medicaments")}>Programmer mes rappels</button></p>
        ) : (
          <ul className="pt-prises">
            {prises.map((p) => <Prise key={`${p.reminderId}-${p.time}`} prise={p} onFait={rafraichir} />)}
          </ul>
        )}
      </section>

      <div className="pt-grille">
        <button type="button" className="pt-carte pt-carte-lien" onClick={() => aller("rendez-vous")}>
          <div className="pt-carte-tete"><CalendarDays size={20} strokeWidth={2} /><h2>Prochain rendez-vous</h2><ChevronRight size={18} /></div>
          {rdv ? (
            <div className="pt-rdv-court">
              <strong>{rdv.date} à {rdv.time}</strong>
              <span>{rdv.doctor}{rdv.service ? ` · ${rdv.service}` : ""}</span>
              {rdv.reason && <span>{rdv.reason}</span>}
            </div>
          ) : <p className="pt-vide">Aucun rendez-vous prévu.</p>}
        </button>

        <button type="button" className="pt-carte pt-carte-lien" onClick={() => aller("messages")}>
          <div className="pt-carte-tete"><MessageCircle size={20} strokeWidth={2} /><h2>Messages</h2><ChevronRight size={18} /></div>
          {unreadMessages > 0
            ? <p className="pt-chiffre"><strong>{unreadMessages}</strong> nouveau(x) message(s) de vos médecins</p>
            : <p className="pt-vide">Aucun nouveau message.</p>}
        </button>
      </div>

      {lastConsultation && (
        <button type="button" className="pt-carte pt-carte-lien" onClick={() => aller("dossier")}>
          <div className="pt-carte-tete"><Stethoscope size={20} strokeWidth={2} /><h2>Dernière consultation</h2><ChevronRight size={18} /></div>
          <div className="pt-rdv-court">
            <strong>{lastConsultation.date}</strong>
            <span>{lastConsultation.doctor} · {lastConsultation.specialite}</span>
            {lastConsultation.diagnosis && <span>{lastConsultation.programme ? "" : "Diagnostic : "}{lastConsultation.diagnosis}</span>}
          </div>
        </button>
      )}
    </>
  );
}

function Prise({ prise, onFait }) {
  const [occupe, setOccupe] = useState(false);
  async function prendre() {
    setOccupe(true);
    try { await portail.post(`/rappels/${prise.reminderId}/prise/`, { time: prise.time }); onFait(); }
    catch (e) { alert(erreur(e)); }
    finally { setOccupe(false); }
  }
  return (
    <li className={prise.taken ? "prise" : ""}>
      <span className="pt-heure">{prise.time}</span>
      <div><strong>{prise.medicine}</strong>{prise.dose && <span>{prise.dose}</span>}</div>
      {prise.taken
        ? <span className="pt-pris"><Check size={18} strokeWidth={2.5} />Pris</span>
        : <button type="button" className="pt-bouton petit" onClick={prendre} disabled={occupe}>J'ai pris</button>}
    </li>
  );
}

/* Autoriser les notifications : le rappel arrive même téléphone verrouillé. */
function ActiverRappels() {
  const [etat, setEtat] = useState("inconnu");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setEtat("impossible"); return; }
    if (!window.isSecureContext) { setEtat("https"); return; }
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEtat(sub && Notification.permission === "granted" ? "actif" : "inactif"))
      .catch(() => setEtat("inactif"));
  }, []);

  async function activer() {
    setEtat("travail");
    try {
      if ((await Notification.requestPermission()) !== "granted") { setEtat("refuse"); return; }
      const { data } = await portail.get("/notifications/");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clePublique(data.publicKey) });
      await portail.post("/notifications/", { subscription: sub.toJSON() });
      await portail.post("/notifications/test/");
      setEtat("actif");
    } catch { setEtat("inactif"); }
  }

  if (etat === "actif" || etat === "inconnu" || etat === "impossible") return null;
  return (
    <section className="pt-bandeau">
      <BellRing size={22} strokeWidth={2} />
      <div>
        <strong>Recevoir les rappels sur ce téléphone</strong>
        <span>
          {etat === "refuse" ? "Les notifications sont bloquées : autorisez-les dans les réglages du navigateur."
            : etat === "https" ? "Les rappels fonctionneront une fois l'espace ouvert depuis l'adresse sécurisée (https) de l'hôpital."
            : "Une alerte à l'heure de chaque médicament, même téléphone verrouillé."}
        </span>
      </div>
      {(etat === "inactif" || etat === "travail") && (
        <button type="button" className="pt-bouton petit" onClick={activer} disabled={etat === "travail"}>Activer</button>
      )}
    </section>
  );
}

function clePublique(base64) {
  const remplissage = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + remplissage).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

/* ============================================================
   DOSSIER
   ============================================================ */

function Dossier() {
  const [donnees, , probleme] = useSection("/dossier/");
  const [ouverte, setOuverte] = useState(null);
  if (probleme) return <p className="pt-alerte">{probleme}</p>;
  if (!donnees) return <Chargement taille="grande" pleine texte="Chargement de votre dossier…" />;
  const p = donnees.patient;
  return (
    <>
      <Titre sous={`${p.fullName} · ${p.code}`}>Mon dossier</Titre>

      <section className="pt-carte">
        <dl className="pt-infos">
          <div><dt>Sexe</dt><dd>{p.sex || "—"}</dd></div>
          <div><dt>Né(e) le</dt><dd>{p.birthDate || "—"}</dd></div>
          <div><dt><Droplet size={13} /> Groupe sanguin</dt><dd>{p.bloodGroup || "Non renseigné"}</dd></div>
          <div><dt>Assurance</dt><dd>{p.insurance || "—"}</dd></div>
        </dl>
        {p.allergies && <p className="pt-allergie"><TriangleAlert size={17} strokeWidth={2} /><span><strong>Allergies :</strong> {p.allergies}</span></p>}
      </section>

      <h2 className="pt-section">Mes consultations</h2>
      {donnees.consultations.length === 0 ? <p className="pt-vide carte">Aucune consultation pour le moment.</p> : (
        <ol className="pt-consultations">
          {donnees.consultations.map((c) => {
            const ouvert = ouverte === c.id;
            return (
              <li key={c.id} className={`pt-carte ${ouvert ? "ouverte" : ""}`}>
                <button type="button" className="pt-consultation-tete" onClick={() => setOuverte(ouvert ? null : c.id)} aria-expanded={ouvert}>
                  <div>
                    <strong>{c.date}</strong>
                    <span>{c.doctor} · {c.specialite}</span>
                    {c.diagnosis && <em>{c.diagnosis}</em>}
                  </div>
                  <ChevronRight size={20} className="pt-chevron" />
                </button>
                {ouvert && (
                  <dl className="pt-details">
                    {c.reason && <div><dt>Motif</dt><dd>{c.reason}</dd></div>}
                    {c.diagnosis && <div><dt>{c.programme ? "Suivi" : "Diagnostic"}</dt><dd>{c.diagnosis}</dd></div>}
                    {c.treatment && <div><dt>Traitement</dt><dd>{c.treatment}</dd></div>}
                    {c.recommendations && <div><dt>Conseils</dt><dd>{c.recommendations}</dd></div>}
                    {c.nextConsultation && <div><dt>Prochaine visite</dt><dd>{c.nextConsultation}</dd></div>}
                    {c.prescription?.items.length > 0 && (
                      <div><dt>Ordonnance</dt><dd>
                        <ul className="pt-ordonnance">
                          {c.prescription.items.map((i) => (
                            <li key={i.id}><strong>{i.medicine}</strong>{[i.dose, i.duration].filter(Boolean).join(" · ")}</li>
                          ))}
                        </ul>
                      </dd></div>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

/* ============================================================
   MÉDICAMENTS ET RAPPELS
   ============================================================ */

function Medicaments({ rafraichir }) {
  const [donnees, setDonnees, probleme] = useSection("/medicaments/");
  const [edition, setEdition] = useState(null); // { item, times }
  if (probleme) return <p className="pt-alerte">{probleme}</p>;
  if (!donnees) return <Chargement taille="grande" pleine texte="Chargement de vos médicaments…" />;

  async function enregistrer(item, times, active = true) {
    try {
      const { data } = await portail.post(`/medicaments/${item.id}/rappel/`, { times, active, endDate: item.endDate || null });
      setDonnees(data);
      setEdition(null);
      rafraichir();
    } catch (e) { alert(erreur(e)); }
  }

  return (
    <>
      <Titre sous="Votre posologie, et une alerte à l'heure de chaque prise.">Mes médicaments</Titre>
      <ActiverRappels />
      {donnees.ordonnances.length === 0 ? <p className="pt-vide carte">Aucune ordonnance pour le moment.</p> : (
        donnees.ordonnances.map((o) => (
          <section key={o.id} className="pt-carte">
            <div className="pt-carte-tete"><ClipboardList size={20} strokeWidth={2} /><h2>Ordonnance du {o.date}</h2></div>
            <p className="pt-sous">{o.doctor}</p>
            <ul className="pt-medicaments">
              {o.items.map((item) => {
                const r = item.reminder;
                const actif = r?.active;
                return (
                  <li key={item.id}>
                    <div className="pt-medicament">
                      <span className="pt-medicament-icone"><Pill size={20} strokeWidth={2} /></span>
                      <div>
                        <strong>{item.medicine}</strong>
                        <span>{[item.dose, item.duration, item.route].filter(Boolean).join(" · ") || "Suivez l'ordonnance"}</span>
                      </div>
                    </div>
                    {edition?.item.id === item.id ? (
                      <HeuresRappel initiales={edition.times} onAnnuler={() => setEdition(null)}
                        onValider={(times) => enregistrer(item, times)} />
                    ) : (
                      <div className="pt-rappel">
                        {actif ? (
                          <>
                            <span className="pt-rappel-heures"><BellRing size={16} />{r.times.join(" · ")}</span>
                            <button type="button" className="pt-lien" onClick={() => setEdition({ item, times: r.times })}>Modifier</button>
                            <button type="button" className="pt-lien discret" onClick={() => enregistrer(item, r.times, false)}>Arrêter</button>
                          </>
                        ) : (
                          <button type="button" className="pt-bouton petit secondaire"
                            onClick={() => setEdition({ item, times: r?.times?.length ? r.times : item.suggestedTimes })}>
                            <BellRing size={16} />Me rappeler
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

function HeuresRappel({ initiales, onValider, onAnnuler }) {
  const [heures, setHeures] = useState(initiales);
  return (
    <div className="pt-heures">
      <span>À quelles heures ?</span>
      <div className="pt-heures-liste">
        {heures.map((h, i) => (
          <label key={i} className="pt-heure-champ">
            <input type="time" value={h} onChange={(e) => setHeures(heures.map((x, j) => (j === i ? e.target.value : x)))} />
            {heures.length > 1 && <button type="button" aria-label="Retirer" onClick={() => setHeures(heures.filter((_, j) => j !== i))}>×</button>}
          </label>
        ))}
        {heures.length < 6 && <button type="button" className="pt-lien" onClick={() => setHeures([...heures, "12:00"])}>+ Ajouter une heure</button>}
      </div>
      <div className="pt-heures-actions">
        <button type="button" className="pt-bouton petit secondaire" onClick={onAnnuler}>Annuler</button>
        <button type="button" className="pt-bouton petit" onClick={() => onValider(heures.filter(Boolean))}>Activer le rappel</button>
      </div>
    </div>
  );
}

/* ============================================================
   RENDEZ-VOUS
   ============================================================ */

function RendezVous() {
  const [donnees, , probleme] = useSection("/rendez-vous/");
  if (probleme) return <p className="pt-alerte">{probleme}</p>;
  if (!donnees) return <Chargement taille="grande" pleine texte="Chargement de vos rendez-vous…" />;
  const ligne = (r) => (
    <li key={r.id} className={`pt-carte pt-rdv ${r.cancelled ? "annule" : ""}`}>
      <div className="pt-rdv-date"><strong>{r.date.slice(0, 2)}</strong><span>{moisCourt(r.date)}</span></div>
      <div className="pt-rdv-texte">
        <strong>{r.time} · {r.doctor}</strong>
        <span>{[r.service, r.reason].filter(Boolean).join(" · ") || "Consultation"}</span>
        <em>{r.status}</em>
      </div>
    </li>
  );
  return (
    <>
      <Titre sous="Présentez-vous à l'accueil quelques minutes avant l'heure.">Mes rendez-vous</Titre>
      <h2 className="pt-section">À venir</h2>
      {donnees.upcoming.length ? <ul className="pt-liste">{donnees.upcoming.map(ligne)}</ul>
        : <p className="pt-vide carte">Aucun rendez-vous à venir.</p>}
      {donnees.past.length > 0 && (<><h2 className="pt-section">Passés</h2><ul className="pt-liste passe">{donnees.past.map(ligne)}</ul></>)}
    </>
  );
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const moisCourt = (date) => MOIS[Number(date.slice(3, 5)) - 1] || "";

/* ============================================================
   MESSAGES
   ============================================================ */

function Messages({ rafraichir }) {
  const [params, setParams] = useSearchParams();
  const medecin = Number(params.get("medecin")) || null;
  const [version, setVersion] = useState(0);
  const [fils, , probleme] = useSection("/messages/", version);

  if (medecin) return <Fil medecinId={medecin} onRetour={() => { setParams({ onglet: "messages" }); setVersion((n) => n + 1); rafraichir(); }} />;
  if (probleme) return <p className="pt-alerte">{probleme}</p>;
  if (!fils) return <Chargement taille="grande" pleine texte="Chargement de vos messages…" />;
  return (
    <>
      <Titre sous="Écrivez aux médecins qui vous ont consulté.">Mes messages</Titre>
      {fils.length === 0 ? <p className="pt-vide carte">Vous pourrez écrire à un médecin après votre première consultation.</p> : (
        <ul className="pt-liste">
          {fils.map((f) => (
            <li key={f.doctorId}>
              <button type="button" className="pt-carte pt-fil" onClick={() => setParams({ onglet: "messages", medecin: f.doctorId })}>
                <span className="pt-avatar">{initiales(f.doctor)}</span>
                <div>
                  <strong>{f.doctor}</strong>
                  <span>{f.lastMessage ? `${f.lastMessage.fromPatient ? "Vous : " : ""}${f.lastMessage.text}` : `${f.specialite} · consulté le ${f.lastConsultation}`}</span>
                </div>
                {f.unread > 0 ? <b className="pt-pastille">{f.unread}</b> : <ChevronRight size={18} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const initiales = (nom) => nom.replace(/^Dr\s+/, "").split(/\s+/).map((m) => m[0]).join("").slice(0, 2).toUpperCase();

function Fil({ medecinId, onRetour }) {
  const [fil, setFil] = useState(null);
  const [texte, setTexte] = useState("");
  const [probleme, setProbleme] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const bas = useRef(null);

  const charger = useCallback(() => portail.get(`/messages/${medecinId}/`)
    .then(({ data }) => setFil(data)).catch((e) => setProbleme(erreur(e))), [medecinId]);

  /* Les réponses arrivent sans recharger : on regarde toutes les 15 secondes. */
  useEffect(() => { charger(); const t = setInterval(charger, 15000); return () => clearInterval(t); }, [charger]);
  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [fil?.messages.length]);

  async function envoyer(event) {
    event.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true);
    try { await portail.post(`/messages/${medecinId}/`, { text: texte }); setTexte(""); await charger(); }
    catch (e) { setProbleme(erreur(e)); }
    finally { setEnvoi(false); }
  }

  return (
    <div className="pt-conversation">
      <div className="pt-conversation-tete">
        <button type="button" onClick={onRetour} aria-label="Retour aux messages"><ChevronLeft size={22} /></button>
        {fil && <><span className="pt-avatar">{initiales(fil.doctor)}</span><strong>{fil.doctor}</strong></>}
      </div>
      {probleme && <p className="pt-alerte">{probleme}</p>}
      {!fil ? <Chargement /> : (
        <div className="pt-bulles">
          {fil.messages.length === 0 && <p className="pt-vide">Écrivez votre premier message à {fil.doctor}. Pour une urgence, rendez-vous à l'hôpital ou appelez les secours.</p>}
          {fil.messages.map((m) => (
            <div key={m.id} className={`pt-bulle ${m.fromPatient ? "moi" : "lui"}`}>
              <p>{m.text}</p>
              <span>{m.sentAt}</span>
            </div>
          ))}
          <div ref={bas} />
        </div>
      )}
      <form className="pt-saisie" onSubmit={envoyer}>
        <textarea rows={1} value={texte} maxLength={2000} placeholder="Votre message…" aria-label="Votre message"
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) envoyer(e); }} />
        <button type="submit" className="pt-envoyer" disabled={envoi || !texte.trim()} aria-label="Envoyer"><Send size={20} /></button>
      </form>
    </div>
  );
}
