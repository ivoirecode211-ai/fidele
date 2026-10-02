import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import "../styles/Caisse.css";

/*
 * ============================================================
 * LISTE D'UN SOUS-MODULE
 * ============================================================
 *
 * Le gabarit des écrans de sous-modules simples (sessions de
 * caisse, congés, contrats, déchets…) : un titre, des pastilles
 * de comptage, une recherche, puis le tableau. Même rendu partout.
 *
 *   colonnes : [{ titre, rendu: (ligne) => contenu, classe? }]
 *   chercher : (ligne) => texte dans lequel on cherche
 *   chiffres : [{ libelle, valeur, ton? : "alerte" | "fait" }]
 * ============================================================
 */

export default function Liste({ titre, sous, chiffres = [], lignes, colonnes, chercher, vide = "Rien à afficher.", actions, cle = (l) => l.id }) {
  const [q, setQ] = useState("");
  const terme = q.trim().toLowerCase();
  const visibles = useMemo(
    () => (lignes || []).filter((l) => !terme || !chercher || String(chercher(l)).toLowerCase().includes(terme)),
    [lignes, terme, chercher],
  );

  return (
    <section className="bloc liste-sm">
      <div className="bloc-tete">
        <div>
          <h2>{titre}</h2>
          {sous && <p>{sous}</p>}
        </div>
        {actions}
      </div>

      {chiffres.length > 0 && (
        <dl className="liste-sm-chiffres">
          {chiffres.map((c) => (
            <div key={c.libelle} className={c.ton || ""}><dt>{c.libelle}</dt><dd>{c.valeur}</dd></div>
          ))}
        </dl>
      )}

      {chercher && (lignes || []).length > 8 && (
        <label className="recherche">
          <Search size={17} strokeWidth={2} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" />
        </label>
      )}

      {lignes === null ? <p className="vide">Chargement…</p> : visibles.length === 0 ? <p className="vide">{terme ? "Aucune ligne ne correspond." : vide}</p> : (
        <div className="tableau">
          <table>
            <thead><tr>{colonnes.map((c) => <th key={c.titre}>{c.titre}</th>)}</tr></thead>
            <tbody>
              {visibles.map((l) => (
                <tr key={cle(l)}>{colonnes.map((c) => <td key={c.titre} className={c.classe || ""}>{c.rendu(l)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
