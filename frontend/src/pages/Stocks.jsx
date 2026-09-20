import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import "../styles/Stocks.css";

const produitsInitials = [
  { id: "001", produit: "Gants", categorie: "Consommable", stock: 25, seuil: 50 },
  { id: "002", produit: "Sérum 500ml", categorie: "Consommable", stock: 120, seuil: 50 },
  { id: "003", produit: "Réactif NFS", categorie: "Laboratoire", stock: 15, seuil: 30 },
  { id: "004", produit: "Masques", categorie: "Consommable", stock: 200, seuil: 100 },
];

export default function Stocks() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [recherche, setRecherche] = useState("");
  const [menuActif, setMenuActif] = useState("Produits");
  const [produits] = useState(produitsInitials);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const produitsFiltres = useMemo(() => {
    const texte = recherche.toLowerCase().trim();
    if (!texte) return produits;

    return produits.filter((produit) =>
      produit.produit.toLowerCase().includes(texte) ||
      produit.categorie.toLowerCase().includes(texte) ||
      produit.id.toLowerCase().includes(texte)
    );
  }, [recherche, produits]);

  const nombreProduits = produits.length;
  const produitsCritiques = produits.filter((p) => p.stock <= p.seuil).length;
  const stockTotal = produits.reduce((total, p) => total + p.stock, 0);

  const handleNouveauProduit = () => {
    alert("Le formulaire de création d'un nouveau produit sera disponible prochainement.");
  };

  return (
    <div className="stocks-page">
      <aside className="stocks-sidebar">
        <div className="stocks-logo">
          <div className="stocks-logo-icon">
            <Logo size={26} inverted />
          </div>
          <div className="stocks-logo-text">
            <strong>MASANTE</strong>
            <span>Gestion de clinique</span>
          </div>
        </div>

        <nav className="stocks-navigation">
          <button
            type="button"
            className={`stocks-nav-item ${menuActif === "Accueil" ? "active" : ""}`}
            onClick={() => setMenuActif("Accueil")}
          >
            <span className="stocks-nav-icon">⌂</span>
            <span>Accueil</span>
          </button>

          <button
            type="button"
            className={`stocks-nav-item ${menuActif === "Produits" ? "active" : ""}`}
            onClick={() => setMenuActif("Produits")}
          >
            <span className="stocks-nav-icon">▣</span>
            <span>Produits</span>
          </button>

          <button
            type="button"
            className={`stocks-nav-item ${menuActif === "Entrées / Sorties" ? "active" : ""}`}
            onClick={() => setMenuActif("Entrées / Sorties")}
          >
            <span className="stocks-nav-icon">⇄</span>
            <span>Entrées / Sorties</span>
          </button>

          <button
            type="button"
            className={`stocks-nav-item ${menuActif === "Seuils d'alerte" ? "active" : ""}`}
            onClick={() => setMenuActif("Seuils d'alerte")}
          >
            <span className="stocks-nav-icon">⚠</span>
            <span>Seuils d'alerte</span>
          </button>

          <button
            type="button"
            className={`stocks-nav-item ${menuActif === "Fournisseurs" ? "active" : ""}`}
            onClick={() => setMenuActif("Fournisseurs")}
          >
            <span className="stocks-nav-icon">♙</span>
            <span>Fournisseurs</span>
          </button>

          <button
            type="button"
            className={`stocks-nav-item ${menuActif === "Rapports" ? "active" : ""}`}
            onClick={() => setMenuActif("Rapports")}
          >
            <span className="stocks-nav-icon">▤</span>
            <span>Rapports</span>
          </button>
        </nav>

        <Link to="/modules" className="stocks-nav-item">
          <span className="stocks-nav-icon">⌘</span>
          <span>Retour aux modules</span>
        </Link>

        <button type="button" className="stocks-nav-item" onClick={handleLogout}>
          <span className="stocks-nav-icon">⏻</span>
          <span>Déconnexion</span>
        </button>

        <div className="stocks-sidebar-footer">
          Ma Santé Clinique
          <span>v1.0</span>
        </div>
      </aside>

      <main className="stocks-main">
        <header className="stocks-header">
          <div className="stocks-header-title">
            <h1>Espace Responsable des Stocks</h1>
            <p>Gestion des produits et des mouvements de stock</p>
          </div>

          <div className="stocks-user">
            <div className="stocks-user-avatar">👨🏾‍💼</div>
            <div className="stocks-user-info">
              <strong>N'GUESSAN Paul</strong>
              <span>Responsable Stocks</span>
            </div>
          </div>
        </header>

        <section className="stocks-content">
          <div className="stocks-statistics">
            <div className="stocks-stat-card">
              <div className="stocks-stat-icon">📦</div>
              <div>
                <span>Produits</span>
                <strong>{nombreProduits}</strong>
              </div>
            </div>

            <div className="stocks-stat-card">
              <div className="stocks-stat-icon">📊</div>
              <div>
                <span>Stock total</span>
                <strong>{stockTotal}</strong>
              </div>
            </div>

            <div className="stocks-stat-card stocks-stat-danger">
              <div className="stocks-stat-icon">⚠</div>
              <div>
                <span>Alertes</span>
                <strong>{produitsCritiques}</strong>
              </div>
            </div>
          </div>

          <div className="stocks-section-header">
            <div>
              <h2>Liste des produits</h2>
              <p>Consultez et gérez les produits disponibles en stock.</p>
            </div>

            <div className="stocks-actions">
              <div className="stocks-search">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={recherche}
                  onChange={(event) => setRecherche(event.target.value)}
                />
              </div>

              <button type="button" className="stocks-new-button" onClick={handleNouveauProduit}>
                <span>+</span>
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
                  produitsFiltres.map((produit) => {
                    const critique = produit.stock <= produit.seuil;

                    return (
                      <tr key={produit.id}>
                        <td className="stocks-id">{produit.id}</td>
                        <td className="stocks-product-name">{produit.produit}</td>
                        <td>
                          <span className="stocks-category">{produit.categorie}</span>
                        </td>
                        <td className={critique ? "stocks-quantity critical" : "stocks-quantity"}>
                          {produit.stock}
                        </td>
                        <td>{produit.seuil}</td>
                        <td>
                          {critique ? (
                            <span className="stocks-status critical">Critique</span>
                          ) : (
                            <span className="stocks-status ok">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="stocks-empty">
                      Aucun produit trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="stocks-table-footer">
            <span>{produitsFiltres.length} produit(s) affiché(s)</span>
            <span>Dernière mise à jour : aujourd'hui</span>
          </div>
        </section>
      </main>
    </div>
  );
}
