
/*
 * ============================================================
 * MA SANTÉ - ROUTES PRINCIPALES DE L'APPLICATION
 * ============================================================
 *
 * Ce fichier définit toutes les routes de l'application React.
 *
 * Fonctionnement :
 *
 * 1. L'utilisateur arrive sur /login s'il n'est pas connecté.
 *
 * 2. Après connexion, "/" redirige vers "/modules".
 *
 * 3. "/modules" constitue la page principale de l'application.
 *
 * 4. "/direction" ouvre directement Direction.jsx.
 *
 * 5. Les autres modules utilisent AppLayout.
 *
 * ============================================================
 */


/* ============================================================
   REACT ROUTER
   ============================================================ */

import {
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";


/* ============================================================
   AUTHENTIFICATION
   ============================================================ */

import { useAuth } from "./context/AuthContext";
import { lazy, Suspense } from "react";
import Chargement from "./components/Chargement";


/* ============================================================
   CHARGEMENT À LA DEMANDE
   ============================================================

   Chaque module n'est téléchargé qu'à sa première ouverture :
   la connexion et la page des modules s'affichent sans attendre
   le code de tous les autres. Pendant le téléchargement, le
   tracé d'électrocardiogramme habituel.

   ============================================================ */

function differe(charger) {
  const Module = lazy(charger);
  return function PageDifferee(props) {
    return (
      <Suspense fallback={<Chargement taille="grande" pleine />}>
        <Module {...props} />
      </Suspense>
    );
  };
}


/* ============================================================
   PAGE DE CONNEXION
   ============================================================ */

import Login from "./pages/Login";


/* ============================================================
   PAGE PRINCIPALE DES MODULES
   ============================================================ */

import Modules from "./pages/Modules";


/* ============================================================
   ANCIEN TABLEAU DE BORD
   ============================================================ */

const Dashboard = differe(() => import("./pages/Dashboard"));

const EspacePatientsPersonnel = differe(() => import("./patient/Personnel"));
const Dossiers = differe(() => import("./dossier/Dossiers"));
const ConnexionPatient = differe(() => import("./patient/Connexion"));
const EspacePatient = differe(() => import("./patient/Espace"));
const Ged = differe(() => import("./ged/Ged"));
const Catalogue = differe(() => import("./catalogue/Catalogue"));


/* ============================================================
   MODULE DIRECTION
   ============================================================

   Direction possède son propre layout complet.

   Elle est volontairement placée en dehors
   de AppLayout.

   ============================================================ */

const Direction = differe(() => import("./pages/Direction"));


/* ============================================================
   MODULE CAISSE
   ============================================================ */

const Caisse = differe(() => import("./accueil/Caisse"));
const Hopitaux = differe(() => import("./pages/Hopitaux"));
const Equipements = differe(() => import("./equipements/Equipements"));
const FicheEquipement = differe(() => import("./equipements/FicheEquipement"));


/* ============================================================
   MODULE GESTION DES STOCKS
   ============================================================ */

const Stocks = differe(() => import("./pages/Stocks"));


/* ============================================================
   FORMULAIRE DE CRÉATION D'UN PATIENT
   ============================================================ */

const PatientForm = differe(() => import("./pages/PatientForm"));


/* ============================================================
   MODULE RENDEZ-VOUS
   ============================================================ */

const Appointments = differe(() => import("./pages/Appointments"));


/* ============================================================
   MODULE RESSOURCES HUMAINES
   ============================================================ */

const Employees = differe(() => import("./pages/employees"));


/* ============================================================
   MODULE CONSULTATIONS
   ============================================================ */

const ModuleConsultation = differe(() => import("./medecine/ModuleConsultation"));


/* ============================================================
   MODULE HOSPITALISATION
   ============================================================ */

const Hospitalization = differe(() => import("./pages/Hospitalization"));


/* ============================================================
   MODULE FACTURATION
   ============================================================ */

const Billing = differe(() => import("./pages/Billing"));


/* ============================================================
   MODULE LABORATOIRE
   ============================================================ */

const Laboratory = differe(() => import("./pages/Laboratory"));


/* ============================================================
   MODULE PHARMACIE
   ============================================================ */

const Pharmacy = differe(() => import("./pages/pharmacy"));


/* ============================================================
   MODULE SOINS INFIRMIERS
   ============================================================ */

const Nursing = differe(() => import("./pages/Nursing"));


/* ============================================================
   PAGES TEMPORAIRES
   ============================================================ */

const PlaceholderPage = differe(() => import("./pages/PlaceholderPage"));


/* ============================================================
   MODULE RAPPORTS ET STATISTIQUES
   ============================================================

   IMPORTANT :
   Reports est indépendant du module Direction.

   ============================================================ */

const ModuleRapports = differe(() => import("./rapports/ModuleRapports"));


/* ============================================================
   NOUVEAUX MODULES
   ============================================================ */


/* ------------------------------------------------------------
   MAINTENANCE
   ------------------------------------------------------------ */

const ModuleMaintenance = differe(() => import("./maintenance/ModuleMaintenance"));


/* ------------------------------------------------------------
   ADMINISTRATION
   ------------------------------------------------------------ */

const Administration = differe(() => import("./pages/Administration"));


/* ------------------------------------------------------------
   HYGIÈNE ET SÉCURITÉ
   ------------------------------------------------------------ */

const Hygiene = differe(() => import("./pages/Hygiene"));


/* ------------------------------------------------------------
   ARCHIVES
   ------------------------------------------------------------ */

const Archives = differe(() => import("./pages/Archives"));


/* ------------------------------------------------------------
   INTELLIGENCE ARTIFICIELLE
   ------------------------------------------------------------ */

const Ia = differe(() => import("./pages/Ia"));


/* ============================================================
   LAYOUT PRINCIPAL
   ============================================================ */

import AppLayout from "./layouts/AppLayout";


/* ============================================================
   PROTECTION DES ROUTES
   ============================================================ */

/*
 * Cette fonction protège les pages nécessitant
 * une authentification.
 *
 * Si un utilisateur possède un token :
 *     → la page demandée est affichée.
 *
 * Sinon :
 *     → il est redirigé vers /login.
 */

function Protected({ children }) {

  const { token } = useAuth();
  const { pathname, search } = useLocation();

  /* Après la connexion, on revient là où l'on voulait aller :
     c'est ce qui permet d'ouvrir la fiche d'un appareil en scannant son étiquette. */
  return token
    ? children
    : <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}


/* ============================================================
   APPLICATION PRINCIPALE
   ============================================================ */

export default function App() {

  return (

    <Routes>


      {/* ======================================================
          PAGE DE CONNEXION
          ====================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />


      {/* ======================================================
          MODULE DIRECTION
          ======================================================

          Direction possède son propre menu et son propre
          layout.

          Elle reste donc en dehors de AppLayout.

          URL :
              /direction

          ====================================================== */}

      <Route
        path="/direction"
        element={
          <Protected>
            <Direction />
          </Protected>
        }
      />


      {/* ======================================================
          MODULES AVEC LEUR PROPRE LAYOUT COMPLET
          ======================================================

          Comme /direction, ces modules construisent leur propre
          sidebar/en-tête spécialisés (espace médecin, pharmacie,
          stocks, caisse) et ne doivent donc PAS être imbriqués
          dans AppLayout : les deux chrome se superposaient sinon
          (double sidebar, double en-tête).

          ====================================================== */}

      {/* Maintenance et Rapports : barre latérale de sous-modules, comme la Caisse. */}
      <Route path="/maintenance" element={<Protected><ModuleMaintenance /></Protected>} />
      <Route path="/reports" element={<Protected><ModuleRapports /></Protected>} />

      <Route
        path="/consultations"
        element={
          <Protected>
            <ModuleConsultation />
          </Protected>
        }
      />

      <Route
        path="/pharmacy"
        element={
          <Protected>
            <Pharmacy />
          </Protected>
        }
      />

      <Route
        path="/stocks"
        element={
          <Protected>
            <Stocks />
          </Protected>
        }
      />

      {/* QR Code équipements : le parc, et la fiche ouverte en scannant une étiquette. */}
      <Route path="/equipements" element={<Protected><Equipements /></Protected>} />
      <Route path="/equipement/:token" element={<Protected><FicheEquipement /></Protected>} />

      {/* Plateforme : création des hôpitaux et de leur administrateur. */}
      <Route
        path="/hopitaux"
        element={
          <Protected>
            <Hopitaux />
          </Protected>
        }
      />

      <Route
        path="/caisse"
        element={
          <Protected>
            <Caisse />
          </Protected>
        }
      />

      {/* Espace patients : côté personnel (accès, messages) et côté patient (code patient + PIN). */}
      <Route path="/patient-space" element={<Protected><EspacePatientsPersonnel /></Protected>} />
      {/* Dossier patient : tout ce que les modules savent d'un patient. */}
      <Route path="/dossiers" element={<Protected><Dossiers /></Protected>} />
      <Route path="/dossiers/:id" element={<Protected><Dossiers /></Protected>} />
      <Route path="/patient" element={<ConnexionPatient />} />
      <Route path="/patient/espace" element={<EspacePatient />} />
      <Route path="/ged" element={<Protected><Ged /></Protected>} />
      {/* Outil de développement : les formulaires des spécialités, sans patient (administrateur). */}
      <Route path="/catalogue-formulaires" element={<Protected><Catalogue /></Protected>} />

      {/* ======================================================
          PAGE PRINCIPALE DES MODULES
          ======================================================

          Comme /direction et les modules ci-dessus, cette page
          construit son propre en-tête (pas de sidebar) : elle
          reste donc, elle aussi, en dehors de AppLayout.

          ====================================================== */}

      <Route
        path="/modules"
        element={
          <Protected>
            <Modules />
          </Protected>
        }
      />


      {/* ======================================================
          APPLICATION PRINCIPALE
          ======================================================

          Tous les autres modules utilisent AppLayout.

          Structure :

              /
              ↓
          Protected
              ↓
          AppLayout
              ↓
          Module

          ====================================================== */}

      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >


        {/* ====================================================
            PAGE D'ACCUEIL
            ====================================================

            "/" redirige automatiquement vers "/modules".

            ==================================================== */}

        <Route
          index
          element={
            <Navigate
              to="/modules"
              replace
            />
          }
        />


        {/* ====================================================
            MODULE : TABLEAU DE BORD
            ==================================================== */}

        <Route
          path="dashboard"
          element={<Dashboard />}
        />


        {/* ====================================================
            CRÉATION D'UN PATIENT
            ==================================================== */}

        <Route
          path="patients/new"
          element={<PatientForm />}
        />


        {/* ====================================================
            MODULE : RENDEZ-VOUS
            ==================================================== */}

        <Route
          path="appointments"
          element={<Appointments />}
        />


        {/* ====================================================
            MODULE : HOSPITALISATION
            ==================================================== */}

        <Route
          path="hospitalization"
          element={<Hospitalization />}
        />


        {/* ====================================================
            MODULE : FACTURATION / COMPTABILITÉ
            ==================================================== */}

        <Route
          path="billing"
          element={<Billing />}
        />


        {/* ====================================================
            MODULE : LABORATOIRE
            ==================================================== */}

        <Route
          path="laboratory"
          element={<Laboratory />}
        />


        {/* ====================================================
            MODULE : SOINS INFIRMIERS
            ==================================================== */}

        <Route
          path="nursing"
          element={<Nursing />}
        />


        {/* ====================================================
            MODULE : RESSOURCES HUMAINES
            ==================================================== */}

        <Route
          path="employees"
          element={<Employees />}
        />


        {/* ====================================================
            MODULE : ÉQUIPEMENTS MÉDICAUX
            ====================================================

            Page temporaire pour le moment.

            ==================================================== */}

        <Route
          path="equipments"
          element={
            <PlaceholderPage
              title="Équipements médicaux"
            />
          }
        />


        {/* ====================================================
            MODULE : MAINTENANCE
            ====================================================

            URL :
                /maintenance

            Fichier :
                src/maintenance/ModuleMaintenance.jsx

            ==================================================== */}

        {/* Maintenance : page autonome (charte de la Caisse), voir plus haut. */}


        {/* ====================================================
            MODULE : ADMINISTRATION
            ====================================================

            URL :
                /administration

            Fichier :
                src/pages/Administration.jsx

            ==================================================== */}

        <Route
          path="administration"
          element={<Administration />}
        />


        {/* ====================================================
            MODULE : HYGIÈNE ET SÉCURITÉ
            ====================================================

            URL :
                /hygiene

            Fichier :
                src/pages/Hygiene.jsx

            ==================================================== */}

        <Route
          path="hygiene"
          element={<Hygiene />}
        />


        {/* ====================================================
            MODULE : ARCHIVES
            ====================================================

            URL :
                /archives

            Fichier :
                src/pages/Archives.jsx

            ==================================================== */}

        <Route
          path="archives"
          element={<Archives />}
        />


        {/* ====================================================
            MODULE : RAPPORTS ET STATISTIQUES
            ====================================================

            URL :
                /reports

            Fichier :
                src/rapports/ModuleRapports.jsx

            IMPORTANT :
            Ce module est indépendant de Direction.

            ==================================================== */}

        {/* Rapports : page autonome (charte de la Caisse), voir plus haut. */}


        {/* ====================================================
            MODULE : INTELLIGENCE ARTIFICIELLE
            ====================================================

            URL :
                /ia

            Fichier :
                src/pages/Ia.jsx

            ==================================================== */}

        <Route
          path="ia"
          element={<Ia />}
        />


        {/* ====================================================
            MODULE : APPROVISIONNEMENT
            ====================================================

            Le module existe dans Modules.jsx.
            Interface temporaire en attendant sa création.

            URL :
                /procurement

            ==================================================== */}

        <Route
          path="procurement"
          element={
            <PlaceholderPage
              title="Approvisionnement"
            />
          }
        />


        {/* ====================================================
            MODULE : ACCUEIL / RÉCEPTION
            ====================================================

            Le module existe dans Modules.jsx.
            Interface temporaire en attendant sa création.

            URL :
                /reception

            ==================================================== */}

        <Route
          path="reception"
          element={
            <PlaceholderPage
              title="Accueil / Réception"
            />
          }
        />


        {/* ====================================================
            PARAMÈTRES
            ====================================================

            Page temporaire pour le moment.

            ==================================================== */}

        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="Paramètres"
            />
          }
        />


      </Route>


      {/* ======================================================
          ROUTE PAR DÉFAUT
          ======================================================

          Toute URL inconnue retourne vers "/".

          "/" redirigera ensuite vers "/modules".

          ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />


    </Routes>
  );
}
