import { useEffect, useState } from "react";
import { Archive, Search, UserRound } from "lucide-react";

import ged from "./api";

/*
 * Recherche d'une personne : les patients du logiciel et les identités
 * d'archive (registres papier), par nom — tolérant aux fautes et aux
 * graphies (Kouassi, Kwasi) — ou par numéro de dossier ou de registre.
 */
export default function RechercheIdentite({ onChoisir, placeholder = "Nom, n° de dossier ou n° de registre", autoFocus = false, sortes }) {
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState(null);

  useEffect(() => {
    if (terme.trim().length < 2) { setResultats(null); return undefined; }
    const minuteur = setTimeout(() => {
      ged.get("recherche/", { q: terme }).then((r) => setResultats(sortes ? r.filter((x) => sortes.includes(x.sorte)) : r))
        .catch(() => setResultats([]));
    }, 250);
    return () => clearTimeout(minuteur);
  }, [terme, sortes]);

  return (
    <div className="ged-recherche">
      <label className="recherche">
        <Search size={17} strokeWidth={2} aria-hidden="true" />
        <input value={terme} onChange={(e) => setTerme(e.target.value)} placeholder={placeholder}
          aria-label={placeholder} autoFocus={autoFocus} />
      </label>
      {resultats && (
        resultats.length === 0 ? <p className="vide">Personne ne correspond.</p> : (
          <ul className="ged-resultats">
            {resultats.map((r) => (
              <li key={`${r.sorte}-${r.id}`}>
                <button type="button" onClick={() => { onChoisir(r); setTerme(""); setResultats(null); }}>
                  <span className={`ged-pastille-sorte ${r.sorte}`}>
                    {r.sorte === "patient" ? <UserRound size={15} /> : <Archive size={15} />}
                  </span>
                  <span className="ged-resultat-texte">
                    <strong>{r.nom}</strong>
                    <small>
                      {r.sorte === "patient"
                        ? [r.numero, r.age != null && `${r.age} ans`, r.telephone].filter(Boolean).join(" · ")
                        : ["Registre papier", r.numeroRegistre, r.anneeRegistre, r.naissance && `né(e) ${r.naissance}`,
                          r.patient && `relié à ${r.patient.numero}`].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
