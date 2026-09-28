import { useEffect, useState } from "react";
import { BadgeCheck, Hospital, Plus, UserPlus, UserRoundCog } from "lucide-react";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import api from "../services/api";
import { messageErreur } from "../accueil/api";
import ListeFiltrable from "../accueil/ListeFiltrable";

/*
 * ============================================================
 * PLATEFORME — MODULE HÔPITAL
 * ============================================================
 *
 * Le logiciel est multitenant : chaque hôpital client est créé
 * ici, avec un code de trois lettres tiré de son nom. Ce code
 * termine le numéro de dossier de chacun de ses patients
 * (P25F46TSB pour l'hôpital TSB).
 *
 * Deux sous-modules :
 *
 *   Hôpitaux          créer un hôpital : nom, contacts, ville, quartier
 *   Administrateurs   créer l'administrateur rattaché à un hôpital,
 *                     qui complétera lui-même sa fiche et ses
 *                     paramètres (souches, validité des reçus…)
 * ============================================================
 */

const ECRANS = [
  { id: "hopitaux", label: "Hôpitaux", icone: Hospital, titre: "Hôpitaux", sous: "Créer et suivre les hôpitaux clients" },
  { id: "administrateurs", label: "Administrateurs", icone: UserRoundCog, titre: "Administrateurs", sous: "Un administrateur par hôpital, qui complète ses informations et ses paramètres" },
];

export default function Hopitaux() {
  const [ecran, setEcran] = useState("hopitaux");
  const [hopitaux, setHopitaux] = useState(null);
  const [version, setVersion] = useState(0);
  const rafraichir = () => setVersion((n) => n + 1);

  useEffect(() => {
    api.get("/plateforme/hopitaux/").then(({ data }) => setHopitaux(data)).catch(() => setHopitaux([]));
  }, [version]);

  return (
    <Coquille ecrans={ECRANS} ecran={ecran} onEcran={setEcran}>
      {!hopitaux ? <Chargement taille="grande" pleine texte="Chargement…" />
        : ecran === "hopitaux"
          ? <EcranHopitaux hopitaux={hopitaux} rafraichir={rafraichir} />
          : <EcranAdministrateurs hopitaux={hopitaux} version={version} rafraichir={rafraichir} />}
    </Coquille>
  );
}

/* ============================================================
   HÔPITAUX
   ============================================================ */

const HOPITAL_VIDE = { name: "", phone: "", email: "", city: "", district: "" };

function EcranHopitaux({ hopitaux, rafraichir }) {
  const [form, setForm] = useState(null);
  const [code, setCode] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  /* Le code se calcule pendant la saisie du nom : on voit ce qui sera attribué. */
  useEffect(() => {
    if (!form?.name.trim()) { setCode(""); return undefined; }
    const minuteur = setTimeout(() => {
      api.get("/plateforme/hopitaux/code/", { params: { name: form.name } })
        .then(({ data }) => setCode(data.code)).catch(() => setCode(""));
    }, 300);
    return () => clearTimeout(minuteur);
  }, [form?.name]);

  async function creer() {
    setOccupe(true); setErreur("");
    try {
      await api.post("/plateforme/hopitaux/", form);
      setForm(null);
      rafraichir();
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setOccupe(false); }
  }

  async function basculer(h) {
    try {
      await api.patch(`/plateforme/hopitaux/${h.id}/`, { active: !h.active });
      rafraichir();
    } catch (e) { alert(messageErreur(e)); }
  }

  const champ = (id, label, { requis = false, type = "text", placeholder = "" } = {}) => (
    <label className="field">
      <span>{label}{requis && <span className="required">*</span>}</span>
      <input type={type} value={form[id]} placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })} />
    </label>
  );

  const complet = form && form.name.trim() && form.phone.trim() && form.city.trim() && form.district.trim();

  return (
    <>
      <section className="bloc">
        <div className="bloc-tete">
          <div>
            <h2>Hôpitaux</h2>
            <p>{hopitaux.length} hôpital(aux) sur la plateforme. Chacun ne voit que ses propres données.</p>
          </div>
          <button type="button" className="primary-button grand" onClick={() => { setForm(HOPITAL_VIDE); setErreur(""); }}>
            <Plus size={18} strokeWidth={2} />Nouvel hôpital
          </button>
        </div>

        <ListeFiltrable
          lignes={hopitaux}
          champs={(h) => `${h.code} ${h.name} ${h.city} ${h.district} ${h.phone}`}
          placeholder="Code, nom, ville ou quartier…"
          vide="Aucun hôpital pour le moment."
        >{(visibles) => (
          <div className="tableau">
            <table>
              <thead>
                <tr><th>Code</th><th>Hôpital</th><th>Ville · Quartier</th><th>Contacts</th>
                  <th>Administrateurs</th><th>Utilisateurs</th><th>Patients</th><th>Statut</th><th /></tr>
              </thead>
              <tbody>
                {visibles.map((h) => (
                  <tr key={h.id}>
                    <td><code>{h.code}</code></td>
                    <td><strong>{h.name}</strong><small>Créé le {h.createdAt}</small></td>
                    <td>{h.city}<small>{h.district}</small></td>
                    <td>{h.phone}<small>{h.email || "—"}</small></td>
                    <td>{h.admins}</td>
                    <td>{h.users}</td>
                    <td>{h.patients}</td>
                    <td><span className={`etat ${h.active ? "regle" : "attente"}`}>{h.active ? "Actif" : "Suspendu"}</span></td>
                    <td>
                      <button type="button" className="secondary-button" onClick={() => basculer(h)}>
                        {h.active ? "Suspendre" : "Réactiver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}</ListeFiltrable>
      </section>

      {form && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="pop-boite" role="dialog" aria-modal="true" aria-label="Nouvel hôpital">
            <header className="pop-tete">
              <div><h2>Nouvel hôpital</h2><p>Les informations essentielles. L'administrateur complétera le reste.</p></div>
            </header>
            <div className="pop-corps">
              <div className="form-grid">
                <div className="champ-large">{champ("name", "Nom de l'hôpital", { requis: true, placeholder: "Centre de Santé Urbain de Treichville" })}</div>
                {champ("phone", "Téléphone", { requis: true, type: "tel", placeholder: "07 00 00 00 00" })}
                {champ("email", "E-mail", { type: "email", placeholder: "contact@hopital.ci" })}
                {champ("city", "Ville", { requis: true, placeholder: "Abidjan" })}
                {champ("district", "Quartier", { requis: true, placeholder: "Treichville" })}
              </div>
              {code && (
                <p className="bandeau info" style={{ marginTop: 18 }}>
                  <span>Code attribué : <strong>{code}</strong> — ses patients seront numérotés P{String(new Date().getFullYear()).slice(2)}•••{code}.</span>
                </p>
              )}
              {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
            </div>
            <footer className="pop-pied">
              <button type="button" className="secondary-button" onClick={() => setForm(null)} disabled={occupe}>Annuler</button>
              <button type="button" className="primary-button" onClick={creer} disabled={occupe || !complet}>
                <BadgeCheck size={16} strokeWidth={2} />{occupe ? "Création…" : "Créer l'hôpital"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   ADMINISTRATEURS
   ============================================================ */

const ADMIN_VIDE = { hospital: "", name: "", username: "", email: "", phone: "", password: "" };

function EcranAdministrateurs({ hopitaux, version, rafraichir }) {
  const [admins, setAdmins] = useState(null);
  const [form, setForm] = useState(null);
  const [cree, setCree] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/plateforme/administrateurs/").then(({ data }) => setAdmins(data)).catch(() => setAdmins([]));
  }, [version]);

  /* Nom d'utilisateur proposé selon la nomenclature pendant la saisie du nom. */
  useEffect(() => {
    if (!form || form.usernameTouched) return undefined;
    const minuteur = setTimeout(() => {
      if (!form.name.trim()) { setForm((f) => f && { ...f, username: "" }); return; }
      api.get("/administration/users/nom-utilisateur/", { params: { name: form.name } })
        .then(({ data }) => setForm((f) => f && !f.usernameTouched ? { ...f, username: data.username } : f))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(minuteur);
  }, [form?.name]);

  async function creer() {
    setOccupe(true); setErreur("");
    try {
      const { usernameTouched, ...corps } = form;
      const { data } = await api.post("/plateforme/administrateurs/", corps);
      setForm(null);
      setCree(data);
      rafraichir();
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setOccupe(false); }
  }

  const actifs = hopitaux.filter((h) => h.active);
  const complet = form && form.hospital && form.name.trim().split(/\s+/).length >= 2;

  return (
    <>
      <section className="bloc">
        <div className="bloc-tete">
          <div>
            <h2>Administrateurs des hôpitaux</h2>
            <p>Une fois connecté, l'administrateur complète la fiche de son hôpital et règle ses paramètres dans le module Administration.</p>
          </div>
          <button type="button" className="primary-button grand" disabled={!actifs.length}
            onClick={() => { setForm({ ...ADMIN_VIDE, hospital: actifs.length === 1 ? String(actifs[0].id) : "" }); setErreur(""); }}>
            <UserPlus size={18} strokeWidth={2} />Nouvel administrateur
          </button>
        </div>

        {!admins ? <Chargement /> : (
          <ListeFiltrable
            lignes={admins}
            champs={(a) => `${a.hospital} ${a.hospitalCode} ${a.name} ${a.username} ${a.email}`}
            placeholder="Hôpital, nom ou nom d'utilisateur…"
            vide={actifs.length ? "Aucun administrateur pour le moment." : "Créez d'abord un hôpital."}
          >{(visibles) => (
            <div className="tableau">
              <table>
                <thead>
                  <tr><th>Hôpital</th><th>Administrateur</th><th>Nom d'utilisateur</th><th>Contacts</th><th>Statut</th><th>Dernière connexion</th></tr>
                </thead>
                <tbody>
                  {visibles.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.hospital}</strong><small>{a.hospitalCode}</small></td>
                      <td>{a.name}</td>
                      <td><code>{a.username}</code></td>
                      <td>{a.phone || "—"}<small>{a.email || "—"}</small></td>
                      <td><span className={`etat ${a.status === "Actif" ? "regle" : "attente"}`}>{a.status}</span></td>
                      <td>{a.connection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}</ListeFiltrable>
        )}
      </section>

      {form && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="pop-boite" role="dialog" aria-modal="true" aria-label="Nouvel administrateur">
            <header className="pop-tete">
              <div><h2>Nouvel administrateur</h2><p>Il aura tous les droits dans son hôpital, et seulement dans celui-ci.</p></div>
            </header>
            <div className="pop-corps">
              <div className="form-grid">
                <label className="field champ-large">
                  <span>Hôpital<span className="required">*</span></span>
                  <select value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })}>
                    <option value="">Sélectionner l'hôpital…</option>
                    {actifs.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.code})</option>)}
                  </select>
                </label>
                <label className="field champ-large">
                  <span>Nom et prénoms<span className="required">*</span></span>
                  <input value={form.name} placeholder="YAO Serge" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="field">
                  <span>Nom d'utilisateur</span>
                  <input value={form.username} placeholder="syao"
                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase(), usernameTouched: true })} />
                  <small className="field-help" style={{ color: "var(--danger)" }}>Nom d'utilisateur — n'oubliez pas de le copier</small>
                </label>
                <label className="field">
                  <span>Mot de passe</span>
                  <input type="password" value={form.password} autoComplete="new-password"
                    placeholder="Laisser vide : mot de passe provisoire"
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </label>
                <label className="field">
                  <span>E-mail</span>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
                <label className="field">
                  <span>Téléphone</span>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
              </div>
              {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
            </div>
            <footer className="pop-pied">
              <button type="button" className="secondary-button" onClick={() => setForm(null)} disabled={occupe}>Annuler</button>
              <button type="button" className="primary-button" onClick={creer} disabled={occupe || !complet}>
                <BadgeCheck size={16} strokeWidth={2} />{occupe ? "Création…" : "Créer l'administrateur"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {cree && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCree(null)}>
          <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Administrateur créé">
            <header className="pop-tete"><div><h2>Administrateur créé</h2><p>{cree.hospital}</p></div></header>
            <div className="pop-corps">
              <div className="reussite"><BadgeCheck size={38} strokeWidth={2} aria-hidden="true" /></div>
              <dl className="recap">
                <div><dt>Administrateur</dt><dd>{cree.name}</dd></div>
                <div><dt>Nom d'utilisateur</dt><dd><code>{cree.username}</code></dd></div>
                {cree.temporaryPassword && <div><dt>Mot de passe provisoire</dt><dd><code>{cree.temporaryPassword}</code></dd></div>}
              </dl>
              <p className="bandeau attention"><span>Transmettez ces identifiants à l'administrateur : ils ne seront plus affichés.</span></p>
            </div>
            <footer className="pop-pied">
              <button type="button" className="primary-button" onClick={() => setCree(null)}>J'ai noté les identifiants</button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
