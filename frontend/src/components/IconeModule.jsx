/*
 * ============================================================
 * ICÔNES DES MODULES — Tabler Icons (MIT), une par module
 * ============================================================
 *
 * Une seule bibliothèque pour toutes les tuiles : Tabler, parce
 * que Lucide n'a pas de caisse enregistreuse. Tracés repris tels
 * quels (contour, grille 24, trait 2) : même épaisseur et même
 * encombrement pour toutes, aucune forme ne dépasse les autres.
 * ============================================================
 */

const TRACES = {
  "patients": <><path d="M21 15h-2.5c-.398 0 -.779 .158 -1.061 .439c-.281 .281 -.439 .663 -.439 1.061c0 .398 .158 .779 .439 1.061c.281 .281 .663 .439 1.061 .439h1c.398 0 .779 .158 1.061 .439c.281 .281 .439 .663 .439 1.061c0 .398 -.158 .779 -.439 1.061c-.281 .281 -.663 .439 -1.061 .439h-2.5" /> <path d="M19 21v1m0 -8v1" /> <path d="M13 21h-7c-.53 0 -1.039 -.211 -1.414 -.586c-.375 -.375 -.586 -.884 -.586 -1.414v-10c0 -.53 .211 -1.039 .586 -1.414c.375 -.375 .884 -.586 1.414 -.586h2m12 3.12v-1.12c0 -.53 -.211 -1.039 -.586 -1.414c-.375 -.375 -.884 -.586 -1.414 -.586h-2" /> <path d="M16 10v-6c0 -.53 -.211 -1.039 -.586 -1.414c-.375 -.375 -.884 -.586 -1.414 -.586h-4c-.53 0 -1.039 .211 -1.414 .586c-.375 .375 -.586 .884 -.586 1.414v6m8 0h-8m8 0h1m-9 0h-1" /> <path d="M8 14v.01" /> <path d="M8 17v.01" /> <path d="M12 13.99v.01" /> <path d="M12 17v.01" /></>,
  "nursing": <><path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -10" /> <path d="M7 20h10" /> <path d="M9 16v4" /> <path d="M15 16v4" /> <path d="M7 10h2l2 3l2 -6l1 3h3" /></>,
  "consultations": <><path d="M6 4h-1a2 2 0 0 0 -2 2v3.5a5.5 5.5 0 0 0 11 0v-3.5a2 2 0 0 0 -2 -2h-1" /> <path d="M8 15a6 6 0 1 0 12 0v-3" /> <path d="M11 3v2" /> <path d="M6 3v2" /> <path d="M18 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></>,
  "appointments": <><path d="M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4" /> <path d="M14 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /> <path d="M15 3v4" /> <path d="M7 3v4" /> <path d="M3 11h16" /> <path d="M18 16.496v1.504l1 1" /></>,
  "hospitalization": <><path d="M5 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /> <path d="M22 17v-3h-20" /> <path d="M2 8v9" /> <path d="M12 14h10v-2a3 3 0 0 0 -3 -3h-7v5" /></>,
  "laboratory": <><path d="M5 21h14" /> <path d="M6 18h2" /> <path d="M7 18v3" /> <path d="M9 11l3 3l6 -6l-3 -3l-6 6" /> <path d="M10.5 12.5l-1.5 1.5" /> <path d="M17 3l3 3" /> <path d="M12 21a6 6 0 0 0 3.715 -10.712" /></>,
  "pharmacy": <><path d="M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7" /> <path d="M8.5 8.5l7 7" /></>,
  "stocks": <><path d="M3 21v-13l9 -4l9 4v13" /> <path d="M13 13h4v8h-10v-6h6" /> <path d="M13 21v-9a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v3" /></>,
  "accounting": <><path d="M4 5a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -14" /> <path d="M8 8a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -1" /> <path d="M8 14l0 .01" /> <path d="M12 14l0 .01" /> <path d="M16 14l0 .01" /> <path d="M8 17l0 .01" /> <path d="M12 17l0 .01" /> <path d="M16 17l0 .01" /></>,
  "hr": <><path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -10" /> <path d="M7 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /> <path d="M15 8l2 0" /> <path d="M15 12l2 0" /> <path d="M7 16l10 0" /></>,
  "direction": <><path d="M3 21l18 0" /> <path d="M5 21v-14l8 -4v18" /> <path d="M19 21v-10l-6 -4" /> <path d="M9 9l0 .01" /> <path d="M9 12l0 .01" /> <path d="M9 15l0 .01" /> <path d="M9 18l0 .01" /></>,
  "maintenance": <><path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" /></>,
  "reports": <><path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6" /> <path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10" /> <path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14" /> <path d="M4 20h14" /></>,
  "administration": <><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /> <path d="M6 21v-2a4 4 0 0 1 4 -4h2.5" /> <path d="M17.001 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /> <path d="M19.001 15.5v1.5" /> <path d="M19.001 21v1.5" /> <path d="M22.032 17.25l-1.299 .75" /> <path d="M17.27 20l-1.3 .75" /> <path d="M15.97 17.25l1.3 .75" /> <path d="M20.733 20l1.3 .75" /></>,
  "hygiene": <><path d="M4 12a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2l0 -7" /> <path d="M6 10v-4a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v4" /> <path d="M15 7h.01" /> <path d="M18 9h.01" /> <path d="M18 5h.01" /> <path d="M21 3h.01" /> <path d="M21 7h.01" /> <path d="M21 11h.01" /> <path d="M10 7h1" /></>,
  "archives": <><path d="M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2" /> <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10" /> <path d="M10 12l4 0" /></>,
  "ia": <><path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8" /> <path d="M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8" /> <path d="M17.5 16a3.5 3.5 0 0 0 0 -7h-.5" /> <path d="M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0" /> <path d="M6.5 16a3.5 3.5 0 0 1 0 -7h.5" /> <path d="M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10" /></>,
  "patient-space": <><path d="M11.5 21h-3.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v6" /> <path d="M11 4h2" /> <path d="M18 22l3.35 -3.284a2.143 2.143 0 0 0 .005 -3.071a2.242 2.242 0 0 0 -3.129 -.006l-.224 .22l-.223 -.22a2.242 2.242 0 0 0 -3.128 -.006a2.143 2.143 0 0 0 -.006 3.071l3.355 3.296" /></>,
  "ged": <><path d="M15 3v4a1 1 0 0 0 1 1h4" /> <path d="M18 17h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h4l5 5v7a2 2 0 0 1 -2 2" /> <path d="M16 17v2a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2" /></>,
  "dossiers": <><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /> <path d="M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2" /> <path d="M10 14l4 0" /> <path d="M12 12l0 4" /></>,
  "equipements": <><path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /> <path d="M7 17l0 .01" /> <path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /> <path d="M7 7l0 .01" /> <path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /> <path d="M17 7l0 .01" /> <path d="M14 14l3 0" /> <path d="M20 14l0 .01" /> <path d="M14 14l0 3" /> <path d="M14 20l3 0" /> <path d="M17 17l3 0" /> <path d="M20 17l0 3" /></>,
  "hopitaux": <><path d="M3 21l18 0" /> <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" /> <path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4" /> <path d="M10 9l4 0" /> <path d="M12 7l0 4" /></>,
};

export default function IconeModule({ module, size = 26, strokeWidth = 1.75 }) {
  const trace = TRACES[module];
  if (!trace) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trace}
    </svg>
  );
}
