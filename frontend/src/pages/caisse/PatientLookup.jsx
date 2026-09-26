import { useEffect, useState } from "react";
import { Search, UserCheck, X } from "lucide-react";

import api from "../../services/api";

/* « Patient déjà enregistré ? » : retrouve le dossier au lieu d'en créer un nouveau. */
export default function PatientLookup({ selected, onSelect, onClear }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      api.get("/parcours/caisse/recherche/", { params: { q: term } })
        .then(({ data }) => setResults(data))
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  if (selected) {
    return (
      <div className="co-lookup">
        <div className="co-lookup-selected">
          <span><UserCheck size={16} style={{ verticalAlign: "-3px" }} /> Dossier existant : {selected.nom} {selected.prenom} ({selected.patientId})</span>
          <button type="button" className="co-icon-button" onClick={onClear} title="Nouveau dossier">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="co-lookup">
      <label className="co-field">
        <span>Patient déjà enregistré ? Recherchez son dossier</span>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--ink-faint)" }} />
          <input
            style={{ paddingLeft: 36 }}
            type="search"
            placeholder="Nom, numéro de dossier ou téléphone"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
      </label>
      {results.length > 0 && (
        <div className="co-lookup-results">
          {results.map((patient) => (
            <button
              type="button"
              key={patient.patientId}
              onClick={() => {
                onSelect(patient);
                setTerm("");
                setResults([]);
              }}
            >
              <strong>{patient.nom} {patient.prenom}</strong>
              <small>
                {patient.patientId} · {patient.age} ans · {patient.telephone || "—"} · dernière visite : {patient.derniereVisite}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
