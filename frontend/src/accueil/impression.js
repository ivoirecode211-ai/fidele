/*
 * ============================================================
 * FORMAT D'IMPRESSION
 * ============================================================
 *
 * Le module imprime deux documents de formats différents : le
 * ticket en A5 paysage, le bilan en A4. Or `@page` ne se laisse
 * pas conditionner par un sélecteur, et une page nommée ne
 * s'applique pas à un élément positionné en absolu.
 *
 * On pose donc la règle juste avant d'imprimer. Une seule
 * balise de style, réécrite à chaque fois.
 * ============================================================
 */

const BALISE = "format-impression";

export const A5_PORTRAIT = { taille: "A5 portrait", marge: "7mm" };
export const A4 = { taille: "A4", marge: "12mm" };

export function imprimer({ taille, marge }) {
  let style = document.getElementById(BALISE);
  if (!style) {
    style = document.createElement("style");
    style.id = BALISE;
    document.head.appendChild(style);
  }
  style.textContent = `@page { size: ${taille}; margin: ${marge}; }`;
  window.print();
}
