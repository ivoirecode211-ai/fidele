import { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";

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
 * Le reçu est une bande horizontale : identité de la clinique à
 * gauche, référence et patient à droite, puis le détail chiffré
 * sur toute la largeur. Trois bandes identiques s'empilent sur
 * une feuille A5 portrait — clinique, patient, comptabilité —
 * séparées par un pointillé de découpe.
 * ============================================================
 */

const SOUCHES = ["Souche clinique", "Souche patient", "Souche comptabilité"];

const horodatage = (valeur) =>
  new Date(valeur).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/* Une bande : le reçu complet, répété à l'identique sur la feuille. */
function Souche({ fiche, maison, caissier, libelle, duplicata }) {
  const assurance = Number(fiche.montant_assurance) > 0;

  return (
    <article className="souche">
      <header className="souche-tete">
        <div className="souche-maison">
          <strong>{maison.nom || "—"}</strong>
          {maison.adresse && <span>{maison.adresse}</span>}
          {(maison.ville || maison.telephone) && (
            <span>{[maison.ville, maison.telephone].filter(Boolean).join(" · ")}</span>
          )}
        </div>

        <div className="souche-piece">
          <span className="souche-libelle">{libelle}</span>
          <strong>Reçu n° {fiche.reference}</strong>
          <span>{horodatage(fiche.date_creation)}</span>
        </div>
      </header>

      {duplicata && <p className="ticket-duplicata">Duplicata</p>}

      <dl className="souche-identite">
        <div><dt>Patient</dt><dd>{fiche.patient_nom}</dd></div>
        <div><dt>N° dossier</dt><dd>{fiche.patient_code}</dd></div>
        <div><dt>Service</dt><dd>{fiche.service_nom || "—"}</dd></div>
        <div><dt>Caissier</dt><dd>{caissier || "—"}</dd></div>
      </dl>

      <table className="souche-lignes">
        <thead>
          <tr>
            <th>Prestation</th><th>Qté</th><th>Prix unitaire</th>
            {assurance && <th>Prise en charge</th>}
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{fiche.prestation_nom}</td>
            <td>{fiche.quantite}</td>
            <td>{argent(fiche.prix_unitaire)}</td>
            {assurance && <td>− {argent(fiche.montant_assurance)}</td>}
            <td>{argent(fiche.montant_total)}</td>
          </tr>
        </tbody>
      </table>

      <footer className="souche-pied">
        <p>{maison.mentions_legales || "Conservez ce reçu, il vous sera demandé en cas de réclamation."}</p>
        <p className="souche-net">
          <span>{fiche.statut === "assurance" ? "Pris en charge" : "Net payé"}</span>
          <strong>{argent(fiche.montant_patient)}</strong>
        </p>
      </footer>
    </article>
  );
}

export default function Ticket({ fiche, etablissement, caissier, onClose, duplicata = false }) {
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
            <p>L'impression s'ouvre automatiquement — trois souches sur une feuille A5.</p>
          </div>
          <button type="button" className="pop-fermer" onClick={onClose} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="pop-corps">
          {/* Une seule bande à l'écran : les trois ne servent qu'à l'impression. */}
          <div className="ticket" id="ticket">
            {SOUCHES.map((libelle) => (
              <Souche key={libelle} fiche={fiche} maison={maison} caissier={caissier}
                libelle={libelle} duplicata={duplicata} />
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
