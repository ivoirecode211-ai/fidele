import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Delete, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

import "../styles/patient.css";

import Logo from "../components/Logo";
import portail, { codeRetenu, erreur, garderJeton, lireJeton, oublierCode, retenirCode } from "./api";

/*
 * ============================================================
 * CONNEXION DE L'ESPACE PATIENT
 * ============================================================
 *
 * Pensée pour ceux qui lisent peu : le code patient arrive déjà
 * rempli (QR code de la carte d'accès, ou retenu par le téléphone),
 * et il ne reste qu'à taper six chiffres sur un grand pavé.
 * ============================================================
 */

export default function Connexion() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => (params.get("code") || codeRetenu()).toUpperCase());
  const [etape, setEtape] = useState(() => ((params.get("code") || codeRetenu()) ? "pin" : "code"));
  const [pin, setPin] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [ancien, setAncien] = useState("");
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);

  /* Déjà connecté sur ce téléphone : directement à l'espace. */
  useEffect(() => { if (lireJeton() && etape !== "choisir" && etape !== "confirmer") navigate("/patient/espace", { replace: true }); }, []);

  async function seConnecter(saisi) {
    setOccupe(true); setMessage("");
    try {
      const { data } = await portail.post("/connexion/", { code, pin: saisi });
      retenirCode(code);
      garderJeton(data.token);
      if (data.mustChangePin) { setAncien(saisi); setPin(""); setEtape("choisir"); }
      else navigate("/patient/espace", { replace: true });
    } catch (e) {
      setMessage(erreur(e));
      setPin("");
    } finally { setOccupe(false); }
  }

  async function choisirPin(confirmation) {
    if (confirmation !== nouveau) {
      setMessage("Les deux codes ne sont pas identiques. Recommencez.");
      setNouveau(""); setPin(""); setEtape("choisir");
      return;
    }
    setOccupe(true); setMessage("");
    try {
      const { data } = await portail.post("/pin/", { current: ancien, new: nouveau });
      garderJeton(data.token);
      navigate("/patient/espace", { replace: true });
    } catch (e) {
      setMessage(erreur(e));
      setNouveau(""); setPin(""); setEtape("choisir");
    } finally { setOccupe(false); }
  }

  function saisir(valeur) {
    setPin(valeur);
    if (valeur.length < 6) return;
    if (etape === "pin") seConnecter(valeur);
    else if (etape === "choisir") { setNouveau(valeur); setPin(""); setEtape("confirmer"); setMessage(""); }
    else if (etape === "confirmer") choisirPin(valeur);
  }

  const titres = {
    pin: ["Votre code secret", "Tapez vos 6 chiffres"],
    choisir: ["Choisissez votre code", "6 chiffres que vous seul connaissez"],
    confirmer: ["Confirmez votre code", "Tapez les mêmes 6 chiffres"],
  };

  return (
    <div className="pt-connexion">
      <header className="pt-connexion-tete">
        <Logo size={44} />
        <div>
          <strong>MA SANTÉ</strong>
          <span>Mon espace patient</span>
        </div>
      </header>

      <main className="pt-connexion-carte">
        {etape === "code" ? (
          <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) { setEtape("pin"); setMessage(""); } }}>
            <div className="pt-connexion-icone"><UserRound size={30} strokeWidth={2} /></div>
            <h1>Votre code patient</h1>
            <p>Il est écrit sur votre ticket de caisse et sur votre carte d'accès.</p>
            <input className="pt-code" value={code} autoFocus autoCapitalize="characters" autoComplete="username"
              placeholder="P26…" aria-label="Code patient"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))} />
            <button type="submit" className="pt-bouton" disabled={code.trim().length < 4}>Continuer</button>
          </form>
        ) : (
          <>
            <div className="pt-connexion-icone">
              {etape === "pin" ? <LockKeyhole size={30} strokeWidth={2} /> : <ShieldCheck size={30} strokeWidth={2} />}
            </div>
            <h1>{titres[etape][0]}</h1>
            <p>{titres[etape][1]}</p>
            {etape === "pin" && (
              <button type="button" className="pt-code-choisi" onClick={() => { oublierCode(); setCode(""); setPin(""); setEtape("code"); }}>
                {code} · <span>changer</span>
              </button>
            )}
            <PavePin valeur={pin} onChange={saisir} occupe={occupe} />
          </>
        )}

        {message && <p className="pt-alerte" role="alert">{message}</p>}
      </main>

      <footer className="pt-connexion-pied">
        Code oublié ? Adressez-vous à l'accueil de votre hôpital avec une pièce d'identité.
      </footer>
    </div>
  );
}

/* Six points qui se remplissent, et des touches assez grandes pour un pouce. */
export function PavePin({ valeur, onChange, occupe }) {
  useEffect(() => {
    const touche = (event) => {
      if (occupe) return;
      if (/^\d$/.test(event.key) && valeur.length < 6) onChange(valeur + event.key);
      if (event.key === "Backspace") onChange(valeur.slice(0, -1));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [valeur, onChange, occupe]);

  return (
    <div className="pt-pave">
      <div className={`pt-points ${occupe ? "occupe" : ""}`} aria-label={`${valeur.length} chiffre(s) sur 6`}>
        {Array.from({ length: 6 }, (_, i) => <span key={i} className={i < valeur.length ? "plein" : ""} />)}
      </div>
      <div className="pt-touches">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button key={n} type="button" disabled={occupe || valeur.length >= 6} onClick={() => onChange(valeur + n)}>{n}</button>
        ))}
        <span aria-hidden="true" />
        <button type="button" disabled={occupe || valeur.length >= 6} onClick={() => onChange(valeur + "0")}>0</button>
        <button type="button" className="pt-effacer" aria-label="Effacer" disabled={occupe || !valeur}
          onClick={() => onChange(valeur.slice(0, -1))}>
          <Delete size={26} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
