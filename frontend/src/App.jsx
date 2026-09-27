
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
  Navigate
} from "react-router-dom";


/* ============================================================
   AUTHENTIFICATION
   ============================================================ */

import { useAuth } from "./context/AuthContext";


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

import Dashboard from "./pages/Dashboard";


/* ============================================================
   MODULE DIRECTION
   ============================================================

   Direction possède son propre layout complet.

   Elle est volontairement placée en dehors
   de AppLayout.

   ============================================================ */

import Direction from "./pages/Direction";


/* ============================================================
   MODULE CAISSE
   ============================================================ */

import Caisse from "./accueil/Caisse";


/* ============================================================
   MODULE GESTION DES STOCKS
   ============================================================ */

import Stocks from "./pages/Stocks";


/* ============================================================
   FORMULAIRE DE CRÉATION D'UN PATIENT
   ============================================================ */

import PatientForm from "./pages/PatientForm";


/* ============================================================
   MODULE RENDEZ-VOUS
   ============================================================ */

import Appointments from "./pages/Appointments";


/* ============================================================
   MODULE RESSOURCES HUMAINES
   ============================================================ */

import Employees from "./pages/employees";


/* ============================================================
   MODULE CONSULTATIONS
   ============================================================ */

import Consultations from "./pages/Consultations";


/* ============================================================
   MODULE HOSPITALISATION
   ============================================================ */

import Hospitalization from "./pages/Hospitalization";


/* ============================================================
   MODULE FACTURATION
   ============================================================ */

import Billing from "./pages/Billing";


/* ============================================================
   MODULE LABORATOIRE
   ============================================================ */

import Laboratory from "./pages/Laboratory";


/* ============================================================
   MODULE PHARMACIE
   ============================================================ */

import Pharmacy from "./pages/pharmacy";


/* ============================================================
   MODULE SOINS INFIRMIERS
   ============================================================ */

import Nursing from "./pages/Nursing";


/* ============================================================
   PAGES TEMPORAIRES
   ============================================================ */

import PlaceholderPage from "./pages/PlaceholderPage";


/* ============================================================
   MODULE RAPPORTS ET STATISTIQUES
   ============================================================

   IMPORTANT :
   Reports est indépendant du module Direction.

   ============================================================ */

import Reports from "./pages/Reports";


/* ============================================================
   NOUVEAUX MODULES
   ============================================================ */


/* ------------------------------------------------------------
   MAINTENANCE
   ------------------------------------------------------------ */

import Maintenance from "./pages/Maintenance";


/* ------------------------------------------------------------
   ADMINISTRATION
   ------------------------------------------------------------ */

import Administration from "./pages/Administration";


/* ------------------------------------------------------------
   HYGIÈNE ET SÉCURITÉ
   ------------------------------------------------------------ */

import Hygiene from "./pages/Hygiene";


/* ------------------------------------------------------------
   ARCHIVES
   ------------------------------------------------------------ */

import Archives from "./pages/Archives";


/* ------------------------------------------------------------
   INTELLIGENCE ARTIFICIELLE
   ------------------------------------------------------------ */

import Ia from "./pages/Ia";


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

  return token
    ? children
    : <Navigate to="/login" replace />;
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

      <Route
        path="/consultations"
        element={
          <Protected>
            <Consultations />
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

      <Route
        path="/caisse"
        element={
          <Protected>
            <Caisse />
          </Protected>
        }
      />


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
                src/pages/Maintenance.jsx

            ==================================================== */}

        <Route
          path="maintenance"
          element={<Maintenance />}
        />


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
                src/pages/Reports.jsx

            IMPORTANT :
            Ce module est indépendant de Direction.

            ==================================================== */}

        <Route
          path="reports"
          element={<Reports />}
        />


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
