import { ChevronLeft } from "lucide-react";

export default function PreviousButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      className="secondary-button"
      onClick={onClick}
      disabled={disabled}
    >
      <ChevronLeft size={16} strokeWidth={2} />
      <span>Précédent</span>
    </button>
  );
}
