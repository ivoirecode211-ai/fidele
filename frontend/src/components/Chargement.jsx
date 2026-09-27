/*
 * ============================================================
 * CHARGEMENT
 * ============================================================
 *
 * Le tracé d'un électrocardiogramme qui se dessine puis
 * s'efface. L'indicateur d'attente de toute l'application :
 * partout le même, pour que l'utilisateur reconnaisse d'un
 * coup d'œil que le logiciel travaille.
 *
 * Trois tailles couvrent les besoins :
 *
 *   petite   dans un bouton, à côté d'un libellé
 *   moyenne  dans un panneau, à la place d'un tableau
 *   grande   sur une page entière
 *
 * `pleine` lui donne toute la hauteur libre : le tracé se pose
 * alors au milieu de la page, pas en haut du cadre.
 *
 * La couleur est le bleu de la charte. Elle s'hérite : passez
 * `couleur="currentColor"` dans un bouton pour qu'elle épouse
 * le libellé.
 * ============================================================
 */

const TAILLES = { petite: 26, moyenne: 46, grande: 84 };

/* Le tracé : ligne de base, complexe QRS, retour à la ligne. */
const TRACE = "M0.625 21.5 h10.25 l3.75 -5.875 l7.375 15 l9.75 -30 l7.375 20.875 v0 h10.25";

export default function Chargement({
  taille = "moyenne",
  couleur,
  vitesse = 1.75,
  texte,
  centre = true,
  pleine = false, // occupe toute la hauteur libre et se pose au milieu
  muet = false,   // dans un bouton qui s'annonce déjà : pas de doublon vocal
}) {
  const largeur = TAILLES[taille] || TAILLES.moyenne;
  const style = {
    "--ecg-largeur": `${largeur}px`,
    "--ecg-vitesse": `${vitesse}s`,
    ...(couleur ? { "--ecg-couleur": couleur } : {}),
  };

  return (
    <div className={`chargement ${centre ? "centre" : ""} ${pleine ? "pleine" : ""} ${taille}`} style={style}
      {...(muet ? { "aria-hidden": true } : { role: "status", "aria-live": "polite" })}>
      <svg className="ecg" viewBox="0 0 50 31.25" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path className="ecg-piste" d={TRACE} strokeWidth="4" fill="none" pathLength="100" />
        <path className="ecg-pouls" d={TRACE} strokeWidth="4" fill="none" pathLength="100" />
      </svg>

      {/* Un mot pour les lecteurs d'écran, sauf si l'entourage le dit déjà. */}
      {!muet && (
        <span className={texte ? "chargement-texte" : "seulement-lecteur"}>
          {texte || "Chargement en cours"}
        </span>
      )}
      {muet && texte && <span className="chargement-texte">{texte}</span>}
    </div>
  );
}
