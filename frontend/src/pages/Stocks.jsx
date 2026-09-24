import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import "../styles/Stocks.css";

/*
 * ============================================================
 * PRODUITS INITIAUX
 * ============================================================
 */

const produitsInitiaux = [
  {
    id: "001",
    produit: "Gants",
    categorie: "Consommable",
    stock: 25,
    seuil: 50,
  },
  {
    id: "002",
    produit: "Sérum 500ml",
    categorie: "Consommable",
    stock: 120,
    seuil: 50,
  },
  {
    id: "003",
    produit: "Réactif NFS",
    categorie: "Laboratoire",
    stock: 15,
    seuil: 30,
  },
  {
    id: "004",
    produit: "Masques",
    categorie: "Consommable",
    stock: 200,
    seuil: 100,
  },
];

/*
 * ============================================================
 * MOUVEMENTS INITIAUX
 * ============================================================
 */

const mouvementsInitiaux = [
  {
    id: 1,
    reference: "ENT-001",
    date: "22/09/2026",
    heure: "08:45",
    produitId: "001",
    produit: "Gants",
    type: "Entrée",
    quantite: 100,
    motif: "Réapprovisionnement",
    utilisateur: "N'GUESSAN Paul",
    stockApres: 125,
    fournisseur: "Pharmacie Centrale de Côte d'Ivoire",
    referenceDocument: "BL-2026-001",
    service: "",
    patient: "",
    observation: "",
  },
  {
    id: 2,
    reference: "SOR-001",
    date: "22/09/2026",
    heure: "09:12",
    produitId: "001",
    produit: "Gants",
    type: "Sortie",
    quantite: 20,
    motif: "Consultation",
    utilisateur: "N'GUESSAN Paul",
    stockApres: 105,
    fournisseur: "",
    referenceDocument: "",
    service: "Consultation",
    patient: "",
    observation: "",
  },
  {
    id: 3,
    reference: "ENT-002",
    date: "22/09/2026",
    heure: "09:30",
    produitId: "002",
    produit: "Sérum 500ml",
    type: "Entrée",
    quantite: 50,
    motif: "Livraison",
    utilisateur: "N'GUESSAN Paul",
    stockApres: 170,
    fournisseur: "MedEquip CI",
    referenceDocument: "BL-2026-002",
    service: "",
    patient: "",
    observation: "",
  },
  {
    id: 4,
    reference: "SOR-002",
    date: "21/09/2026",
    heure: "14:20",
    produitId: "004",
    produit: "Masques",
    type: "Sortie",
    quantite: 15,
    motif: "Soins infirmiers",
    utilisateur: "N'GUESSAN Paul",
    stockApres: 200,
    fournisseur: "",
    referenceDocument: "",
    service: "Soins infirmiers",
    patient: "",
    observation: "",
  },
  {
    id: 5,
    reference: "ENT-003",
    date: "20/09/2026",
    heure: "10:05",
    produitId: "003",
    produit: "Réactif NFS",
    type: "Entrée",
    quantite: 30,
    motif: "Livraison",
    utilisateur: "N'GUESSAN Paul",
    stockApres: 45,
    fournisseur: "LabSupply Côte d'Ivoire",
    referenceDocument: "BL-2026-003",
    service: "",
    patient: "",
    observation: "",
  },
];

/*
 * ============================================================
 * FOURNISSEURS INITIAUX
 * ============================================================
 */

const fournisseursInitiaux = [
  {
    id: "FOU-001",
    fournisseur: "Pharmacie Centrale de Côte d'Ivoire",
    contact: "M. Kouassi Jean",
    telephone: "07 08 09 10 11",
    produits: 45,
    derniereCommande: "20/09/2026",
    statut: "Actif",
  },
  {
    id: "FOU-002",
    fournisseur: "MedEquip CI",
    contact: "Mme Aya N'Guessan",
    telephone: "05 22 34 56 78",
    produits: 18,
    derniereCommande: "15/09/2026",
    statut: "Actif",
  },
  {
    id: "FOU-003",
    fournisseur: "LabSupply Côte d'Ivoire",
    contact: "M. Yao Marc",
    telephone: "01 72 45 89 20",
    produits: 23,
    derniereCommande: "02/09/2026",
    statut: "Inactif",
  },
];

/*
 * ============================================================
 * COMPOSANT PRINCIPAL
 * ============================================================
 */

export default function Stocks() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  /*
   * ==========================================================
   * NAVIGATION
   * ==========================================================
   */

  const [menuActif, setMenuActif] = useState("Produits");

  /*
   * ==========================================================
   * PRODUITS
   * ==========================================================
   */

  const [produits, setProduits] = useState(produitsInitiaux);
  const [recherche, setRecherche] = useState("");

  /*
   * ==========================================================
   * FORMULAIRE NOUVEAU PRODUIT
   * ==========================================================
   */

  const [formulaireOuvert, setFormulaireOuvert] =
    useState(false);

  const [nouveauProduit, setNouveauProduit] = useState({
    produit: "",
    categorie: "",
    stock: "",
    seuil: "",
  });

  /*
   * ==========================================================
   * MOUVEMENTS
   * ==========================================================
   */

  const [mouvements, setMouvements] = useState(
    mouvementsInitiaux
  );

  const [rechercheMouvement, setRechercheMouvement] =
    useState("");

  const [filtreTypeMouvement, setFiltreTypeMouvement] =
    useState("Tous");

  /*
   * ==========================================================
   * FORMULAIRE ENTRÉE / SORTIE
   * ==========================================================
   */

  const [
    mouvementFormulaireOuvert,
    setMouvementFormulaireOuvert,
  ] = useState(false);

  const [typeMouvement, setTypeMouvement] =
    useState("Entrée");

  const [nouveauMouvement, setNouveauMouvement] =
    useState({
      produitId: "",
      quantite: "",
      fournisseur: "",
      referenceDocument: "",
      service: "",
      patient: "",
      motif: "",
      date: new Date().toISOString().split("T")[0],
      observation: "",
    });

  /*
   * ==========================================================
   * FOURNISSEURS
   * ==========================================================
   */

  const [fournisseurs, setFournisseurs] = useState(
    fournisseursInitiaux
  );

  const [rechercheFournisseur, setRechercheFournisseur] =
    useState("");

  const [
    fournisseurFormulaireOuvert,
    setFournisseurFormulaireOuvert,
  ] = useState(false);

  const [nouveauFournisseur, setNouveauFournisseur] =
    useState({
      fournisseur: "",
      contact: "",
      telephone: "",
      produits: "",
      derniereCommande: "",
      statut: "Actif",
    });

  /*
   * ==========================================================
   * FOURNISSEUR SÉLECTIONNÉ
   * ==========================================================
   */

  const [fournisseurSelectionne, setFournisseurSelectionne] =
    useState(null);

  /*
   * ==========================================================
   * RAPPORTS
   * ==========================================================
   */

  const [filtreRapport, setFiltreRapport] =
    useState("Tous");

  /*
   * ==========================================================
   * DÉCONNEXION
   * ==========================================================
   */

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  /*
   * ==========================================================
   * RECHERCHE PRODUITS
   * ==========================================================
   */

  const produitsFiltres = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return produits;
    }

    return produits.filter(
      (produit) =>
        produit.produit.toLowerCase().includes(texte) ||
        produit.categorie.toLowerCase().includes(texte) ||
        produit.id.toLowerCase().includes(texte)
    );
  }, [recherche, produits]);

  /*
   * ==========================================================
   * STATISTIQUES PRODUITS
   * ==========================================================
   */

  const nombreProduits = produits.length;

  const produitsCritiques = produits.filter(
    (produit) => produit.stock <= produit.seuil
  ).length;

  const stockTotal = produits.reduce(
    (total, produit) => total + produit.stock,
    0
  );

  /*
   * ==========================================================
   * NOUVEAU PRODUIT
   * ==========================================================
   */

  const handleNouveauProduit = () => {
    setNouveauProduit({
      produit: "",
      categorie: "",
      stock: "",
      seuil: "",
    });

    setFormulaireOuvert(true);
  };

  /*
   * ==========================================================
   * FERMER FORMULAIRE PRODUIT
   * ==========================================================
   */

  const fermerFormulaire = () => {
    setFormulaireOuvert(false);

    setNouveauProduit({
      produit: "",
      categorie: "",
      stock: "",
      seuil: "",
    });
  };

  /*
   * ==========================================================
   * MODIFICATION FORMULAIRE PRODUIT
   * ==========================================================
   */

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setNouveauProduit((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  /*
   * ==========================================================
   * AJOUT PRODUIT
   * ==========================================================
   */

  const handleAjouterProduit = (event) => {
    event.preventDefault();

    const nomProduit = nouveauProduit.produit.trim();
    const categorie = nouveauProduit.categorie.trim();
    const stock = Number(nouveauProduit.stock);
    const seuil = Number(nouveauProduit.seuil);

    if (
      !nomProduit ||
      !categorie ||
      nouveauProduit.stock === "" ||
      nouveauProduit.seuil === ""
    ) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    if (stock < 0 || seuil < 0) {
      alert(
        "Le stock et le seuil doivent être positifs."
      );
      return;
    }

    const prochainNumero =
      produits.length > 0
        ? Math.max(
            ...produits.map((p) => Number(p.id))
          ) + 1
        : 1;

    const nouvelId =
      String(prochainNumero).padStart(3, "0");

    const produitAjoute = {
      id: nouvelId,
      produit: nomProduit,
      categorie,
      stock,
      seuil,
    };

    setProduits((anciensProduits) => [
      ...anciensProduits,
      produitAjoute,
    ]);

    fermerFormulaire();
  };

  /*
   * ==========================================================
   * OUVRIR FORMULAIRE MOUVEMENT
   * ==========================================================
   */

  const ouvrirFormulaireMouvement = (type) => {
    setTypeMouvement(type);

    setNouveauMouvement({
      produitId: "",
      quantite: "",
      fournisseur: "",
      referenceDocument: "",
      service: "",
      patient: "",
      motif: "",
      date: new Date().toISOString().split("T")[0],
      observation: "",
    });

    setMouvementFormulaireOuvert(true);
  };

  /*
   * ==========================================================
   * FERMER FORMULAIRE MOUVEMENT
   * ==========================================================
   */

  const fermerFormulaireMouvement = () => {
    setMouvementFormulaireOuvert(false);

    setNouveauMouvement({
      produitId: "",
      quantite: "",
      fournisseur: "",
      referenceDocument: "",
      service: "",
      patient: "",
      motif: "",
      date: new Date().toISOString().split("T")[0],
      observation: "",
    });
  };

  /*
   * ==========================================================
   * MODIFICATION FORMULAIRE MOUVEMENT
   * ==========================================================
   */

  const handleMouvementChange = (event) => {
    const { name, value } = event.target;

    setNouveauMouvement((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  /*
   * ==========================================================
   * AJOUT MOUVEMENT
   * ==========================================================
   */

  const handleAjouterMouvement = (event) => {
    event.preventDefault();

    const produit = produits.find(
      (item) =>
        item.id === nouveauMouvement.produitId
    );

    const quantite = Number(
      nouveauMouvement.quantite
    );

    if (!produit) {
      alert("Veuillez sélectionner un produit.");
      return;
    }

    if (
      !nouveauMouvement.quantite ||
      quantite <= 0
    ) {
      alert(
        "Veuillez saisir une quantité valide."
      );
      return;
    }

    if (!nouveauMouvement.motif) {
      alert("Veuillez sélectionner un motif.");
      return;
    }

    if (
      typeMouvement === "Sortie" &&
      quantite > produit.stock
    ) {
      alert(
        `Stock insuffisant.\n\nStock disponible : ${produit.stock}`
      );
      return;
    }

    const nouveauStock =
      typeMouvement === "Entrée"
        ? produit.stock + quantite
        : produit.stock - quantite;

    const dateObjet = new Date(
      nouveauMouvement.date
    );

    const dateFormatee =
      dateObjet.toLocaleDateString("fr-FR");

    const heure =
      new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

    const prefix =
      typeMouvement === "Entrée"
        ? "ENT"
        : "SOR";

    const mouvementsDuType =
      mouvements.filter(
        (item) => item.type === typeMouvement
      ).length + 1;

    const reference =
      `${prefix}-${String(
        mouvementsDuType
      ).padStart(3, "0")}`;

    const mouvementAjoute = {
      id: Date.now(),
      reference,
      date: dateFormatee,
      heure,
      produitId: produit.id,
      produit: produit.produit,
      type: typeMouvement,
      quantite,
      motif: nouveauMouvement.motif,
      utilisateur: "N'GUESSAN Paul",
      stockApres: nouveauStock,
      fournisseur:
        nouveauMouvement.fournisseur,
      referenceDocument:
        nouveauMouvement.referenceDocument,
      service: nouveauMouvement.service,
      patient: nouveauMouvement.patient,
      observation: nouveauMouvement.observation,
    };

    setMouvements((anciens) => [
      mouvementAjoute,
      ...anciens,
    ]);

    setProduits((anciens) =>
      anciens.map((item) =>
        item.id === produit.id
          ? {
              ...item,
              stock: nouveauStock,
            }
          : item
      )
    );

    fermerFormulaireMouvement();
  };

  /*
   * ==========================================================
   * RECHERCHE MOUVEMENTS
   * ==========================================================
   */

  const mouvementsFiltres = useMemo(() => {
    const texte =
      rechercheMouvement.toLowerCase().trim();

    return mouvements.filter((mouvement) => {
      const correspondRecherche =
        !texte ||
        mouvement.produit
          .toLowerCase()
          .includes(texte) ||
        mouvement.reference
          .toLowerCase()
          .includes(texte) ||
        mouvement.motif
          .toLowerCase()
          .includes(texte) ||
        mouvement.utilisateur
          .toLowerCase()
          .includes(texte);

      const correspondType =
        filtreTypeMouvement === "Tous" ||
        mouvement.type === filtreTypeMouvement;

      return (
        correspondRecherche &&
        correspondType
      );
    });
  }, [
    mouvements,
    rechercheMouvement,
    filtreTypeMouvement,
  ]);

  /*
   * ==========================================================
   * STATISTIQUES MOUVEMENTS
   * ==========================================================
   */

  const dateAujourdHui =
    new Date().toLocaleDateString("fr-FR");

  const entreesAujourdHui =
    mouvements
      .filter(
        (mouvement) =>
          mouvement.type === "Entrée" &&
          mouvement.date === dateAujourdHui
      )
      .reduce(
        (total, mouvement) =>
          total + mouvement.quantite,
        0
      );

  const sortiesAujourdHui =
    mouvements
      .filter(
        (mouvement) =>
          mouvement.type === "Sortie" &&
          mouvement.date === dateAujourdHui
      )
      .reduce(
        (total, mouvement) =>
          total + mouvement.quantite,
        0
      );

  const totalEntrees = mouvements
    .filter(
      (mouvement) =>
        mouvement.type === "Entrée"
    )
    .reduce(
      (total, mouvement) =>
        total + mouvement.quantite,
      0
    );

  const totalSorties = mouvements
    .filter(
      (mouvement) =>
        mouvement.type === "Sortie"
    )
    .reduce(
      (total, mouvement) =>
        total + mouvement.quantite,
      0
    );

  /*
   * ==========================================================
   * FOURNISSEURS - RECHERCHE
   * ==========================================================
   */

  const fournisseursFiltres = useMemo(() => {
    const texte =
      rechercheFournisseur
        .toLowerCase()
        .trim();

    if (!texte) {
      return fournisseurs;
    }

    return fournisseurs.filter(
      (fournisseur) =>
        fournisseur.id
          .toLowerCase()
          .includes(texte) ||
        fournisseur.fournisseur
          .toLowerCase()
          .includes(texte) ||
        fournisseur.contact
          .toLowerCase()
          .includes(texte) ||
        fournisseur.telephone
          .toLowerCase()
          .includes(texte) ||
        fournisseur.statut
          .toLowerCase()
          .includes(texte)
    );
  }, [
    fournisseurs,
    rechercheFournisseur,
  ]);

  /*
   * ==========================================================
   * OUVRIR FORMULAIRE FOURNISSEUR
   * ==========================================================
   */

  const ouvrirFormulaireFournisseur = () => {
    setNouveauFournisseur({
      fournisseur: "",
      contact: "",
      telephone: "",
      produits: "",
      derniereCommande: "",
      statut: "Actif",
    });

    setFournisseurFormulaireOuvert(true);
  };

  /*
   * ==========================================================
   * FERMER FORMULAIRE FOURNISSEUR
   * ==========================================================
   */

  const fermerFormulaireFournisseur = () => {
    setFournisseurFormulaireOuvert(false);

    setNouveauFournisseur({
      fournisseur: "",
      contact: "",
      telephone: "",
      produits: "",
      derniereCommande: "",
      statut: "Actif",
    });
  };

  /*
   * ==========================================================
   * MODIFICATION FOURNISSEUR
   * ==========================================================
   */

  const handleFournisseurChange = (event) => {
    const { name, value } = event.target;

    setNouveauFournisseur((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  /*
   * ==========================================================
   * AJOUT FOURNISSEUR
   * ==========================================================
   */

  const handleAjouterFournisseur = (event) => {
    event.preventDefault();

    const nom =
      nouveauFournisseur.fournisseur.trim();

    const contact =
      nouveauFournisseur.contact.trim();

    const telephone =
      nouveauFournisseur.telephone.trim();

    const nombreProduits =
      Number(nouveauFournisseur.produits);

    if (!nom || !contact || !telephone) {
      alert(
        "Veuillez remplir les champs obligatoires."
      );
      return;
    }

    if (
      nouveauFournisseur.produits !== "" &&
      nombreProduits < 0
    ) {
      alert(
        "Le nombre de produits ne peut pas être négatif."
      );
      return;
    }

    const prochainNumero =
      fournisseurs.length > 0
        ? Math.max(
            ...fournisseurs.map(
              (fournisseur) =>
                Number(
                  fournisseur.id.replace(
                    "FOU-",
                    ""
                  )
                )
            )
          ) + 1
        : 1;

    const nouvelId =
      `FOU-${String(
        prochainNumero
      ).padStart(3, "0")}`;

    const fournisseurAjoute = {
      id: nouvelId,
      fournisseur: nom,
      contact,
      telephone,
      produits:
        nouveauFournisseur.produits === ""
          ? 0
          : nombreProduits,
      derniereCommande:
        nouveauFournisseur.derniereCommande ||
        "Aucune",
      statut:
        nouveauFournisseur.statut,
    };

    setFournisseurs((anciens) => [
      ...anciens,
      fournisseurAjoute,
    ]);

    fermerFormulaireFournisseur();
  };

  /*
   * ==========================================================
   * SUPPRIMER FOURNISSEUR
   * ==========================================================
   */

  const handleSupprimerFournisseur = (
    fournisseur
  ) => {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer le fournisseur "${fournisseur.fournisseur}" ?`
    );

    if (!confirmation) {
      return;
    }
    setFournisseurs((anciens) =>
      anciens.filter(
        (item) =>
          item.id !== fournisseur.id
      )
    );

    if (
      fournisseurSelectionne?.id ===
      fournisseur.id
    ) {
      setFournisseurSelectionne(null);
    }
  };

  /*
   * ==========================================================
   * AFFICHER DÉTAILS FOURNISSEUR
   * ==========================================================
   */

  const handleVoirFournisseur = (
    fournisseur
  ) => {
    setFournisseurSelectionne(
      fournisseur
    );
  };

  /*
   * ==========================================================
   * FILTRE RAPPORT
   * ==========================================================
   */

  const mouvementsRapport = useMemo(() => {
    if (filtreRapport === "Tous") {
      return mouvements;
    }
    return mouvements.filter(
      (mouvement) =>
        mouvement.type === filtreRapport
    );
  }, [mouvements, filtreRapport]);

  /*
   * ==========================================================
   * RAPPORT - PRODUITS CRITIQUES
   * ==========================================================
   */

  const produitsEnAlerte = useMemo(() => {
    return produits.filter(
      (produit) =>
        produit.stock <= produit.seuil
    );
  }, [produits]);

  /*
   * ==========================================================
   * RAPPORT - IMPRESSION
   * ==========================================================
   */

  const imprimerRapport = () => {
    window.print();
  };

  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <div className="stocks-page">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="stocks-sidebar">
        <div className="stocks-logo">
          <div className="stocks-logo-icon">
            <Logo
              size={26}
              inverted
            />
          </div>
          <div className="stocks-logo-text">
            <strong>
              MASANTE
            </strong>
            <span>
              Gestion de clinique
            </span>
          </div>
        </div>

        <nav className="stocks-navigation">

          {/* ACCUEIL */}

          <button
            type="button"
            className="stocks-nav-item"
               onClick={() => navigate("/modules")}
          >
            
            <span className="stocks-nav-icon">
              ⌂
              </span>
         <span>
            Accueil
         </span>
         </button>

          {/* PRODUITS */}

          <button
            type="button"
            className={`stocks-nav-item ${
              menuActif === "Produits"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setMenuActif("Produits")
            }
          >
            <span className="stocks-nav-icon">
              ▣
            </span>
            <span>
              Produits
            </span>
          </button>

          {/* ENTRÉES / SORTIES */}

          <button
            type="button"
            className={`stocks-nav-item ${
              menuActif === "Entrées / Sorties"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setMenuActif(
                "Entrées / Sorties"
              )
            }
          >
            <span className="stocks-nav-icon">
              ⇄
            </span>
            <span>
              Entrées / Sorties
            </span>
          </button>

          {/* SEUILS */}

          <button
            type="button"
            className={`stocks-nav-item ${
              menuActif ===
              "Seuils d'alerte"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setMenuActif(
                "Seuils d'alerte"
              )
            }
          >
            <span className="stocks-nav-icon">
              ⚠
            </span>
            <span>
              Seuils d'alerte
            </span>
          </button>

          {/* FOURNISSEURS */}
          <button
            type="button"
            className={`stocks-nav-item ${
              menuActif === "Fournisseurs"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setMenuActif(
                "Fournisseurs"
              )
            }
          >
            <span className="stocks-nav-icon">
              ♙
            </span>

            <span>
              Fournisseurs
            </span>
          </button>

          {/* RAPPORTS */}

          <button
            type="button"
            className={`stocks-nav-item ${
              menuActif === "Rapports"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setMenuActif("Rapports")
            }
          >
            <span className="stocks-nav-icon">
              ▤
            </span>
            <span>
              Rapports
            </span>
          </button>
        </nav>

        {/* RETOUR */}

        <Link
          to="/modules"
          className="stocks-nav-item"
        >
          <span className="stocks-nav-icon">
            ⌘
          </span>
          <span>
            Retour aux modules
          </span>
        </Link>
        {/* DÉCONNEXION */}

        <button
          type="button"
          className="stocks-nav-item"
          onClick={handleLogout}
        >
          <span className="stocks-nav-icon">
            ⏻
          </span>
          <span>
            Déconnexion
          </span>
        </button>

        <div className="stocks-sidebar-footer">
          Ma Santé Clinique
          <span>
            v1.0
          </span>
        </div>

      </aside>

      {/* ======================================================
          CONTENU PRINCIPAL
      ====================================================== */}

      <main className="stocks-main">

        {/* HEADER */}

        <header className="stocks-header">

          <div className="stocks-header-title">

            <h1>
              Espace Responsable des Stocks
            </h1>

            <p>
              Gestion des produits et des
              mouvements de stock
            </p>

          </div>

          <div className="stocks-user">

            <div className="stocks-user-avatar">
              👨🏾‍💼
            </div>

            <div className="stocks-user-info">

              <strong>
                N'GUESSAN Paul
              </strong>

              <span>
                Responsable Stocks
              </span>

            </div>

          </div>

        </header>

        {/* ====================================================
            PRODUITS
        ==================================================== */}

        {menuActif === "Produits" && (

          <section className="stocks-content">

            <div className="stocks-statistics">

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  📦
                </div>

                <div>
                  <span>
                    Produits
                  </span>

                  <strong>
                    {nombreProduits}
                  </strong>
                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  📊
                </div>

                <div>
                  <span>
                    Stock total
                  </span>

                  <strong>
                    {stockTotal}
                  </strong>
                </div>

              </div>

              <div className="stocks-stat-card stocks-stat-danger">

                <div className="stocks-stat-icon">
                  ⚠
                </div>

                <div>
                  <span>
                    Alertes
                  </span>

                  <strong>
                    {produitsCritiques}
                  </strong>
                </div>

              </div>

            </div>

            <div className="stocks-section-header">

              <div>

                <h2>
                  Liste des produits
                </h2>

                <p>
                  Consultez et gérez les produits
                  disponibles en stock.
                </p>

              </div>

              <div className="stocks-actions">

                <div className="stocks-search">

                  <span>
                    ⌕
                  </span>

                  <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={recherche}
                    onChange={(event) =>
                      setRecherche(
                        event.target.value
                      )
                    }
                  />

                </div>

                <button
                  type="button"
                  className="stocks-new-button"
                  onClick={
                    handleNouveauProduit
                  }
                >
                  <span>
                    +
                  </span>

                  Nouveau produit
                </button>

              </div>

            </div>

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>#</th>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Stock</th>
                    <th>Seuil</th>
                    <th>Statut</th>
                  </tr>

                </thead>

                <tbody>

                  {produitsFiltres.length > 0 ? (

                    produitsFiltres.map(
                      (produit) => {

                        const critique =
                          produit.stock <=
                          produit.seuil;

                        return (

                          <tr
                            key={produit.id}
                          >

                            <td className="stocks-id">
                              {produit.id}
                            </td>

                            <td className="stocks-product-name">
                              {produit.produit}
                            </td>

                            <td>
                              <span className="stocks-category">
                                {produit.categorie}
                              </span>
                            </td>

                            <td
                              className={
                                critique
                                  ? "stocks-quantity critical"
                                  : "stocks-quantity"
                              }
                            >
                              {produit.stock}
                            </td>

                            <td className="stocks-threshold">
                              {produit.seuil}
                            </td>

                            <td>

                              {critique ? (

                                <span className="stocks-status critical">
                                  Critique
                                </span>

                              ) : (

                                <span className="stocks-status ok">
                                  OK
                                </span>

                              )}

                            </td>

                          </tr>

                        );
                      }
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="6"
                        className="stocks-empty"
                      >
                        Aucun produit trouvé.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

            <div className="stocks-table-footer">

              <span>
                {produitsFiltres.length} produit(s)
                affiché(s)
              </span>

              <span>
                Dernière mise à jour :
                aujourd'hui
              </span>

            </div>

          </section>

        )}

        {/* ====================================================
            ENTRÉES / SORTIES
        ==================================================== */}

        {menuActif ===
          "Entrées / Sorties" && (

          <section className="stocks-content">

            <div className="stocks-statistics">

              <div className="stocks-stat-card">

                <div
                  className="stocks-stat-icon"
                  style={{
                    color: "#15803d",
                    background: "#dcfce7",
                  }}
                >
                  ↓
                </div>

                <div>
                  <span>
                    Entrées aujourd'hui
                  </span>

                  <strong>
                    +{entreesAujourdHui}
                  </strong>
                </div>

              </div>

              <div className="stocks-stat-card">

                <div
                  className="stocks-stat-icon"
                  style={{
                    color: "#dc2626",
                    background: "#fee2e2",
                  }}
                >
                  ↑
                </div>

                <div>
                  <span>
                    Sorties aujourd'hui
                  </span>

                  <strong>
                    -{sortiesAujourdHui}
                  </strong>
                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  ⇄
                </div>

                <div>
                  <span>
                    Mouvements
                  </span>

                  <strong>
                    {mouvements.length}
                  </strong>
                </div>

              </div>

            </div>

            <div className="stocks-section-header">

              <div>

                <h2>
                  Entrées / Sorties
                </h2>

                <p>
                  Suivez les mouvements et la
                  traçabilité des stocks.
                </p>

              </div>

              <div className="stocks-actions">

                <button
                  type="button"
                  className="stocks-new-button"
                  onClick={() =>
                    ouvrirFormulaireMouvement(
                      "Entrée"
                    )
                  }
                >
                  <span>
                    +
                  </span>

                  Nouvelle entrée
                </button>

                <button
                  type="button"
                  className="stocks-new-button"
                  style={{
                    background: "#dc2626",
                  }}
                  onClick={() =>
                    ouvrirFormulaireMouvement(
                      "Sortie"
                    )
                  }
                >
                  <span>
                    −
                  </span>

                  Nouvelle sortie
                </button>

              </div>

            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                marginBottom: "20px",
                flexWrap: "wrap",
              }}
            >

              <div className="stocks-search">

                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Rechercher un mouvement..."
                  value={
                    rechercheMouvement
                  }
                  onChange={(event) =>
                    setRechercheMouvement(
                      event.target.value
                    )
                  }
                />

              </div>

              <select
                value={filtreTypeMouvement}
                onChange={(event) =>
                  setFiltreTypeMouvement(
                    event.target.value
                  )
                }
                style={{
                  height: "44px",
                  border:
                    "1px solid #dbe2ea",
                  borderRadius: "8px",
                  padding: "0 14px",
                  background: "#ffffff",
                  color: "#1e293b",
                  fontSize: "13px",
                  outline: "none",
                }}
              >

                <option value="Tous">
                  Tous les mouvements
                </option>

                <option value="Entrée">
                  Entrées
                </option>

                <option value="Sortie">
                  Sorties
                </option>

              </select>

            </div>

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Référence</th>
                    <th>Produit</th>
                    <th>Type</th>
                    <th>Quantité</th>
                    <th>Motif</th>
                    <th>Utilisateur</th>
                    <th>Stock après</th>
                  </tr>

                </thead>

                <tbody>

                  {mouvementsFiltres.length > 0 ? (

                    mouvementsFiltres.map(
                      (mouvement) => (

                        <tr
                          key={mouvement.id}
                        >

                          <td>

                            <div
                              style={{
                                display: "flex",
                                flexDirection:
                                  "column",
                                gap: "3px",
                              }}
                            >

                              <strong
                                style={{
                                  color:
                                    "#334155",
                                }}
                              >
                                {mouvement.date}
                              </strong>

                              <span
                                style={{
                                  color:
                                    "#94a3b8",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {mouvement.heure}
                              </span>

                            </div>

                          </td>

                          <td>

                            <span
                              style={{
                                background:
                                  "#f1f5f9",
                                color:
                                  "#475569",
                                padding:
                                  "5px 8px",
                                borderRadius:
                                  "5px",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "700",
                              }}
                            >
                              {mouvement.reference}
                            </span>

                          </td>

                          <td className="stocks-product-name">
                            {mouvement.produit}
                          </td>

                          <td>

                            {mouvement.type ===
                            "Entrée" ? (

                              <span
                                style={{
                                  background:
                                    "#dcfce7",
                                  color:
                                    "#15803d",
                                  padding:
                                    "6px 10px",
                                  borderRadius:
                                    "20px",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                ↓ Entrée
                              </span>

                            ) : (

                              <span
                                style={{
                                  background:
                                    "#fee2e2",
                                  color:
                                    "#dc2626",
                                  padding:
                                    "6px 10px",
                                  borderRadius:
                                    "20px",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                ↑ Sortie
                              </span>

                            )}

                          </td>

                          <td>

                            <strong
                              style={{
                                color:
                                  mouvement.type ===
                                  "Entrée"
                                    ? "#15803d"
                                    : "#dc2626",
                                fontSize:
                                  "14px",
                              }}
                            >
                              {mouvement.type ===
                              "Entrée"
                                ? "+"
                                : "-"}
                              {mouvement.quantite}
                            </strong>

                          </td>

                          <td>
                            {mouvement.motif}
                          </td>

                          <td>

                            <span
                              style={{
                                color:
                                  "#475569",
                                fontSize:
                                  "11px",
                              }}
                            >
                              {mouvement.utilisateur}
                            </span>

                          </td>

                          <td>

                            <strong>
                              {mouvement.stockApres}
                            </strong>

                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="8"
                        className="stocks-empty"
                      >
                        Aucun mouvement trouvé.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

            <div className="stocks-table-footer">

              <span>
                {mouvementsFiltres.length}
                mouvement(s) affiché(s)
              </span>

              <span>
                Historique des mouvements
              </span>

            </div>

          </section>

        )}

        {/* ====================================================
            ACCUEIL
        ==================================================== */}

        {menuActif === "Accueil" && (

          <section className="stocks-content">

            <div className="stocks-section-header">

              <div>

                <h2>
                  Accueil
                </h2>

                <p>
                  Bienvenue dans la gestion des
                  stocks de Ma Santé.
                </p>

              </div>

            </div>

          </section>

        )}

        {/* ====================================================
            SEUILS D'ALERTE
        ==================================================== */}

        {menuActif ===
          "Seuils d'alerte" && (

          <section className="stocks-content">

            <div className="stocks-section-header">

              <div>

                <h2>
                  Seuils d'alerte
                </h2>

                <p>
                  Consultez les produits dont le
                  stock atteint le seuil d'alerte.
                </p>

              </div>

            </div>

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>#</th>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Stock actuel</th>
                    <th>Seuil</th>
                    <th>État</th>
                  </tr>

                </thead>

                <tbody>

                  {produits
                    .filter(
                      (produit) =>
                        produit.stock <=
                        produit.seuil
                    )
                    .map(
                      (produit) => (

                        <tr
                          key={produit.id}
                        >

                          <td>
                            {produit.id}
                          </td>

                          <td className="stocks-product-name">
                            {produit.produit}
                          </td>

                          <td>
                            {produit.categorie}
                          </td>

                          <td className="stocks-quantity critical">
                            {produit.stock}
                          </td>

                          <td>
                            {produit.seuil}
                          </td>

                          <td>

                            <span className="stocks-status critical">
                              Critique
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  {produits.filter(
                    (produit) =>
                      produit.stock <=
                      produit.seuil
                  ).length === 0 && (

                    <tr>

                      <td
                        colSpan="6"
                        className="stocks-empty"
                      >
                        Aucun produit en alerte.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>

        )}

        {/* ====================================================
            FOURNISSEURS
        ==================================================== */}

        {menuActif === "Fournisseurs" && (

          <section className="stocks-content">

            {/* STATISTIQUES */}

            <div className="stocks-statistics">

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  🏢
                </div>

                <div>

                  <span>
                    Fournisseurs
                  </span>

                  <strong>
                    {fournisseurs.length}
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  ✓
                </div>

                <div>

                  <span>
                    Fournisseurs actifs
                  </span>

                  <strong>
                    {
                      fournisseurs.filter(
                        (fournisseur) =>
                          fournisseur.statut ===
                          "Actif"
                      ).length
                    }
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  📦
                </div>

                <div>

                  <span>
                    Produits fournis
                  </span>

                  <strong>
                    {fournisseurs.reduce(
                      (
                        total,
                        fournisseur
                      ) =>
                        total +
                        Number(
                          fournisseur.produits
                        ),
                      0
                    )}
                  </strong>

                </div>

              </div>

            </div>

            {/* ENTÊTE */}

            <div className="stocks-section-header">

              <div>

                <h2>
                  Liste des fournisseurs
                </h2>

                <p>
                  Consultez et gérez les
                  fournisseurs de la clinique.
                </p>

              </div>

              <div className="stocks-actions">

                <div className="stocks-search">

                  <span>
                    ⌕
                  </span>

                  <input
                    type="text"
                    placeholder="Rechercher un fournisseur..."
                    value={
                      rechercheFournisseur
                    }
                    onChange={(event) =>
                      setRechercheFournisseur(
                        event.target.value
                      )
                    }
                  />

                </div>

                <button
                  type="button"
                  className="stocks-new-button"
                  onClick={
                    ouvrirFormulaireFournisseur
                  }
                >
                  <span>
                    +
                  </span>

                  Nouveau fournisseur
                </button>

              </div>

            </div>

            {/* TABLEAU */}

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>Code</th>
                    <th>Fournisseur</th>
                    <th>Contact</th>
                    <th>Téléphone</th>
                    <th>Produits</th>
                    <th>Dernière commande</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>

                </thead>

                <tbody>

                  {fournisseursFiltres.length > 0 ? (

                    fournisseursFiltres.map(
                      (fournisseur) => (

                        <tr
                          key={
                            fournisseur.id
                          }
                        >

                          <td>

                            <span
                              style={{
                                background:
                                  "#f1f5f9",
                                color:
                                  "#475569",
                                padding:
                                  "6px 9px",
                                borderRadius:
                                  "6px",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "800",
                              }}
                            >
                              {fournisseur.id}
                            </span>

                          </td>

                          <td>

                            <strong
                              style={{
                                color:
                                  "#0f172a",
                                fontSize:
                                  "13px",
                              }}
                            >
                              {
                                fournisseur.fournisseur
                              }
                            </strong>

                          </td>

                          <td>
                            {fournisseur.contact}
                          </td>

                          <td>
                            {fournisseur.telephone}
                          </td>

                          <td>

                            <strong>
                              {
                                fournisseur.produits
                              }
                            </strong>

                          </td>

                          <td>
                            {
                              fournisseur.derniereCommande
                            }
                          </td>

                          <td>

                            {fournisseur.statut ===
                            "Actif" ? (

                              <span className="stocks-status ok">
                                Actif
                              </span>

                            ) : (

                              <span
                                className="stocks-status critical"
                                style={{
                                  background:
                                    "#f1f5f9",
                                  color:
                                    "#64748b",
                                }}
                              >
                                Inactif
                              </span>

                            )}

                          </td>

                          <td>

                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "8px",
                                flexWrap:
                                  "wrap",
                              }}
                            >

                              <button
                                type="button"
                                onClick={() =>
                                  handleVoirFournisseur(
                                    fournisseur
                                  )
                                }
                                style={{
                                  border:
                                    "1px solid #dbe2ea",
                                  background:
                                    "#ffffff",
                                  color:
                                    "#0f766e",
                                  borderRadius:
                                    "7px",
                                  padding:
                                    "7px 11px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Voir
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleSupprimerFournisseur(
                                    fournisseur
                                  )
                                }
                                style={{
                                  border:
                                    "1px solid #fecaca",
                                  background:
                                    "#fff1f2",
                                  color:
                                    "#dc2626",
                                  borderRadius:
                                    "7px",
                                  padding:
                                    "7px 11px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Supprimer
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="8"
                        className="stocks-empty"
                      >
                        Aucun fournisseur trouvé.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

            <div className="stocks-table-footer">

              <span>
                {fournisseursFiltres.length}
                fournisseur(s) affiché(s)
              </span>

              <span>
                Gestion locale des fournisseurs
              </span>

            </div>

          </section>

        )}

        {/* ====================================================
            RAPPORTS
        ==================================================== */}

        {menuActif === "Rapports" && (

          <section className="stocks-content">

            {/* ==================================================
                ENTÊTE
            ================================================== */}

            <div className="stocks-section-header">

              <div>

                <h2>
                  Rapports et statistiques
                </h2>

                <p>
                  Analyse complète de l'activité
                  et de l'état actuel des stocks.
                </p>

              </div>

              <div className="stocks-actions">

                <select
                  value={filtreRapport}
                  onChange={(event) =>
                    setFiltreRapport(
                      event.target.value
                    )
                  }
                  style={{
                    height: "44px",
                    border:
                      "1px solid #dbe2ea",
                    borderRadius: "8px",
                    padding:
                      "0 14px",
                    background:
                      "#ffffff",
                    color:
                      "#1e293b",
                    fontSize:
                      "13px",
                    outline:
                      "none",
                  }}
                >

                  <option value="Tous">
                    Tous les mouvements
                  </option>

                  <option value="Entrée">
                    Entrées uniquement
                  </option>

                  <option value="Sortie">
                    Sorties uniquement
                  </option>

                </select>

                <button
                  type="button"
                  className="stocks-new-button"
                  onClick={
                    imprimerRapport
                  }
                >
                  🖨 Imprimer le rapport
                </button>

              </div>

            </div>


            {/* ==================================================
                STATISTIQUES GÉNÉRALES
            ================================================== */}

            <div className="stocks-statistics">

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  📦
                </div>

                <div>

                  <span>
                    Produits
                  </span>

                  <strong>
                    {produits.length}
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  📊
                </div>

                <div>

                  <span>
                    Stock total
                  </span>

                  <strong>
                    {stockTotal}
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card stocks-stat-danger">

                <div className="stocks-stat-icon">
                  ⚠
                </div>

                <div>

                  <span>
                    Produits critiques
                  </span>

                  <strong>
                    {produitsCritiques}
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  🏢
                </div>

                <div>

                  <span>
                    Fournisseurs
                  </span>

                  <strong>
                    {fournisseurs.length}
                  </strong>

                </div>

              </div>

            </div>


            {/* ==================================================
                STATISTIQUES MOUVEMENTS
            ================================================== */}

            <div className="stocks-statistics">

              <div className="stocks-stat-card">

                <div
                  className="stocks-stat-icon"
                  style={{
                    color: "#15803d",
                    background: "#dcfce7",
                  }}
                >
                  ↓
                </div>

                <div>

                  <span>
                    Total des entrées
                  </span>

                  <strong>
                    +{totalEntrees}
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card">

                <div
                  className="stocks-stat-icon"
                  style={{
                    color: "#dc2626",
                    background: "#fee2e2",
                  }}
                >
                  ↑
                </div>

                <div>

                  <span>
                    Total des sorties
                  </span>

                  <strong>
                    -{totalSorties}
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  ⇄
                </div>

                <div>

                  <span>
                    Mouvements
                  </span>

                  <strong>
                    {mouvements.length}
                  </strong>

                </div>

              </div>

              <div className="stocks-stat-card">

                <div className="stocks-stat-icon">
                  ✓
                </div>

                <div>

                  <span>
                    Fournisseurs actifs
                  </span>

                  <strong>
                    {
                      fournisseurs.filter(
                        (fournisseur) =>
                          fournisseur.statut ===
                          "Actif"
                      ).length
                    }
                  </strong>

                </div>

              </div>

            </div>


            {/* ==================================================
                ÉTAT DU STOCK
            ================================================== */}

            <div className="stocks-section-header">

              <div>

                <h2>
                  État du stock
                </h2>

                <p>
                  Situation actuelle des produits
                  disponibles.
                </p>

              </div>

            </div>

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>#</th>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Stock actuel</th>
                    <th>Seuil</th>
                    <th>Écart</th>
                    <th>État</th>
                  </tr>

                </thead>

                <tbody>

                  {produits.length > 0 ? (

                    produits.map((produit) => {

                      const critique =
                        produit.stock <=
                        produit.seuil;

                      const ecart =
                        produit.stock -
                        produit.seuil;

                      return (

                        <tr
                          key={produit.id}
                        >

                          <td className="stocks-id">
                            {produit.id}
                          </td>

                          <td className="stocks-product-name">
                            {produit.produit}
                          </td>

                          <td>

                            <span className="stocks-category">
                              {produit.categorie}
                            </span>

                          </td>

                          <td
                            className={
                              critique
                                ? "stocks-quantity critical"
                                : "stocks-quantity"
                            }
                          >
                            {produit.stock}
                          </td>

                          <td className="stocks-threshold">
                            {produit.seuil}
                          </td>

                          <td>

                            <strong
                              style={{
                                color:
                                  ecart < 0
                                    ? "#dc2626"
                                    : ecart === 0
                                    ? "#d97706"
                                    : "#15803d",
                              }}
                            >
                              {ecart > 0
                                ? `+${ecart}`
                                : ecart}
                            </strong>

                          </td>

                          <td>

                            {critique ? (

                              <span className="stocks-status critical">
                                ⚠ Critique
                              </span>

                            ) : (

                              <span className="stocks-status ok">
                                ✓ OK
                              </span>

                            )}

                          </td>

                        </tr>

                      );

                    })

                  ) : (

                    <tr>

                      <td
                        colSpan="7"
                        className="stocks-empty"
                      >
                        Aucun produit disponible.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>


            {/* ==================================================
                ALERTES
            ================================================== */}

            <div
              className="stocks-section-header"
              style={{
                marginTop: "30px",
              }}
            >

              <div>

                <h2>
                  ⚠ Produits en alerte
                </h2>

                <p>
                  Produits dont le stock est
                  inférieur ou égal au seuil défini.
                </p>

              </div>

            </div>

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>#</th>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Stock</th>
                    <th>Seuil</th>
                    <th>Manque</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {produitsEnAlerte.length > 0 ? (

                    produitsEnAlerte.map(
                      (produit) => {

                        const manque =
                          Math.max(
                            produit.seuil -
                              produit.stock,
                            0
                          );

                        return (

                          <tr
                            key={produit.id}
                          >

                            <td>
                              {produit.id}
                            </td>

                            <td className="stocks-product-name">
                              {produit.produit}
                            </td>

                            <td>
                              {produit.categorie}
                            </td>

                            <td className="stocks-quantity critical">
                              {produit.stock}
                            </td>

                            <td>
                              {produit.seuil}
                            </td>

                            <td>

                              <strong
                                style={{
                                  color:
                                    "#dc2626",
                                }}
                              >
                                {manque > 0
                                  ? `-${manque}`
                                  : "0"}
                              </strong>

                            </td>

                            <td>

                              <span className="stocks-status critical">
                                Réapprovisionnement
                              </span>

                            </td>

                          </tr>

                        );

                      }
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="7"
                        className="stocks-empty"
                      >
                        ✓ Aucun produit en alerte.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>


            {/* ==================================================
                HISTORIQUE DES MOUVEMENTS
            ================================================== */}

            <div
              className="stocks-section-header"
              style={{
                marginTop: "30px",
              }}
            >

              <div>

                <h2>
                  Historique des mouvements
                </h2>

                <p>
                  Synthèse des entrées et sorties
                  enregistrées.
                </p>

              </div>

            </div>

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Référence</th>
                    <th>Produit</th>
                    <th>Type</th>
                    <th>Quantité</th>
                    <th>Motif</th>
                    <th>Utilisateur</th>
                  </tr>

                </thead>

                <tbody>

                  {mouvementsRapport.length > 0 ? (

                    mouvementsRapport.map(
                      (mouvement) => (

                        <tr
                          key={
                            mouvement.id
                          }
                        >

                          <td>

                            <div
                              style={{
                                display:
                                  "flex",
                                flexDirection:
                                  "column",
                                gap:
                                  "3px",
                              }}
                            >

                              <strong
                                style={{
                                  color:
                                    "#334155",
                                }}
                              >
                                {mouvement.date}
                              </strong>

                              <span
                                style={{
                                  color:
                                    "#94a3b8",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {mouvement.heure}
                              </span>

                            </div>

                          </td>

                          <td>

                            <span
                              style={{
                                background:
                                  "#f1f5f9",
                                color:
                                  "#475569",
                                padding:
                                  "5px 8px",
                                borderRadius:
                                  "5px",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "700",
                              }}
                            >
                              {
                                mouvement.reference
                              }
                            </span>

                          </td>

                          <td className="stocks-product-name">
                            {
                              mouvement.produit
                            }
                          </td>

                          <td>

                            {mouvement.type ===
                            "Entrée" ? (

                              <span
                                style={{
                                  background:
                                    "#dcfce7",
                                  color:
                                    "#15803d",
                                  padding:
                                    "6px 10px",
                                  borderRadius:
                                    "20px",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                ↓ Entrée
                              </span>

                            ) : (

                              <span
                                style={{
                                  background:
                                    "#fee2e2",
                                  color:
                                    "#dc2626",
                                  padding:
                                    "6px 10px",
                                  borderRadius:
                                    "20px",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                ↑ Sortie
                              </span>

                            )}

                          </td>

                          <td>

                            <strong
                              style={{
                                color:
                                  mouvement.type ===
                                  "Entrée"
                                    ? "#15803d"
                                    : "#dc2626",
                                fontSize:
                                  "14px",
                              }}
                            >
                              {mouvement.type ===
                              "Entrée"
                                ? "+"
                                : "-"}
                              {
                                mouvement.quantite
                              }
                            </strong>

                          </td>

                          <td>
                            {
                              mouvement.motif
                            }
                          </td>

                          <td>

                            <span
                              style={{
                                color:
                                  "#475569",
                                fontSize:
                                  "11px",
                              }}
                            >
                              {
                                mouvement.utilisateur
                              }
                            </span>

                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="7"
                        className="stocks-empty"
                      >
                        Aucun mouvement enregistré.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

            <div className="stocks-table-footer">

              <span>
                {mouvementsRapport.length}
                mouvement(s) dans le rapport
              </span>

              <span>
                Filtre :
                {" "}
                {filtreRapport}
              </span>

            </div>


            {/* ==================================================
                SYNTHÈSE FOURNISSEURS
            ================================================== */}

            <div
              className="stocks-section-header"
              style={{
                marginTop: "30px",
              }}
            >

              <div>

                <h2>
                  Synthèse des fournisseurs
                </h2>

                <p>
                  Vue globale des fournisseurs
                  enregistrés dans le système.
                </p>

              </div>

            </div>

            <div className="stocks-table-container">

              <table className="stocks-table">

                <thead>

                  <tr>
                    <th>Code</th>
                    <th>Fournisseur</th>
                    <th>Contact</th>
                    <th>Produits fournis</th>
                    <th>Dernière commande</th>
                    <th>Statut</th>
                  </tr>

                </thead>

                <tbody>

                  {fournisseurs.length > 0 ? (

                    fournisseurs.map(
                      (fournisseur) => (

                        <tr
                          key={
                            fournisseur.id
                          }
                        >

                          <td>

                            <span
                              style={{
                                background:
                                  "#f1f5f9",
                                color:
                                  "#475569",
                                padding:
                                  "6px 9px",
                                borderRadius:
                                  "6px",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "800",
                              }}
                            >
                              {
                                fournisseur.id
                              }
                            </span>

                          </td>

                          <td className="stocks-product-name">
                            {
                              fournisseur.fournisseur
                            }
                          </td>

                          <td>
                            {
                              fournisseur.contact
                            }
                          </td>

                          <td>

                            <strong>
                              {
                                fournisseur.produits
                              }
                            </strong>

                          </td>

                          <td>
                            {
                              fournisseur.derniereCommande
                            }
                          </td>

                          <td>

                            {fournisseur.statut ===
                            "Actif" ? (

                              <span className="stocks-status ok">
                                Actif
                              </span>

                            ) : (

                              <span
                                className="stocks-status critical"
                                style={{
                                  background:
                                    "#f1f5f9",
                                  color:
                                    "#64748b",
                                }}
                              >
                                Inactif
                              </span>

                            )}

                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="6"
                        className="stocks-empty"
                      >
                        Aucun fournisseur enregistré.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>


            {/* ==================================================
                RÉSUMÉ FINAL
            ================================================== */}

            <div
              style={{
                marginTop: "30px",
                padding: "22px",
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "12px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "20px",
              }}
            >

              <div>

                <span
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: "11px",
                    marginBottom:
                      "6px",
                  }}
                >
                  Produits enregistrés
                </span>

                <strong
                  style={{
                    color: "#0f172a",
                    fontSize: "20px",
                  }}
                >
                  {produits.length}
                </strong>

              </div>

              <div>

                <span
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: "11px",
                    marginBottom:
                      "6px",
                  }}
                >
                  Stock disponible
                </span>

                <strong
                  style={{
                    color: "#0f766e",
                    fontSize: "20px",
                  }}
                >
                  {stockTotal}
                </strong>

              </div>

              <div>

                <span
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: "11px",
                    marginBottom:
                      "6px",
                  }}
                >
                  Alertes à traiter
                </span>

                <strong
                  style={{
                    color:
                      produitsCritiques > 0
                        ? "#dc2626"
                        : "#15803d",
                    fontSize: "20px",
                  }}
                >
                  {produitsCritiques}
                </strong>

              </div>

              <div>

                <span
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: "11px",
                    marginBottom:
                      "6px",
                  }}
                >
                  Mouvements enregistrés
                </span>

                <strong
                  style={{
                    color: "#0f172a",
                    fontSize: "20px",
                  }}
                >
                  {mouvements.length}
                </strong>

              </div>

            </div>

            <div className="stocks-table-footer">

              <span>
                Rapport généré à partir des
                données locales du module Stocks.
              </span>

              <span>
                Dernière mise à jour :
                aujourd'hui
              </span>

            </div>

          </section>

        )}

      </main>

      {/* ======================================================
          MODAL NOUVEAU PRODUIT
      ====================================================== */}

      {formulaireOuvert && (

        <div
          className="stocks-modal-overlay"
          onClick={fermerFormulaire}
        >

          <div
            className="stocks-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="stocks-modal-header">

              <div>

                <h2>
                  Nouveau produit
                </h2>

                <p>
                  Ajoutez un nouveau produit dans
                  le stock.
                </p>

              </div>

              <button
                type="button"
                className="stocks-modal-close"
                onClick={fermerFormulaire}
              >
                ×
              </button>

            </div>

            <form
              className="stocks-product-form"
              onSubmit={handleAjouterProduit}
            >

              <div className="stocks-form-group">

                <label htmlFor="produit">
                  Produit
                </label>

                <input
                  id="produit"
                  name="produit"
                  type="text"
                  placeholder="Ex : Paracétamol 500mg"
                  value={
                    nouveauProduit.produit
                  }
                  onChange={handleFormChange}
                  autoFocus
                  required
                />

              </div>

              <div className="stocks-form-group">

                <label htmlFor="categorie">
                  Catégorie
                </label>

                <select
                  id="categorie"
                  name="categorie"
                  value={
                    nouveauProduit.categorie
                  }
                  onChange={handleFormChange}
                  required
                >

                  <option value="">
                    Sélectionner une catégorie
                  </option>

                  <option value="Médicament">
                    Médicament
                  </option>
                  <option value="Consommable">
                    Consommable
                  </option>
                  <option value="Laboratoire">
                    Laboratoire
                  </option>
                  <option value="Matériel médical">
                    Matériel médical
                  </option>

                  <option value="Autre">
                    Autre
                  </option>
                </select>
              </div>
              <div className="stocks-form-row">
                <div className="stocks-form-group">

                  <label htmlFor="stock">
                    Stock initial
                  </label>

                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    placeholder="Ex : 100"
                    value={
                      nouveauProduit.stock
                    }
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="stocks-form-group">

                  <label htmlFor="seuil">
                    Seuil d'alerte
                  </label>

                  <input
                    id="seuil"
                    name="seuil"
                    type="number"
                    min="0"
                    placeholder="Ex : 20"
                    value={
                      nouveauProduit.seuil
                    }
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              {nouveauProduit.stock !== "" &&
                nouveauProduit.seuil !== "" && (
                  <div
                    className={
                      Number(
                        nouveauProduit.stock
                      ) <=
                      Number(
                        nouveauProduit.seuil
                      )
                        ? "stocks-form-preview critical"
                        : "stocks-form-preview"
                    }
                  >

                    <span>
                      Statut du produit
                    </span>
                    <strong>
                      {Number(
                        nouveauProduit.stock
                      ) <=
                      Number(
                        nouveauProduit.seuil
                      )
                        ? "⚠ Critique"
                        : "✓ OK"}
                    </strong>
                  </div>
                )}

              <div className="stocks-form-actions">
                <button
                  type="button"
                  className="stocks-cancel-button"
                  onClick={fermerFormulaire}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="stocks-submit-button"
                >
                  <span>
                    +
                  </span>
                  Ajouter le produit
                </button>
              </div>

            </form>
          </div>
        </div>

      )}

      {/* ======================================================
          MODAL ENTRÉE / SORTIE
      ====================================================== */}

      {mouvementFormulaireOuvert && (

        <div
          className="stocks-modal-overlay"
          onClick={
            fermerFormulaireMouvement
          }
        >
          <div
            className="stocks-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="stocks-modal-header">

              <div>

                <span
                  style={{
                    display:
                      "inline-block",
                    fontSize: "10px",
                    fontWeight: "800",
                    letterSpacing:
                      "0.8px",
                    color:
                      typeMouvement ===
                      "Entrée"
                        ? "#15803d"
                        : "#dc2626",
                    marginBottom:
                      "6px",
                  }}
                >
                  {typeMouvement ===
                  "Entrée"
                    ? "ENTRÉE DE STOCK"
                    : "SORTIE DE STOCK"}
                </span>

                <h2>
                  {typeMouvement ===
                  "Entrée"
                    ? "Nouvelle entrée"
                    : "Nouvelle sortie"}
                </h2>

                <p>
                  {typeMouvement ===
                  "Entrée"
                    ? "Enregistrez un approvisionnement dans le stock."
                    : "Enregistrez une sortie du stock."}
                </p>

              </div>

              <button
                type="button"
                className="stocks-modal-close"
                onClick={
                  fermerFormulaireMouvement
                }
              >
                ×
              </button>
            </div>

            <form
              className="stocks-product-form"
              onSubmit={
                handleAjouterMouvement
              }
            >
              <div className="stocks-form-group">

                <label htmlFor="produitId">
                  Produit
                </label>

                <select
                  id="produitId"
                  name="produitId"
                  value={
                    nouveauMouvement.produitId
                  }
                  onChange={
                    handleMouvementChange
                  }
                  required
                >
                  <option value="">
                    Sélectionner un produit
                  </option>

                  {produits.map(
                    (produit) => (

                      <option
                        key={produit.id}
                        value={produit.id}
                      >
                        {produit.produit}
                        {" — Stock actuel : "}
                        {produit.stock}
                      </option>

                    )
                  )}

                </select>
              </div>

              <div className="stocks-form-row">
                <div className="stocks-form-group">
                  <label htmlFor="quantite">
                    Quantité
                  </label>

                  <input
                    id="quantite"
                    name="quantite"
                    type="number"
                    min="1"
                    placeholder="Ex : 100"
                    value={
                      nouveauMouvement.quantite
                    }
                    onChange={
                      handleMouvementChange
                    }
                    required
                  />
                </div>

                <div className="stocks-form-group">

                  <label htmlFor="date">
                    Date
                  </label>

                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={
                      nouveauMouvement.date
                    }
                    onChange={
                      handleMouvementChange
                    }
                    required
                  />
                </div>
              </div>

              {typeMouvement ===
                "Entrée" && (
                <div className="stocks-form-row">
                  <div className="stocks-form-group">
                    <label htmlFor="fournisseur">
                      Fournisseur
                    </label>

                    <select
                      id="fournisseur"
                      name="fournisseur"
                      value={
                        nouveauMouvement.fournisseur
                      }
                      onChange={
                        handleMouvementChange
                      }
                    >

                      <option value="">
                        Sélectionner un fournisseur
                      </option>

                      {fournisseurs
                        .filter(
                          (fournisseur) =>
                            fournisseur.statut ===
                            "Actif"
                        )
                        .map(
                          (fournisseur) => (

                            <option
                              key={
                                fournisseur.id
                              }
                              value={
                                fournisseur.fournisseur
                              }
                            >
                              {
                                fournisseur.fournisseur
                              }
                            </option>

                          )
                        )}
                    </select>
                  </div>
                  <div className="stocks-form-group">

                    <label htmlFor="referenceDocument">
                      N° Facture / BL
                    </label>

                    <input
                      id="referenceDocument"
                      name="referenceDocument"
                      type="text"
                      placeholder="Ex : BL-2026-0045"
                      value={
                        nouveauMouvement.referenceDocument
                      }
                      onChange={
                        handleMouvementChange
                      }
                    />

                  </div>

                </div>

              )}

              {typeMouvement ===
                "Sortie" && (

                <div className="stocks-form-row">
                  <div className="stocks-form-group">
                    <label htmlFor="service">
                      Service destinataire
                    </label>
                    <select
                      id="service"
                      name="service"
                      value={
                        nouveauMouvement.service
                      }
                      onChange={
                        handleMouvementChange
                      }
                    >
                      <option value="">
                        Sélectionner un service
                      </option>
                      <option value="Consultation">
                        Consultation
                      </option>
                      <option value="Pharmacie">
                        Pharmacie
                      </option>
                      <option value="Laboratoire">
                        Laboratoire
                      </option>
                      <option value="Soins infirmiers">
                        Soins infirmiers
                      </option>
                      <option value="Maternité">
                        Maternité
                      </option>
                      <option value="Bloc opératoire">
                        Bloc opératoire
                      </option>
                      <option value="Autre">
                        Autre
                      </option>
                    </select>
                  </div>

                  <div className="stocks-form-group">

                    <label htmlFor="patient">
                      Patient
                    </label>

                    <input
                      id="patient"
                      name="patient"
                      type="text"
                      placeholder="Nom du patient"
                      value={
                        nouveauMouvement.patient
                      }
                      onChange={
                        handleMouvementChange
                      }
                    />

                  </div>

                </div>

              )}
              <div className="stocks-form-group">
                <label htmlFor="motif">
                  Motif
                </label>
                <select
                  id="motif"
                  name="motif"
                  value={
                    nouveauMouvement.motif
                  }
                  onChange={
                    handleMouvementChange
                  }
                  required
                >
                  <option value="">
                    Sélectionner un motif
                  </option>

                  {typeMouvement ===
                  "Entrée" ? (
                    <>
                      <option value="Réapprovisionnement">
                        Réapprovisionnement
                      </option>
                      <option value="Livraison">
                        Livraison
                      </option>
                      <option value="Retour fournisseur">
                        Retour fournisseur
                      </option>
                      <option value="Don">
                        Don
                      </option>
                      <option value="Inventaire">
                        Inventaire
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="Consultation">
                        Consultation
                      </option>
                      <option value="Pharmacie">
                        Pharmacie
                      </option>
                      <option value="Soins infirmiers">
                        Soins infirmiers
                      </option>
                      <option value="Laboratoire">
                        Laboratoire
                      </option>
                      <option value="Maternité">
                        Maternité
                      </option>
                      <option value="Bloc opératoire">
                        Bloc opératoire
                      </option>
                      <option value="Perte">
                        Perte
                      </option>
                      <option value="Produit périmé">
                        Produit périmé
                      </option>

                      <option value="Autre">
                        Autre
                      </option>
                    </>
                  )}
                </select>

              </div>
              <div className="stocks-form-group">

                <label htmlFor="observation">
                  Observation
                </label>
                <textarea
                  id="observation"
                  name="observation"
                  rows="3"
                  placeholder="Ajouter une observation..."
                  value={
                    nouveauMouvement.observation
                  }
                  onChange={
                    handleMouvementChange
                  }
                  style={{
                    width: "100%",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding:
                      "13px 14px",
                    resize: "vertical",
                    fontFamily:
                      "inherit",
                    outline: "none",
                    fontSize: "13px",
                  }}
                />
              </div>
              {nouveauMouvement.produitId &&
                nouveauMouvement.quantite && (
                <div
                  style={{
                    background:
                      typeMouvement ===
                      "Entrée"
                        ? "#f0fdf4"
                        : "#fef2f2",
                    border:
                      typeMouvement ===
                      "Entrée"
                        ? "1px solid #bbf7d0"
                        : "1px solid #fecaca",
                    borderRadius:
                      "10px",
                    padding:
                      "15px 20px",
                    marginBottom:
                      "20px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display:
                          "block",
                        color:
                          "#64748b",
                        fontSize:
                          "11px",
                        marginBottom:
                          "5px",
                      }}
                    >
                      Stock actuel
                    </span>
                    <strong
                      style={{
                        fontSize:
                          "21px",
                      }}
                    >
                      {
                        produits.find(
                          (item) =>
                            item.id ===
                            nouveauMouvement.produitId
                        )?.stock
                      }
                    </strong>
                  </div>
                  <div
                    style={{
                      fontSize:
                        "22px",
                      color:
                        "#94a3b8",
                    }}
                  >
                    →
                  </div>
                  <div>
                    <span
                      style={{
                        display:
                          "block",
                        color:
                          "#64748b",
                        fontSize:
                          "11px",
                        marginBottom:
                          "5px",
                      }}
                    >
                      Après opération
                    </span>
                    <strong
                      style={{
                        fontSize:
                          "21px",
                        color:
                          typeMouvement ===
                          "Entrée"
                            ? "#15803d"
                            : "#dc2626",
                      }}
                    >
                      {(() => {
                        const produit =
                          produits.find(
                            (item) =>
                              item.id ===
                              nouveauMouvement.produitId
                          );

                        if (!produit) {
                          return 0;
                        }
                        const quantite =
                          Number(
                            nouveauMouvement.quantite
                          );
                        return typeMouvement ===
                          "Entrée"
                          ? produit.stock +
                            quantite
                          : produit.stock -
                            quantite;

                      })()}
                    </strong>
                  </div>
                </div>

              )}
              <div className="stocks-form-actions">
                <button
                  type="button"
                  className="stocks-cancel-button"
                  onClick={
                    fermerFormulaireMouvement
                  }
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="stocks-submit-button"
                  style={{
                    background:
                      typeMouvement ===
                      "Entrée"
                        ? "#0f766e"
                        : "#dc2626",
                  }}
                >
                  {typeMouvement ===
                  "Entrée"
                    ? "+ Enregistrer l'entrée"
                    : "− Enregistrer la sortie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL NOUVEAU FOURNISSEUR
      ====================================================== */}

      {fournisseurFormulaireOuvert && (
        <div
          className="stocks-modal-overlay"
          onClick={
            fermerFormulaireFournisseur
          }
        >
          <div
            className="stocks-modal"
            style={{
              maxWidth: "720px",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="stocks-modal-header">

              <div>
                <span
                  style={{
                    display:
                      "inline-block",
                    fontSize: "10px",
                    fontWeight: "800",
                    letterSpacing:
                      "0.8px",
                    color: "#0f766e",
                    marginBottom:
                      "6px",
                  }}
                >
                  FOURNISSEUR
                </span>
                <h2>
                  Nouveau fournisseur
                </h2>
                <p>
                  Ajoutez un fournisseur à la
                  liste de la clinique.
                </p>

              </div>
              <button
                type="button"
                className="stocks-modal-close"
                onClick={
                  fermerFormulaireFournisseur
                }
              >
                ×
              </button>
            </div>

            <form
              className="stocks-product-form"
              onSubmit={
                handleAjouterFournisseur
              }
            >
              <div className="stocks-form-group">
                <label htmlFor="fournisseur">
                  Nom / raison sociale *
                </label>
                <input
                  id="fournisseur"
                  name="fournisseur"
                  type="text"
                  placeholder="Ex : Pharmacie Centrale de Côte d'Ivoire"
                  value={
                    nouveauFournisseur.fournisseur
                  }
                  onChange={
                    handleFournisseurChange
                  }
                  autoFocus
                  required
                />
              </div>

              <div className="stocks-form-row">
                <div className="stocks-form-group">
                  <label htmlFor="contact">
                    Personne à contacter *
                  </label>

                  <input
                    id="contact"
                    name="contact"
                    type="text"
                    placeholder="Ex : M. Kouassi Jean"
                    value={
                      nouveauFournisseur.contact
                    }
                    onChange={
                      handleFournisseurChange
                    }
                    required
                  />
                </div>

                <div className="stocks-form-group">
                  <label htmlFor="telephone">
                    Téléphone *
                  </label>
                  <input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    placeholder="Ex : 07 08 09 10 11"
                    value={
                      nouveauFournisseur.telephone
                    }
                    onChange={
                      handleFournisseurChange
                    }
                    required
                  />
                </div>
              </div>

              <div className="stocks-form-row">
                <div className="stocks-form-group">
                  <label htmlFor="produits">
                    Nombre de produits fournis
                  </label>
                  <input
                    id="produits"
                    name="produits"
                    type="number"
                    min="0"
                    placeholder="Ex : 25"
                    value={
                      nouveauFournisseur.produits
                    }
                    onChange={
                      handleFournisseurChange
                    }
                  />
                </div>
                <div className="stocks-form-group">
                  <label htmlFor="derniereCommande">
                    Dernière commande
                  </label>
                  <input
                    id="derniereCommande"
                    name="derniereCommande"
                    type="date"
                    value={
                      nouveauFournisseur.derniereCommande
                    }
                    onChange={
                      handleFournisseurChange
                    }
                  />
                </div>

              </div>
              <div className="stocks-form-group">
                <label htmlFor="statut">
                  Statut
                </label>
                <select
                  id="statut"
                  name="statut"
                  value={
                    nouveauFournisseur.statut
                  }
                  onChange={
                    handleFournisseurChange
                  }
                >
                  <option value="Actif">
                    Actif
                  </option>
                  <option value="Inactif">
                    Inactif
                  </option>
                </select>
              </div>
              <div className="stocks-form-actions">
                <button
                  type="button"
                  className="stocks-cancel-button"
                  onClick={
                    fermerFormulaireFournisseur
                  }
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="stocks-submit-button"
                  style={{
                    background:
                      "#0f766e",
                  }}
                >
                  + Ajouter le fournisseur
                </button>
              </div>
            </form>
          </div>

        </div>

      )}

      {/* ======================================================
          MODAL DÉTAILS FOURNISSEUR
      ====================================================== */}
      {fournisseurSelectionne && (

        <div
          className="stocks-modal-overlay"
          onClick={() =>
            setFournisseurSelectionne(null)
          }
        >
          <div
            className="stocks-modal"
            style={{
              maxWidth: "760px",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="stocks-modal-header">

              <div>
                <span
                  style={{
                    display:
                      "inline-block",
                    fontSize: "10px",
                    fontWeight: "800",
                    letterSpacing:
                      "0.8px",
                    color: "#0f766e",
                    marginBottom:
                      "6px",
                  }}
                >
                  FICHE FOURNISSEUR
                </span>
                <h2>
                  {
                    fournisseurSelectionne.fournisseur
                  }
                </h2>

                <p>
                  Informations du fournisseur
                </p>

              </div>
              <button
                type="button"
                className="stocks-modal-close"
                onClick={() =>
                  setFournisseurSelectionne(
                    null
                  )
                }
              >
                ×
              </button>

            </div>
            <div
              style={{
                padding:
                  "10px 0 20px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "15px",
                }}
              >
                <div
                  style={{
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      color:
                        "#64748b",
                      fontSize:
                        "11px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Code fournisseur
                  </span>
                  <strong
                    style={{
                      fontSize:
                        "16px",
                      color:
                        "#0f172a",
                    }}
                  >
                    {
                      fournisseurSelectionne.id
                    }
                  </strong>

                </div>
                <div
                  style={{
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      color:
                        "#64748b",
                      fontSize:
                        "11px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Statut
                  </span>
                  <strong
                    style={{
                      color:
                        fournisseurSelectionne.statut ===
                        "Actif"
                          ? "#15803d"
                          : "#64748b",
                      fontSize:
                        "16px",
                    }}
                  >
                    {
                      fournisseurSelectionne.statut
                    }
                  </strong>
                </div>
                <div
                  style={{
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      color:
                        "#64748b",
                      fontSize:
                        "11px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Personne à contacter
                  </span>
                  <strong
                    style={{
                      fontSize:
                        "15px",
                      color:
                        "#0f172a",
                    }}
                  >
                    {
                      fournisseurSelectionne.contact
                    }
                  </strong>
                </div>

                <div
                  style={{
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      color:
                        "#64748b",
                      fontSize:
                        "11px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Téléphone
                  </span>
                  <strong
                    style={{
                      fontSize:
                        "15px",
                      color:
                        "#0f172a",
                    }}
                  >
                    {
                      fournisseurSelectionne.telephone
                    }
                  </strong>
                </div>
                <div
                  style={{
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      color:
                        "#64748b",
                      fontSize:
                        "11px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Produits fournis
                  </span>

                  <strong
                    style={{
                      fontSize:
                        "18px",
                      color:
                        "#0f766e",
                    }}
                  >
                    {
                      fournisseurSelectionne.produits
                    }
                  </strong>
                </div>
                <div
                  style={{
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      color:
                        "#64748b",
                      fontSize:
                        "11px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Dernière commande
                  </span>
                  <strong
                    style={{
                      fontSize:
                        "15px",
                      color:
                        "#0f172a",
                    }}
                  >
                    {
                      fournisseurSelectionne.derniereCommande
                    }
                  </strong>
                </div>
              </div>
            </div>
            <div
              className="stocks-form-actions"
              style={{
                marginTop: "10px",
              }}
            >
              <button
                type="button"
                className="stocks-cancel-button"
                onClick={() =>
                  setFournisseurSelectionne(
                    null
                  )
                }
              >
                Fermer
              </button>
              <button
                type="button"
                className="stocks-submit-button"
                style={{
                  background:
                    "#dc2626",
                }}
                onClick={() => {
                  handleSupprimerFournisseur(
                    fournisseurSelectionne
                  );
                  setFournisseurSelectionne(
                    null
                  );

                }}
              >
                Supprimer le fournisseur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}