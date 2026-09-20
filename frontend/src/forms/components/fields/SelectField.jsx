import { useEffect, useState } from "react";
import api from "../../../services/api";

/*
 * Options statiques (`field.options`, liste de paires
 * [valeur, libellé]) OU chargées depuis l'API (`field.optionsSource`,
 * chemin relatif — ex. "/auth/users/?role=DOCTOR"). Un
 * `field.optionsMap` optionnel transforme chaque élément de la
 * réponse en paire [valeur, libellé] ; par défaut on suppose des
 * objets utilisateur (id + nom).
 */

function defaultOptionsMap(item) {
  const name = [item.first_name, item.last_name].filter(Boolean).join(" ");
  return [item.id, name || item.username];
}

export default function SelectField({ field, value, error, onChange }) {
  const [remoteOptions, setRemoteOptions] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!field.optionsSource) return;

    let cancelled = false;

    api
      .get(field.optionsSource)
      .then((res) => {
        if (cancelled) return;
        const mapper = field.optionsMap || defaultOptionsMap;
        setRemoteOptions(res.data.map(mapper));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.optionsSource]);

  const options = field.optionsSource ? remoteOptions : field.options;
  const loading = field.optionsSource && remoteOptions === null && !loadError;

  return (
    <label className={`field ${error ? "field-error" : ""}`}>
      <span>
        {field.label}
        {field.required && <span className="required">*</span>}
      </span>

      <select
        name={field.id}
        value={value ?? ""}
        disabled={loading}
        onChange={(event) => onChange(field.id, event.target.value)}
      >
        <option value="" disabled>
          {loading ? "Chargement…" : "Sélectionner…"}
        </option>

        {(options || []).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>

      {loadError && (
        <span className="field-error-message">
          Impossible de charger les options. Réessayez.
        </span>
      )}

      {error && <span className="field-error-message">{error}</span>}
    </label>
  );
}
