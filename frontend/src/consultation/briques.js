/*
 * ============================================================
 * BRIQUES DES BLOCS DE SPÉCIALITÉ
 * ============================================================
 *
 * Ce qui se répète d'une spécialité à l'autre : une carte, une
 * ligne « Normal / Anormal » qui déplie ses signes, et la synthèse
 * calculée depuis ce qui a été saisi. Un bloc (voir blocs.js) se
 * compose de ces briques ; ses champs normaux le sont par défaut.
 * ============================================================
 */

export const paires = (liste) => liste.map((x) => (Array.isArray(x) ? x : [x, x]));
export const aujourdhui = () => new Date().toISOString().slice(0, 10);

export const OUI_NON = [["non", "Non"], ["oui", "Oui"]];
export const NORMAL_ANORMAL = [["normal", "Normal"], ["anormal", "Anormal"]];
export const RESULTAT = [["non_fait", "Non fait"], ["negatif", "Négatif"], ["positif", "Positif"]];

/* Une carte titrée ; `colonne` la range à gauche ou à droite sur grand écran. */
export const carte = (id, label, colonne = "droite", extra = {}) => ({ id: `__${id}__`, type: "section", label, colonne, ...extra });
export const repliable = (id, label, colonne = "droite", extra = {}) => ({ id: `__${id}__`, type: "disclosure", label, colonne, ...extra });
export const dansRepliable = (id) => ({ field: `__${id}__`, operator: "truthy" });

/* Libellé à gauche, choix à droite : la ligne d'examen. */
export const choix = (id, label, options, extra = {}) => ({ id, type: "radio", label, span: 12, variant: "ligne", options, ...extra });

/* « Normal » par défaut ; « Anormal » déplie les signes et les précisions. */
export function examen(id, label, signes = []) {
  const anormal = { field: id, operator: "eq", value: "anormal" };
  return [
    { id, type: "radio", label, span: 12, variant: "ligne", options: NORMAL_ANORMAL, defaut: "normal" },
    ...(signes.length ? [{ id: `${id}_signes`, type: "liste", label: "Signes", span: 12, options: paires(signes), visibleIf: anormal, variant: "detail" }] : []),
    { id: `${id}_detail`, type: "text", label: "Précisions", span: 12, visibleIf: anormal, variant: "detail" },
  ];
}

/* Les valeurs par défaut d'un bloc (les « Normal »), lues dans ses champs. */
export function defauts(champs) {
  return Object.fromEntries(champs.filter((c) => c.defaut !== undefined).map((c) => [c.id, c.defaut]));
}

function texteValeur(champ, valeur) {
  if (valeur === undefined || valeur === null || valeur === "" || (Array.isArray(valeur) && !valeur.length)) return "";
  if (champ.type === "switch") return valeur === true ? "oui" : valeur === false ? "non" : "";
  const options = Array.isArray(champ.options) ? champ.options : null;
  const libelle = (v) => (options?.find(([o]) => o === v)?.[1] ?? v);
  return Array.isArray(valeur) ? valeur.map(libelle).join(", ") : String(libelle(valeur)) + (champ.suffixe ? ` ${champ.suffixe}` : "");
}

/*
 * La synthèse d'un bloc : ce qui a été saisi, dans l'ordre du formulaire.
 * Les examens « Normal » se regroupent en une phrase ; les anomalies
 * s'écrivent avec leurs signes. C'est ce qui s'enregistre dans la consultation.
 */
export function synthese(champs) {
  const parId = Object.fromEntries(champs.map((c) => [c.id, c]));
  return (v) => {
    const normaux = [];
    const phrases = [];
    for (const c of champs) {
      // Les champs graphiques et les listes de lignes se résument ailleurs (graphiques.js, ordonnance…).
      if (["section", "disclosure", "dents", "courbe", "partogramme", "repeater"].includes(c.type) || c.id.startsWith("__") || c.id.endsWith("_signes") || c.id.endsWith("_detail")) continue;
      if (c.visibleIf && typeof c.visibleIf === "object" && c.visibleIf.operator === "truthy" && !v[c.visibleIf.field]) continue;
      if (c.defaut === "normal") {
        if (v[c.id] === "anormal") {
          const details = [texteValeur(parId[`${c.id}_signes`] || {}, v[`${c.id}_signes`]), v[`${c.id}_detail`]].filter(Boolean);
          phrases.push(`${c.label} : ${details.join(", ") || "anormal"}`);
        } else {
          normaux.push(c.label.toLowerCase());
        }
        continue;
      }
      const texte = texteValeur(c, v[c.id]);
      if (texte) phrases.push(`${c.label} : ${texte}`);
    }
    return [
      ...phrases.map((p) => `${p}.`),
      normaux.length ? `${normaux.join(", ").replace(/^./, (x) => x.toUpperCase())} : normal.` : "",
    ].filter(Boolean).join(" ");
  };
}

/* Un bloc complet à partir de ses champs d'examen : défauts et synthèse compris. */
export function bloc({ examen: champs = [], etapes = [], ...options }) {
  const tous = [...champs, ...etapes.flatMap((e) => e.fields)];
  return { ...options, examen: champs, etapes, defauts: defauts(tous), synthese: synthese(tous) };
}
