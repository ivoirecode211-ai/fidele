import { useMemo, useState } from "react";
import { Search } from "lucide-react";

/*
 * ============================================================
 * LISTE COURTE ET CHERCHABLE
 * ============================================================
 *
 * Passé dix lignes, une liste ne se parcourt plus : elle se
 * fouille. On n'en montre donc que les dix premières et on
 * annonce le reste, qu'une recherche fait apparaître.
 *
 * La barre n'apparaît que si elle sert : en dessous de la
 * limite, il n'y a rien à chercher.
 * ============================================================
 */

const LIMITE = 10;

export default function ListeFiltrable({
  lignes = [],
  champs,            // (ligne) => texte dans lequel on cherche
  placeholder = "Rechercher…",
  vide = "Aucune ligne.",
  limite = LIMITE,
  children,          // (visibles) => contenu
}) {
  const [recherche, setRecherche] = useState("");
  const terme = recherche.trim().toLowerCase();

  const filtrees = useMemo(() => {
    if (!terme) return lignes;
    return lignes.filter((ligne) => String(champs(ligne) || "").toLowerCase().includes(terme));
  }, [lignes, terme, champs]);

  const visibles = filtrees.slice(0, limite);
  const caches = filtrees.length - visibles.length;
  const chercheUtile = lignes.length > limite || terme;

  return (
    <>
      {chercheUtile && (
        <label className="recherche">
          <Search size={17} strokeWidth={2} aria-hidden="true" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder={placeholder} aria-label={placeholder} />
        </label>
      )}

      {filtrees.length === 0
        ? <p className="vide">{terme ? "Aucune ligne ne correspond à cette recherche." : vide}</p>
        : children(visibles)}

      {caches > 0 && (
        <p className="reste-cache">
          {caches} ligne{caches > 1 ? "s" : ""} de plus.
          {" "}Affinez la recherche pour {caches > 1 ? "les" : "la"} retrouver.
        </p>
      )}
    </>
  );
}
