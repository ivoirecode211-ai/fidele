import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { UserAvatar } from "../components/UserBadge";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutGrid,
  LogOut,
  Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import IconeModule from "../components/IconeModule";
import "../styles/modules.css";

// ============================================================
// TOUS LES MODULES DE L'APPLICATION
// ============================================================
//
// `color` ne distingue plus visuellement les modules.
// La charte graphique utilise une seule couleur de marque.
// La valeur est conservée afin de ne pas casser la structure
// existante des données.
//
// NOUVEAUX MODULES :
// - Espace patients
// - GED
// ============================================================

const ALL_MODULES = [
  {
    id: "patients",
    name: "Caisse",
    description:
      "Enregistrer les patients, gérer l'accueil et les opérations de caisse",
    path: "/caisse",
    color: "blue",
  },

  {
    id: "nursing",
    name: "Soins infirmiers",
    description:
      "Saisir les soins, surveillances et traitements",
    path: "/nursing",
    color: "cyan",
  },

  {
    id: "consultations",
    name: "Consultation",
    description:
      "Consultations de toutes les spécialités et prescriptions",
    path: "/consultations",
    color: "purple",
  },

  {
    id: "appointments",
    name: "Rendez-vous",
    description:
      "Planifier et gérer les rendez-vous des patients",
    path: "/appointments",
    color: "green",
  },

  {
    id: "hospitalization",
    name: "Hospitalisation",
    description:
      "Gérer les admissions, séjours et sorties des patients",
    path: "/hospitalization",
    color: "red",
  },

  {
    id: "laboratory",
    name: "Laboratoire",
    description:
      "Gérer les analyses et résultats de laboratoire",
    path: "/laboratory",
    color: "orange",
  },

  {
    id: "pharmacy",
    name: "Pharmacie",
    description:
      "Gérer les médicaments, ordonnances et stocks pharmaceutiques",
    path: "/pharmacy",
    color: "pink",
  },

  {
    id: "stocks",
    name: "Gestion des stocks",
    description:
      "Suivre les stocks de médicaments, matériel et consommables",
    path: "/stocks",
    color: "blue-dark",
  },

  {
    id: "accounting",
    name: "Comptabilité",
    description:
      "Gérer la facturation, les paiements et les rapports financiers",
    path: "/billing",
    color: "purple",
  },

  {
    id: "hr",
    name: "Ressources humaines",
    description:
      "Gérer le personnel, les congés et les plannings",
    path: "/employees",
    color: "green-dark",
  },

  {
    id: "direction",
    name: "Direction",
    description:
      "Tableau de bord de la direction et suivi de l'activité de l'établissement",
    path: "/direction",
    color: "yellow",
  },

  {
    id: "maintenance",
    name: "Maintenance",
    description:
      "Gérer les interventions et la maintenance des équipements",
    path: "/maintenance",
    color: "gray",
  },

  {
    id: "reports",
    name: "Rapports et statistiques",
    description:
      "Consulter les rapports et les indicateurs clés",
    path: "/reports",
    color: "blue-light",
  },

  {
    id: "administration",
    name: "Administration",
    description:
      "Gérer les utilisateurs, les rôles et les paramètres système",
    path: "/administration",
    color: "indigo",
  },

  {
    id: "hygiene",
    name: "Hygiène et sécurité",
    description:
      "Suivre les contrôles d'hygiène et la sécurité sanitaire",
    path: "/hygiene",
    color: "green",
  },

  {
    id: "archives",
    name: "Archives",
    description:
      "Consulter et gérer les dossiers archivés",
    path: "/archives",
    color: "blue-light",
  },

  {
    id: "ia",
    name: "Intelligence Artificielle",
    description:
      "Assistance intelligente pour l'analyse des informations et l'aide à la décision",
    path: "/ia",
    color: "indigo",
  },

  // ============================================================
  // NOUVEAU MODULE : ESPACE PATIENTS
  // ============================================================
  {
    id: "patient-space",
    name: "Espace patients",
    description:
      "Activer l'espace de chaque patient (dossier, médicaments, rendez-vous) et répondre à ses messages",
    path: "/patient-space",
    color: "blue-light",
  },

  // ============================================================
  // NOUVEAU MODULE : GED
  // ============================================================
  {
    id: "ged",
    name: "GED",
    description:
      "Gestion électronique, indexation, recherche et archivage des documents de la clinique",
    path: "/ged",
    color: "indigo",
  },

  // ============================================================
  // DOSSIER PATIENT : tout ce que les modules savent d'un patient
  // ============================================================
  {
    id: "dossiers",
    name: "Dossier patient",
    description:
      "Retrouver un patient et tout son parcours : caisse, soins, consultations, ordonnances, analyses, séjours",
    path: "/dossiers",
    color: "blue",
  },

  // ============================================================
  // QR CODE ÉQUIPEMENTS : identifier chaque appareil, voir sa maintenance
  // ============================================================
  {
    id: "equipements",
    name: "QR Code équipements",
    description:
      "Étiqueter les appareils du centre et retrouver leur historique de maintenance en les scannant",
    path: "/equipements",
    color: "blue",
  },

  // ============================================================
  // PLATEFORME : création des hôpitaux et de leur administrateur
  // ============================================================
  {
    id: "hopitaux",
    name: "Hôpital",
    description:
      "Créer les hôpitaux clients et leur administrateur",
    path: "/hopitaux",
    color: "blue",
  },
];


// ============================================================
// MODULES DISPONIBLES PAR RÔLE
// ============================================================

const DEFAULT_ROLE_MODULES = {
  ADMIN: ALL_MODULES.map((module) => module.id),

  DIRECTOR: [
    "dossiers",
    "patients",
    "appointments",
    "consultations",
    "hospitalization",
    "nursing",
    "laboratory",
    "pharmacy",
    "stocks",
    "accounting",
    "hr",
    "direction",
    "maintenance",
    "reports",
    "hygiene",
    "archives",
    "ia",
    "ged",
    "equipements",
    "patient-space",
  ],

  DOCTOR: [
    "dossiers",
    "appointments",
    "consultations",
    "hospitalization",
    "laboratory",
    "pharmacy",
    "ia",
    "patient-space",
    "ged",
  ],

  NURSE: [
    "dossiers",
    "appointments",
    "hospitalization",
    "nursing",
    "laboratory",
  ],

  AIDE_SOIGNANT: [
    "nursing",
  ],

  RECEPTION: [
    "dossiers",
    "patients",
    "appointments",
    "patient-space",
  ],

  LAB: [
    "dossiers",
    "laboratory",
    "ged",
  ],

  PHARMACY: [
    "dossiers",
    "pharmacy",
    "stocks",
  ],

  ACCOUNTING: [
    "dossiers",
    "patients",
    "accounting",
    "reports",
  ],

  STOCK: [
    "stocks",
    "pharmacy",
  ],

  HR: [
    "hr",
    "reports",
  ],

  MAINTENANCE: [
    "maintenance",
    "equipements",
  ],

  // Reçoit les fonds des caisses, valide les clôtures, annule les tickets.
  REGISSEUR: [
    "dossiers",
    "patients",
    "accounting",
    "reports",
  ],

  // Les patients n'ont pas de compte du personnel : ils se connectent
  // à leur propre espace, /patient, avec leur code patient et un PIN.
};


// ============================================================
// NORMALISATION DU RÔLE
// ============================================================
//
// Le backend peut renvoyer :
// ADMIN
// admin
// Admin
// etc.
//
// On normalise tout en majuscules.
//

function normalizeRole(role) {
  if (!role) return "";

  return String(role)
    .trim()
    .toUpperCase();
}


// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Modules() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const userMenuRef = useRef(null);


  // ==========================================================
  // FERMER LE MENU UTILISATEUR SI ON CLIQUE À L'EXTÉRIEUR
  // ==========================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);


  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  function handleLogout() {
    logout();

    navigate("/login", {
      replace: true,
    });
  }


  // ==========================================================
  // RÔLE DE L'UTILISATEUR CONNECTÉ
  // ==========================================================

  const userRole = useMemo(
    () =>
      normalizeRole(
        user?.role ||
        user?.role_name ||
        user?.role_code
      ),
    [user]
  );


  // L'aide-soignant ne prend que les constantes : il va droit aux Soins infirmiers.
  useEffect(() => {
    if (!user || userRole !== "AIDE_SOIGNANT") return;
    const autres = (Array.isArray(user.roles) ? user.roles : [])
      .map(normalizeRole)
      .filter((role) => role && role !== "AIDE_SOIGNANT");
    if (!autres.length) navigate("/nursing", { replace: true });
  }, [user, userRole, navigate]);


  // ==========================================================
  // MODULES AUTORISÉS
  // ==========================================================

  const authorizedModules = useMemo(() => {
    if (!user) return [];

    // Rôle principal + rôles supplémentaires
    // éventuellement attribués dans Administration.

    const roles = [
      userRole,
      ...(Array.isArray(user.roles)
        ? user.roles.map(normalizeRole)
        : []),
    ];


    // ========================================================
    // PLATEFORME : un seul module, la création des hôpitaux
    // ========================================================

    if (user.is_platform) {
      return ALL_MODULES.filter(
        (module) => module.id === "hopitaux"
      );
    }

    const hospitalModules = ALL_MODULES.filter(
      (module) => module.id !== "hopitaux"
    );


    // ========================================================
    // ADMINISTRATEUR DE L'HÔPITAL
    // ========================================================

    if (
      user.is_superuser ||
      roles.some((role) =>
        [
          "ADMIN",
          "ADMINISTRATOR",
          "ADMINISTRATEUR",
        ].includes(role)
      )
    ) {
      return hospitalModules;
    }


    // ========================================================
    // MODULES DIRECTEMENT FOURNIS PAR LE BACKEND
    // ========================================================

    if (Array.isArray(user.modules)) {
      return hospitalModules.filter((module) =>
        user.modules.includes(module.id)
      );
    }


    // ========================================================
    // MODULES DÉDUITS DES RÔLES
    // ========================================================

    const roleModules = new Set(
      roles.flatMap(
        (role) =>
          DEFAULT_ROLE_MODULES[role] || []
      )
    );


    return hospitalModules.filter((module) =>
      roleModules.has(module.id)
    );
  }, [user, userRole]);


  // ==========================================================
  // RECHERCHE
  // ==========================================================

  const filteredModules = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return authorizedModules;
    }

    return authorizedModules.filter(
      (module) =>
        module.name
          .toLowerCase()
          .includes(value) ||
        module.description
          .toLowerCase()
          .includes(value)
    );
  }, [search, authorizedModules]);


  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div className="modules-page">

      {/* ======================================================
          PAS DE SIDEBAR SUR CET ÉCRAN
          ====================================================== */}

      <div className="modules-main">

        {/* ====================================================
            BARRE SUPÉRIEURE
            ==================================================== */}

        <header className="modules-topbar">

          {/* ==================================================
              LOGO / IDENTITÉ
              ================================================== */}

          <div className="modules-brand">

            <div className="modules-brand-icon">
              <Logo size={36} />
            </div>

            <div>
              <div className="modules-brand-title">
                MA SANTÉ
              </div>

              <div className="modules-brand-subtitle">
                {user?.hospital?.name ||
                  (user?.is_platform
                    ? "Plateforme multi-hôpitaux"
                    : "Clinique & Gestion Hospitalière")}
              </div>
            </div>

          </div>


          {/* ==================================================
              UTILISATEUR
              ================================================== */}

          <div
            className="modules-user"
            ref={userMenuRef}
          >

            <button
              type="button"
              className="modules-user-trigger"
              onClick={() =>
                setMenuOpen(
                  (open) => !open
                )
              }
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >

              <div className="modules-user-information">

                <strong>
                  {user?.first_name ||
                    user?.username ||
                    "Utilisateur"}{" "}

                  {user?.last_name || ""}
                </strong>

                <small>
                  {user?.is_platform
                    ? "Plateforme"
                    : user?.role_label ||
                      user?.role ||
                      "Utilisateur"}
                </small>

              </div>


              <UserAvatar size={38} />


              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`modules-user-chevron ${
                  menuOpen ? "open" : ""
                }`}
              />

            </button>


            {/* ==================================================
                MENU UTILISATEUR
                ================================================== */}

            {menuOpen && (
              <div
                className="modules-user-menu"
                role="menu"
              >

                <button
                  type="button"
                  role="menuitem"
                  className="modules-user-menu-item"
                  onClick={handleLogout}
                >

                  <LogOut
                    size={16}
                    strokeWidth={2}
                  />

                  <span>
                    Déconnexion
                  </span>

                </button>

              </div>
            )}

          </div>

        </header>


        {/* ====================================================
            CONTENU
            ==================================================== */}

        <main className="modules-content">

          <section className="modules-panel">

            {/* ==================================================
                TITRE
                ================================================== */}

            <div className="modules-heading">

              <div className="modules-heading-icon">
                <LayoutGrid
                  size={22}
                  strokeWidth={2}
                />
              </div>

              <h1>
                Modules de l’application
              </h1>

            </div>


            {/* ==================================================
                RECHERCHE
                ================================================== */}

            <div className="modules-search-area">

              <div className="modules-search">

                <Search
                  size={23}
                  strokeWidth={2}
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Rechercher un module par son nom..."
                  aria-label="Rechercher un module"
                />


                {search && (
                  <button
                    className="clear-search"
                    onClick={() =>
                      setSearch("")
                    }
                    title="Effacer la recherche"
                    type="button"
                  >

                    <X size={22} />

                  </button>
                )}

              </div>


              <button
                className="all-modules-button"
                type="button"
                title="Modules accessibles"
              >

                <Filter size={18} />

                <span>
                  Tous les modules
                </span>

              </button>

            </div>


            {/* ==================================================
                LISTE DES MODULES
                ================================================== */}

            {filteredModules.length > 0 ? (

              <div className="modules-grid">

                {filteredModules.map(
                  (module) => {

                    return (
                      <Link
                        key={module.id}
                        to={module.path}
                        className={`module-card module-${module.color}`}
                        title={`${module.name} — ${module.description}`}
                      >

                        <ChevronRight
                          className="module-arrow"
                          size={18}
                          strokeWidth={2}
                        />


                        <div className="module-icon">

                          <IconeModule module={module.id} />

                        </div>


                        <div className="module-text">

                          <h2>
                            {module.name}
                          </h2>

                          <p>
                            {module.description}
                          </p>

                        </div>

                      </Link>
                    );
                  }
                )}

              </div>

            ) : (

              /* =================================================
                 AUCUN RÉSULTAT
                 ================================================= */

              <div className="modules-empty">

                <Search size={42} />

                <h2>
                  Aucun module trouvé
                </h2>

                <p>
                  Aucun module ne correspond
                  à votre recherche.
                </p>

                <button
                  onClick={() =>
                    setSearch("")
                  }
                  type="button"
                >
                  Afficher tous les modules
                </button>

              </div>

            )}

          </section>

        </main>

      </div>

    </div>
  );
}