import { useEffect, useState } from "react";
import { History, Search, X } from "lucide-react";

import api from "../../services/api";

/*
 * Journal d'audit (/api/administration/audit/) : actions qui modifient des
 * données, connexions et tentatives échouées, avec l'adresse IP.
 * `failuresOnly` : vue « Sécurité » (échecs uniquement).
 */
export default function AuditLogModal({ onClose, failuresOnly = false }) {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [data, setData] = useState({ modules: [], logs: [] });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      api
        .get("/administration/audit/", {
          params: { q: search || undefined, module: module || undefined, failures: failuresOnly ? 1 : undefined },
        })
        .then((response) => setData(response.data))
        .catch(() => setData({ modules: [], logs: [] }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, module, failuresOnly]);

  return (
    <div
      className="administration-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="administration-modal audit-modal">
        <div className="administration-modal-header">
          <div className="modal-header-title">
            <div className="modal-icon blue">
              <History size={21} />
            </div>
            <div>
              <h2>{failuresOnly ? "Sécurité — échecs et erreurs" : "Journal d'audit"}</h2>
              <p>Qui a fait quoi, quand et depuis quelle adresse IP</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            <X size={19} />
          </button>
        </div>

        <div className="audit-toolbar">
          <label className="audit-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Utilisateur, action, adresse IP…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select value={module} onChange={(event) => setModule(event.target.value)} aria-label="Module">
            <option value="">Tous les modules</option>
            {data.modules.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Module</th>
                <th>Objet</th>
                <th>Adresse IP</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length === 0 && (
                <tr>
                  <td colSpan="7" className="audit-empty">Aucune entrée pour ces critères.</td>
                </tr>
              )}
              {data.logs.map((log) => (
                <tr key={log.id} onClick={() => setSelected(selected?.id === log.id ? null : log)} className={selected?.id === log.id ? "selected" : ""}>
                  <td>{log.date}</td>
                  <td>{log.user}</td>
                  <td>{log.action}</td>
                  <td>{log.module}</td>
                  <td>{log.description || "—"}</td>
                  <td className="audit-ip">{log.ip_address || "—"}</td>
                  <td>
                    <span className={`audit-status ${log.success ? "ok" : "ko"}`}>
                      {log.success ? "Réussi" : `Échec${log.status_code ? ` (${log.status_code})` : ""}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="audit-details">
            <strong>Détails techniques</strong>
            <span>{selected.method} {selected.path} · {selected.duration_ms ?? "—"} ms</span>
            <span>Navigateur : {selected.user_agent || "—"}</span>
            {Object.keys(selected.details || {}).length > 0 && (
              <code>{JSON.stringify(selected.details)}</code>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
