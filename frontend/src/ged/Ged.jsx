import { useCallback, useEffect, useState } from "react";
import { FolderSearch, Files, ScanLine, Trash2 } from "lucide-react";

import "../styles/Caisse.css";
import "../styles/ged.css";

import Chargement from "../components/Chargement";
import Coquille from "../components/Coquille";
import { useAttente } from "../components/attente";
import ged from "./api";
import Depot from "./Depot";
import DossierPatient from "./DossierPatient";
import Documents from "./Documents";
import Numerisation from "./Numerisation";

/*
 * ============================================================
 * GED — GESTION ÉLECTRONIQUE DES DOCUMENTS
 * ============================================================
 *
 *   Dossiers patients   tout ce que l'hôpital sait d'une personne
 *   Documents           les documents du centre, cherchables
 *   Numérisation        les registres papier, scannés et rattachés
 *   Corbeille           rien ne s'efface d'emblée
 *
 * Les fichiers sont sur le serveur du centre ; le logiciel
 * d'archivage externe se branchera derrière (backend/ged/connecteurs.py)
 * sans rien changer à ces écrans.
 * ============================================================
 */

const ECRANS = [
  { id: "dossiers", label: "Dossiers patients", icone: FolderSearch, titre: "Dossiers patients", sous: "" },
  { id: "documents", label: "Documents", icone: Files, titre: "Documents", sous: "" },
  { id: "numerisation", label: "Numérisation", icone: ScanLine, titre: "Numérisation des registres", sous: "" },
  { id: "corbeille", label: "Corbeille", icone: Trash2, titre: "Corbeille", sous: "" },
];

export default function Ged() {
  const [ecran, setEcran] = useState("dossiers");
  const [refs, setRefs] = useState(null);
  const [depot, setDepot] = useState(null);           // { rattache, type } quand la fenêtre est ouverte
  const [version, setVersion] = useState(0);
  const rafraichir = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => { ged.get("references/").then(setRefs).catch(() => setRefs({ types: [], extensions: [], tailleMax: 0 })); }, []);
  const attente = useAttente(!refs);

  return (
    <Coquille ecrans={ECRANS} ecran={ecran} onEcran={setEcran}
      apres={depot && refs && (
        <Depot refs={refs} rattache={depot.rattache} typeParDefaut={depot.type}
          onFermer={() => setDepot(null)} onDepose={rafraichir} />
      )}>
      {attente ? <Chargement taille="grande" pleine texte="Chargement du module…" /> : <>
        {ecran === "dossiers" && (
          <DossierPatient version={version} onDeposer={(rattache) => setDepot({ rattache, type: rattache?.sorte === "archive" ? "registre" : "autre" })} />
        )}
        {ecran === "documents" && (
          <Documents refs={refs} version={version} onDeposer={() => setDepot({ rattache: null, type: "autre" })} onRafraichir={rafraichir} />
        )}
        {ecran === "numerisation" && (
          <Numerisation onDeposer={(personne) => setDepot({ rattache: personne, type: "registre" })} />
        )}
        {ecran === "corbeille" && <Documents refs={refs} version={version} corbeille onRafraichir={rafraichir} />}
      </>}
    </Coquille>
  );
}
