import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

/*
 * ============================================================
 * RETOUR AU TABLEAU DE BORD
 * ============================================================
 *
 * Entrer dans un module ne doit jamais être un aller simple :
 * chaque coquille porte le même retour, au même endroit, sous
 * le même nom — juste au-dessus de la déconnexion.
 *
 * Le module passe sa propre classe d'élément de menu ; le lien
 * prend alors exactement l'allure du reste de sa barre.
 *
 *   <LienTableau className="caisse-nav-item" />
 * ============================================================
 */

export default function LienTableau({ className = "", libelle = "Tableau de bord" }) {
  return (
    <Link to="/modules" className={className} title="Revenir au tableau de bord">
      <LayoutGrid size={17} strokeWidth={2} aria-hidden="true" />
      <span>{libelle}</span>
    </Link>
  );
}
