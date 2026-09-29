import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck, ClipboardList, Lock,
  Printer, Search, ShieldAlert, Unlock, UserPlus, Users, Wallet,
} from "lucide-react";

import "../styles/Caisse.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import { useAttente } from "../components/attente";
import { useAuth } from "../context/AuthContext";
import StepModal from "../forms/StepModal";
import accueil, { argent, messageErreur, moment } from "./api";
import ListeFiltrable from "./ListeFiltrable";
import Bilan from "./Bilan";
import Regie from "./Regie";
import Ticket from "./Ticket";
import { configDossier } from "./configs";

/*
 * ============================================================
 * ACCUEIL & CAISSE
 * ============================================================
 *
 * Quatre écrans, qui suivent le trajet réel du patient :
 *
 *   Accueil             il arrive, on l'enregistre, on édite sa fiche
 *   Paiements           la fiche est réglée
 *   Patients enregistrés  ce qui a été fait, et où en est chacun
 *   Bilan               l'état de la caisse, ses opérations, sa clôture
 *
 * L'enregistrement se fait d'un bout à l'autre dans le popup :
 * la création du dossier et l'envoi en caisse ont lieu en
 * arrière-plan, sans que la page derrière ait bougé.
 * ============================================================
 */

/*
 * Chaque écran déclare à qui il s'adresse. Un régisseur qui ne tient pas de
 * caisse ne voit que la régie ; un compte qui cumule les deux rôles voit tout.
 */
const ECRANS = [
  { id: "accueil", pour: "caissier", label: "Accueil", icone: UserPlus, titre: "Accueil", sous: "Rechercher un patient, l'enregistrer, éditer sa fiche" },
  { id: "paiements", pour: "caissier", label: "Paiements", icone: ClipboardList, titre: "Paiements", sous: "Fiches en attente de règlement" },
  { id: "enregistres", pour: "caissier", label: "Patients enregistrés", icone: Users, titre: "Patients enregistrés", sous: "Ce qui a été enregistré, et où en est chaque patient" },
  { id: "bilan", pour: "caissier", label: "Mon bilan", icone: Wallet, titre: "Mon bilan", sous: "Ma caisse, mes opérations et mes clôtures" },
  { id: "regie", pour: "regisseur", label: "Régie", icone: ShieldAlert, titre: "Régie", sous: "Clôtures à valider, caisses, tickets et corbeille" },
];

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export default function Caisse() {
  const { user } = useAuth();
  const [ecran, setEcran] = useState("accueil");
  const [refs, setRefs] = useState({ services: [], prestations: [], assurances: [] });
  const [session, setSession] = useState(null);
  const [popup, setPopup] = useState(null);      // { patient? }
  const [recu, setRecu] = useState(null);
  const [version, setVersion] = useState(0);
  const [bilan, setBilan] = useState(null);
  const [periode, setPeriode] = useState({ du: aujourdhui(), au: aujourdhui() });

  const rafraichir = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => { accueil.get("referentiels").then(setRefs).catch(() => {}); }, []);

  /* Le bilan porte les droits : c'est lui qui dit ce que ce compte occupe. */
  useEffect(() => {
    accueil.get("bilan", periode).then(setBilan).catch(() => setBilan(null));
  }, [version, periode.du, periode.au]);

  useEffect(() => { setSession(bilan?.session || null); }, [bilan]);

  /* Le module s'annonce une seconde pleine, même si le serveur a déjà répondu. */
  const attente = useAttente(!bilan);

  const ecrans = ECRANS.filter((e) => bilan && bilan[e.pour]);
  const courant = ecrans.find((e) => e.id === ecran) || ecrans[0];

  /* Un régisseur pur atterrit sur la régie, pas sur un écran qu'il n'a pas. */
  useEffect(() => {
    if (courant && courant.id !== ecran) setEcran(courant.id);
  }, [courant, ecran]);

  /*
   * Enregistrement complet, en arrière-plan : le dossier est créé,
   * puis la fiche, puis l'écran de confirmation s'affiche dans le
   * même popup. L'utilisateur n'a rien vu bouger derrière.
   */
  async function enregistrer(valeurs) {
    try {
      const patient = popup.patient || await accueil.post("patients", {
        last_name: valeurs.last_name?.toUpperCase(),
        first_names: valeurs.first_names,
        birth_date: valeurs.birth_date || null,
        sex: valeurs.sex,
        phone: valeurs.phone,
        city: valeurs.city || "",
        locality: valeurs.locality || "",
        address: valeurs.address || "",
        profession: valeurs.profession || "",
        emergency_contact: valeurs.emergency_contact || "",
        emergency_phone: valeurs.emergency_phone || "",
        emergency_relationship: valeurs.emergency_relationship || "",
        assurance: valeurs.assure ? Number(valeurs.assurance) : null,
        numero_assurance: valeurs.assure ? valeurs.numero_assurance : "",
      });

      /*
       * Un doublon n'est pas une erreur de saisie : le serveur répond 409
       * avec la fiche déjà émise, et l'écran propose de la réimprimer.
       */
      let fiche;
      try {
        fiche = await accueil.post("fiches", {
          patient: patient.id,
          service: Number(valeurs.service),
          prestation: Number(valeurs.prestation),
          quantite: Number(valeurs.quantite) || 1,
          notes: valeurs.notes || "",
        });
      } catch (e) {
        if (e?.response?.status === 409) {
          rafraichir();
          return { patient, doublon: e.response.data };
        }
        throw e;
      }

      rafraichir();
      return { patient, fiche };
    } catch (e) {
      if (e instanceof Error && !e.response) throw e;
      throw new Error(messageErreur(e));
    }
  }

  /* Régler une fiche, d'où qu'on la lance : popup de création ou liste. */
  async function payerFiche(fiche, montantRecu) {
    try {
      const reglee = await accueil.post(`fiches/${fiche.id}/valider`, { montant_recu: montantRecu });
      rafraichir();
      return reglee;
    } catch (e) {
      throw new Error(messageErreur(e));
    }
  }

  return (
    <Coquille ecrans={ecrans} ecran={courant?.id} onEcran={setEcran}
      actions={<>
            {bilan?.caissier && (
              <button type="button" className={`caisse-date-chip etat-caisse ${session ? "ouverte" : "fermee"}`}
                onClick={() => setEcran("bilan")}>
                {session ? <Unlock size={16} strokeWidth={2} /> : <Lock size={16} strokeWidth={2} />}
                {session ? `Caisse ouverte depuis ${new Date(session.ouverte_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Caisse fermée"}
              </button>
            )}
      </>}
      apres={<>
      {/* Un seul popup, du premier champ jusqu'à la confirmation. */}
      {popup && (
        <StepModal
          config={configDossier({ ...refs, patientExistant: !!popup.patient, patient: popup.patient })}
          initialValues={{ quantite: 1, assure: false, __patient_existant__: !!popup.patient }}
          onClose={() => setPopup(null)}
          onSubmit={enregistrer}
          renderSuccess={({ patient, fiche, doublon }, fermer) =>
            doublon ? (
              <Doublon
                patient={patient}
                doublon={doublon}
                onFermer={fermer}
                onImprimer={() => { fermer(); setRecu({ fiche: doublon.fiche_existante, duplicata: true }); }}
              />
            ) : (
              <Confirmation
                patient={patient}
                fiche={fiche}
                session={session}
                onFermer={() => { fermer(); setEcran("paiements"); }}
                onPayer={async (f, montantRecu) => {
                  const reglee = await payerFiche(f, montantRecu);
                  fermer();
                  setRecu({ fiche: reglee, duplicata: false });
                }}
              />
            )
          }
        />
      )}

      {recu && (
        <Ticket
          fiche={recu.fiche}
          duplicata={recu.duplicata}
          etablissement={refs.etablissement}
          onClose={() => setRecu(null)}
        />
      )}
      </>}>

          {attente || !bilan ? <Chargement taille="grande" pleine texte="Chargement du module…" /> : <>
            {courant?.id === "accueil" && (
              <EcranAccueil version={version} onNouveau={() => setPopup({})}
                onFiche={(patient) => setPopup({ patient })} />
            )}
            {courant?.id === "paiements" && (
              <EcranPaiements version={version} session={session} rafraichir={rafraichir}
                onRecu={setRecu} onBilan={() => setEcran("bilan")} />
            )}
            {courant?.id === "enregistres" && <EcranEnregistres version={version} />}
            {courant?.id === "bilan" && (
              <Bilan bilan={bilan} periode={periode} setPeriode={setPeriode} rafraichir={rafraichir}
                etablissement={refs.etablissement}
                caissier={user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username} />
            )}
            {courant?.id === "regie" && (
              <Regie bilan={bilan} periode={periode} setPeriode={setPeriode} rafraichir={rafraichir} />
            )}
          </>}
    </Coquille>
  );
}

/* ============================================================
   CONFIRMATION — dans le même popup
   ============================================================ */

/*
 * Le paiement se fait ici, sans quitter le popup : le caissier n'a pas à
 * fermer, changer d'écran et retrouver la ligne pour encaisser.
 */
function Confirmation({ patient, fiche, session, onPayer, onFermer }) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [recu, setRecu] = useState(String(Number(fiche.montant_patient)));
  const aRegler = Number(fiche.montant_patient) > 0;
  const insuffisant = aRegler && !(Number(recu) >= Number(fiche.montant_patient));

  async function payer() {
    setOccupe(true); setErreur("");
    try { await onPayer(fiche, aRegler ? recu : undefined); }
    catch (e) { setErreur(e.message); setOccupe(false); }
  }

  return (
    <>
      <header className="pop-tete">
        <div>
          <h2>Dossier enregistré</h2>
          <p>{aRegler ? "Vous pouvez régler tout de suite." : "Rien à encaisser : la prise en charge est totale."}</p>
        </div>
      </header>

      <div className="pop-corps">
        <div className="reussite"><BadgeCheck size={38} strokeWidth={2} aria-hidden="true" /></div>
        <dl className="recap">
          <div><dt>Patient</dt><dd>{patient.nom_complet}</dd></div>
          <div><dt>N° de dossier</dt><dd><code>{patient.patient_number}</code></dd></div>
          <div><dt>Fiche</dt><dd><code>{fiche.reference}</code></dd></div>
          <div><dt>Prestation</dt><dd>{fiche.prestation_nom}</dd></div>
          {Number(fiche.montant_assurance) > 0 && (
            <div><dt>Part assurance</dt><dd>− {argent(fiche.montant_assurance)}</dd></div>
          )}
        </dl>
        <p className="total">À payer <strong>{argent(fiche.montant_patient)}</strong></p>
        {aRegler && session && <MontantRecu aPayer={fiche.montant_patient} valeur={recu} onChange={setRecu} />}

        {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
        {!session && aRegler && (
          <p className="bandeau attention">
            <span>Votre caisse est fermée : ouvrez-la depuis « Mon bilan » pour pouvoir régler.</span>
          </p>
        )}
      </div>

      <footer className="pop-pied">
        <button type="button" className="secondary-button" onClick={onFermer} disabled={occupe}>
          Régler plus tard
        </button>
        <button type="button" className="primary-button" onClick={payer} disabled={occupe || (aRegler && (!session || insuffisant))}>
          <BadgeCheck size={16} strokeWidth={2} />
          {occupe ? "Enregistrement…" : aRegler ? "Payer maintenant" : "Valider la prise en charge"}
        </button>
      </footer>
    </>
  );
}

/* ============================================================
   MONTANT REÇU — les espèces remises, et la monnaie à rendre
   ============================================================ */

function MontantRecu({ aPayer, valeur, onChange }) {
  const rendu = Number(valeur) - Number(aPayer);
  return (
    <>
      <label className="field" style={{ marginTop: 18 }}>
        <span>Montant reçu<span className="required">*</span></span>
        <input type="number" min={0} step="1" value={valeur} onChange={(e) => onChange(e.target.value)} />
      </label>
      {valeur !== "" && !Number.isNaN(rendu) && (
        <p className={`ecart ${rendu < 0 ? "manque" : "juste"}`}>
          {rendu < 0 ? `Il manque ${argent(-rendu)}.` : `Monnaie à rendre : ${argent(rendu)}`}
        </p>
      )}
    </>
  );
}

/* ============================================================
   DOUBLON — même patient, même service, moins de quinze jours
   ============================================================ */

function Doublon({ patient, doublon, onFermer, onImprimer }) {
  const ancienne = doublon.fiche_existante;
  // Une fiche récente n'est pas forcément réglée : ne pas l'affirmer.
  const reglee = ancienne.statut !== "en_attente";

  return (
    <>
      <header className="pop-tete">
        <div>
          <h2>Une fiche existe déjà</h2>
          <p>{patient.nom_complet}</p>
        </div>
      </header>

      <div className="pop-corps">
        <div className="avertissement attention" role="alert">
          <ShieldAlert size={20} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>Aucune nouvelle fiche n'a été créée.</strong>
            <p>
              {reglee
                ? `Ce patient a déjà réglé ce service il y a moins de ${doublon.delai_jours} jours.`
                : `Une fiche de moins de ${doublon.delai_jours} jours attend déjà d'être encaissée pour ce service.`}
              {" "}Réimprimez son ticket plutôt que d'en éditer un second.
            </p>
          </div>
        </div>

        <dl className="recap">
          <div><dt>N° de dossier</dt><dd><code>{patient.patient_number}</code></dd></div>
          <div><dt>Ticket existant</dt><dd><code>{ancienne.reference}</code></dd></div>
          <div><dt>Prestation</dt><dd>{ancienne.prestation_nom}</dd></div>
          <div><dt>Service</dt><dd>{ancienne.service_nom || "—"}</dd></div>
          <div><dt>Émis le</dt><dd>{moment(ancienne.date_creation)}</dd></div>
          <div><dt>État</dt><dd>{ancienne.statut_display}</dd></div>
        </dl>
        <p className="total">
          {reglee ? "Montant réglé" : "Reste à encaisser"}
          <strong>{argent(ancienne.montant_patient)}</strong>
        </p>
      </div>

      <footer className="pop-pied">
        <button type="button" className="secondary-button" onClick={onFermer}>Fermer</button>
        <button type="button" className="primary-button" onClick={onImprimer}>
          <Printer size={16} strokeWidth={2} />Réimprimer son ticket
        </button>
      </footer>
    </>
  );
}


/* ============================================================
   ÉCRAN 1 — ACCUEIL
   ============================================================ */

function EcranAccueil({ version, onNouveau, onFiche }) {
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(null);   // { total, resultats, reste }

  /*
   * La recherche est faite par le serveur, qui ne renvoie que les dix
   * premiers dossiers et le nombre de ceux qu'il garde. Afficher quatre-vingts
   * lignes pour en lire trois n'aide personne, et alourdit chaque appel.
   */
  useEffect(() => {
    const minuteur = setTimeout(() => {
      accueil.get("patients", { q: recherche })
        .then(setPage)
        .catch(() => setPage({ total: 0, resultats: [], reste: 0 }));
    }, 250);
    return () => clearTimeout(minuteur);
  }, [recherche, version]);

  const patients = page?.resultats;
  const attente = useAttente(!patients);

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Rechercher un patient</h2>
          <p>
            {page
              ? `${page.total} dossier(s) au total. Tapez un nom, un téléphone ou un numéro pour retrouver le bon.`
              : "Vérifiez qu'il n'a pas déjà un dossier avant d'en créer un nouveau."}
          </p>
        </div>
        <button type="button" className="primary-button grand" onClick={onNouveau}>
          <UserPlus size={18} strokeWidth={2} />Nouveau patient
        </button>
      </div>

      <label className="recherche">
        <Search size={17} strokeWidth={2} aria-hidden="true" />
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom, téléphone, n° de dossier ou n° d'assurance…" aria-label="Rechercher un patient" />
      </label>

      {attente || !patients ? <Chargement />
        : patients.length === 0 ? (
          <p className="vide">
            {recherche ? "Aucun dossier ne correspond. Enregistrez un nouveau patient." : "Aucun patient enregistré pour le moment."}
          </p>
        ) : (
          <div className="tableau">
            <table>
              <thead><tr><th>N° dossier</th><th>Patient</th><th>Téléphone</th><th>Assurance</th><th /></tr></thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.patient_number}</code></td>
                    <td><strong>{p.nom_complet}</strong><small>{p.sex === "F" ? "Féminin" : p.sex === "M" ? "Masculin" : "Autre"}{p.birth_date ? ` · ${p.birth_date}` : ""}</small></td>
                    <td>{p.phone || "—"}</td>
                    <td>{p.a_assurance ? `${p.assurance_nom} (${p.taux_assurance} %)` : "Non assuré"}</td>
                    <td>
                      <div className="ligne-actions">
                        <a className="secondary-button" href={`/dossiers/${p.id}`}>Dossier</a>
                        <button type="button" className="secondary-button" onClick={() => onFiche(p)}>Nouvelle fiche</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {page?.reste > 0 && (
        <p className="reste-cache">
          {page.reste} autre{page.reste > 1 ? "s" : ""} dossier{page.reste > 1 ? "s" : ""} non affiché{page.reste > 1 ? "s" : ""}.
          {" "}Affinez la recherche pour {page.reste > 1 ? "les" : "le"} retrouver.
        </p>
      )}
    </section>
  );
}

/* ============================================================
   ÉCRAN 2 — PAIEMENTS
   ============================================================ */

function EcranPaiements({ version, session, rafraichir, onRecu, onBilan }) {
  const [fiches, setFiches] = useState(null);
  const [aValider, setAValider] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    accueil.get("fiches", { statut: "en_attente" }).then(setFiches).catch(() => setFiches([]));
  }, [version]);

  const attente = useAttente(!fiches);

  async function valider(fiche) {
    setOccupe(true); setErreur("");
    try {
      const reglee = await accueil.post(`fiches/${fiche.id}/valider`, { montant_recu: fiche.recu });
      setAValider(null);
      onRecu({ fiche: reglee, duplicata: false });
      rafraichir();
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setOccupe(false); }
  }

  return (
    <>
      {!session && (
        <div className="bandeau attention">
          <span><strong>La caisse est fermée.</strong> Vous voyez les fiches, mais vous ne pouvez pas encore les régler.</span>
          <button type="button" className="primary-button" onClick={onBilan}>
            <Unlock size={16} strokeWidth={2} />Ouvrir ma caisse
          </button>
        </div>
      )}

      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}

      <section className="bloc">
        <div className="bloc-tete">
          <div><h2>Fiches en attente</h2><p>{fiches ? `${fiches.length} fiche(s) à régler` : "…"}</p></div>
        </div>

        {attente || !fiches ? <Chargement /> : (
          <ListeFiltrable
            lignes={fiches}
            champs={(f) => `${f.patient_nom} ${f.patient_code} ${f.reference} ${f.prestation_nom} ${f.service_nom}`}
            placeholder="Patient, n° de dossier, ticket ou prestation…"
            vide="Aucune fiche en attente de règlement."
          >{(visibles) => (
            <div className="tableau">
              <table>
                <thead><tr><th>Patient</th><th>N° dossier</th><th>Prestation</th><th>Service</th><th>Assurance</th><th>À payer</th><th /></tr></thead>
                <tbody>
                  {visibles.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.patient_nom}</strong><small>{moment(f.date_creation)}</small></td>
                      <td><code>{f.patient_code}</code></td>
                      <td>{f.prestation_nom}{f.quantite > 1 && <small>× {f.quantite}</small>}</td>
                      <td>{f.service_nom || "—"}</td>
                      <td>{argent(f.montant_assurance)}</td>
                      <td><strong>{argent(f.montant_patient)}</strong></td>
                      <td>
                        {session
                          ? <button type="button" className="primary-button" onClick={() => setAValider({ ...f, recu: String(Number(f.montant_patient)) })}>Payer</button>
                          : <span className="note">Caisse fermée</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}</ListeFiltrable>
        )}
      </section>

      {aValider && (
        <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setAValider(null)}>
          <div className="pop-boite etroite" role="dialog" aria-modal="true" aria-label="Confirmer le paiement">
            <header className="pop-tete"><div><h2>Confirmer le paiement</h2><p>{aValider.patient_nom}</p></div></header>
            <div className="pop-corps">
              <dl className="recap">
                <div><dt>N° de dossier</dt><dd><code>{aValider.patient_code}</code></dd></div>
                <div><dt>Prestation</dt><dd>{aValider.prestation_nom}</dd></div>
                <div><dt>Service</dt><dd>{aValider.service_nom || "—"}</dd></div>
                <div><dt>Part assurance</dt><dd>− {argent(aValider.montant_assurance)}</dd></div>
              </dl>
              <p className="total">À payer <strong>{argent(aValider.montant_patient)}</strong></p>
              {Number(aValider.montant_patient) > 0 && (
                <MontantRecu aPayer={aValider.montant_patient} valeur={aValider.recu}
                  onChange={(recu) => setAValider({ ...aValider, recu })} />
              )}
            </div>
            <footer className="pop-pied">
              <button type="button" className="secondary-button" onClick={() => setAValider(null)} disabled={occupe}>Annuler</button>
              <button type="button" className="primary-button" onClick={() => valider(aValider)}
                disabled={occupe || (Number(aValider.montant_patient) > 0 && !(Number(aValider.recu) >= Number(aValider.montant_patient)))}>
                <BadgeCheck size={16} strokeWidth={2} />{occupe ? "Enregistrement…" : "Confirmer"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   ÉCRAN 3 — PATIENTS ENREGISTRÉS
   ============================================================ */

const ETAT_FICHE = {
  en_attente: { texte: "En attente de paiement", classe: "attente" },
  paye: { texte: "Réglé — parti en soins", classe: "regle" },
  assurance: { texte: "Pris en charge — parti en soins", classe: "regle" },
};

function EcranEnregistres({ version }) {
  const [fiches, setFiches] = useState(null);

  useEffect(() => { accueil.get("fiches").then(setFiches).catch(() => setFiches([])); }, [version]);

  const attente = useAttente(!fiches);

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Patients enregistrés</h2>
          <p>Chaque patient enregistré et l'état de sa prise en charge.</p>
        </div>
      </div>

      {attente || !fiches ? <Chargement /> : (
        <ListeFiltrable
          lignes={fiches}
          champs={(f) => `${f.patient_nom} ${f.patient_code} ${f.reference} ${f.prestation_nom}`}
          placeholder="Nom, n° de dossier, ticket ou prestation…"
          vide="Aucun patient enregistré pour le moment."
        >{(visibles) => (
          <div className="tableau">
            <table>
              <thead><tr><th>Patient</th><th>N° dossier</th><th>Fiche</th><th>Prestation</th><th>Montant</th><th>Enregistré</th><th>État</th></tr></thead>
              <tbody>
                {visibles.map((f) => {
                  const etat = ETAT_FICHE[f.statut] || { texte: f.statut_display, classe: "" };
                  return (
                    <tr key={f.id}>
                      <td><strong>{f.patient_nom}</strong></td>
                      <td><code>{f.patient_code}</code></td>
                      <td><code>{f.reference}</code></td>
                      <td>{f.prestation_nom}<small>{f.service_nom}</small></td>
                      <td>{argent(f.montant_patient)}</td>
                      <td>{moment(f.date_creation)}</td>
                      <td><span className={`etat ${etat.classe}`}>{etat.texte}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}</ListeFiltrable>
      )}
    </section>
  );
}

/* ============================================================
   ÉCRAN 4 — BILAN
   ============================================================ */
