/*
 * ============================================================
 * PÉRIODE
 * ============================================================
 *
 * Deux bornes et trois raccourcis, sur une seule ligne. Le
 * bilan de la caissière et la vue d'ensemble du régisseur
 * posent la même question — ils la posent donc pareil.
 *
 * On ne va jamais au-delà d'aujourd'hui : une caisse ne
 * s'encaisse pas d'avance.
 * ============================================================
 */

export const aujourdhui = () => new Date().toISOString().slice(0, 10);

function depuis(jours) {
  const debut = new Date();
  debut.setDate(debut.getDate() - jours);
  return { du: debut.toISOString().slice(0, 10), au: aujourdhui() };
}

const RACCOURCIS = [
  ["Aujourd'hui", () => ({ du: aujourdhui(), au: aujourdhui() })],
  ["7 derniers jours", () => depuis(6)],
  ["30 derniers jours", () => depuis(29)],
];

export default function Periode({ periode, setPeriode, className = "" }) {
  return (
    <div className={`periode ${className}`.trim()}>
      <label className="field">
        <span>Du</span>
        <input type="date" value={periode.du} max={periode.au}
          onChange={(e) => setPeriode({ ...periode, du: e.target.value })} />
      </label>

      <label className="field">
        <span>Au</span>
        <input type="date" value={periode.au} min={periode.du} max={aujourdhui()}
          onChange={(e) => setPeriode({ ...periode, au: e.target.value })} />
      </label>

      <div className="raccourcis">
        {RACCOURCIS.map(([libelle, calcul]) => (
          <button key={libelle} type="button" className="secondary-button"
            onClick={() => setPeriode(calcul())}>
            {libelle}
          </button>
        ))}
      </div>
    </div>
  );
}
