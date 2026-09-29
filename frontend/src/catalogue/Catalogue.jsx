import { useMemo, useState } from "react";
import { Download, Eye, ListTree, Stethoscope } from "lucide-react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "../styles/Caisse.css";
import "../styles/medecine.css";

import Coquille from "../components/Coquille";
import StepForm from "../forms/StepForm";
import { DOSSIER_EXEMPLE, REFS_EXEMPLE, SPECIALITES } from "./specialites";

/*
 * ============================================================
 * CATALOGUE DES FORMULAIRES — OUTIL DE DÉVELOPPEMENT
 * ============================================================
 *
 * Chaque spécialité, sans enregistrer de patient :
 *
 *   Aperçu   le vrai formulaire, cliquable ; rien n'est enregistré
 *   Champs   la liste complète : identifiant, libellé, type,
 *            obligatoire, condition, valeurs, étape
 *
 * Et l'export CSV, pour faire relire les champs aux médecins.
 * ============================================================
 */

const TYPES = {
  text: "Texte", textarea: "Texte long", number: "Nombre", date: "Date", time: "Heure", select: "Liste",
  liste: "Liste multiple", radio: "Choix unique", switch: "Oui / Non", coches: "Cases à cocher",
  combobox: "Saisie avec suggestions", repeater: "Lignes répétables", chips: "Pastilles",
};

function condition(visibleIf) {
  if (!visibleIf) return "";
  if (typeof visibleIf === "function") return "règle calculée";
  const { field, operator = "eq", value } = visibleIf;
  return { eq: `${field} = ${value}`, neq: `${field} ≠ ${value}`, truthy: `${field} ouvert`, falsy: `${field} fermé`,
    in: `${field} ∈ ${value}` }[operator] || field;
}

function valeurs(champ) {
  if (champ.items) return champ.items.map(([, l]) => l).join(", ");
  const options = typeof champ.options === "function" ? null : champ.options;
  if (!options) return champ.options ? "selon le contexte" : "";
  return options.map((o) => (Array.isArray(o) ? o[1] : o)).slice(0, 12).join(", ") + (options.length > 12 ? "…" : "");
}

/* Toutes les lignes du tableau : sections, champs, et sous-champs des lignes répétables. */
function lignes(config) {
  const sortie = [];
  for (const etape of config.steps) {
    let section = "";
    for (const champ of etape.fields) {
      if (champ.type === "section" || champ.type === "disclosure") {
        section = champ.label + (champ.type === "disclosure" ? " (repliable)" : "");
        continue;
      }
      sortie.push({
        etape: etape.title, section, id: champ.id, libelle: champ.label, type: TYPES[champ.type] || champ.type,
        obligatoire: champ.required ? "Oui" : "", condition: condition(champ.visibleIf), valeurs: valeurs(champ),
        ia: champ.assist ? "Oui" : "",
      });
      for (const sous of champ.fields || []) {
        sortie.push({
          etape: etape.title, section, id: `${champ.id}.${sous.id}`, libelle: `↳ ${sous.label}`,
          type: TYPES[sous.type] || sous.type, obligatoire: "", condition: "", valeurs: valeurs(sous), ia: "",
        });
      }
    }
  }
  return sortie;
}

const COLONNES = [["etape", "Étape"], ["section", "Carte"], ["id", "Identifiant"], ["libelle", "Libellé"], ["type", "Type"],
  ["obligatoire", "Obligatoire"], ["condition", "Affiché si"], ["valeurs", "Valeurs"], ["ia", "Aide IA"]];

function exporter(nom, rangees) {
  const echapper = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [COLONNES.map(([, l]) => l), ...rangees.map((r) => COLONNES.map(([c]) => r[c]))]
    .map((ligne) => ligne.map(echapper).join(";")).join("\r\n");
  const lien = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })),
    download: `champs-${nom}.csv`,
  });
  lien.click();
}

/* Outil de développement : réservé à l'administrateur. */
export default function CatalogueProtege() {
  const { user } = useAuth();
  if (!user) return null;
  const admin = user.is_superuser || user.role === "ADMIN" || (user.roles || []).includes("ADMIN");
  return admin ? <Catalogue /> : <Navigate to="/modules" replace />;
}

function Catalogue() {
  const [ecran, setEcran] = useState(SPECIALITES[0].id);
  const [vue, setVue] = useState("champs");
  const [version, setVersion] = useState(0);
  const specialite = SPECIALITES.find((s) => s.id === ecran);
  const config = useMemo(() => specialite.config({ dossier: DOSSIER_EXEMPLE, refs: REFS_EXEMPLE }), [specialite]);
  const rangees = useMemo(() => lignes(config), [config]);
  const obligatoires = rangees.filter((r) => r.obligatoire).length;

  const ecrans = SPECIALITES.map((s) => ({
    id: s.id, label: s.nom, icone: Stethoscope, titre: "Catalogue des formulaires", sous: "",
  }));

  return (
    <Coquille ecrans={ecrans} ecran={ecran} onEcran={setEcran}
      actions={<>
        <div className="cat-bascule" role="tablist" aria-label="Vue">
          <button type="button" role="tab" aria-selected={vue === "champs"} className={vue === "champs" ? "actif" : ""} onClick={() => setVue("champs")}>
            <ListTree size={16} />Champs
          </button>
          <button type="button" role="tab" aria-selected={vue === "apercu"} className={vue === "apercu" ? "actif" : ""} onClick={() => setVue("apercu")}>
            <Eye size={16} />Aperçu
          </button>
        </div>
        <button type="button" className="secondary-button" onClick={() => exporter(specialite.id, rangees)}>
          <Download size={16} />CSV
        </button>
      </>}>
      {vue === "apercu" ? (
        <>
          <p className="bandeau info">Aperçu : rien n'est enregistré. La flèche ← remet le formulaire à zéro.</p>
          <StepForm key={`${ecran}-${version}`} config={config} enPage
            initialValues={{ ...(specialite.bloc.defauts || {}), ...(specialite.bloc.reprise?.([], DOSSIER_EXEMPLE.patient) || {}), __sexe: DOSSIER_EXEMPLE.patient.sexe, __age: DOSSIER_EXEMPLE.patient.age }}
            onSaveStep={() => Promise.resolve()} onSubmit={() => Promise.resolve()} onClose={() => setVersion((n) => n + 1)} />
        </>
      ) : (
        <section className="bloc">
          <div className="bloc-tete">
            <div>
              <h2>{specialite.nom}</h2>
              <p>{specialite.statut} · {config.steps.length} étapes · {rangees.length} champs dont {obligatoires} obligatoires</p>
              <p>Sources : {specialite.sources.join(" · ")}</p>
            </div>
          </div>
          <div className="tableau cat-tableau">
            <table>
              <thead><tr>{COLONNES.map(([c, l]) => <th key={c}>{l}</th>)}</tr></thead>
              <tbody>
                {rangees.map((r) => (
                  <tr key={r.id} className={r.obligatoire ? "cat-obligatoire" : ""}>
                    {COLONNES.map(([c]) => <td key={c}>{c === "id" ? <code>{r.id}</code> : r[c]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Coquille>
  );
}
