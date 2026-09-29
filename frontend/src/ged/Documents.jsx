import { useEffect, useState } from "react";
import { ArchiveRestore, Download, Eye, FileUp, HardDrive, Cloud, Trash2 } from "lucide-react";

import Chargement from "../components/Chargement";
import ged, { date, messageErreur, ouvrirFichier, taille } from "./api";

/*
 * La liste des documents : recherche (titre, patient, mots-clés, n° de
 * dossier ou de registre), filtre par type, et les actions de chaque ligne.
 * La même liste sert de corbeille (`corbeille`).
 */
export default function Documents({ refs, version, corbeille = false, onDeposer, onRafraichir }) {
  const [liste, setListe] = useState(null);
  const [terme, setTerme] = useState("");
  const [type, setType] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const minuteur = setTimeout(() => {
      ged.get("documents/", { q: terme, type, corbeille: corbeille ? 1 : 0 }).then(setListe).catch((e) => setErreur(messageErreur(e)));
    }, 250);
    return () => clearTimeout(minuteur);
  }, [terme, type, corbeille, version]);

  async function agir(action) {
    setErreur("");
    try { await action(); onRafraichir(); } catch (e) { setErreur(e.message || messageErreur(e)); }
  }

  return (
    <section className="bloc">
      <div className="bloc-tete">
        <div><h2>{corbeille ? "Corbeille" : "Documents"}</h2></div>
        {!corbeille && (
          <button type="button" className="primary-button" onClick={onDeposer}>
            <FileUp size={16} strokeWidth={2} />Déposer des documents
          </button>
        )}
      </div>

      <div className="ged-filtres">
        <label className="recherche">
          <input value={terme} onChange={(e) => setTerme(e.target.value)}
            placeholder="Titre, patient, n° de dossier, mot-clé" aria-label="Rechercher un document" />
        </label>
        <select className="ged-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type de document">
          <option value="">Tous les types</option>
          {refs.types.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}
        </select>
      </div>

      {erreur && <p className="bandeau erreur" role="alert">{erreur}</p>}

      {liste === null ? <Chargement taille="moyenne" /> : liste.length === 0 ? (
        <p className="vide">{terme || type ? "Aucun document ne correspond." : corbeille ? "La corbeille est vide." : "Aucun document pour l'instant."}</p>
      ) : (
        <div className="tableau">
          <table>
            <thead>
              <tr><th>Document</th><th>Type</th><th>Patient</th><th>Date</th><th>Taille</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {liste.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.titre}</strong>
                    <small className="ged-origine">
                      {d.stockage === "distant" ? <Cloud size={12} /> : <HardDrive size={12} />}
                      {[d.nomFichier, d.ajoutePar].filter(Boolean).join(" · ")}
                    </small>
                  </td>
                  <td><span className="etat">{d.typeLibelle}</span></td>
                  <td>
                    {d.patient ? <>{d.patient.nom}<small>{d.patient.numero}</small></>
                      : d.identite ? <>{d.identite.nom}<small>Registre {d.identite.numeroRegistre || "papier"}</small></>
                        : <span className="note">—</span>}
                  </td>
                  <td>{date(d.date || d.ajouteLe)}</td>
                  <td>{taille(d.taille)}</td>
                  <td className="ged-actions">
                    {corbeille ? (
                      <button type="button" className="secondary-button" onClick={() => agir(() => ged.post(`documents/${d.id}/restaurer/`))}>
                        <ArchiveRestore size={15} />Restaurer
                      </button>
                    ) : (
                      <>
                        <button type="button" className="ged-icone" title="Ouvrir" aria-label={`Ouvrir ${d.titre}`}
                          onClick={() => agir(() => ouvrirFichier(d))}><Eye size={17} /></button>
                        <button type="button" className="ged-icone" title="Télécharger" aria-label={`Télécharger ${d.titre}`}
                          onClick={() => agir(() => ouvrirFichier(d, true))}><Download size={17} /></button>
                        <button type="button" className="ged-icone danger" title="Mettre à la corbeille" aria-label={`Supprimer ${d.titre}`}
                          onClick={() => agir(() => ged.supprimer(`documents/${d.id}/`))}><Trash2 size={17} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
