import { MessageCircleQuestion, RotateCcw, ShieldX, Sparkles, TriangleAlert, X } from "lucide-react";

import Chargement from "../components/Chargement";

/*
 * Bouton IA d'une rubrique (diagnostic, examens, ordonnance, conseils)
 * et sa suggestion : une carte qui se détache du formulaire, une ligne,
 * « Pourquoi ? » pour en savoir plus, « Annuler » pour revenir.
 * L'état vit dans Consultation.jsx : il survit au changement d'étape.
 */

const QUESTIONS = {
  diagnostic: "Pourquoi ce diagnostic ?",
  examens: "Pourquoi ces examens ?",
  ordonnance: "Justifie cette ordonnance et vérifie les doses.",
  conseils: "Quels signes doivent faire revenir ce patient ?",
};

export default function AideIa({ cible, etat, onProposer, onAnnuler, onFermer, onDemander }) {
  const occupe = etat?.statut === "attente";
  const p = etat?.proposition;

  return (
    <>
      <button type="button" className="ia-proposer" onClick={onProposer} disabled={occupe}>
        {occupe
          ? <Chargement taille="petite" centre={false} couleur="currentColor" muet />
          : <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />}
        {occupe ? "…" : "Suggestion IA"}
      </button>

      {etat?.statut === "erreur" && (
        <p className="ia-carte ia-erreur" role="alert">
          <TriangleAlert size={15} strokeWidth={2} aria-hidden="true" />
          <span>{etat.message}</span>
          <button type="button" className="ia-x" onClick={onFermer} aria-label="Fermer"><X size={14} /></button>
        </p>
      )}

      {etat?.statut === "propose" && p && (
        <div className="ia-carte" role="status">
          <span className="ia-badge"><Sparkles size={14} strokeWidth={2.2} aria-hidden="true" /></span>
          <div className="ia-carte-corps">
            <strong>
              {cible === "diagnostic" ? p.diagnostic
                : cible === "examens" ? (p.examens.length ? `${p.examens.length} examen${p.examens.length > 1 ? "s" : ""} suggéré${p.examens.length > 1 ? "s" : ""}` : "Aucun examen utile")
                  : cible === "ordonnance" ? (p.ordonnance.length ? `${p.ordonnance.length} médicament${p.ordonnance.length > 1 ? "s" : ""}` : "Aucun médicament")
                    : "Conseils rédigés"}
            </strong>
            {cible === "diagnostic" && p.gravite && (
              <span className="ia-gravite"><TriangleAlert size={13} aria-hidden="true" />{p.gravite}</span>
            )}
            {cible === "ordonnance" && p.retraits?.map((r) => (
              <span key={r} className="ia-gravite ia-retrait"><ShieldX size={13} aria-hidden="true" />{r}</span>
            ))}
            <span className="ia-actions">
              <button type="button" className="ia-lien" onClick={() => onDemander(QUESTIONS[cible])}>
                <MessageCircleQuestion size={14} strokeWidth={2} aria-hidden="true" />Pourquoi ?
              </button>
              <button type="button" className="ia-lien discret" onClick={onAnnuler}>
                <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />Annuler
              </button>
            </span>
          </div>
          <button type="button" className="ia-x" onClick={onFermer} aria-label="Masquer"><X size={14} /></button>
        </div>
      )}
    </>
  );
}
