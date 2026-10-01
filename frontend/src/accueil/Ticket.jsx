import { useEffect, useRef } from "react";
import { Check, Printer, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import LogoEtablissement from "../components/LogoEtablissement";
import { argent } from "./api";
import { A5_PORTRAIT, imprimer } from "./impression";

/*
 * ============================================================
 * TICKET DE CAISSE
 * ============================================================
 *
 * Dès que le paiement est validé, la fenêtre d'impression
 * s'ouvre d'elle-même.
 *
 * Le reçu reprend la disposition des reçus de caisse publics :
 * l'établissement et le numéro du reçu en tête avec un QR code,
 * l'identité du patient, le détail chiffré, puis le règlement
 * (statut, montant reçu, monnaie rendue, agent qui a validé).
 * Trois exemplaires identiques s'empilent sur une feuille A5,
 * séparés par un pointillé de découpe.
 * ============================================================
 */

// Valeurs par défaut ; chaque hôpital règle les siennes dans Administration → Paramètres.
const EXEMPLAIRES = 3;
const VALIDITE_JOURS = 15;
const EXCLUSIONS = "Laboratoire – Échographie – Hospitalisation";

const horodatage = (valeur) =>
  valeur ? new Date(valeur).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) : "—";

const SEXES = { M: "M", F: "F", O: "Autre" };

const STATUTS = {
  paye: "Montant réglé",
  assurance: "Pris en charge",
  en_attente: "En attente de paiement",
};

/* « 3 an(s) et 6 mois et 9 jour(s) », à la date d'édition du reçu. */
function ageDetaille(naissance, edition) {
  if (!naissance) return "—";
  const debut = new Date(`${naissance}T00:00:00`);
  const fin = new Date(edition);
  let ans = fin.getFullYear() - debut.getFullYear();
  let mois = fin.getMonth() - debut.getMonth();
  let jours = fin.getDate() - debut.getDate();
  if (jours < 0) {
    mois -= 1;
    jours += new Date(fin.getFullYear(), fin.getMonth(), 0).getDate();
  }
  if (mois < 0) { ans -= 1; mois += 12; }
  return `${ans} an(s) et ${mois} mois et ${jours} jour(s)`;
}

function Case({ cochee, children }) {
  return (
    <span className="souche-case">
      <span className={`souche-case-boite ${cochee ? "cochee" : ""}`} aria-hidden="true">{cochee && <Check size={9} strokeWidth={3.5} />}</span>
      {children}
    </span>
  );
}

/* Un exemplaire : le reçu complet, répété à l'identique sur la feuille. */
function Souche({ fiche, maison, duplicata }) {
  const taux = Number(fiche.taux_assurance);
  const recu = fiche.montant_recu ?? (fiche.statut === "assurance" ? 0 : null);
  const rendu = fiche.monnaie_rendue ?? (fiche.statut === "assurance" ? 0 : null);

  return (
    <article className="souche">
      <header className="souche-tete">
        <div className="souche-maison">
          <LogoEtablissement logo={maison.logo} size={34} nom={maison.nom} />
          <div>
            <strong>{maison.nom || "—"}</strong>
            {(maison.adresse || maison.quartier || maison.ville) && (
              <span>{[maison.adresse, maison.quartier, maison.ville].filter(Boolean).join(", ")}</span>
            )}
            {maison.email && <span>{maison.email}</span>}
            {maison.telephone && <span>{maison.telephone}</span>}
          </div>
        </div>

        <div className="souche-piece">
          <strong>Reçu N° : {fiche.reference}</strong>
          <span>{fiche.patient_nom}</span>
          {duplicata && <em className="ticket-duplicata">Duplicata</em>}
        </div>

        <QRCodeSVG className="souche-qr" value={`${fiche.reference} ${fiche.patient_code} ${fiche.montant_patient}`}
          size={60} level="M" />
      </header>

      <dl className="souche-identite">
        <div><dt>Code patient :</dt><dd>{fiche.patient_code}</dd></div>
        <div><dt>Sexe :</dt><dd>{SEXES[fiche.patient_sexe] || "—"}</dd></div>
        <div><dt>Âge :</dt><dd>{ageDetaille(fiche.patient_naissance, fiche.date_creation)}</dd></div>
        <div><dt>Éditée le :</dt><dd>{horodatage(fiche.date_creation)}</dd></div>
      </dl>

      <table className="souche-lignes">
        <thead>
          <tr>
            <th>Service</th><th>Prestations</th><th>Montant acte</th><th>Qté</th>
            <th>Taux réduit (%)</th><th>Montant total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{fiche.service_nom || "—"}</td>
            <td>{fiche.prestation_nom}</td>
            <td>{argent(fiche.prix_unitaire)}</td>
            <td>{fiche.quantite}</td>
            <td>{taux.toLocaleString("fr-FR")}</td>
            <td>{argent(fiche.montant_patient)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colSpan={5}>Total à payer :</td><td>{argent(fiche.montant_patient)}</td></tr>
        </tfoot>
      </table>

      <div className="souche-cases">
        <Case>Cas social</Case>
        <Case cochee={taux > 0}>Tarif réduit</Case>
        <Case>Réorientation</Case>
      </div>

      <div className="souche-reglement">
        <p>Statut : <strong className={fiche.statut === "en_attente" ? "attente" : "regle"}>{STATUTS[fiche.statut] || fiche.statut_display}</strong></p>
        <p>Montant reçu : <strong>{recu === null ? "—" : argent(recu)}</strong></p>
        <p>Monnaie rendue : <strong>{rendu === null ? "—" : argent(rendu)}</strong></p>
        <p className="souche-validation">
          {fiche.valide_par_nom
            ? <>Validée par : <strong>{fiche.valide_par_nom}</strong>,<br />le <strong>{horodatage(fiche.valide_le)}</strong></>
            : "Non encore validée en caisse"}
        </p>
      </div>

      <p className="souche-mention">
        *** Ticket de consultation valable pour {maison.validite_jours || VALIDITE_JOURS} jour(s).
        {" "}Exclusions ({maison.exclusions ?? EXCLUSIONS}) ***
        {maison.mentions_legales && <><br />{maison.mentions_legales}</>}
      </p>
    </article>
  );
}

export default function Ticket({ fiche, etablissement, onClose, duplicata = false }) {
  const maison = etablissement || {};
  const deja = useRef(false);

  /*
   * L'impression part toute seule, une fois que le document est peint.
   *
   * Le garde-fou est dans le minuteur, pas avant : en mode strict React
   * monte, démonte puis remonte le composant. S'il était posé à l'entrée
   * de l'effet, le premier montage le lèverait, le nettoyage annulerait
   * le minuteur, et le second montage sortirait sans rien imprimer.
   */
  useEffect(() => {
    const minuteur = setTimeout(() => {
      if (deja.current) return;
      deja.current = true;
      imprimer(A5_PORTRAIT);
    }, 350);
    return () => clearTimeout(minuteur);
  }, []);

  return (
    <div className="pop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-boite" role="dialog" aria-modal="true" aria-label="Reçu de paiement">

        <header className="pop-tete no-print">
          <div>
            <h2>Paiement enregistré</h2>
            <p>L'impression s'ouvre automatiquement — {maison.souches || EXEMPLAIRES} exemplaire(s) sur une feuille A5.</p>
          </div>
          <button type="button" className="pop-fermer" onClick={onClose} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="pop-corps">
          {/* Une seule bande à l'écran : les trois ne servent qu'à l'impression. */}
          <div className="ticket" id="ticket">
            {Array.from({ length: maison.souches || EXEMPLAIRES }, (_, i) => (
              <Souche key={i} fiche={fiche} maison={maison} duplicata={duplicata} />
            ))}
          </div>
        </div>

        <footer className="pop-pied no-print">
          <button type="button" className="secondary-button" onClick={onClose}>Fermer</button>
          <button type="button" className="primary-button" onClick={() => imprimer(A5_PORTRAIT)}>
            <Printer size={16} strokeWidth={2} />Réimprimer
          </button>
        </footer>
      </div>
    </div>
  );
}
