import { UserRound } from "lucide-react";

import { useAuth } from "../context/AuthContext";

/*
 * ============================================================
 * IDENTITÉ DE LA PERSONNE CONNECTÉE — EN-TÊTE DES MODULES
 * ============================================================
 */

export function UserAvatar({ size = 40 }) {
  return (
    <span
      className="ms-avatar"
      style={{ "--ms-avatar-size": `${size}px` }}
      aria-hidden="true"
    >
      <UserRound size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  );
}

export function useUserIdentity() {
  const { user } = useAuth();

  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "Utilisateur";

  const role = user?.role_label || "";

  return { name, role };
}

export default function UserBadge({ className = "" }) {
  const { name, role } = useUserIdentity();

  return (
    <div className={`ms-user ${className}`} title={role ? `${name} — ${role}` : name}>
      <UserAvatar />

      <div className="ms-user-text">
        <strong>{name}</strong>
        {role && <span>{role}</span>}
      </div>
    </div>
  );
}
