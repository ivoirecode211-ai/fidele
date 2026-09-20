const TONE_CLASS = {
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
  neutral: "badge-neutral",
};

// `tone` choisit le style visuel (voir .badge-* dans global.css) ;
// la correspondance statut -> tone reste décidée par la page appelante.
export default function StatusBadge({ status, tone = "neutral" }) {
  return <span className={`badge ${TONE_CLASS[tone] || TONE_CLASS.neutral}`}>{status}</span>;
}
