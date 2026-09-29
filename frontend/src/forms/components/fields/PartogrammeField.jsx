/*
 * Partogramme (OMS) : la dilatation du col au fil des heures.
 *
 * Champ d'affichage : il lit les relevés d'une liste répétable
 * (`field.releves`, lignes { heure: "HH:MM", dilatation, bcf, … }).
 * La ligne d'alerte part du premier relevé à 4 cm ou plus et
 * progresse d'1 cm par heure ; la ligne d'action la suit 4 h plus
 * tard. Un relevé à droite de la ligne d'action est en rouge.
 */

const minutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export function lire(releves = []) {
  const points = releves
    .map((r) => ({ t: minutes(r.heure), cm: Number(String(r.dilatation ?? "").replace(",", ".")), bcf: Number(r.bcf) || null }))
    .filter((p) => p.t !== null && p.cm >= 0 && p.cm <= 10);
  if (!points.length) return { points: [], depart: null };
  // Un travail qui passe minuit : les heures suivantes continuent le lendemain.
  for (let i = 1; i < points.length; i++) while (points[i].t < points[i - 1].t) points[i].t += 1440;
  const t0 = points[0].t;
  points.forEach((p) => { p.h = (p.t - t0) / 60; });
  const actif = points.find((p) => p.cm >= 4);
  return { points, depart: actif ? { h: actif.h, cm: actif.cm } : null };
}

/* Au-delà de la ligne d'action : le travail n'avance pas assez. */
export function horsDelai(releves) {
  const { points, depart } = lire(releves);
  if (!depart) return false;
  return points.some((p) => p.h >= depart.h && p.cm < 10 && p.h > depart.h + (p.cm - depart.cm) + 4);
}

export default function PartogrammeField({ field, values = {} }) {
  const { points, depart } = lire(values[field.releves]);
  const L = 560, H = 250, G = 34, B = 26, HEURES = 12;
  const x = (h) => G + (h / HEURES) * (L - G - 8);
  const y = (cm) => H - B - (cm / 10) * (H - B - 10);
  const alerte = depart && [[depart.h, depart.cm], [depart.h + (10 - depart.cm), 10]];
  const action = alerte && alerte.map(([h, cm]) => [h + 4, cm]);
  const ligne = (seg) => `M${x(seg[0][0])},${y(seg[0][1])} L${x(seg[1][0])},${y(seg[1][1])}`;
  const retard = horsDelai(values[field.releves]);

  return (
    <div className="field partogramme">
      <span>{field.label}</span>
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Partogramme, ${points.length} relevé(s)`}>
        {Array.from({ length: HEURES + 1 }, (_, h) => (
          <g key={h}>
            <line x1={x(h)} x2={x(h)} y1={10} y2={H - B} className="courbe-grille" />
            {h % 2 === 0 && <text x={x(h)} y={H - 8} className="courbe-axe" textAnchor="middle">{`${h} h`}</text>}
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10].map((cm) => (
          <g key={cm}>
            <line x1={G} x2={L - 8} y1={y(cm)} y2={y(cm)} className="courbe-grille" />
            <text x={G - 6} y={y(cm) + 4} className="courbe-axe" textAnchor="end">{cm}</text>
          </g>
        ))}
        {alerte && <path d={ligne(alerte)} className="parto-alerte" />}
        {action && <path d={ligne(action)} className="parto-action" />}
        {alerte && <text x={x(alerte[1][0]) - 4} y={y(10) + 14} className="courbe-axe" textAnchor="end">Alerte</text>}
        {action && <text x={Math.min(x(action[1][0]) + 4, L - 40)} y={y(10) + 14} className="courbe-axe parto-texte-action">Action</text>}
        {points.length > 1 && <path d={points.map((p, i) => `${i ? "L" : "M"}${x(p.h)},${y(p.cm)}`).join(" ")} className="courbe-enfant" />}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.h)} cy={y(p.cm)} r={4.5}
            className={`courbe-point ${depart && p.h > depart.h + (p.cm - depart.cm) + 4 ? "retard" : ""}`}>
            <title>{`${p.cm} cm à ${Math.floor(p.h)} h ${Math.round((p.h % 1) * 60)}`}</title>
          </circle>
        ))}
      </svg>
      <p className={`courbe-statut ${retard ? "severe" : points.length ? "normal" : ""}`}>
        {!points.length ? "Ajoutez les relevés (heure, dilatation) pour tracer le partogramme."
          : retard ? "Ligne d'action franchie : le travail n'avance pas, décision obstétricale nécessaire."
            : depart ? "Travail dans les délais." : "Phase de latence (moins de 4 cm)."}
      </p>
    </div>
  );
}
