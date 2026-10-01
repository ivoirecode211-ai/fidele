import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import Chargement from "../components/Chargement";
import LogoEtablissement from "../components/LogoEtablissement";
import api from "../services/api";
import { argent } from "../accueil/api";
import { A5_PORTRAIT, imprimer } from "../accueil/impression";

import "../styles/recu-pharmacie.css";

/*
 * ============================================================
 * REÇU DE DISPENSATION — PHARMACIE
 * ============================================================
 *
 * Même disposition que le reçu de la Caisse : l'établissement
 * et le numéro en tête avec un QR code, l'identité du patient,
 * chaque médicament avec sa posologie, sa quantité et son prix
 * (catalogue des Stocks), le total, puis qui a délivré et quand.
 *
 * Seul le reçu s'imprime, sur une feuille A5 : la fenêtre est
 * posée directement dans <body> (portail), et recu-pharmacie.css
 * retire tout le reste à l'impression, sans page blanche.
 * ============================================================
 */

const SEXES = { M: "Masculin", F: "Féminin", O: "Autre" };

const horodatage = (valeur) =>
  valeur ? new Date(valeur).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—";

function age(naissance) {
  if (!naissance) return "—";
  const debut = new Date(`${naissance}T00:00:00`);
  const jour = new Date();
  let ans = jour.getFullYear() - debut.getFullYear();
  if (jour < new Date(jour.getFullYear(), debut.getMonth(), debut.getDate())) ans -= 1;
  return `${ans} an(s)`;
}

export default function RecuPharmacie({ ordonnance, onClose }) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;
    api.get(`/parcours/pharmacie/ordonnances/${ordonnance}/recu/`)
      .then((r) => actif && setDonnees(r.data))
      .catch(() => actif && setErreur("Impossible de charger le reçu. Vérifiez la connexion puis réessayez."));
    return () => { actif = false; };
  }, [ordonnance]);

  const maison = donnees?.etablissement || {};
  const recu = donnees?.recu;

  return createPortal(
    <div className="recu-ph-voile" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="recu-ph-boite" role="dialog" aria-modal="true" aria-label="Reçu de dispensation">
        <header className="recu-ph-barre">
          <div>
            <h2>Reçu de dispensation</h2>
            <p>Aperçu avant impression, sur une feuille A5.</p>
          </div>
          <button type="button" className="recu-ph-fermer" onClick={onClose} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="recu-ph-corps">
          {!recu && !erreur && <Chargement taille="moyenne" />}
          {erreur && <p className="recu-ph-erreur">{erreur}</p>}

          {recu && (
            <article className="recu-ph" id="recu-pharmacie">
              <header className="recu-ph-tete">
                <div className="recu-ph-maison">
                  <LogoEtablissement logo={maison.logo} size={34} nom={maison.nom} />
                  <div>
                    <strong>{maison.nom || "—"}</strong>
                    {(maison.adresse || maison.quartier || maison.ville) && (
                      <span>{[maison.adresse, maison.quartier, maison.ville].filter(Boolean).join(", ")}</span>
                    )}
                    {maison.telephone && <span>{maison.telephone}</span>}
                    {maison.agrement && <span>Agrément : {maison.agrement}</span>}
                  </div>
                </div>
                <div className="recu-ph-piece">
                  <strong>Reçu N° : {recu.reference}</strong>
                  <span>Pharmacie</span>
                </div>
                <QRCodeSVG className="recu-ph-qr" value={`${recu.reference} ${recu.patient_code} ${recu.total}`}
                  size={58} level="M" />
              </header>

              <h3 className="recu-ph-titre">Ticket de dispensation</h3>

              <dl className="recu-ph-identite">
                <div><dt>Patient :</dt><dd>{recu.patient_nom}</dd></div>
                <div><dt>Code patient :</dt><dd>{recu.patient_code}</dd></div>
                <div><dt>Sexe :</dt><dd>{SEXES[recu.patient_sexe] || "—"}</dd></div>
                <div><dt>Âge :</dt><dd>{age(recu.patient_naissance)}</dd></div>
                <div><dt>Prescripteur :</dt><dd>{recu.medecin || "—"}</dd></div>
                <div><dt>Prescrite le :</dt><dd>{recu.date_prescription ? new Date(`${recu.date_prescription}T00:00:00`).toLocaleDateString("fr-FR") : "—"}</dd></div>
                <div className="recu-ph-large">
                  <dt>Assurance :</dt>
                  <dd>
                    {recu.assurance
                      ? `${recu.assurance.nom} (${recu.assurance.taux.toLocaleString("fr-FR")} %)${recu.assurance.numero ? ` — N° ${recu.assurance.numero}` : ""}`
                      : "Aucune (règlement intégral par le patient)"}
                  </dd>
                </div>
                <div><dt>{recu.servie ? "Délivrée le :" : "Édité le :"}</dt><dd>{horodatage(recu.date)}</dd></div>
              </dl>

              <table className="recu-ph-lignes">
                <thead>
                  <tr><th>Médicament</th><th>Qté</th><th>Prix unitaire</th><th>Montant</th></tr>
                </thead>
                <tbody>
                  {recu.lignes.map((ligne, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{ligne.medicament}</strong>
                        {ligne.posologie && <small>{ligne.posologie}</small>}
                        {ligne.consignes && <small>{ligne.consignes}</small>}
                      </td>
                      <td>{ligne.quantite}{ligne.unite ? ` ${ligne.unite.toLowerCase()}` : ""}</td>
                      <td>{ligne.prix_unitaire === null ? "Hors catalogue" : argent(ligne.prix_unitaire)}</td>
                      <td>{ligne.montant === null ? "—" : argent(ligne.montant)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3}>Total :</td><td>{argent(recu.total)}</td></tr>
                  {recu.assurance && (
                    <tr className="recu-ph-assurance">
                      <td colSpan={3}>Part {recu.assurance.nom} ({recu.assurance.taux.toLocaleString("fr-FR")} %) :</td>
                      <td>− {argent(recu.part_assurance)}</td>
                    </tr>
                  )}
                  <tr className="recu-ph-net"><td colSpan={3}>Net à payer par le patient :</td><td>{argent(recu.net_a_payer)}</td></tr>
                </tfoot>
              </table>

              {recu.hors_catalogue > 0 && (
                <p className="recu-ph-note">
                  {recu.hors_catalogue} médicament(s) hors catalogue : prix à régler à part.
                </p>
              )}

              <div className="recu-ph-pied">
                <p>Statut : <strong className={recu.servie ? "regle" : "attente"}>{recu.statut}</strong></p>
                <p>Délivré par : <strong>{recu.pharmacien}</strong></p>
              </div>

              <p className="recu-ph-mention">
                *** Les médicaments délivrés ne sont ni repris ni échangés. Respectez la posologie prescrite ;
                en cas d'effet indésirable, consultez votre médecin. ***
                {maison.mentions_legales && <><br />{maison.mentions_legales}</>}
              </p>
            </article>
          )}
        </div>

        <footer className="recu-ph-actions">
          <button type="button" className="recu-ph-bouton secondaire" onClick={onClose}>Fermer</button>
          <button type="button" className="recu-ph-bouton" disabled={!recu} onClick={() => imprimer(A5_PORTRAIT)}>
            <Printer size={16} strokeWidth={2} />Imprimer
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
