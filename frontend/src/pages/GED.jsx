import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  File,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Home,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "../styles/GED.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

/* =========================================================
   DONNÉES DE DÉMONSTRATION
   ========================================================= */

const DEMO_PATIENTS = [
  {
    id: "patient-001",
    first_name: "Jean",
    last_name: "KOUADIO",
  },
  {
    id: "patient-002",
    first_name: "Marie",
    last_name: "YAO",
  },
  {
    id: "patient-003",
    first_name: "Paul",
    last_name: "KOFFI",
  },
];

const DEMO_DOCUMENTS = [
  {
    id: "demo-001",
    title: "Dossier médical — KOUADIO Jean",
    name: "dossier-medical-kouadio-jean.pdf",
    document_type: "Dossier médical",
    patient_name: "KOUADIO Jean",
    patient_id: "patient-001",
    description:
      "Dossier médical de consultation et suivi du patient.",
    tags: "dossier médical, consultation, suivi",
    created_at: "2026-09-24T09:30:00",
    file_size: 2457600,
    file_url: "",
    folder: "Dossiers médicaux",
    favorite: true,
    archived: false,
    is_demo: true,
  },

  {
    id: "demo-002",
    title: "Compte rendu de consultation — 24/09/2026",
    name: "compte-rendu-consultation-24092026.pdf",
    document_type: "Consultation",
    patient_name: "YAO Marie",
    patient_id: "patient-002",
    description:
      "Compte rendu de consultation médicale du 24 septembre 2026.",
    tags: "consultation, compte rendu, 2026",
    created_at: "2026-09-24T14:15:00",
    file_size: 874496,
    file_url: "",
    folder: "Consultations",
    favorite: false,
    archived: false,
    is_demo: true,
  },

  {
    id: "demo-003",
    title: "Ordonnance — KOFFI Paul",
    name: "ordonnance-koffi-paul.pdf",
    document_type: "Ordonnance",
    patient_name: "KOFFI Paul",
    patient_id: "patient-003",
    description: "Ordonnance médicale du patient.",
    tags: "ordonnance, traitement, pharmacie",
    created_at: "2026-09-22T10:20:00",
    file_size: 532480,
    file_url: "",
    folder: "Ordonnances",
    favorite: true,
    archived: false,
    is_demo: true,
  },

  {
    id: "demo-004",
    title: "Résultat laboratoire — Analyse sanguine",
    name: "resultat-laboratoire-sanguin.pdf",
    document_type: "Résultat laboratoire",
    patient_name: "KOUADIO Jean",
    patient_id: "patient-001",
    description: "Résultats des analyses biologiques.",
    tags: "laboratoire, analyse, sang",
    created_at: "2026-09-20T08:10:00",
    file_size: 1249280,
    file_url: "",
    folder: "Laboratoire",
    favorite: false,
    archived: false,
    is_demo: true,
  },

  {
    id: "demo-005",
    title: "Facture consultation septembre",
    name: "facture-consultation-septembre.pdf",
    document_type: "Facture",
    patient_name: "YAO Marie",
    patient_id: "patient-002",
    description: "Facture relative aux soins du mois de septembre.",
    tags: "facture, septembre, paiement",
    created_at: "2026-09-18T16:45:00",
    file_size: 654336,
    file_url: "",
    folder: "Factures",
    favorite: false,
    archived: false,
    is_demo: true,
  },
];

const DOCUMENT_TYPES = [
  "Tous les documents",
  "Dossier médical",
  "Consultation",
  "Ordonnance",
  "Résultat laboratoire",
  "Radiologie",
  "Facture",
  "Pièce administrative",
  "Autre",
];

/* =========================================================
   UTILITAIRES
   ========================================================= */

function getFileIcon(fileName = "") {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (
    ["jpg", "jpeg", "png", "gif", "webp"].includes(extension)
  ) {
    return FileImage;
  }

  if (extension === "pdf") return FileText;

  if (["zip", "rar", "7z"].includes(extension)) {
    return FileArchive;
  }

  return File;
}

function getDocumentName(document) {
  return (
    document?.title ||
    document?.name ||
    document?.filename ||
    document?.file_name ||
    "Document sans titre"
  );
}

function getDocumentType(document) {
  return (
    document?.document_type ||
    document?.type ||
    "Autre"
  );
}

function getDocumentDate(document) {
  return (
    document?.created_at ||
    document?.date ||
    document?.updated_at
  );
}

function getPatientName(document) {
  return (
    document?.patient_name ||
    document?.patient_full_name ||
    document?.patient ||
    "Non associé"
  );
}

/* =========================================================
   COMPOSANT PRINCIPAL
   ========================================================= */

export default function GED() {
  const { user } = useAuth();

  const fileInputRef = useRef(null);

  /* =========================
     ÉTAT GÉNÉRAL
     ========================= */

  const [activeTab, setActiveTab] = useState("ged");

  const [documents, setDocuments] = useState([]);
  const [trashDocuments, setTrashDocuments] = useState([]);

  const [patients, setPatients] = useState(
    DEMO_PATIENTS
  );

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  /* =========================
     RECHERCHE / FILTRES
     ========================= */

  const [search, setSearch] = useState("");

  const [selectedType, setSelectedType] =
    useState("Tous les documents");

  const [selectedPatient, setSelectedPatient] =
    useState("");

  const [selectedFolder, setSelectedFolder] =
    useState("Tous les documents");

  const [sortBy, setSortBy] = useState("recent");

  /* =========================
     SÉLECTION
     ========================= */

  const [selectedDocument, setSelectedDocument] =
    useState(null);

  const [selectedIds, setSelectedIds] =
    useState([]);

  /* =========================
     MODALES
     ========================= */

  const [showUploadModal, setShowUploadModal] =
    useState(false);

  const [showPreviewModal, setShowPreviewModal] =
    useState(false);

  const [showNotifications, setShowNotifications] =
    useState(false);

  /* =========================
     FORMULAIRE UPLOAD
     ========================= */

  const [form, setForm] = useState({
    title: "",
    document_type: "Autre",
    patient: "",
    description: "",
    tags: "",
    file: null,
  });

  /* =========================
     FORMULAIRE INDEXATION
     ========================= */

  const [indexForm, setIndexForm] = useState({
    document_type: "",
    patient: "",
    tags: "",
    description: "",
  });

  const [error, setError] = useState("");

  /* =========================================================
     TOKEN
     ========================================================= */

  const token = useMemo(
    () =>
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      localStorage.getItem("token"),
    []
  );

  const headers = useMemo(
    () => ({
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    }),
    [token]
  );

  /* =========================================================
     FORMATAGE
     ========================================================= */

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return `${date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  function formatFileSize(bytes) {
    if (!bytes) return "—";

    if (bytes < 1024) {
      return `${bytes} o`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} Ko`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  /* =========================================================
     CHARGEMENT API
     ========================================================= */

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/ged/documents/`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      const apiDocuments = Array.isArray(data)
        ? data
        : data?.results || [];

      setDocuments(
        apiDocuments.length
          ? apiDocuments
          : DEMO_DOCUMENTS
      );
    } catch {
      setDocuments(DEMO_DOCUMENTS);

      setError(
        "Mode démonstration : les données de test sont affichées car l'API GED n'est pas disponible."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPatients() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/patients/`,
        {
          headers,
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      const apiPatients = Array.isArray(data)
        ? data
        : data?.results || [];

      if (apiPatients.length) {
        setPatients(apiPatients);
      }
    } catch {
      setPatients(DEMO_PATIENTS);
    }
  }

  useEffect(() => {
    loadDocuments();
    loadPatients();
  }, []);

  /* =========================================================
     FILTRAGE + TRI
     ========================================================= */

  const filteredDocuments = useMemo(() => {
    const value = search.trim().toLowerCase();

    let result = documents.filter((document) => {
      const matchesSearch =
        !value ||
        getDocumentName(document)
          .toLowerCase()
          .includes(value) ||
        getPatientName(document)
          .toLowerCase()
          .includes(value) ||
        String(document.description || "")
          .toLowerCase()
          .includes(value) ||
        String(document.tags || "")
          .toLowerCase()
          .includes(value);

      const matchesType =
        selectedType === "Tous les documents" ||
        getDocumentType(document) === selectedType;

      const matchesPatient =
        !selectedPatient ||
        String(
          document.patient_id ||
            document.patient
        ) === String(selectedPatient);

      const matchesFolder =
        selectedFolder === "Tous les documents" ||
        document.folder === selectedFolder;

      return (
        matchesSearch &&
        matchesType &&
        matchesPatient &&
        matchesFolder &&
        !document.archived
      );
    });

    /* Onglet favoris */
    if (activeTab === "favorites") {
      result = result.filter(
        (document) => document.favorite
      );
    }

    /* Onglet récents */
    if (activeTab === "recent") {
      result = [...result].sort(
        (a, b) =>
          new Date(getDocumentDate(b)) -
          new Date(getDocumentDate(a))
      );
    }

    /* Tri utilisateur */
    if (sortBy === "recent") {
      result = [...result].sort(
        (a, b) =>
          new Date(getDocumentDate(b)) -
          new Date(getDocumentDate(a))
      );
    }

    if (sortBy === "old") {
      result = [...result].sort(
        (a, b) =>
          new Date(getDocumentDate(a)) -
          new Date(getDocumentDate(b))
      );
    }

    if (sortBy === "name") {
      result = [...result].sort((a, b) =>
        getDocumentName(a).localeCompare(
          getDocumentName(b),
          "fr"
        )
      );
    }

    return result;
  }, [
    documents,
    search,
    selectedType,
    selectedPatient,
    selectedFolder,
    sortBy,
    activeTab,
  ]);

  /* =========================================================
     DOSSIERS
     ========================================================= */

  const folderGroups = [
    {
      label: "Administration",
      count: documents.filter(
        (d) => d.folder === "Courriers"
      ).length,
      children: [
        "Courriers",
        "Décisions",
        "Notes de service",
        "Budgets",
      ],
    },
    {
      label: "Dossiers patients",
      count: documents.filter(
        (d) =>
          [
            "Dossiers médicaux",
            "Consultations",
            "Ordonnances",
          ].includes(d.folder)
      ).length,
      children: [
        "Dossiers médicaux",
        "Consultations",
        "Ordonnances",
      ],
    },
    {
      label: "Résultats",
      count: documents.filter(
        (d) =>
          ["Laboratoire", "Radiologie"].includes(
            d.folder
          )
      ).length,
      children: ["Laboratoire", "Radiologie"],
    },
    {
      label: "Finances",
      count: documents.filter(
        (d) =>
          [
            "Factures",
            "Paiements",
            "Rapports financiers",
          ].includes(d.folder)
      ).length,
      children: [
        "Factures",
        "Paiements",
        "Rapports financiers",
      ],
    },
  ];

  /* =========================================================
     STATISTIQUES
     ========================================================= */

  const totalDocuments = documents.length;

  const favoriteDocuments = documents.filter(
    (document) => document.favorite
  ).length;

  const archivedDocuments = documents.filter(
    (document) => document.archived
  ).length;

  const pdfDocuments = documents.filter((document) =>
    getDocumentName(document)
      .toLowerCase()
      .endsWith(".pdf")
  ).length;

  /* =========================================================
     FORMULAIRES
     ========================================================= */

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const file =
      event.target.files?.[0] || null;

    setForm((previous) => ({
      ...previous,
      file,
      title:
        previous.title ||
        file?.name?.replace(/\.[^/.]+$/, "") ||
        "",
    }));
  }

  /* =========================================================
     SÉLECTION DOCUMENT
     ========================================================= */

  function selectDocument(document) {
    setSelectedDocument(document);

    setIndexForm({
      document_type:
        getDocumentType(document),
      patient:
        document?.patient_id ||
        document?.patient ||
        "",
      tags: document?.tags || "",
      description:
        document?.description || "",
    });
  }

  function toggleDocumentSelection(id) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter(
            (item) => item !== id
          )
        : [...previous, id]
    );
  }

  function toggleSelectAll() {
    if (
      selectedIds.length ===
      filteredDocuments.length
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        filteredDocuments.map(
          (document) => document.id
        )
      );
    }
  }

  /* =========================================================
     UPLOAD
     ========================================================= */

  function openUploadModal() {
    setForm({
      title: "",
      document_type: "Autre",
      patient: "",
      description: "",
      tags: "",
      file: null,
    });

    setShowUploadModal(true);
  }

  function closeUploadModal() {
    if (!uploading) {
      setShowUploadModal(false);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!form.file) {
      setError(
        "Veuillez sélectionner un document."
      );
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();

      formData.append(
        "title",
        form.title || form.file.name
      );

      formData.append(
        "document_type",
        form.document_type
      );

      if (form.patient) {
        formData.append(
          "patient",
          form.patient
        );
      }

      formData.append(
        "description",
        form.description
      );

      formData.append(
        "tags",
        form.tags
      );

      formData.append(
        "file",
        form.file
      );

      const response = await fetch(
        `${API_BASE_URL}/ged/documents/`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      const newDocument =
        await response.json();

      setDocuments((previous) => [
        newDocument,
        ...previous,
      ]);

      setShowUploadModal(false);

      selectDocument(newDocument);
    } catch {
      /*
       * Mode démo :
       * si l'API n'est pas disponible,
       * le document est ajouté localement.
       */

      const demoDocument = {
        id: `local-${Date.now()}`,
        title:
          form.title ||
          form.file.name,
        name: form.file.name,
        document_type:
          form.document_type,
        patient_id:
          form.patient || "",
        patient_name:
          patients.find(
            (patient) =>
              String(patient.id) ===
              String(form.patient)
          )
            ? `${patients.find(
                (patient) =>
                  String(patient.id) ===
                  String(form.patient)
              ).first_name} ${
                patients.find(
                  (patient) =>
                    String(patient.id) ===
                    String(form.patient)
                ).last_name
              }`
            : "Non associé",
        description:
          form.description,
        tags: form.tags,
        created_at:
          new Date().toISOString(),
        file_size:
          form.file.size,
        file_url:
          URL.createObjectURL(form.file),
        folder: "Dossiers médicaux",
        favorite: false,
        archived: false,
        is_demo: true,
      };

      setDocuments((previous) => [
        demoDocument,
        ...previous,
      ]);

      setShowUploadModal(false);

      selectDocument(demoDocument);

      setError(
        "Document ajouté en mode démonstration. Il sera réellement envoyé lorsque l'API GED sera disponible."
      );
    } finally {
      setUploading(false);
    }
  }

  /* =========================================================
     PRÉVISUALISATION
     ========================================================= */

  function openPreview(document) {
    setSelectedDocument(document);
    setShowPreviewModal(true);
  }

  function closePreview() {
    setShowPreviewModal(false);
  }

  /* =========================================================
     TÉLÉCHARGEMENT
     ========================================================= */

  function downloadDocument(document) {
    const url =
      document?.file_url ||
      document?.file ||
      document?.url;

    if (!url) {
      setError(
        "Aucun fichier disponible pour ce document de démonstration."
      );
      return;
    }

    const link =
      window.document.createElement("a");

    link.href = url;
    link.target = "_blank";
    link.rel =
      "noopener noreferrer";

    link.click();
  }

  /* =========================================================
     SUPPRESSION
     ========================================================= */

  async function deleteDocument(document) {
    const confirmed =
      window.confirm(
        `Voulez-vous déplacer "${getDocumentName(
          document
        )}" vers la corbeille ?`
      );

    if (!confirmed) return;

    try {
      if (!document.is_demo) {
        const response = await fetch(
          `${API_BASE_URL}/ged/documents/${document.id}/`,
          {
            method: "DELETE",
            headers,
          }
        );

        if (!response.ok) {
          throw new Error();
        }
      }

      setDocuments((previous) =>
        previous.filter(
          (item) =>
            item.id !== document.id
        )
      );

      setTrashDocuments((previous) => [
        {
          ...document,
          deleted_at:
            new Date().toISOString(),
        },
        ...previous,
      ]);

      if (
        selectedDocument?.id ===
        document.id
      ) {
        setSelectedDocument(null);
      }
    } catch {
      setError(
        "Impossible de supprimer ce document."
      );
    }
  }

  /* =========================================================
     RESTAURATION
     ========================================================= */

  function restoreDocument(document) {
    setTrashDocuments((previous) =>
      previous.filter(
        (item) =>
          item.id !== document.id
      )
    );

    setDocuments((previous) => [
      {
        ...document,
        archived: false,
      },
      ...previous,
    ]);

    setActiveTab("trash");
  }

  /* =========================================================
     FAVORIS
     ========================================================= */

  function toggleFavorite(document) {
    setDocuments((previous) =>
      previous.map((item) =>
        item.id === document.id
          ? {
              ...item,
              favorite: !item.favorite,
            }
          : item
      )
    );
  }

  /* =========================================================
     INDEXATION
     ========================================================= */

  async function saveIndexation() {
    if (!selectedDocument) {
      return;
    }

    const updatedDocument = {
      ...selectedDocument,
      document_type:
        indexForm.document_type,
      patient_id:
        indexForm.patient,
      tags: indexForm.tags,
      description:
        indexForm.description,
    };

    /*
     * Mise à jour locale immédiate.
     * Ici on pourra ensuite brancher PATCH/PUT.
     */

    setDocuments((previous) =>
      previous.map((item) =>
        item.id ===
        selectedDocument.id
          ? updatedDocument
          : item
      )
    );

    setSelectedDocument(
      updatedDocument
    );

    setError(
      "Indexation enregistrée en mode démonstration."
    );
  }

  /* =========================================================
     RESET FILTRES
     ========================================================= */

  function resetFilters() {
    setSearch("");
    setSelectedType(
      "Tous les documents"
    );
    setSelectedPatient("");
    setSelectedFolder(
      "Tous les documents"
    );
    setSortBy("recent");
  }

  /* =========================================================
     CHANGEMENT ONGLET
     ========================================================= */

  function changeTab(tab) {
    setActiveTab(tab);

    if (
      tab === "search" ||
      tab === "ged" ||
      tab === "documents"
    ) {
      setSelectedFolder(
        "Tous les documents"
      );
    }
  }

  /* =========================================================
     RENDU : SIDEBAR
     ========================================================= */

  function renderSidebar() {
    return (
      <aside className="ged-sidebar">
        <div className="ged-sidebar-brand">
          <div className="ged-brand-logo">
            <FolderOpen size={28} />
          </div>

          <div>
            <strong>GED</strong>

            <span>
              Gestion Électronique
              <br />
              des Documents
            </span>
          </div>
        </div>

        <nav className="ged-sidebar-nav">

          <button
            type="button"
            className={`ged-nav-item ${
              activeTab === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("dashboard")
            }
          >
            <Home size={20} />
            <span>Tableau de bord</span>
          </button>

          <button
            type="button"
            className={`ged-nav-item ${
              activeTab === "ged"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("ged")
            }
          >
            <FolderOpen size={20} />
            <span>GED</span>
          </button>

          <button
            type="button"
            className={`ged-nav-item ${
              activeTab === "documents"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("documents")
            }
          >
            <FileText size={20} />
            <span>Mes documents</span>
          </button>

          <button
            type="button"
            className={`ged-nav-item ${
              activeTab === "search"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("search")
            }
          >
            <Search size={20} />
            <span>Recherche</span>
          </button>

          <button
            type="button"
            className={`ged-nav-item ${
              activeTab === "indexation"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("indexation")
            }
          >
            <Tag size={20} />
            <span>Indexation</span>
          </button>

          <button
            type="button"
            className={`ged-nav-item ${
              activeTab === "trash"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("trash")
            }
          >
            <Trash2 size={20} />
            <span>Corbeille</span>
          </button>

          <button
            type="button"
            className={`ged-nav-item ${
              activeTab === "administration"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("administration")
            }
          >
            <Settings size={20} />
            <span>Administration</span>
          </button>
        </nav>

        <div className="ged-sidebar-footer">
          <FileText size={28} />

          <p>
            Un document bien indexé,
            c’est une information facile
            à retrouver !
          </p>
        </div>
      </aside>
    );
  }

  /* =========================================================
     RENDU : TOPBAR
     ========================================================= */

  function renderTopbar() {
    return (
      <header className="ged-topbar">
        <button
          className="ged-menu-button"
          type="button"
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="ged-topbar-actions">

          <button
            className="ged-icon-button notification"
            type="button"
            onClick={() =>
              setShowNotifications(
                (previous) =>
                  !previous
              )
            }
          >
            <Bell size={20} />
            <span>3</span>
          </button>

          <div className="ged-account">

            <div className="ged-avatar">
              <UserRound size={19} />
            </div>

            <div>
              <strong>
                {user?.first_name ||
                  user?.username ||
                  "Utilisateur"}{" "}
                {user?.last_name || ""}
              </strong>

              <span>
                {user?.role_label ||
                  user?.role ||
                  "Utilisateur"}
              </span>
            </div>

            <ChevronDown size={17} />

          </div>

        </div>

        {showNotifications && (
          <div
            style={{
              position: "absolute",
              right: 30,
              top: 58,
              zIndex: 50,
              width: 280,
              background: "#fff",
              border: "1px solid #dce5ef",
              borderRadius: 8,
              boxShadow:
                "0 15px 40px rgba(20,40,70,.15)",
              padding: 15,
            }}
          >
            <strong
              style={{
                color: "#102746",
                fontSize: 13,
              }}
            >
              Notifications
            </strong>

            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "#f5faff",
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              Nouveau document ajouté.
            </div>

            <div
              style={{
                marginTop: 7,
                padding: 10,
                background: "#f5faff",
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              Indexation à compléter.
            </div>

            <div
              style={{
                marginTop: 7,
                padding: 10,
                background: "#f5faff",
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              2 documents nécessitent
              votre attention.
            </div>
          </div>
        )}
      </header>
    );
  }

  /* =========================================================
     TITRE
     ========================================================= */

  function getPageTitle() {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "Tableau de bord GED",
          description:
            "Vue globale de votre gestion documentaire.",
          icon: Home,
        };

      case "documents":
        return {
          title: "Mes documents",
          description:
            "Consultez et gérez vos documents.",
          icon: FileText,
        };

      case "search":
        return {
          title: "Recherche documentaire",
          description:
            "Recherchez rapidement dans vos documents.",
          icon: Search,
        };

      case "indexation":
        return {
          title: "Indexation",
          description:
            "Classez et enrichissez les métadonnées de vos documents.",
          icon: Tag,
        };

      case "trash":
        return {
          title: "Corbeille",
          description:
            "Consultez les documents supprimés.",
          icon: Trash2,
        };

      case "administration":
        return {
          title: "Administration GED",
          description:
            "Configuration et statistiques du système documentaire.",
          icon: Settings,
        };

      default:
        return {
          title:
            "Gestion Électronique des Documents (GED)",
          description:
            "Stockez, organisez et retrouvez facilement vos documents.",
          icon: FolderOpen,
        };
    }
  }

  /* =========================================================
     TABLEAU DE BORD
     ========================================================= */

  function renderDashboard() {
    return (
      <div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 18,
          }}
        >

          {[
            {
              label: "Documents",
              value: totalDocuments,
              icon: FileText,
            },
            {
              label: "Favoris",
              value: favoriteDocuments,
              icon: Star,
            },
            {
              label: "PDF",
              value: pdfDocuments,
              icon: FileText,
            },
            {
              label: "Corbeille",
              value:
                trashDocuments.length,
              icon: Trash2,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="ged-panel"
                style={{
                  padding: 20,
                }}
              >
                <Icon
                  size={24}
                  color="#0877ed"
                />

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#102746",
                  }}
                >
                  {item.value}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: "#6f7f95",
                    fontSize: 11,
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="ged-panel"
          style={{
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                color: "#102746",
              }}
            >
              Documents récents
            </h2>

            <button
              type="button"
              className="ged-upload-button"
              onClick={() =>
                changeTab("documents")
              }
            >
              Voir tous les documents
            </button>
          </div>

          {documents
            .slice(0, 5)
            .map((document) => (
              <div
                key={document.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom:
                    "1px solid #edf1f5",
                }}
              >
                <div className="ged-file-icon">
                  <FileText size={20} />
                </div>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "#223b5c",
                    }}
                  >
                    {getDocumentName(
                      document
                    )}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 9,
                      color: "#8997a8",
                    }}
                  >
                    {formatDateTime(
                      getDocumentDate(
                        document
                      )
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="ged-row-actions"
                  onClick={() => {
                    selectDocument(
                      document
                    );
                    openPreview(
                      document
                    );
                  }}
                >
                  <Eye size={16} />
                </button>
              </div>
            ))}
        </div>
      </div>
    );
  }

  /* =========================================================
     ARBORESCENCE
     ========================================================= */

  function renderFolders() {
    return (
      <section className="ged-folder-panel ged-panel">

        <div className="ged-panel-heading">
          <h2>
            Arborescence des dossiers
          </h2>
        </div>

        <button
          type="button"
          className={`ged-folder-root ${
            selectedFolder ===
            "Tous les documents"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setSelectedFolder(
              "Tous les documents"
            )
          }
        >
          <ChevronDown size={16} />
          <Folder size={18} />

          <span>
            Tous les documents
          </span>

          <b>
            {documents.length}
          </b>
        </button>

        <div className="ged-folder-tree">

          {folderGroups.map(
            (group) => (
              <div
                className="ged-folder-group"
                key={group.label}
              >
                <button
                  type="button"
                  className="ged-folder-row"
                >
                  <ChevronDown
                    size={15}
                  />

                  <Folder
                    size={18}
                  />

                  <span>
                    {group.label}
                  </span>

                  <b>
                    {group.count}
                  </b>
                </button>

                <div className="ged-folder-children">
                  {group.children.map(
                    (child) => (
                      <button
                        type="button"
                        className={`ged-folder-child ${
                          selectedFolder ===
                          child
                            ? "selected"
                            : ""
                        }`}
                        key={child}
                        onClick={() =>
                          setSelectedFolder(
                            child
                          )
                        }
                      >
                        <Folder
                          size={16}
                        />

                        <span>
                          {child}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          )}

        </div>

        <div className="ged-folder-separator" />

        <div className="ged-folder-special">

          <button
            type="button"
            onClick={() =>
              changeTab(
                "favorites"
              )
            }
          >
            <Star size={17} />
            <span>
              Mes favoris
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType(
                "Tous les documents"
              );
              setSelectedFolder(
                "Tous les documents"
              );
            }}
          >
            <Folder size={16} />
            <span>
              Documents importants
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              changeTab("recent")
            }
          >
            <Clock3 size={16} />
            <span>
              Récents
            </span>
          </button>

        </div>
      </section>
    );
  }

  /* =========================================================
     TABLE DOCUMENTS
     ========================================================= */

  function renderDocumentTable() {
    if (loading) {
      return (
        <div className="ged-loading">
          <div className="ged-loading-spinner" />
          <span>
            Chargement des documents...
          </span>
        </div>
      );
    }

    if (!filteredDocuments.length) {
      return (
        <div className="ged-empty">

          <div className="ged-empty-icon">
            <FolderOpen size={42} />
          </div>

          <h3>
            Aucun document
          </h3>

          <p>
            Aucun document ne correspond
            aux critères actuels.
          </p>

          <button
            type="button"
            onClick={() => {
              resetFilters();
              openUploadModal();
            }}
          >
            <Upload size={17} />
            Ajouter un document
          </button>

        </div>
      );
    }

    return (
      <table className="ged-table">

        <thead>
          <tr>

            <th>
              <input
                type="checkbox"
                checked={
                  filteredDocuments.length >
                    0 &&
                  selectedIds.length ===
                    filteredDocuments.length
                }
                onChange={
                  toggleSelectAll
                }
                aria-label="Tout sélectionner"
              />
            </th>

            <th>
              Nom du document
            </th>

            <th>Type</th>

            <th>
              Date d’ajout
            </th>

            <th>
              Taille
            </th>

            <th />
          </tr>
        </thead>

        <tbody>

          {filteredDocuments.map(
            (document) => {

              const Icon =
                getFileIcon(
                  document.file_name ||
                    document.filename ||
                    document.file ||
                    document.name
                );

              const isSelected =
                selectedDocument?.id ===
                document.id;

              const checked =
                selectedIds.includes(
                  document.id
                );

              return (
                <tr
                  key={document.id}
                  className={
                    isSelected
                      ? "selected-row"
                      : ""
                  }
                  onClick={() =>
                    selectDocument(
                      document
                    )
                  }
                >

                  <td
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleDocumentSelection(
                          document.id
                        )
                      }
                      aria-label={
                        getDocumentName(
                          document
                        )
                      }
                    />
                  </td>

                  <td>
                    <div className="ged-document-cell">

                      <div className="ged-file-icon">
                        <Icon size={21} />
                      </div>

                      <div>

                        <strong>
                          {getDocumentName(
                            document
                          )}
                        </strong>

                        <span>
                          <Folder size={12} />
                          {getPatientName(
                            document
                          )}
                        </span>

                      </div>

                    </div>
                  </td>

                  <td>
                    <span className="ged-type-badge">
                      {getDocumentType(
                        document
                      )}
                    </span>
                  </td>

                  <td>
                    <span className="ged-date-cell">
                      {formatDateTime(
                        getDocumentDate(
                          document
                        )
                      )}
                    </span>
                  </td>

                  <td>
                    {formatFileSize(
                      document.file_size ||
                        document.size
                    )}
                  </td>

                  <td
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >

                    <div className="ged-row-actions">

                      <button
                        type="button"
                        title="Favori"
                        onClick={() =>
                          toggleFavorite(
                            document
                          )
                        }
                      >
                        <Star
                          size={16}
                          fill={
                            document.favorite
                              ? "#f2b01e"
                              : "none"
                          }
                        />
                      </button>

                      <button
                        type="button"
                        title="Consulter"
                        onClick={() =>
                          openPreview(
                            document
                          )
                        }
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        title="Télécharger"
                        onClick={() =>
                          downloadDocument(
                            document
                          )
                        }
                      >
                        <Download
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        title="Supprimer"
                        className="danger"
                        onClick={() =>
                          deleteDocument(
                            document
                          )
                        }
                      >
                        <Trash2
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        title="Plus d'actions"
                      >
                        <MoreVertical
                          size={17}
                        />
                      </button>

                    </div>

                  </td>

                </tr>
              );
            }
          )}

        </tbody>
      </table>
    );
  }

  /* =========================================================
     INDEXATION
     ========================================================= */

  function renderIndexPanel() {
    return (
      <aside className="ged-index-panel ged-panel">

        <div className="ged-index-heading">

          <h2>
            Indexation du document
          </h2>

          <span>
            GED
          </span>

        </div>

        {selectedDocument ? (
          <>
            <div className="ged-selected-file">

              <div className="ged-selected-file-icon">
                <FileText size={25} />
              </div>

              <div>

                <strong>
                  {getDocumentName(
                    selectedDocument
                  )}
                </strong>

                <span>
                  {formatFileSize(
                    selectedDocument.file_size ||
                      selectedDocument.size
                  )}{" "}
                  ·{" "}
                  {formatDateTime(
                    getDocumentDate(
                      selectedDocument
                    )
                  )}
                </span>

              </div>

            </div>

            <div className="ged-index-form">

              <label>
                <span>
                  Type de document{" "}
                  <b>*</b>
                </span>

                <div className="ged-index-select">

                  <select
                    value={
                      indexForm.document_type
                    }
                    onChange={(event) =>
                      setIndexForm(
                        (previous) => ({
                          ...previous,
                          document_type:
                            event.target
                              .value,
                        })
                      )
                    }
                  >
                    {DOCUMENT_TYPES.filter(
                      (type) =>
                        type !==
                        "Tous les documents"
                    ).map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown size={16} />

                </div>
              </label>

              <label>

                <span>
                  Patient associé
                </span>

                <div className="ged-index-select">

                  <select
                    value={
                      indexForm.patient
                    }
                    onChange={(event) =>
                      setIndexForm(
                        (previous) => ({
                          ...previous,
                          patient:
                            event.target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      Aucun patient
                    </option>

                    {patients.map(
                      (patient) => (
                        <option
                          key={patient.id}
                          value={patient.id}
                        >
                          {patient.first_name ||
                            patient.prenom ||
                            ""}{" "}
                          {patient.last_name ||
                            patient.nom ||
                            ""}
                        </option>
                      )
                    )}

                  </select>

                  <ChevronDown size={16} />

                </div>
              </label>

              <label>

                <span>
                  Date du document
                </span>

                <div className="ged-index-input icon-input">

                  <input
                    type="text"
                    value={formatDate(
                      getDocumentDate(
                        selectedDocument
                      )
                    )}
                    readOnly
                  />

                  <CalendarDays size={16} />

                </div>

              </label>

              <label>

                <span>
                  Mots-clés
                </span>

                <input
                  className="ged-index-input"
                  value={
                    indexForm.tags
                  }
                  onChange={(event) =>
                    setIndexForm(
                      (previous) => ({
                        ...previous,
                        tags: event.target
                          .value,
                      })
                    )
                  }
                  placeholder="courrier, administration, 2026"
                />

              </label>

              <label>

                <span>
                  Description
                </span>

                <textarea
                  className="ged-index-input ged-index-textarea"
                  value={
                    indexForm.description
                  }
                  onChange={(event) =>
                    setIndexForm(
                      (previous) => ({
                        ...previous,
                        description:
                          event.target
                            .value,
                      })
                    )
                  }
                  rows={4}
                  placeholder="Description du document..."
                />

              </label>

            </div>

            <div className="ged-index-actions">

              <button
                type="button"
                className="ged-reset-button"
                onClick={() =>
                  selectDocument(
                    selectedDocument
                  )
                }
              >
                Réinitialiser
              </button>

              <button
                type="button"
                className="ged-save-button"
                onClick={
                  saveIndexation
                }
              >
                Enregistrer
              </button>

            </div>
          </>
        ) : (

          <div className="ged-index-empty">

            <div>
              <Tag size={32} />
            </div>

            <h3>
              Sélectionnez un document
            </h3>

            <p>
              Cliquez sur un document
              dans la liste pour afficher
              et compléter ses métadonnées
              d’indexation.
            </p>

          </div>

        )}

      </aside>
    );
  }

  /* =========================================================
     WORKSPACE PRINCIPAL
     ========================================================= */

  function renderWorkspace() {
    return (
      <div className="ged-workspace">

        {renderFolders()}

        <section className="ged-document-panel ged-panel">

          <div className="ged-search-row">

            <div className="ged-main-search">

              <Search size={19} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Rechercher un document, un mot-clé..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  <X size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={() => {}}
              >
                Rechercher
              </button>

            </div>

          </div>

          <div className="ged-filter-row">

            <label>

              <span>
                Type
              </span>

              <div className="ged-select">

                <select
                  value={
                    selectedType
                  }
                  onChange={(event) =>
                    setSelectedType(
                      event.target
                        .value
                    )
                  }
                >

                  {DOCUMENT_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type ===
                        "Tous les documents"
                          ? "Tous"
                          : type}
                      </option>
                    )
                  )}

                </select>

                <ChevronDown
                  size={16}
                />

              </div>

            </label>

            <label>

              <span>
                Patient
              </span>

              <div className="ged-select">

                <select
                  value={
                    selectedPatient
                  }
                  onChange={(event) =>
                    setSelectedPatient(
                      event.target
                        .value
                    )
                  }
                >

                  <option value="">
                    Tous les patients
                  </option>

                  {patients.map(
                    (patient) => (
                      <option
                        key={patient.id}
                        value={
                          patient.id
                        }
                      >
                        {patient.first_name ||
                          patient.prenom ||
                          ""}{" "}
                        {patient.last_name ||
                          patient.nom ||
                          ""}
                      </option>
                    )
                  )}

                </select>

                <ChevronDown
                  size={16}
                />

              </div>

            </label>

            <label>

              <span>
                Trier par
              </span>

              <div className="ged-select">

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="recent">
                    Plus récents
                  </option>

                  <option value="old">
                    Plus anciens
                  </option>

                  <option value="name">
                    Nom du document
                  </option>
                </select>

                <ChevronDown
                  size={16}
                />

              </div>

            </label>

          </div>

          {selectedIds.length >
            0 && (
            <div
              style={{
                margin:
                  "0 14px 10px",
                padding:
                  "8px 10px",
                background:
                  "#eaf4ff",
                borderRadius: 5,
                color:
                  "#0877ed",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {selectedIds.length}{" "}
              document(s)
              sélectionné(s)
            </div>
          )}

          <div className="ged-table-wrapper">
            {renderDocumentTable()}
          </div>

          <div className="ged-pagination">

            <button
              type="button"
              disabled
            >
              <ChevronLeft
                size={16}
              />
            </button>

            <button
              type="button"
              className="active"
            >
              1
            </button>

            <button type="button">
              2
            </button>

            <button type="button">
              3
            </button>

            <span>
              ...
            </span>

            <button type="button">
              <ChevronRight
                size={16}
              />
            </button>

            <span className="ged-pagination-count">
              1–
              {filteredDocuments.length}{" "}
              sur{" "}
              {totalDocuments}
            </span>

          </div>

        </section>

        {renderIndexPanel()}

      </div>
    );
  }

  /* =========================================================
     CORBEILLE
     ========================================================= */

  function renderTrash() {
    return (
      <div className="ged-panel">

        <div
          className="ged-panel-heading"
        >
          <h2>
            Documents supprimés
          </h2>
        </div>

        {trashDocuments.length ===
        0 ? (
          <div className="ged-empty">
            <div className="ged-empty-icon">
              <Trash2 size={42} />
            </div>

            <h3>
              Corbeille vide
            </h3>

            <p>
              Aucun document n'a été
              supprimé.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: 15,
            }}
          >
            {trashDocuments.map(
              (document) => (
                <div
                  key={document.id}
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 12,
                    padding: 12,
                    borderBottom:
                      "1px solid #edf1f5",
                  }}
                >

                  <FileText
                    size={25}
                    color="#0877ed"
                  />

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <strong
                      style={{
                        display:
                          "block",
                        fontSize: 11,
                      }}
                    >
                      {getDocumentName(
                        document
                      )}
                    </strong>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop: 4,
                        color:
                          "#8997a8",
                        fontSize: 9,
                      }}
                    >
                      Supprimé le{" "}
                      {formatDateTime(
                        document.deleted_at
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ged-save-button"
                    onClick={() =>
                      restoreDocument(
                        document
                      )
                    }
                  >
                    <RefreshCw
                      size={15}
                    />
                    Restaurer
                  </button>

                </div>
              )
            )}
          </div>
        )}

      </div>
    );
  }

  /* =========================================================
     ADMINISTRATION
     ========================================================= */

  function renderAdministration() {
    return (
      <div
        style={{
          display: "grid",
          gap: 15,
        }}
      >

        <div className="ged-panel">
          <div className="ged-panel-heading">
            <h2>
              Statistiques GED
            </h2>
          </div>

          <div
            style={{
              padding: 20,
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 15,
            }}
          >

            <div>
              <strong
                style={{
                  fontSize: 25,
                  color:
                    "#102746",
                }}
              >
                {totalDocuments}
              </strong>

              <p
                style={{
                  fontSize: 11,
                  color:
                    "#6f7f95",
                }}
              >
                Documents
              </p>
            </div>

            <div>
              <strong
                style={{
                  fontSize: 25,
                  color:
                    "#0877ed",
                }}
              >
                {favoriteDocuments}
              </strong>

              <p
                style={{
                  fontSize: 11,
                  color:
                    "#6f7f95",
                }}
              >
                Favoris
              </p>
            </div>

            <div>
              <strong
                style={{
                  fontSize: 25,
                  color:
                    "#1aa46f",
                }}
              >
                {archivedDocuments}
              </strong>

              <p
                style={{
                  fontSize: 11,
                  color:
                    "#6f7f95",
                }}
              >
                Archivés
              </p>
            </div>

          </div>
        </div>

        <div className="ged-panel">

          <div className="ged-panel-heading">
            <h2>
              Configuration
            </h2>
          </div>

          <div
            style={{
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >

            <label
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                fontSize: 11,
              }}
            >
              <span>
                Indexation obligatoire
              </span>

              <input
                type="checkbox"
                defaultChecked
              />
            </label>

            <label
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                fontSize: 11,
              }}
            >
              <span>
                Conservation automatique
              </span>

              <input
                type="checkbox"
                defaultChecked
              />
            </label>

            <label
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                fontSize: 11,
              }}
            >
              <span>
                Notifications GED
              </span>

              <input
                type="checkbox"
                defaultChecked
              />
            </label>

          </div>
        </div>

      </div>
    );
  }

  /* =========================================================
     TITRE PRINCIPAL
     ========================================================= */

  const pageInfo =
    getPageTitle();

  const PageIcon =
    pageInfo.icon;

  /* =========================================================
     RENDU FINAL
     ========================================================= */

  return (
    <div className="ged-page">

      {renderSidebar()}

      <div className="ged-main">

        {renderTopbar()}

        <main className="ged-content">

          <div className="ged-page-title">

            <div className="ged-title-left">

              <div className="ged-title-icon">
                <PageIcon size={30} />
              </div>

              <div>
                <h1>
                  {pageInfo.title}
                </h1>

                <p>
                  {pageInfo.description}
                </p>
              </div>

            </div>

            <button
              type="button"
              className="ged-upload-button"
              onClick={
                openUploadModal
              }
            >
              <Upload size={18} />
              Ajouter un document
            </button>

          </div>

          {error && (
            <div className="ged-alert">

              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >
                <X size={17} />
              </button>

            </div>
          )}

          {/* ===============================
              TABLEAU DE BORD
              =============================== */}

          {activeTab ===
            "dashboard" &&
            renderDashboard()}

          {/* ===============================
              GED / DOCUMENTS / RECHERCHE
              =============================== */}

          {(activeTab === "ged" ||
            activeTab ===
              "documents" ||
            activeTab ===
              "search" ||
            activeTab ===
              "favorites" ||
            activeTab ===
              "recent") &&
            renderWorkspace()}

          {/* ===============================
              INDEXATION
              =============================== */}

          {activeTab ===
            "indexation" && (
            <div
              style={{
                maxWidth: 700,
              }}
            >
              {selectedDocument ? (
                renderIndexPanel()
              ) : (
                <div className="ged-panel">
                  <div className="ged-index-empty">
                    <div>
                      <Tag size={32} />
                    </div>

                    <h3>
                      Sélectionnez un document
                    </h3>

                    <p>
                      Rendez-vous dans
                      « Mes documents »
                      puis cliquez sur un
                      document pour
                      l'indexer.
                    </p>

                    <button
                      type="button"
                      className="ged-upload-button"
                      style={{
                        marginTop: 15,
                      }}
                      onClick={() =>
                        changeTab(
                          "documents"
                        )
                      }
                    >
                      <FileText
                        size={16}
                      />
                      Ouvrir mes documents
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===============================
              CORBEILLE
              =============================== */}

          {activeTab ===
            "trash" &&
            renderTrash()}

          {/* ===============================
              ADMINISTRATION
              =============================== */}

          {activeTab ===
            "administration" &&
            renderAdministration()}

        </main>
      </div>

      {/* =====================================================
          MODALE AJOUT
          ===================================================== */}

      {showUploadModal && (
        <div
          className="ged-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeUploadModal();
            }
          }}
        >

          <div className="ged-modal">

            <div className="ged-modal-header">

              <div>
                <span>
                  GED
                </span>

                <h2>
                  Ajouter un document
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeUploadModal
                }
                disabled={
                  uploading
                }
              >
                <X size={20} />
              </button>

            </div>

            <form
              className="ged-form"
              onSubmit={
                handleUpload
              }
            >

              <div className="ged-form-group">

                <label>
                  Document
                </label>

                <div
                  className="ged-file-input"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >

                  <Upload
                    size={24}
                  />

                  <div>

                    <strong>
                      {form.file
                        ? form.file.name
                        : "Sélectionner un fichier"}
                    </strong>

                    <span>
                      Cliquez pour
                      choisir le document
                    </span>

                  </div>

                </div>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  onChange={
                    handleFileChange
                  }
                  hidden
                />

              </div>

              <div className="ged-form-grid">

                <div className="ged-form-group">

                  <label htmlFor="ged-title">
                    Titre du document
                  </label>

                  <input
                    id="ged-title"
                    name="title"
                    type="text"
                    value={
                      form.title
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Ex. Compte rendu consultation"
                    required
                  />

                </div>

                <div className="ged-form-group">

                  <label htmlFor="ged-type">
                    Type de document
                  </label>

                  <select
                    id="ged-type"
                    name="document_type"
                    value={
                      form.document_type
                    }
                    onChange={
                      handleFormChange
                    }
                  >
                    {DOCUMENT_TYPES.filter(
                      (type) =>
                        type !==
                        "Tous les documents"
                    ).map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              <div className="ged-form-group">

                <label htmlFor="ged-patient">
                  Patient
                </label>

                <select
                  id="ged-patient"
                  name="patient"
                  value={
                    form.patient
                  }
                  onChange={
                    handleFormChange
                  }
                >

                  <option value="">
                    Aucun patient associé
                  </option>

                  {patients.map(
                    (patient) => (
                      <option
                        key={
                          patient.id
                        }
                        value={
                          patient.id
                        }
                      >
                        {patient.first_name ||
                          patient.prenom ||
                          ""}{" "}
                        {patient.last_name ||
                          patient.nom ||
                          ""}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="ged-form-group">

                <label htmlFor="ged-description">
                  Description
                </label>

                <textarea
                  id="ged-description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleFormChange
                  }
                  rows="4"
                  placeholder="Description..."
                />

              </div>

              <div className="ged-form-group">

                <label htmlFor="ged-tags">
                  Mots-clés / indexation
                </label>

                <input
                  id="ged-tags"
                  name="tags"
                  type="text"
                  value={
                    form.tags
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Ex. consultation, cardiologie, 2026"
                />

              </div>

              <div className="ged-modal-actions">

                <button
                  type="button"
                  className="ged-cancel-button"
                  onClick={
                    closeUploadModal
                  }
                  disabled={
                    uploading
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="ged-submit-button"
                  disabled={
                    uploading
                  }
                >

                  <Upload
                    size={17}
                  />

                  {uploading
                    ? "Enregistrement..."
                    : "Indexer le document"}

                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODALE PRÉVISUALISATION
          ===================================================== */}

      {showPreviewModal &&
        selectedDocument && (
          <div
            className="ged-modal-overlay"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closePreview();
              }
            }}
          >

            <div className="ged-preview-modal">

              <div className="ged-modal-header">

                <div>

                  <span>
                    DOCUMENT
                  </span>

                  <h2>
                    {getDocumentName(
                      selectedDocument
                    )}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={
                    closePreview
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="ged-preview-content">

                <div className="ged-preview-icon">
                  <FileText
                    size={50}
                  />
                </div>

                <h3>
                  {getDocumentName(
                    selectedDocument
                  )}
                </h3>

                <p>
                  {selectedDocument.description ||
                    "Aucune description disponible."}
                </p>

                <div className="ged-preview-information">

                  <div>
                    <span>
                      Patient
                    </span>

                    <strong>
                      {getPatientName(
                        selectedDocument
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Type
                    </span>

                    <strong>
                      {getDocumentType(
                        selectedDocument
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Date
                    </span>

                    <strong>
                      {formatDate(
                        getDocumentDate(
                          selectedDocument
                        )
                      )}
                    </strong>
                  </div>

                </div>

                <div
                  style={{
                    marginTop: 15,
                    padding: 12,
                    border:
                      "1px solid #dce5ef",
                    borderRadius: 6,
                    textAlign:
                      "left",
                    background:
                      "#f9fbfd",
                  }}
                >
                  <strong
                    style={{
                      fontSize: 10,
                      color:
                        "#102746",
                    }}
                  >
                    Mots-clés
                  </strong>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      fontSize: 10,
                      color:
                        "#6f7f95",
                    }}
                  >
                    {selectedDocument.tags ||
                      "Aucun mot-clé"}
                  </p>
                </div>

              </div>

              <div className="ged-preview-actions">

                <button
                  type="button"
                  className="ged-cancel-button"
                  onClick={
                    closePreview
                  }
                >
                  Fermer
                </button>

                <button
                  type="button"
                  className="ged-submit-button"
                  onClick={() =>
                    downloadDocument(
                      selectedDocument
                    )
                  }
                >
                  <Download
                    size={17}
                  />
                  Télécharger
                </button>

              </div>

            </div>
          </div>
        )}

    </div>
  );
}