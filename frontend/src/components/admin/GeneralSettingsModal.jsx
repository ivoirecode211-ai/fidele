import { useEffect, useState } from "react";
import { Save, Settings, X } from "lucide-react";

import api from "../../services/api";

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
