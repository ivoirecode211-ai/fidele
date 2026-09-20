/*
 * ============================================================
 * MARQUE MA SANTÉ
 * ============================================================
 *
 * Croix médicale blanche dans un carré bleu aux angles
 * arrondis, conforme à la charte graphique (section 5).
 *
 * `inverted` : carré blanc, croix bleue — pour les fonds
 * déjà bleus (ex. bannière de bienvenue, visuel de connexion).
 * ============================================================
 */

export default function Logo({ size = 40, inverted = false, className }) {
  const square = inverted ? "#fff" : "var(--primary-600)";
  const cross = inverted ? "var(--primary-600)" : "#fff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="MA SANTÉ"
    >
      <rect width="40" height="40" rx="11" fill={square} />
      <path
        d="M17 10h6v7h7v6h-7v7h-6v-7h-7v-6h7z"
        fill={cross}
        stroke={cross}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
