/*
 * Courbe de croissance « poids pour l'âge » (0 à 5 ans).
 *
 * Champ d'affichage : il lit le poids du jour (`field.poids`), la
 * naissance et le sexe (`__naissance`, `__sexe`) et les pesées du
 * carnet (`__points`), et les place entre les repères de l'OMS.
 *
 * Repères : médiane, −2 ET et −3 ET (et +2 ET) des normes de
 * croissance OMS 2006, arrondis au dixième de kg — une aide à la
 * lecture, pas un calcul de z-score au centième.
 */

const MOIS = [0, 3, 6, 9, 12, 18, 24, 36, 48, 60];
const OMS = {
  M: {
    moins3: [2.1, 4.4, 5.7, 6.4, 6.9, 7.7, 8.6, 10.0, 11.2, 12.4],
    moins2: [2.5, 5.0, 6.4, 7.1, 7.7, 8.8, 9.7, 11.3, 12.7, 14.1],
    mediane: [3.3, 6.4, 7.9, 8.9, 9.6, 10.9, 12.2, 14.3, 16.3, 18.3],
    plus2: [4.4, 8.0, 9.8, 11.0, 12.0, 13.7, 15.3, 18.3, 21.2, 24.2],
  },
  F: {
    moins3: [2.0, 4.0, 5.1, 5.8, 6.3, 7.2, 8.1, 9.6, 10.9, 12.1],
    moins2: [2.4, 4.5, 5.7, 6.5, 7.0, 8.1, 9.0, 10.8, 12.3, 13.7],
    mediane: [3.2, 5.8, 7.3, 8.2, 8.9, 10.2, 11.5, 13.9, 16.1, 18.2],
    plus2: [4.2, 7.5, 9.3, 10.5, 11.5, 13.2, 14.8, 18.1, 21.5, 24.9],
  },
};

/* Valeur d'une courbe à un âge donné (interpolation linéaire). */
function a(courbe, mois) {
  const i = Math.max(1, MOIS.findIndex((m) => m >= mois));
  if (mois >= 60) return courbe[courbe.length - 1];
  const [m0, m1] = [MOIS[i - 1], MOIS[i]];
  return courbe[i - 1] + ((courbe[i] - courbe[i - 1]) * (mois - m0)) / (m1 - m0);
}

export const moisDepuis = (naissance, date = new Date()) =>
  (new Date(date) - new Date(naissance)) / (86400000 * 30.4375);

/* Où se situe un poids : « normal », « modéré » (< −2 ET), « sévère » (< −3 ET). */
export function statutPoids(poids, mois, sexe) {
  const ref = OMS[sexe === "F" ? "F" : "M"];
  if (!poids || mois < 0 || mois > 60) return "";
  if (poids < a(ref.moins3, mois)) return "severe";
  if (poids < a(ref.moins2, mois)) return "modere";
  if (poids > a(ref.plus2, mois)) return "eleve";
  return "normal";
}

const LIBELLES = { severe: "Insuffisance pondérale sévère (< −3 ET)", modere: "Insuffisance pondérale modérée (< −2 ET)",
  eleve: "Poids élevé pour l'âge (> +2 ET)", normal: "Poids normal pour l'âge" };

export default function CourbeField({ field, values = {} }) {
  const sexe = values.__sexe === "F" ? "F" : "M";
  const naissance = values.__naissance;
  const ref = OMS[sexe];
  const L = 560, H = 240, G = 36, B = 26;
  const x = (mois) => G + (mois / 60) * (L - G - 8);
  const y = (kg) => H - B - (kg / 26) * (H - B - 8);
  const trace = (courbe) => MOIS.map((m, i) => `${i ? "L" : "M"}${x(m).toFixed(1)},${y(courbe[i]).toFixed(1)}`).join(" ");

  const points = [
    ...(values.__points || []).filter((p) => p.poids),
    ...(values[field.poids] ? [{ date: new Date().toISOString(), poids: values[field.poids], aujourdhui: true }] : []),
  ].map((p) => ({ ...p, mois: naissance ? moisDepuis(naissance, p.date) : null, kg: Number(p.poids) }))
    .filter((p) => p.mois !== null && p.mois >= 0 && p.mois <= 60 && p.kg > 0);
  const dernier = points[points.length - 1];
  const statut = dernier ? statutPoids(dernier.kg, dernier.mois, sexe) : "";

  if (!naissance) return <p className="note">Date de naissance inconnue : courbe indisponible.</p>;

  return (
    <div className="field courbe">
      <span>{field.label}</span>
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Courbe poids pour l'âge, ${points.length} pesée(s)`}>
        {[0, 12, 24, 36, 48, 60].map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={8} y2={H - B} className="courbe-grille" />
            <text x={x(m)} y={H - 8} className="courbe-axe" textAnchor="middle">{m ? `${m / 12} an${m > 12 ? "s" : ""}` : "0"}</text>
          </g>
        ))}
        {[5, 10, 15, 20, 25].map((kg) => (
          <g key={kg}>
            <line x1={G} x2={L - 8} y1={y(kg)} y2={y(kg)} className="courbe-grille" />
            <text x={G - 6} y={y(kg) + 4} className="courbe-axe" textAnchor="end">{kg}</text>
          </g>
        ))}
        <path d={`${trace(ref.moins2)} ${MOIS.slice().reverse().map((m, i) => `L${x(m)},${y(ref.plus2[MOIS.length - 1 - i])}`).join(" ")} Z`} className="courbe-zone" />
        <path d={trace(ref.moins3)} className="courbe-limite severe" />
        <path d={trace(ref.moins2)} className="courbe-limite" />
        <path d={trace(ref.plus2)} className="courbe-limite" />
        <path d={trace(ref.mediane)} className="courbe-mediane" />
        {points.length > 1 && <path d={points.map((p, i) => `${i ? "L" : "M"}${x(p.mois)},${y(p.kg)}`).join(" ")} className="courbe-enfant" />}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.mois)} cy={y(p.kg)} r={p.aujourdhui ? 5.5 : 4} className={`courbe-point ${p.aujourdhui ? "jour" : ""}`}>
            <title>{`${p.kg} kg à ${Math.round(p.mois)} mois`}</title>
          </circle>
        ))}
      </svg>
      <p className={`courbe-statut ${statut}`}>{statut ? LIBELLES[statut] : "Saisissez le poids pour situer l'enfant."}</p>
    </div>
  );
}
