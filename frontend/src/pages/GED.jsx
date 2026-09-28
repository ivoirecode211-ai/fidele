/*
 * ============================================================
 * MA SANTÉ — GED
 * Gestion Électronique des Documents
 * ============================================================
 */

import React, { useEffect, useMemo, useState } from "react";

import {
  Archive,
  Bell,
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
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
  Grid2X2,
  LogOut,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/GED.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

/* ============================================================
   DONNÉES DE DÉMONSTRATION
   ============================================================ */

const DEMO_PATIENTS = [
  {
    id: 1,
    patient_id: "PAT-0001",
    first_name: "Jean",
    last_name: "KOUADIO",
    name: "Jean KOUADIO",
  },
  {
    id: 2,
    patient_id: "PAT-0002",
    first_name: "Marie",
    last_name: "YAO",
    name: "Marie YAO",
  },
  {
    id: 3,
    patient_id: "PAT-0003",
    first_name: "Paul",
    last_name: "KOFFI",
    name: "Paul KOFFI",
  },
];

const DEMO_DOCUMENTS = [
  {
    id: 1,
    title: "Dossier médical — Jean KOUADIO",
    name: "dossier-medical-jean-kouadio.pdf",
    document_type: "Dossier médical",
    patient_name: "Jean KOUADIO",
    patient_id: "PAT-0001",
    description: "Dossier médical du patient Jean KOUADIO.",
    tags: ["patient", "médical"],
    created_at: "2026-09-27T09:30:00",
    file_size: "2.4 MB",
    file_url: "",
    folder: "Dossiers médicaux",
    favorite: true,
    archived: false,
    is_demo: true,
  },
  {
    id: 2,
    title: "Rapport de consultation — Marie YAO",
    name: "rapport-consultation-marie-yao.pdf",
    document_type: "Consultation",
    patient_name: "Marie YAO",
    patient_id: "PAT-0002",
    description: "Rapport de consultation médicale.",
    tags: ["consultation"],
    created_at: "2026-09-26T14:15:00",
    file_size: "850 KB",
    file_url: "",
    folder: "Consultations",
    favorite: false,
    archived: false,
    is_demo: true,
  },
  {
    id: 3,
    title: "Ordonnance — Paul KOFFI",
    name: "ordonnance-paul-koffi.pdf",
    document_type: "Ordonnance",
    patient_name: "Paul KOFFI",
    patient_id: "PAT-0003",
    description: "Ordonnance médicale du patient.",
    tags: ["pharmacie", "ordonnance"],
    created_at: "2026-09-25T10:00:00",
    file_size: "420 KB",
    file_url: "",
    folder: "Ordonnances",
    favorite: true,
    archived: false,
    is_demo: true,
  },
  {
    id: 4,
    title: "Résultat laboratoire — Jean KOUADIO",
    name: "resultat-laboratoire-jean-kouadio.pdf",
    document_type: "Résultat laboratoire",
    patient_name: "Jean KOUADIO",
    patient_id: "PAT-0001",
    description: "Résultats des examens de laboratoire.",
    tags: ["laboratoire", "résultat"],
    created_at: "2026-09-24T16:20:00",
    file_size: "1.1 MB",
    file_url: "",
    folder: "Laboratoire",
    favorite: false,
    archived: false,
    is_demo: true,
  },
  {
    id: 5,
    title: "Facture — Marie YAO",
    name: "facture-marie-yao.pdf",
    document_type: "Facture",
    patient_name: "Marie YAO",
    patient_id: "PAT-0002",
    description: "Facture des prestations médicales.",
    tags: ["finance", "facture"],
    created_at: "2026-09-23T11:45:00",
    file_size: "390 KB",
    file_url: "",
    folder: "Factures",
    favorite: false,
    archived: true,
    is_demo: true,
  },
];

/* ============================================================
   TYPES DE DOCUMENTS
   ============================================================ */

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

/* ============================================================
   OUTILS
   ============================================================ */

function getFileIcon(document) {
  const type = String(document?.document_type || "").toLowerCase();
  const name = String(document?.name || "").toLowerCase();

  if (
    type.includes("image") ||
    type.includes("radiologie") ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
  ) {
    return FileImage;
  }

  if (
    type.includes("archive") ||
    /\.(zip|rar|7z)$/i.test(name)
  ) {
    return FileArchive;
  }

  if (
    type.includes("pdf") ||
    /\.pdf$/i.test(name) ||
    type.includes("consultation") ||
    type.includes("ordonnance") ||
    type.includes("médical")
  ) {
    return FileText;
  }

  return File;
}

function getDocumentName(document) {
  return (
    document?.title ||
    document?.name ||
    document?.filename ||
    "Document sans nom"
  );
}

function getDocumentType(document) {
  return document?.document_type || document?.type || "Autre";
}

function getDocumentDate(document) {
  const date = document?.created_at || document?.date;

  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getPatientName(document) {
  return (
    document?.patient_name ||
    document?.patient?.name ||
    document?.patient?.full_name ||
    "Non associé"
  );
}

/* ============================================================
   COMPOSANT GED
   ============================================================ */

export default function GED() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  /* ==========================================================
     ÉTATS
     ========================================================== */

  const [activeTab, setActiveTab] = useState("ged");

  const [documents, setDocuments] = useState(DEMO_DOCUMENTS);
  const [trashDocuments, setTrashDocuments] = useState([]);
  const [patients, setPatients] = useState(DEMO_PATIENTS);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous les documents");
  const [patientFilter, setPatientFilter] = useState("Tous les patients");
  const [folderFilter, setFolderFilter] = useState("Tous les dossiers");
  const [sortOrder, setSortOrder] = useState("recent");

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    document_type: "Dossier médical",
    patient_id: "",
    description: "",
    tags: "",
    folder: "Dossiers médicaux",
    file: null,
  });

  const [indexForm, setIndexForm] = useState({
    title: "",
    document_type: "Dossier médical",
    patient_id: "",
    folder: "",
    tags: "",
    description: "",
  });

  const [error, setError] = useState("");

  /* ==========================================================
     TOKEN
     ========================================================== */

  const getToken = () => {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      localStorage.getItem("token") ||
      ""
    );
  };

  const getHeaders = () => {
    const token = getToken();

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  /* ==========================================================
     CHARGEMENT API
     ========================================================== */

  useEffect(() => {
    loadDocuments();
    loadPatients();
  }, []);

  async function loadDocuments() {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ged/documents/`, {
        headers: {
          ...getHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error("API GED indisponible");
      }

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : data.results || data.documents || [];

      if (list.length > 0) {
        setDocuments(list);
      }
    } catch {
      setDocuments(DEMO_DOCUMENTS);
    } finally {
      setLoading(false);
    }
  }

  async function loadPatients() {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/`, {
        headers: {
          ...getHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error("Patients indisponibles");
      }

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : data.results || data.patients || [];

      if (list.length > 0) {
        setPatients(list);
      }
    } catch {
      setPatients(DEMO_PATIENTS);
    }
  }

  /* ==========================================================
     NAVIGATION
     ========================================================== */

  function changeTab(tab) {
    setActiveTab(tab);
    setSelectedIds([]);

    if (
      tab === "ged" ||
      tab === "documents" ||
      tab === "search"
    ) {
      setFolderFilter("Tous les dossiers");
    }
  }

  function goToModules() {
    navigate("/modules");
  }

  function goToPatientSpace() {
    navigate("/patient-space");
  }

  function handleLogout() {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  /* ==========================================================
     FILTRES
     ========================================================== */

  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (activeTab === "trash") {
      return [...trashDocuments];
    }

    if (activeTab === "favorites") {
      result = result.filter((doc) => doc.favorite);
    }

    if (activeTab === "recent") {
      result = result.filter((doc) => {
        if (!doc.created_at) return false;

        const date = new Date(doc.created_at);
        const limit = new Date();

        limit.setDate(limit.getDate() - 30);

        return date >= limit;
      });
    }

    if (typeFilter !== "Tous les documents") {
      result = result.filter(
        (doc) => getDocumentType(doc) === typeFilter
      );
    }

    if (patientFilter !== "Tous les patients") {
      result = result.filter(
        (doc) => getPatientName(doc) === patientFilter
      );
    }

    if (folderFilter !== "Tous les dossiers") {
      result = result.filter(
        (doc) => doc.folder === folderFilter
      );
    }

    const keyword = search.trim().toLowerCase();

    if (keyword) {
      result = result.filter((doc) => {
        const content = [
          getDocumentName(doc),
          getDocumentType(doc),
          getPatientName(doc),
          doc.description,
          ...(Array.isArray(doc.tags) ? doc.tags : []),
        ]
          .join(" ")
          .toLowerCase();

        return content.includes(keyword);
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      return sortOrder === "old"
        ? dateA - dateB
        : dateB - dateA;
    });

    return result;
  }, [
    documents,
    trashDocuments,
    activeTab,
    search,
    typeFilter,
    patientFilter,
    folderFilter,
    sortOrder,
  ]);

  /* ==========================================================
     STATISTIQUES
     ========================================================== */

  const stats = useMemo(() => {
    return {
      total: documents.length,
      favorites: documents.filter((doc) => doc.favorite).length,
      archived: documents.filter((doc) => doc.archived).length,
      pdf: documents.filter((doc) =>
        String(doc.name || "").toLowerCase().endsWith(".pdf")
      ).length,
    };
  }, [documents]);

  /* ==========================================================
     SÉLECTION
     ========================================================== */

  function toggleSelect(id) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  function toggleSelectAll() {
    if (
      selectedIds.length === filteredDocuments.length &&
      filteredDocuments.length > 0
    ) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredDocuments.map((doc) => doc.id));
  }

  /* ==========================================================
     APERÇU
     ========================================================== */

  function previewDocument(document) {
    setSelectedDocument(document);

    setIndexForm({
      title: getDocumentName(document),
      document_type: getDocumentType(document),
      patient_id: document.patient_id || "",
      folder: document.folder || "",
      tags: Array.isArray(document.tags)
        ? document.tags.join(", ")
        : document.tags || "",
      description: document.description || "",
    });

    setShowPreviewModal(true);
  }

  /* ==========================================================
     TÉLÉCHARGEMENT
     ========================================================== */

  function downloadDocument(document) {
    if (document.file_url) {
      window.open(document.file_url, "_blank");
      return;
    }

    setError(
      "Ce document de démonstration ne possède pas encore de fichier réel."
    );

    setTimeout(() => setError(""), 3500);
  }

  /* ==========================================================
     SUPPRESSION
     ========================================================== */

  async function deleteDocument(document) {
    const confirmed = window.confirm(
      `Voulez-vous placer "${getDocumentName(
        document
      )}" dans la corbeille ?`
    );

    if (!confirmed) return;

    if (!document.is_demo) {
      try {
        await fetch(
          `${API_BASE_URL}/ged/documents/${document.id}/`,
          {
            method: "DELETE",
            headers: {
              ...getHeaders(),
            },
          }
        );
      } catch {
        setError("Impossible de supprimer le document.");
        return;
      }
    }

    setDocuments((previous) =>
      previous.filter((doc) => doc.id !== document.id)
    );

    setTrashDocuments((previous) => [
      ...previous,
      {
        ...document,
        archived: true,
      },
    ]);

    setSelectedIds((previous) =>
      previous.filter((id) => id !== document.id)
    );
  }

  /* ==========================================================
     RESTAURATION
     ========================================================== */

  function restoreDocument(document) {
    setTrashDocuments((previous) =>
      previous.filter((doc) => doc.id !== document.id)
    );

    setDocuments((previous) => [
      ...previous,
      {
        ...document,
        archived: false,
      },
    ]);
  }

  /* ==========================================================
     FAVORIS
     ========================================================== */

  function toggleFavorite(document) {
    setDocuments((previous) =>
      previous.map((doc) =>
        doc.id === document.id
          ? {
              ...doc,
              favorite: !doc.favorite,
            }
          : doc
      )
    );
  }

  /* ==========================================================
     RESET
     ========================================================== */

  function resetFilters() {
    setSearch("");
    setTypeFilter("Tous les documents");
    setPatientFilter("Tous les patients");
    setFolderFilter("Tous les dossiers");
    setSortOrder("recent");
  }

  /* ==========================================================
     UPLOAD
     ========================================================== */

  function handleUploadChange(event) {
    const { name, value, files } = event.target;

    if (name === "file") {
      setUploadForm((previous) => ({
        ...previous,
        file: files?.[0] || null,
      }));

      return;
    }

    setUploadForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!uploadForm.title.trim()) {
      setError("Veuillez renseigner le titre du document.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      if (uploadForm.file) {
        const formData = new FormData();

        formData.append("title", uploadForm.title);
        formData.append(
          "document_type",
          uploadForm.document_type
        );
        formData.append(
          "description",
          uploadForm.description
        );
        formData.append("folder", uploadForm.folder);
        formData.append("file", uploadForm.file);

        if (uploadForm.patient_id) {
          formData.append(
            "patient_id",
            uploadForm.patient_id
          );
        }

        if (uploadForm.tags) {
          formData.append("tags", uploadForm.tags);
        }

        const response = await fetch(
          `${API_BASE_URL}/ged/documents/`,
          {
            method: "POST",
            headers: {
              ...getHeaders(),
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Upload API échoué");
        }

        const data = await response.json();

        setDocuments((previous) => [
          data,
          ...previous,
        ]);
      } else {
        const newDocument = {
          id: Date.now(),
          title: uploadForm.title,
          name: "document.pdf",
          document_type: uploadForm.document_type,
          patient_name:
            patients.find(
              (patient) =>
                String(patient.id) ===
                String(uploadForm.patient_id)
            )?.name || "Non associé",
          patient_id: uploadForm.patient_id,
          description: uploadForm.description,
          tags: uploadForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          created_at: new Date().toISOString(),
          file_size: "0 KB",
          file_url: "",
          folder: uploadForm.folder,
          favorite: false,
          archived: false,
          is_demo: true,
        };

        setDocuments((previous) => [
          newDocument,
          ...previous,
        ]);
      }

      setShowUploadModal(false);

      setUploadForm({
        title: "",
        document_type: "Dossier médical",
        patient_id: "",
        description: "",
        tags: "",
        folder: "Dossiers médicaux",
        file: null,
      });
    } catch {
      const newDocument = {
        id: Date.now(),
        title: uploadForm.title,
        name:
          uploadForm.file?.name ||
          "nouveau-document.pdf",
        document_type: uploadForm.document_type,
        patient_name:
          patients.find(
            (patient) =>
              String(patient.id) ===
              String(uploadForm.patient_id)
          )?.name || "Non associé",
        patient_id: uploadForm.patient_id,
        description: uploadForm.description,
        tags: uploadForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        created_at: new Date().toISOString(),
        file_size: uploadForm.file
          ? `${(
              uploadForm.file.size /
              1024 /
              1024
            ).toFixed(2)} MB`
          : "0 KB",
        file_url: "",
        folder: uploadForm.folder,
        favorite: false,
        archived: false,
        is_demo: true,
      };

      setDocuments((previous) => [
        newDocument,
        ...previous,
      ]);

      setShowUploadModal(false);

      setUploadForm({
        title: "",
        document_type: "Dossier médical",
        patient_id: "",
        description: "",
        tags: "",
        folder: "Dossiers médicaux",
        file: null,
      });
    } finally {
      setUploading(false);
    }
  }

  /* ==========================================================
     INDEXATION
     ========================================================== */

  function saveIndexation(event) {
    event.preventDefault();

    if (!selectedDocument) return;

    setDocuments((previous) =>
      previous.map((doc) =>
        doc.id === selectedDocument.id
          ? {
              ...doc,
              title: indexForm.title,
              document_type: indexForm.document_type,
              patient_id: indexForm.patient_id,
              folder: indexForm.folder,
              tags: indexForm.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              description: indexForm.description,
              patient_name:
                patients.find(
                  (patient) =>
                    String(patient.id) ===
                    String(indexForm.patient_id)
                )?.name || getPatientName(doc),
            }
          : doc
      )
    );

    setSelectedDocument((previous) =>
      previous
        ? {
            ...previous,
            title: indexForm.title,
            document_type: indexForm.document_type,
            patient_id: indexForm.patient_id,
            folder: indexForm.folder,
            tags: indexForm.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            description: indexForm.description,
          }
        : previous
    );
  }

  /* ==========================================================
     SIDEBAR — MÊME STRUCTURE QUE PATIENTSPACE
     ========================================================== */

  function renderSidebar() {
    return (
      <aside
        className={`ged-sidebar ${
          !sidebarOpen ? "ged-sidebar-hidden" : ""
        }`}
      >
        {/* ==================================================
            IDENTITÉ MA SANTÉ
        ================================================== */}

        <div className="patient-sidebar-brand ged-patient-sidebar-brand">
          <div className="patient-sidebar-brand-icon">
            <Plus size={34} strokeWidth={5} />
          </div>

          <div className="patient-sidebar-brand-text">
            <strong>MA SANTÉ</strong>

            <span>
              Clinique &amp; Gestion
              <br />
              Hospitalière
            </span>
          </div>
        </div>

        {/* ==================================================
            MENU GED
        ================================================== */}

        <nav className="patient-space-menu ged-patient-space-menu">

          <button
            type="button"
            className={`${
              activeTab === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() => changeTab("dashboard")}
          >
            <FolderOpen size={19} />
            <span>Tableau de bord</span>
          </button>

          <button
            type="button"
            className={`${
              activeTab === "ged" ||
              activeTab === "documents"
                ? "active"
                : ""
            }`}
            onClick={() => changeTab("ged")}
          >
            <FileText size={19} />
            <span>Mes documents</span>
          </button>

          <button
            type="button"
            className={`${
              activeTab === "search"
                ? "active"
                : ""
            }`}
            onClick={() => changeTab("search")}
          >
            <Search size={19} />
            <span>Recherche</span>
          </button>

          <button
            type="button"
            className={`${
              activeTab === "indexation"
                ? "active"
                : ""
            }`}
            onClick={() => changeTab("indexation")}
          >
            <Tag size={19} />
            <span>Indexation</span>
          </button>

          <button
            type="button"
            className={`${
              activeTab === "favorites"
                ? "active"
                : ""
            }`}
            onClick={() => changeTab("favorites")}
          >
            <Star size={19} />
            <span>Mes favoris</span>
          </button>

          <button
            type="button"
            className={`${
              activeTab === "trash"
                ? "active"
                : ""
            }`}
            onClick={() => changeTab("trash")}
          >
            <Trash2 size={19} />
            <span>Corbeille</span>
          </button>

          <button
            type="button"
            className={`${
              activeTab === "administration"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeTab("administration")
            }
          >
            <Settings size={19} />
            <span>Administration</span>
          </button>

        </nav>

        {/* ==================================================
            ACTIONS EN BAS
        ================================================== */}

        <div className="patient-sidebar-bottom ged-patient-sidebar-bottom">

          <button
            type="button"
            className="patient-sidebar-action"
            onClick={goToModules}
            title="Retour aux modules"
          >
            <Grid2X2 size={20} />
            <span>Retour aux modules</span>
          </button>

          <button
            type="button"
            className="patient-sidebar-action patient-sidebar-logout"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>

        </div>
      </aside>
    );
  }

  /* ==========================================================
     TOPBAR
     ========================================================== */

  function renderTopbar() {
    const userName =
      user?.name ||
      user?.username ||
      user?.first_name ||
      "Utilisateur";

    return (
      <header className="ged-topbar">
        <button
          className="ged-menu-button"
          type="button"
          onClick={() =>
            setSidebarOpen(
              (previous) => !previous
            )
          }
          aria-label="Afficher ou masquer le menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="ged-topbar-actions">

          <div className="ged-notification-wrapper">

            <button
              className="ged-icon-button notification"
              type="button"
              onClick={() =>
                setShowNotifications(
                  (previous) => !previous
                )
              }
              title="Notifications"
            >
              <Bell size={19} />
              <span>3</span>
            </button>

            {showNotifications && (
              <div className="ged-notification-panel">
                <strong>Notifications</strong>

                <p>
                  3 nouvelles informations sont
                  disponibles.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowNotifications(false)
                  }
                >
                  Fermer
                </button>
              </div>
            )}

          </div>

          <div className="ged-account">

            <div className="ged-avatar">
              <UserRound size={18} />
            </div>

            <div>
              <strong>{userName}</strong>
              <span>Utilisateur connecté</span>
            </div>

            <ChevronDown size={16} />

          </div>

        </div>
      </header>
    );
  }

  /* ==========================================================
     TITRE
     ========================================================== */

  function getPageTitle() {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "Tableau de bord GED",
          description:
            "Vue générale de vos documents et activités.",
          icon: FolderOpen,
        };

      case "documents":
      case "ged":
        return {
          title: "Gestion des documents",
          description:
            "Centralisez, consultez et gérez vos documents.",
          icon: FileText,
        };

      case "search":
        return {
          title: "Recherche documentaire",
          description:
            "Retrouvez rapidement un document dans la GED.",
          icon: Search,
        };

      case "indexation":
        return {
          title: "Indexation",
          description:
            "Classez et renseignez les informations des documents.",
          icon: Tag,
        };

      case "favorites":
        return {
          title: "Mes favoris",
          description:
            "Retrouvez rapidement vos documents favoris.",
          icon: Star,
        };

      case "trash":
        return {
          title: "Corbeille",
          description:
            "Consultez et restaurez les documents supprimés.",
          icon: Trash2,
        };

      case "administration":
        return {
          title: "Administration GED",
          description:
            "Paramètres et informations du système documentaire.",
          icon: Settings,
        };

      default:
        return {
          title: "Gestion Électronique des Documents",
          description:
            "Centralisez vos documents médicaux et administratifs.",
          icon: FolderOpen,
        };
    }
  }

  /* ==========================================================
     DOSSIERS
     ========================================================== */

  function renderFolderPanel() {
    const folderGroups = [
      {
        name: "Administration",
        children: [
          "Courriers",
          "Décisions",
          "Notes de service",
          "Budgets",
        ],
      },
      {
        name: "Dossiers patients",
        children: [
          "Dossiers médicaux",
          "Consultations",
          "Ordonnances",
        ],
      },
      {
        name: "Résultats",
        children: [
          "Laboratoire",
          "Radiologie",
        ],
      },
      {
        name: "Finances",
        children: [
          "Factures",
          "Paiements",
          "Rapports financiers",
        ],
      },
    ];

    return (
      <aside className="ged-folder-panel ged-panel">

        <div className="ged-panel-heading">
          <h2>Explorateur</h2>
        </div>

        <button
          className={`ged-folder-root ${
            folderFilter === "Tous les dossiers"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setFolderFilter("Tous les dossiers")
          }
          type="button"
        >
          <FolderOpen size={16} />
          <span>Tous les documents</span>
          <b>{documents.length}</b>
        </button>

        <div className="ged-folder-tree">

          {folderGroups.map((group) => (
            <div
              className="ged-folder-group"
              key={group.name}
            >

              <button
                className="ged-folder-row"
                type="button"
              >
                <ChevronDown size={14} />
                <Folder size={15} />
                <span>{group.name}</span>
              </button>

              <div className="ged-folder-children">

                {group.children.map((child) => (
                  <button
                    className={`ged-folder-child ${
                      folderFilter === child
                        ? "selected"
                        : ""
                    }`}
                    key={child}
                    type="button"
                    onClick={() =>
                      setFolderFilter(child)
                    }
                  >
                    <Folder size={13} />
                    <span>{child}</span>
                  </button>
                ))}

              </div>

            </div>
          ))}

        </div>

        <div className="ged-folder-separator" />

        <div className="ged-folder-special">

          <button
            type="button"
            onClick={() =>
              changeTab("favorites")
            }
          >
            <Star size={14} />
            Favoris
          </button>

          <button
            type="button"
            onClick={() =>
              changeTab("recent")
            }
          >
            <Clock3 size={14} />
            Documents récents
          </button>

          <button
            type="button"
            onClick={() =>
              setFolderFilter(
                "Tous les dossiers"
              )
            }
          >
            <Archive size={14} />
            Documents archivés
          </button>

        </div>

      </aside>
    );
  }

  /* ==========================================================
     TABLEAU DES DOCUMENTS
     ========================================================== */

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

    if (filteredDocuments.length === 0) {
      return (
        <div className="ged-empty">

          <div className="ged-empty-icon">
            <FileText size={31} />
          </div>

          <h3>Aucun document trouvé</h3>

          <p>
            Aucun document ne correspond aux
            critères sélectionnés.
          </p>

          <button
            type="button"
            onClick={resetFilters}
          >
            <RefreshCw size={14} />
            Réinitialiser
          </button>

        </div>
      );
    }

    return (
      <div className="ged-table-wrapper">

        <table className="ged-table">

          <thead>
            <tr>

              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length ===
                      filteredDocuments.length &&
                    filteredDocuments.length > 0
                  }
                  onChange={toggleSelectAll}
                />
              </th>

              <th>DOCUMENT</th>
              <th>TYPE</th>
              <th>PATIENT</th>
              <th>DATE</th>
              <th>TAILLE</th>
              <th>ACTIONS</th>

            </tr>
          </thead>

          <tbody>

            {filteredDocuments.map((document) => {
              const FileIcon =
                getFileIcon(document);

              return (
                <tr
                  key={document.id}
                  className={
                    selectedDocument?.id ===
                    document.id
                      ? "selected-row"
                      : ""
                  }
                  onClick={() =>
                    setSelectedDocument(document)
                  }
                >

                  <td
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(
                        document.id
                      )}
                      onChange={() =>
                        toggleSelect(
                          document.id
                        )
                      }
                    />
                  </td>

                  <td>

                    <div className="ged-document-cell">

                      <div className="ged-file-icon">
                        <FileIcon size={17} />
                      </div>

                      <div>

                        <strong
                          title={getDocumentName(
                            document
                          )}
                        >
                          {getDocumentName(
                            document
                          )}
                        </strong>

                        <span>
                          {document.name ||
                            "Document numérique"}
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
                    {getPatientName(document)}
                  </td>

                  <td className="ged-date-cell">
                    {getDocumentDate(
                      document
                    )}
                  </td>

                  <td>
                    {document.file_size || "—"}
                  </td>

                  <td>

                    <div
                      className="ged-row-actions"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >

                      <button
                        type="button"
                        title="Voir"
                        onClick={() =>
                          previewDocument(
                            document
                          )
                        }
                      >
                        <Eye size={15} />
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
                        <Download size={15} />
                      </button>

                      <button
                        type="button"
                        title="Favori"
                        onClick={() =>
                          toggleFavorite(
                            document
                          )
                        }
                        className={
                          document.favorite
                            ? "favorite-active"
                            : ""
                        }
                      >
                        <Star size={15} />
                      </button>

                      <button
                        type="button"
                        className="danger"
                        title="Corbeille"
                        onClick={() =>
                          deleteDocument(
                            document
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        type="button"
                        title="Plus"
                      >
                        <MoreVertical size={15} />
                      </button>

                    </div>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

        <div className="ged-pagination">

          <button type="button">
            <ChevronLeft size={14} />
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

          <button type="button">
            <ChevronRight size={14} />
          </button>

          <span className="ged-pagination-count">
            {filteredDocuments.length} document(s)
          </span>

        </div>

      </div>
    );
  }

  /* ==========================================================
     RECHERCHE / FILTRES
     ========================================================== */

  function renderFilters() {
    return (
      <>
        <div className="ged-search-row">

          <div className="ged-main-search">

            <Search size={16} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Rechercher un document, patient, type..."
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                title="Effacer"
              >
                <X size={15} />
              </button>
            )}

            <button type="button">
              Rechercher
            </button>

          </div>

        </div>

        <div className="ged-filter-row">

          <label>

            <span>
              Type de document
            </span>

            <div className="ged-select">

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
              >
                {DOCUMENT_TYPES.map(
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

              <ChevronDown size={14} />

            </div>

          </label>

          <label>

            <span>Patient</span>

            <div className="ged-select">

              <select
                value={patientFilter}
                onChange={(event) =>
                  setPatientFilter(
                    event.target.value
                  )
                }
              >

                <option value="Tous les patients">
                  Tous les patients
                </option>

                {patients.map(
                  (patient) => (
                    <option
                      key={patient.id}
                      value={
                        patient.name ||
                        `${patient.first_name || ""} ${
                          patient.last_name || ""
                        }`.trim()
                      }
                    >
                      {patient.name ||
                        `${patient.first_name || ""} ${
                          patient.last_name || ""
                        }`.trim()}
                    </option>
                  )
                )}

              </select>

              <ChevronDown size={14} />

            </div>

          </label>

          <label>

            <span>Tri</span>

            <div className="ged-select">

              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(
                    event.target.value
                  )
                }
              >

                <option value="recent">
                  Plus récents
                </option>

                <option value="old">
                  Plus anciens
                </option>

              </select>

              <ChevronDown size={14} />

            </div>

          </label>

        </div>
      </>
    );
  }

  /* ==========================================================
     PANEL INDEXATION
     ========================================================== */

  function renderIndexPanel() {
    if (!selectedDocument) {
      return (
        <aside className="ged-index-panel ged-panel">

          <div className="ged-index-heading">
            <h2>Indexation</h2>
            <span>GED</span>
          </div>

          <div className="ged-index-empty">

            <div>
              <Tag size={29} />
            </div>

            <h3>
              Aucun document sélectionné
            </h3>

            <p>
              Sélectionnez un document dans
              la liste pour afficher ses
              informations et effectuer son
              indexation.
            </p>

          </div>

        </aside>
      );
    }

    return (
      <aside className="ged-index-panel ged-panel">

        <div className="ged-index-heading">

          <h2>Indexation</h2>

          <span>DOCUMENT</span>

        </div>

        <div className="ged-selected-file">

          <div className="ged-selected-file-icon">
            <FileText size={20} />
          </div>

          <div>

            <strong>
              {getDocumentName(
                selectedDocument
              )}
            </strong>

            <span>
              {selectedDocument.file_size ||
                "Taille inconnue"}
            </span>

          </div>

        </div>

        <form
          className="ged-index-form"
          onSubmit={saveIndexation}
        >

          <label>

            <span>
              Titre <b>*</b>
            </span>

            <input
              className="ged-index-input"
              value={indexForm.title}
              onChange={(event) =>
                setIndexForm(
                  (previous) => ({
                    ...previous,
                    title:
                      event.target.value,
                  })
                )
              }
            />

          </label>

          <label>

            <span>
              Type de document
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
                        event.target.value,
                    })
                  )
                }
              >

                {DOCUMENT_TYPES
                  .filter(
                    (type) =>
                      type !==
                      "Tous les documents"
                  )
                  .map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}

              </select>

              <ChevronDown size={14} />

            </div>

          </label>

          <label>

            <span>
              Patient associé
            </span>

            <div className="ged-index-select">

              <select
                value={
                  indexForm.patient_id
                }
                onChange={(event) =>
                  setIndexForm(
                    (previous) => ({
                      ...previous,
                      patient_id:
                        event.target.value,
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
                      {patient.name ||
                        `${patient.first_name || ""} ${
                          patient.last_name || ""
                        }`.trim()}
                    </option>
                  )
                )}

              </select>

              <ChevronDown size={14} />

            </div>

          </label>

          <label>

            <span>Dossier</span>

            <input
              className="ged-index-input"
              value={indexForm.folder}
              onChange={(event) =>
                setIndexForm(
                  (previous) => ({
                    ...previous,
                    folder:
                      event.target.value,
                  })
                )
              }
              placeholder="Ex : Dossiers médicaux"
            />

          </label>

          <label>

            <span>Tags</span>

            <div className="icon-input ged-index-input">

              <input
                value={indexForm.tags}
                onChange={(event) =>
                  setIndexForm(
                    (previous) => ({
                      ...previous,
                      tags:
                        event.target.value,
                    })
                  )
                }
                placeholder="patient, médical..."
              />

              <Tag size={14} />

            </div>

          </label>

          <label>

            <span>Description</span>

            <textarea
              className="ged-index-input ged-index-textarea"
              rows="4"
              value={
                indexForm.description
              }
              onChange={(event) =>
                setIndexForm(
                  (previous) => ({
                    ...previous,
                    description:
                      event.target.value,
                  })
                )
              }
            />

          </label>

          <div className="ged-index-actions">

            <button
              type="button"
              className="ged-reset-button"
              onClick={() =>
                setSelectedDocument(null)
              }
            >
              Annuler
            </button>

            <button
              type="submit"
              className="ged-save-button"
            >
              <Check size={15} />
              Enregistrer
            </button>

          </div>

        </form>

      </aside>
    );
  }

  /* ==========================================================
     WORKSPACE
     ========================================================== */

  function renderWorkspace() {
    return (
      <div className="ged-workspace">

        {renderFolderPanel()}

        <section className="ged-document-panel ged-panel">

          {renderFilters()}

          {renderDocumentTable()}

        </section>

        {renderIndexPanel()}

      </div>
    );
  }

  /* ==========================================================
     DASHBOARD
     ========================================================== */

  function renderDashboard() {
    return (
      <div className="ged-dashboard">

        <div className="ged-stats-grid">

          <div className="ged-stat-card">
            <div>
              <span>Total documents</span>
              <strong>{stats.total}</strong>
            </div>

            <div className="ged-stat-icon">
              <FileText size={22} />
            </div>
          </div>

          <div className="ged-stat-card">
            <div>
              <span>Documents favoris</span>
              <strong>{stats.favorites}</strong>
            </div>

            <div className="ged-stat-icon">
              <Star size={22} />
            </div>
          </div>

          <div className="ged-stat-card">
            <div>
              <span>Documents archivés</span>
              <strong>{stats.archived}</strong>
            </div>

            <div className="ged-stat-icon">
              <Archive size={22} />
            </div>
          </div>

          <div className="ged-stat-card">
            <div>
              <span>Documents PDF</span>
              <strong>{stats.pdf}</strong>
            </div>

            <div className="ged-stat-icon">
              <File size={22} />
            </div>
          </div>

        </div>

        <div className="ged-dashboard-card ged-panel">

          <div className="ged-dashboard-card-header">

            <div>
              <h2>
                Documents récents
              </h2>

              <p>
                Les derniers documents ajoutés
                à la GED.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                changeTab("ged")
              }
            >
              Voir tous les documents
            </button>

          </div>

          <div className="ged-recent-list">

            {documents
              .slice(0, 5)
              .map((document) => {

                const FileIcon =
                  getFileIcon(document);

                return (
                  <button
                    type="button"
                    className="ged-recent-item"
                    key={document.id}
                    onClick={() =>
                      previewDocument(
                        document
                      )
                    }
                  >

                    <div className="ged-file-icon">
                      <FileIcon size={17} />
                    </div>

                    <div>

                      <strong>
                        {getDocumentName(
                          document
                        )}
                      </strong>

                      <span>
                        {getPatientName(
                          document
                        )}{" "}
                        •{" "}
                        {getDocumentDate(
                          document
                        )}
                      </span>

                    </div>

                    <Eye size={16} />

                  </button>
                );
              })}

          </div>

        </div>

      </div>
    );
  }

  /* ==========================================================
     CORBEILLE
     ========================================================== */

  function renderTrash() {
    return (
      <div className="ged-panel ged-special-panel">

        <div className="ged-special-header">

          <div>
            <h2>
              Documents supprimés
            </h2>

            <p>
              Les documents déplacés dans la
              corbeille peuvent être restaurés.
            </p>
          </div>

          <Trash2 size={28} />

        </div>

        {trashDocuments.length === 0 ? (

          <div className="ged-empty">

            <div className="ged-empty-icon">
              <Trash2 size={30} />
            </div>

            <h3>
              La corbeille est vide
            </h3>

            <p>
              Aucun document n'est actuellement
              dans la corbeille.
            </p>

          </div>

        ) : (

          <div className="ged-trash-list">

            {trashDocuments.map(
              (document) => (
                <div
                  className="ged-trash-item"
                  key={document.id}
                >

                  <FileText size={21} />

                  <div>

                    <strong>
                      {getDocumentName(
                        document
                      )}
                    </strong>

                    <span>
                      {getDocumentDate(
                        document
                      )}
                    </span>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      restoreDocument(
                        document
                      )
                    }
                  >
                    <RefreshCw size={15} />
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

  /* ==========================================================
     ADMINISTRATION
     ========================================================== */

  function renderAdministration() {
    return (
      <div className="ged-admin-grid">

        <div className="ged-admin-card ged-panel">

          <Settings size={27} />

          <h2>
            Configuration GED
          </h2>

          <p>
            Gestion des paramètres généraux
            de la Gestion Électronique des
            Documents.
          </p>

          <button type="button">
            Paramètres
          </button>

        </div>

        <div className="ged-admin-card ged-panel">

          <Users size={27} />

          <h2>
            Utilisateurs
          </h2>

          <p>
            Gestion des droits d'accès aux
            documents et aux fonctions de la GED.
          </p>

          <button type="button">
            Gérer les utilisateurs
          </button>

        </div>

        <div className="ged-admin-card ged-panel">

          <Archive size={27} />

          <h2>
            Archivage
          </h2>

          <p>
            Paramétrage des règles d'archivage
            et de conservation des documents.
          </p>

          <button type="button">
            Configurer
          </button>

        </div>

      </div>
    );
  }

  /* ==========================================================
     MODALE UPLOAD
     ========================================================== */

  function renderUploadModal() {
    if (!showUploadModal) return null;

    return (
      <div
        className="ged-modal-overlay"
        onMouseDown={() =>
          !uploading &&
          setShowUploadModal(false)
        }
      >

        <div
          className="ged-modal"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >

          <div className="ged-modal-header">

            <div>

              <span>
                NOUVEAU DOCUMENT
              </span>

              <h2>
                Ajouter un document
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                !uploading &&
                setShowUploadModal(false)
              }
            >
              <X size={18} />
            </button>

          </div>

          <form
            className="ged-form"
            onSubmit={handleUpload}
          >

            <div className="ged-form-group">

              <label>
                Titre du document *
              </label>

              <input
                name="title"
                value={uploadForm.title}
                onChange={handleUploadChange}
                placeholder="Ex : Dossier médical Jean KOUADIO"
                required
              />

            </div>

            <div className="ged-form-grid">

              <div className="ged-form-group">

                <label>
                  Type de document
                </label>

                <select
                  name="document_type"
                  value={
                    uploadForm.document_type
                  }
                  onChange={
                    handleUploadChange
                  }
                >

                  {DOCUMENT_TYPES
                    .filter(
                      (type) =>
                        type !==
                        "Tous les documents"
                    )
                    .map((type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ))}

                </select>

              </div>

              <div className="ged-form-group">

                <label>
                  Patient associé
                </label>

                <select
                  name="patient_id"
                  value={
                    uploadForm.patient_id
                  }
                  onChange={
                    handleUploadChange
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
                        {patient.name ||
                          `${patient.first_name || ""} ${
                            patient.last_name || ""
                          }`.trim()}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

            <div className="ged-form-grid">

              <div className="ged-form-group">

                <label>Dossier</label>

                <input
                  name="folder"
                  value={
                    uploadForm.folder
                  }
                  onChange={
                    handleUploadChange
                  }
                  placeholder="Dossiers médicaux"
                />

              </div>

              <div className="ged-form-group">

                <label>Tags</label>

                <input
                  name="tags"
                  value={uploadForm.tags}
                  onChange={
                    handleUploadChange
                  }
                  placeholder="patient, médical..."
                />

              </div>

            </div>

            <div className="ged-form-group">

              <label>
                Fichier
              </label>

              <label className="ged-file-input">

                <Upload size={24} />

                <div>

                  <strong>
                    {uploadForm.file
                      ? uploadForm.file.name
                      : "Sélectionner un fichier"}
                  </strong>

                  <span>
                    PDF, Word, image,
                    document administratif...
                  </span>

                </div>

                <input
                  type="file"
                  name="file"
                  onChange={
                    handleUploadChange
                  }
                  hidden
                />

              </label>

            </div>

            <div className="ged-form-group">

              <label>
                Description
              </label>

              <textarea
                name="description"
                rows="4"
                value={
                  uploadForm.description
                }
                onChange={
                  handleUploadChange
                }
                placeholder="Description du document..."
              />

            </div>

            <div className="ged-modal-actions">

              <button
                type="button"
                className="ged-cancel-button"
                onClick={() =>
                  setShowUploadModal(false)
                }
                disabled={uploading}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="ged-submit-button"
                disabled={uploading}
              >

                {uploading ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="ged-spin-icon"
                    />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    Ajouter le document
                  </>
                )}

              </button>

            </div>

          </form>

        </div>

      </div>
    );
  }

  /* ==========================================================
     MODALE APERÇU
     ========================================================== */

  function renderPreviewModal() {
    if (
      !showPreviewModal ||
      !selectedDocument
    ) {
      return null;
    }

    const FileIcon =
      getFileIcon(selectedDocument);

    return (
      <div
        className="ged-modal-overlay"
        onMouseDown={() =>
          setShowPreviewModal(false)
        }
      >

        <div
          className="ged-preview-modal"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >

          <div className="ged-modal-header">

            <div>

              <span>
                APERÇU DU DOCUMENT
              </span>

              <h2>
                Informations
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowPreviewModal(false)
              }
            >
              <X size={18} />
            </button>

          </div>

          <div className="ged-preview-content">

            <div className="ged-preview-icon">
              <FileIcon size={38} />
            </div>

            <h3>
              {getDocumentName(
                selectedDocument
              )}
            </h3>

            <p>
              {selectedDocument.description ||
                "Aucune description disponible pour ce document."}
            </p>

            <div className="ged-preview-information">

              <div>
                <span>Type</span>
                <strong>
                  {getDocumentType(
                    selectedDocument
                  )}
                </strong>
              </div>

              <div>
                <span>Patient</span>
                <strong>
                  {getPatientName(
                    selectedDocument
                  )}
                </strong>
              </div>

              <div>
                <span>Date</span>
                <strong>
                  {getDocumentDate(
                    selectedDocument
                  )}
                </strong>
              </div>

              <div>
                <span>Taille</span>
                <strong>
                  {selectedDocument.file_size ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Dossier</span>
                <strong>
                  {selectedDocument.folder ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Favori</span>
                <strong>
                  {selectedDocument.favorite
                    ? "Oui"
                    : "Non"}
                </strong>
              </div>

            </div>

            <div className="ged-preview-actions">

              <button
                type="button"
                className="ged-cancel-button"
                onClick={() =>
                  setShowPreviewModal(false)
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
                <Download size={15} />
                Télécharger
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* ==========================================================
     RENDU PRINCIPAL
     ========================================================== */

  const pageInfo = getPageTitle();
  const PageIcon = pageInfo.icon;

  return (
    <div className="ged-page">

      {renderSidebar()}

      <div
        className={`ged-main ${
          !sidebarOpen
            ? "ged-main-expanded"
            : ""
        }`}
      >

        {renderTopbar()}

        <main className="ged-content">

          <div className="ged-page-title">

            <div className="ged-title-left">

              <div className="ged-title-icon">
                <PageIcon size={28} />
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

            {(activeTab === "ged" ||
              activeTab === "documents" ||
              activeTab === "dashboard") && (

              <button
                type="button"
                className="ged-upload-button"
                onClick={() =>
                  setShowUploadModal(true)
                }
              >
                <Upload size={17} />
                Ajouter un document
              </button>

            )}

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
                <X size={15} />
              </button>

            </div>

          )}

          {activeTab === "dashboard" &&
            renderDashboard()}

          {(activeTab === "ged" ||
            activeTab === "documents" ||
            activeTab === "search" ||
            activeTab === "favorites" ||
            activeTab === "recent") &&
            renderWorkspace()}

          {activeTab === "indexation" &&
            renderWorkspace()}

          {activeTab === "trash" &&
            renderTrash()}

          {activeTab === "administration" &&
            renderAdministration()}

        </main>

      </div>

      {renderUploadModal()}
      {renderPreviewModal()}

    </div>
  );
}