import { useEffect, useState } from "react";

import api from "../services/api";
import Logo from "./Logo";

/*
 * ============================================================
 * LOGO DE L'HÔPITAL SUR LES DOCUMENTS
 * ============================================================
 *
 * Chaque hôpital a son propre logo (Administration → Paramètres
 * généraux). Tickets, reçus, résultats et rapports l'impriment ;
 * sans logo déposé, c'est la marque MA SANTÉ.
 *
 * `useEtablissement()` lit une fois par session les informations
 * de l'hôpital de l'utilisateur, pour les modules qui ne les
 * reçoivent pas déjà avec leurs données.
 * ============================================================
 */

export default function LogoEtablissement({ logo, size = 34, className = "", nom = "Logo de l'hôpital" }) {
  if (!logo) return <Logo size={size} className={className} />;
  return (
    <img src={logo} alt={nom} className={`logo-etablissement ${className}`}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
  );
}

let enCours = null;

export function lireEtablissement() {
  enCours ||= api.get("/administration/parametres/").then((r) => r.data).catch(() => {
    enCours = null;
    return {};
  });
  return enCours;
}

/* Après un changement de logo ou de nom, la prochaine lecture repart du serveur. */
export function oublierEtablissement() {
  enCours = null;
}

export function useEtablissement() {
  const [etablissement, setEtablissement] = useState({});
  useEffect(() => {
    let actif = true;
    lireEtablissement().then((data) => actif && setEtablissement(data || {}));
    return () => { actif = false; };
  }, []);
  return etablissement;
}
