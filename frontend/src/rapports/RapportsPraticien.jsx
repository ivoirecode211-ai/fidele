import { useEffect, useState } from "react";
import { FileBarChart2, Printer, SlidersHorizontal } from "lucide-react";

import "../styles/Caisse.css";
import "../styles/rapports.css";

import Chargement from "../components/Chargement";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { messageErreur } from "../accueil/api";
import {
  BarreRapport, bilanVersDocument, DocumentOfficiel, etatVersDocument, FenetreFiltres, imprimerDocument, moisEnCours,
  organiserPour,
} from "./commun";

/*
 * ============================================================
 * RAPPORTS — SOUS-MODULE DU MODULE DE TRAVAIL
 * ============================================================
 *
 * Disposition du DPI :
 *   « Sélectionner un type de rapport »   liste déroulante, hors
 *                                         du bouton Filtres
 *   Filtres                               période, organiser par,
 *                                         professionnel de santé
 *   Imprimer                              le document officiel
 *
 * Module Consultation : les types du praticien selon ses spécialités
 * (rapport maladie, pathologies associées, activités, nutrition,
 * TDR, goutte épaisse, patients consultés ; CPN, accouchement, CPON…).
 * La direction y voit tout l'établissement.
 *
 * Soins infirmiers, laboratoire, pharmacie : le bilan de l'agent.
 * ============================================================
 */

export default function RapportsPraticien({ consultation = false }) {
  const { user } = useAuth();
  const roles = [user?.role, ...(user?.roles || [])];
  const medecin = roles.includes("DOCTOR");
  const etats = consultation && (medecin || user?.is_superuser || roles.some((r) => ["ADMIN", "DIRECTOR"].includes(r)));
  // Par défaut, le médecin voit sa propre activité ; la direction, tout le service.
  const initiaux = { ...moisEnCours(), organiser: "", professionnel: medecin && user ? String(user.id) : "" };
  const [filtres, setFiltres] = useState(initiaux);
  const [options, setOptions] = useState(undefined);
  const [type, setType] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [rapport, setRapport] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/reports/etats/filtres-praticien/").then(({ data }) => setOptions(data)).catch(() => setOptions(null));
  }, []);

  const types = options?.types || [];
  const courant = types.find((t) => t.id === type) || types[0];

  useEffect(() => {
    if (options === undefined || !user || (etats && !courant)) return;
    setRapport("chargement"); setErreur("");
    const requete = etats
      ? api.get(`/reports/etats/${courant.id}/`, { params: {
        du: filtres.du, au: filtres.au, organiser: organiserPour(courant.organiser, filtres.organiser), medecins: filtres.professionnel || "" } })
        .then(({ data }) => etatVersDocument(data))
      : api.get("/reports/praticien/", { params: { du: filtres.du, au: filtres.au } })
        .then(({ data }) => bilanVersDocument(data, options?.entete));
    requete.then(setRapport).catch((e) => { setRapport(null); setErreur(messageErreur(e)); });
  }, [options, etats, filtres, user, courant]);

  const document = rapport && rapport !== "chargement" ? rapport : null;

  return (
    <div className="rp-page">
      {etats ? (
        <BarreRapport types={types} type={courant?.id} onType={setType} onFiltres={() => setOuvert(true)} document={document} csv={false} />
      ) : (
        <header className="rp-page-tete no-print">
          <span className="rp-page-icone"><FileBarChart2 size={26} strokeWidth={1.8} /></span>
          <div><h2>Mon rapport d'activité</h2><p>Ce que vous avez réalisé sur la période</p></div>
          <div className="rp-page-actions">
            <button type="button" className="secondary-button grand" onClick={() => setOuvert(true)}>
              <SlidersHorizontal size={18} strokeWidth={2} />Filtres
            </button>
            <button type="button" className="primary-button grand" disabled={!document} onClick={imprimerDocument}>
              <Printer size={18} strokeWidth={2} />Imprimer
            </button>
          </div>
        </header>
      )}

      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}
      {rapport === "chargement" || options === undefined ? <Chargement taille="moyenne" /> : document && <DocumentOfficiel doc={document} />}

      {ouvert && (
        <FenetreFiltres valeurs={filtres}
          organiser={etats ? courant?.organiser : null}
          professionnels={etats ? options?.professionnels || [] : null}
          onFermer={() => setOuvert(false)}
          onAppliquer={(v) => { setFiltres(v); setOuvert(false); }}
          onAnnuler={() => { setFiltres(initiaux); setOuvert(false); }} />
      )}
    </div>
  );
}
