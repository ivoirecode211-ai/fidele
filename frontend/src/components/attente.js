import { useEffect, useRef, useState } from "react";

/*
 * ============================================================
 * TEMPS D'ATTENTE MINIMAL
 * ============================================================
 *
 * Quand le serveur répond en 80 ms, l'indicateur apparaît et
 * disparaît avant que l'œil ne l'ait vu : l'utilisateur clique
 * et croit qu'il ne s'est rien passé.
 *
 * On lui laisse donc le temps d'exister — une seconde, assez
 * pour que le tracé se dessine une fois en entier.
 * ============================================================
 */

export const DUREE_MINIMALE = 1000;

/*
 * Reste vrai au moins `minimum` millisecondes après le début de
 * l'attente, même si la réponse est déjà là.
 *
 *   const attente = useAttente(!patients);
 *   return attente ? <Chargement /> : <Tableau lignes={patients} />;
 */
export function useAttente(enCours, minimum = DUREE_MINIMALE) {
  const [visible, setVisible] = useState(enCours);
  const debut = useRef(enCours ? Date.now() : 0);

  useEffect(() => {
    if (enCours) {
      debut.current = Date.now();
      setVisible(true);
      return undefined;
    }

    const ecoule = Date.now() - debut.current;
    if (ecoule >= minimum) {
      setVisible(false);
      return undefined;
    }

    const minuteur = setTimeout(() => setVisible(false), minimum - ecoule);
    return () => clearTimeout(minuteur);
  }, [enCours, minimum]);

  return visible;
}

/* La même seconde, pour une action qui n'a pas d'état d'attente. */
export function patienter(minimum = DUREE_MINIMALE) {
  return new Promise((resolution) => setTimeout(resolution, minimum));
}
