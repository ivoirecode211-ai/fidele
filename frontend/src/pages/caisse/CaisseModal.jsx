import { X } from "lucide-react";

/* Fenêtre modale commune aux opérations de caisse. */
export default function CaisseModal({ title, subtitle, onClose, children, actions }) {
  return (
    <div
      className="co-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="co-modal" role="dialog" aria-label={title}>
        <header className="co-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="co-icon-button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        <div className="co-modal-body">{children}</div>
        {actions && <footer className="co-modal-actions">{actions}</footer>}
      </div>
    </div>
  );
}

export const apiMessage = (error, fallback) => {
  const data = error.response?.data;
  if (data?.detail) return data.detail;
  return data && typeof data === "object" ? Object.values(data).flat().join("\n") : fallback;
};

export const fcfa = (value) => `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} FCFA`;
