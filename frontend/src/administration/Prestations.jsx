import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import "../styles/Caisse.css";

import Chargement from "../components/Chargement";
import StepModal from "../forms/StepModal";
import api from "../services/api";
import { messageErreur } from "../accueil/api";

/*
 * ============================================================
 * PRESTATIONS ET TARIFS
 * ============================================================
 *
 * Le catalogue de la caisse : ce qu'on encaisse, à quel prix,
 * vers quel service on envoie le patient, et — pour une
 * consultation — quel formulaire de spécialité s'ouvre.
 *
 * Un prix modifié ne touche pas les passages déjà encaissés.
 * Une prestation ne se supprime pas : on la désactive.
 * ============================================================
 */

const argent = (v) => `${Math.round(Number(v) || 0).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

function configPrestation({ refs, prestation }) {
  const consultation = { field: "categorie", operator: "eq", value: "CONSULTATION" };
  return {
    title: prestation ? "Modifier la prestation" : "Nouvelle prestation",
    submitLabel: "Enregistrer",
    steps: [{
      id: "prestation",
      title: "Prestation",
      fields: [
        { id: "nom", type: "text", label: "Nom", required: true, span: 8, requiredMessage: "Le nom est obligatoire." },
        { id: "prix", type: "number", label: "Prix (FCFA)", required: true, span: 4, min: 0, step: 50,
          validate: { min: 0, message: "Le prix ne peut pas être négatif." } },
        { id: "categorie", type: "radio", label: "Catégorie", required: true, span: 12,
          options: refs.categories.map((c) => [c.code, c.libelle]) },
        { id: "service", type: "combobox", label: "Service de destination", span: 6, options: refs.services },
        { id: "specialite", type: "select", label: "Formulaire de consultation", span: 6, visibleIf: consultation,
          placeholder: "Médecine générale", options: refs.specialites.map((s) => [s.code, s.nom]) },
        { id: "active", type: "switch", label: "Proposée à la caisse", span: 12 },
      ],
    }],
  };
}

export default function Prestations() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const [terme, setTerme] = useState("");
  const [filtre, setFiltre] = useState("toutes");
  const [edition, setEdition] = useState(null);       // { prestation? }
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get("/administration/prestations/").then((r) => setDonnees(r.data)).catch((e) => setErreur(messageErreur(e)));
  }, [version]);

  const visibles = useMemo(() => {
    if (!donnees) return [];
    const t = terme.trim().toLowerCase();
    return donnees.prestations.filter((p) =>
      (filtre === "toutes" || (filtre === "inactives" ? !p.active : p.categorie === filtre))
      && (!t || `${p.nom} ${p.service} ${p.specialiteNom}`.toLowerCase().includes(t)));
  }, [donnees, terme, filtre]);

  async function enregistrer(valeurs) {
    const corps = { ...valeurs, active: valeurs.active !== false };
    try {
      if (edition.prestation) await api.put(`/administration/prestations/${edition.prestation.id}/`, corps);
      else await api.post("/administration/prestations/", corps);
      setVersion((n) => n + 1);
    } catch (e) {
      throw new Error(messageErreur(e));
    }
  }

  if (erreur) return <p className="bandeau erreur" role="alert">{erreur}</p>;
  if (!donnees) return <Chargement taille="moyenne" />;
  const inactives = donnees.prestations.filter((p) => !p.active).length;

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div>
          <h2>Prestations et tarifs</h2>
          {inactives > 0 && <p>{inactives} prestation{inactives > 1 ? "s" : ""} non proposée{inactives > 1 ? "s" : ""} à la caisse</p>}
        </div>
        <button type="button" className="primary-button" onClick={() => setEdition({})}>
          <Plus size={16} />Nouvelle prestation
        </button>
      </div>

      <div className="presta-filtres">
        <label className="recherche">
          <input value={terme} onChange={(e) => setTerme(e.target.value)} placeholder="Rechercher une prestation"
            aria-label="Rechercher une prestation" />
        </label>
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Filtrer">
          <option value="toutes">Toutes</option>
          {donnees.categories.map((c) => <option key={c.code} value={c.code}>{c.libelle}s</option>)}
          <option value="inactives">Non proposées</option>
        </select>
      </div>

      <div className="tableau">
        <table>
          <thead><tr><th>Prestation</th><th>Catégorie</th><th>Service</th><th>Formulaire</th><th>Prix</th><th>Caisse</th><th aria-label="Action" /></tr></thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id} className={p.active ? "" : "presta-inactive"}>
                <td><strong>{p.nom}</strong></td>
                <td>{p.categorieLibelle}</td>
                <td>{p.service || "—"}</td>
                <td>{p.categorie === "CONSULTATION" ? (p.specialiteNom || "Médecine générale") : "—"}</td>
                <td className="presta-prix">{argent(p.prix)}</td>
                <td><span className={`etat ${p.active ? "" : "presta-non"}`}>{p.active ? "Proposée" : "Non proposée"}</span></td>
                <td className="presta-action">
                  <button type="button" className="secondary-button" onClick={() => setEdition({ prestation: p })}>
                    <Pencil size={14} />Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibles.length === 0 && <p className="vide">Aucune prestation ne correspond.</p>}
      </div>

      {edition && (
        <StepModal config={configPrestation({ refs: donnees, prestation: edition.prestation })}
          initialValues={edition.prestation
            ? { ...edition.prestation, prix: String(edition.prestation.prix) }
            : { categorie: "CONSULTATION", active: true, prix: "" }}
          onClose={() => setEdition(null)} onSubmit={enregistrer} />
      )}
    </section>
  );
}
