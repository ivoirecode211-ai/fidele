import { Loader2 } from "lucide-react";

export default function SaveAndContinueButton({ label, saving, onClick }) {
  return (
    <button
      type="button"
      className="primary-button"
      onClick={onClick}
      disabled={saving}
    >
      {saving ? (
        <Loader2 size={16} strokeWidth={2} className="spin" />
      ) : null}
      <span>{saving ? "Enregistrement…" : label}</span>
    </button>
  );
}
