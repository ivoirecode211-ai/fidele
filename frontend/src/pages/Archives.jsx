import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  FileText,
  Folder,
  CalendarDays,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  ScanLine,
  Eye,
  FileArchive,
  FileCheck2,
  FileSpreadsheet,
  File,
  X,
  Info,
} from "lucide-react";
import StatCard from "../components/StatCard";
import api from "../services/api";
import { useModuleView } from "../layouts/AppLayout";
import "../styles/archives.css";

// Données de démonstration — seront reliées aux API Django/PostgreSQL.

// Documents produits par les autres modules, servis par /api/archives/.
const CATEGORY_ICONS = { FileArchive, FileCheck2, FileSpreadsheet, FileText, File, Archive };

const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value);

const DOCUMENT_TYPES = [
  "Tous les types", "Dossier patient", "Compte rendu", "Résultat labo", "Facture", "Courrier", "Document administratif",
];

const CATEGORY_TYPE_MAP = {
  "Dossiers patients": "Dossier patient",
  "Comptes rendus": "Compte rendu",
  "Résultats d'analyses": "Résultat labo",
  "Factures": "Facture",
  "Courriers": "Courrier",
  "Documents administratifs": "Document administratif",
};

function DocumentIcon({ type }) {
  if (type === "Résultat labo") return <FileSpreadsheet size={15} />;
  if (type === "Facture") return <FileText size={15} />;
  if (type === "Dossier patient") return <FileArchive size={15} />;
  if (type === "Document administratif") return <FileCheck2 size={15} />;
  if (type === "Courrier") return <File size={15} />;
  return <FileText size={15} />;
}

export default function Archives() {
  // Sous-module : documents archivés, par catégorie, recherche avancée.
  const vue = useModuleView("/archives");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("Tous les types");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [data, setData] = useState({
    stats: { documents: 0, patientFiles: 0, thisYear: 0, year: new Date().getFullYear() },
    categories: [],
    years: [String(new Date().getFullYear())],
    documents: [],
  });

  useEffect(() => {
    api
      .get("/archives/overview/", { params: { year: selectedYear } })
      .then((response) => setData(response.data))
      .catch((error) => console.error("Erreur de chargement des archives :", error));
  }, [selectedYear]);

  const ARCHIVED_DOCUMENTS = data.documents;
  const YEARS = data.years;
  const ARCHIVE_CATEGORIES = data.categories.map((category) => ({
    ...category,
    count: formatNumber(category.count),
    icon: CATEGORY_ICONS[category.icon] || FileText,
  }));
  const ARCHIVE_STATS = [
    { id: "documents", value: formatNumber(data.stats.documents), label: "Documents archivés", icon: FileText, color: "blue" },
    { id: "dossiers", value: formatNumber(data.stats.patientFiles), label: "Dossiers patients", icon: Folder, color: "green" },
    { id: "documents-year", value: formatNumber(data.stats.thisYear), label: `Documents ${data.stats.year}`, icon: CalendarDays, color: "purple" },
    { id: "security", value: "100%", label: "Sécurisation", icon: ShieldCheck, color: "orange" },
  ];

  const filteredDocuments = useMemo(() => {
    const value = search.toLowerCase().trim();

    return ARCHIVED_DOCUMENTS.filter((document) => {
      const matchesSearch =
        !value ||
        document.type.toLowerCase().includes(value) ||
        document.patient.toLowerCase().includes(value) ||
        document.reference.toLowerCase().includes(value) ||
        document.author.toLowerCase().includes(value);

      const matchesType = selectedType === "Tous les types" || document.type === selectedType;

      // L'année est filtrée par l'API.
      return matchesSearch && matchesType;
    });
  }, [search, selectedType, ARCHIVED_DOCUMENTS]);

  const exportCsv = () => {
    const header = ["Date", "Type", "Patient", "Référence", "Auteur", "Format"];
    const lines = filteredDocuments.map((doc) =>
      [doc.date, doc.type, doc.patient, doc.reference, doc.author, doc.format]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(";")
    );
    const blob = new Blob(["\ufeff" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `archives-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleAction = (action) => {
    if (action === "Exporter") {
      exportCsv();
      return;
    }
    alert(`${action} : la gestion des fichiers numérisés n'est pas encore disponible.`);
  };

  const handleCategoryClick = (categoryName) => {
    if (CATEGORY_TYPE_MAP[categoryName]) {
      setSelectedType(CATEGORY_TYPE_MAP[categoryName]);
    }
  };

  return (
    <div className="archives-page" data-vue={vue.id}>
      <header className="archives-header">

        <div className="archives-user-status">
          <span></span>
          Archivage sécurisé
        </div>
      </header>

      <section className="archives-stats">
        {ARCHIVE_STATS.map((stat) => (
          <StatCard key={stat.id} value={stat.value} label={stat.label} icon={<stat.icon size={21} />} tone={stat.color} />
        ))}
      </section>

      <section className="archives-toolbar">
        <div className="archives-search">
          <Search size={14} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un document, patient, N° dossier..."
          />
          {search && (
            <button
              type="button"
              className="archives-clear-search"
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="archives-filters">
          <div className="archive-select">
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>

          <div className="archive-select small">
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              {YEARS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>

          <button type="button" className="archives-search-button">
            <Search size={13} />
            Rechercher
          </button>
        </div>
      </section>

      <div className="archives-content-grid">
        <section className="archives-panel categories-panel">
          <div className="archives-panel-title">
            <div><h2>Catégories</h2></div>
            <span>{ARCHIVE_CATEGORIES.length}</span>
          </div>

          <div className="archive-category-list">
            {ARCHIVE_CATEGORIES.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  type="button"
                  key={category.id}
                  className="archive-category"
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <div className="archive-category-icon">
                    <Icon size={14} />
                  </div>
                  <span>{category.name}</span>
                  <strong>{category.count}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="archives-panel documents-panel">
          <div className="archives-panel-title">
            <div>
              <h2>Derniers documents archivés</h2>
              <p>Documents ajoutés récemment</p>
            </div>

            <button
              type="button"
              className="archive-view-all"
              onClick={() => {
                setSearch("");
                setSelectedType("Tous les types");
                setSelectedYear("2026");
              }}
            >
              Voir tout
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="archive-table-wrapper">
            <table className="archive-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Patient / Référence</th>
                  <th>Auteur</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <div className="archive-date">
                        <CalendarDays size={11} />
                        {document.date}
                      </div>
                    </td>
                    <td>
                      <div className="archive-document-type">
                        <span><DocumentIcon type={document.type} /></span>
                        <div>
                          <strong>{document.type}</strong>
                          <small>{document.format}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="archive-patient">
                        <strong>{document.patient}</strong>
                        <span>{document.reference}</span>
                      </div>
                    </td>
                    <td>
                      <span className="archive-author">{document.author}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="archive-eye-button"
                        title="Voir le document"
                        aria-label="Voir le document"
                        onClick={() => setSelectedDocument(document)}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredDocuments.length === 0 && (
              <div className="archive-empty">
                <Archive size={28} />
                <strong>Aucun document trouvé</strong>
                <span>Modifiez votre recherche ou vos filtres.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="archives-actions">
        <div className="archives-actions-header">
          <div>
            <h2>Actions</h2>
            <p>Gestion des documents archivés</p>
          </div>
        </div>

        <div className="archives-action-grid">
          <button type="button" className="archive-action-card scan" onClick={() => handleAction("Numériser")}>
            <div className="archive-action-icon">
              <ScanLine size={22} />
            </div>
            <div>
              <strong>Numériser</strong>
              <span>Ajouter un document</span>
            </div>
            <ChevronRight size={15} />
          </button>

          <button type="button" className="archive-action-card import" onClick={() => handleAction("Importer")}>
            <div className="archive-action-icon">
              <Upload size={22} />
            </div>
            <div>
              <strong>Importer</strong>
              <span>Fichier PDF / Image</span>
            </div>
            <ChevronRight size={15} />
          </button>

          <button type="button" className="archive-action-card export" onClick={() => handleAction("Exporter")}>
            <div className="archive-action-icon">
              <Download size={22} />
            </div>
            <div>
              <strong>Exporter</strong>
              <span>Sauvegarde</span>
            </div>
            <ChevronRight size={15} />
          </button>
        </div>
      </section>

      <div className="archives-information">
        <div className="archives-information-icon">
          <Info size={16} />
        </div>
        <div>
          <strong>Archivage sécurisé</strong>
          <span>
            Les documents archivés sont conservés de manière sécurisée et leur
            accès est contrôlé selon les droits de l'utilisateur.
          </span>
        </div>
        <ShieldCheck size={18} className="archives-security-icon" />
      </div>

      {selectedDocument && (
        <div
          className="archives-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedDocument(null);
          }}
        >
          <div className="archives-modal">
            <div className="archives-modal-header">
              <div className="archives-modal-title">
                <div className="archives-modal-icon">
                  <DocumentIcon type={selectedDocument.type} />
                </div>
                <div>
                  <h2>{selectedDocument.type}</h2>
                  <p>{selectedDocument.reference}</p>
                </div>
              </div>

              <button
                type="button"
                className="archives-modal-close"
                onClick={() => setSelectedDocument(null)}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="archives-modal-body">
              <div className="archive-preview">
                <FileText size={38} />
                <h3>Aperçu du document</h3>
                <p>Le lecteur de documents PDF sera connecté au système d'archivage Django.</p>
              </div>

              <div className="archive-document-details">
                <div>
                  <span>Patient</span>
                  <strong>{selectedDocument.patient}</strong>
                </div>
                <div>
                  <span>Date</span>
                  <strong>{selectedDocument.date}</strong>
                </div>
                <div>
                  <span>Auteur</span>
                  <strong>{selectedDocument.author}</strong>
                </div>
                <div>
                  <span>Format</span>
                  <strong>{selectedDocument.format}</strong>
                </div>
              </div>
            </div>

            <div className="archives-modal-footer">
              <button type="button" className="archive-modal-cancel" onClick={() => setSelectedDocument(null)}>
                Fermer
              </button>
              <button
                type="button"
                className="archive-modal-download"
                onClick={() => handleAction("Téléchargement du document")}
              >
                <Download size={14} />
                Télécharger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
