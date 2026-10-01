import { useEffect, useState } from "react";
import { ImagePlus, Save, Settings, Trash2, X } from "lucide-react";

import api from "../../services/api";
import { oublierEtablissement } from "../LogoEtablissement";

const SECTIONS = [
  {
    title: "Identité de l'hôpital",
    fields: [
      { name: "name", label: "Nom de l'hôpital", required: true },
      { name: "slogan", label: "Slogan" },
      { name: "license_number", label: "Numéro d'agrément" },
      { name: "opening_hours", label: "Horaires d'ouverture" },
      { name: "currency", label: "Devise", required: true },
    ],
  },
  {
    title: "Coordonnées",
    fields: [
      { name: "phone", label: "Téléphone" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "city", label: "Ville" },
      { name: "district", label: "Quartier" },
      { name: "address", label: "Adresse" },
    ],
  },
  {
    title: "Caisse et tickets",
    fields: [
      { name: "ticket_copies", label: "Nombre de souches par ticket", type: "number", min: 1, max: 5, required: true,
        help: "Exemplaires imprimés sur la feuille A5 (1 à 5)." },
      { name: "ticket_validity_days", label: "Validité d'un reçu (jours)", type: "number", min: 1, max: 365, required: true,
        help: "Pendant ce délai, un nouveau ticket pour la même consultation est refusé : on réimprime l'ancien." },
      { name: "ticket_exclusions", label: "Exclusions mentionnées sur le ticket",
        help: "Ex. Laboratoire – Échographie – Hospitalisation" },
      { name: "ticket_note", label: "Mention en pied de ticket" },
    ],
  },
];

/*
 * Logo de l'hôpital : déposé tout de suite (route à part, qui vérifie le format),
 * puis imprimé sur les tickets, les reçus et les documents de cet hôpital seulement.
 */
function LogoHopital({ logo, onChange }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const deposer = async (event) => {
    const fichier = event.target.files?.[0];
    event.target.value = "";
    if (!fichier) return;
    setErreur("");
    if (fichier.size > 300 * 1024) {
      setErreur("Le logo dépasse 300 Ko : réduisez l'image puis réessayez.");
      return;
    }
    const corps = new FormData();
    corps.append("logo", fichier);
    setEnvoi(true);
    try {
      const { data } = await api.post("/administration/parametres/logo/", corps,
        { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.logo);
      oublierEtablissement();
    } catch (error) {
      setErreur(error.response?.data?.detail || "Envoi du logo impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  const retirer = async () => {
    setEnvoi(true);
    try {
      const { data } = await api.delete("/administration/parametres/logo/");
      onChange(data.logo);
      oublierEtablissement();
    } catch {
      setErreur("Retrait du logo impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <fieldset className="admin-settings-section">
      <legend>Logo de l'hôpital</legend>
      <div className="admin-logo">
        <div className="admin-logo-apercu">
          {logo ? <img src={logo} alt="Logo de l'hôpital" /> : <span>Aucun logo</span>}
        </div>
        <div className="admin-logo-actions">
          <p className="admin-settings-help">
            Imprimé sur les tickets de caisse, les reçus de pharmacie, les résultats de laboratoire et les rapports.
            PNG, JPEG ou WebP, 300 Ko au plus ; de préférence carré, sur fond blanc ou transparent.
          </p>
          <div className="admin-logo-boutons">
            <label className={`administration-save-button admin-logo-choisir ${envoi ? "occupe" : ""}`}>
              <ImagePlus size={16} />
              {logo ? "Changer le logo" : "Choisir une image"}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={deposer} disabled={envoi} hidden />
            </label>
            {logo && (
              <button type="button" className="administration-cancel-button" onClick={retirer} disabled={envoi}>
                <Trash2 size={16} />
                Retirer
              </button>
            )}
          </div>
          {erreur && <p className="admin-logo-erreur" role="alert">{erreur}</p>}
        </div>
      </div>
    </fieldset>
  );
}

/* Paramètres de l'hôpital de l'administrateur (/api/administration/parametres/). */
export default function GeneralSettingsModal({ onClose }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/administration/parametres/")
      .then((response) => setForm(response.data))
      .catch(() => alert("Impossible de charger les paramètres."));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put("/administration/parametres/", form);
      oublierEtablissement();
      alert("Paramètres généraux enregistrés.");
      onClose();
    } catch (error) {
      const data = error.response?.data;
      alert(data && typeof data === "object" ? Object.values(data).flat().join("\n") : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="administration-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="administration-modal">
        <div className="administration-modal-header">
          <div className="modal-header-title">
            <div className="modal-icon blue">
              <Settings size={21} />
            </div>
            <div>
              <h2>Paramètres généraux</h2>
              <p>
                Informations de l'hôpital et réglages de la caisse
                {form?.code && <> — code <strong>{form.code}</strong></>}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            <X size={19} />
          </button>
        </div>

        {!form ? (
          <p className="admin-panel-loading">Chargement…</p>
        ) : (
          <form className="administration-form" onSubmit={handleSubmit}>
            <LogoHopital logo={form.logo} onChange={(logo) => setForm((previous) => ({ ...previous, logo }))} />
            {SECTIONS.map((section) => (
              <fieldset className="admin-settings-section" key={section.title}>
                <legend>{section.title}</legend>
                <div className="admin-settings-grid">
                  {section.fields.map((field) => (
                    <div className="form-group" key={field.name}>
                      <label htmlFor={`settings-${field.name}`}>{field.label}</label>
                      <input
                        id={`settings-${field.name}`}
                        name={field.name}
                        type={field.type || "text"}
                        min={field.min}
                        max={field.max}
                        value={form[field.name] ?? ""}
                        onChange={handleChange}
                        required={field.required}
                      />
                      {field.help && <small className="admin-settings-help">{field.help}</small>}
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="administration-modal-actions">
              <button type="button" className="administration-cancel-button" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="administration-save-button" disabled={saving}>
                <Save size={16} />
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
