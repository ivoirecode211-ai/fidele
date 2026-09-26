import { useEffect, useState } from "react";
import { Save, Settings, X } from "lucide-react";

import api from "../../services/api";

const FIELDS = [
  { name: "name", label: "Nom de l'établissement", required: true },
  { name: "slogan", label: "Slogan" },
  { name: "address", label: "Adresse" },
  { name: "phone", label: "Téléphone" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "currency", label: "Devise", required: true },
  { name: "license_number", label: "Numéro d'agrément" },
  { name: "opening_hours", label: "Horaires d'ouverture" },
];

/* Paramètres généraux de l'établissement (/api/administration/parametres/). */
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
              <p>Identité et coordonnées de l'établissement</p>
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
            <div className="admin-settings-grid">
              {FIELDS.map((field) => (
                <div className="form-group" key={field.name}>
                  <label htmlFor={`settings-${field.name}`}>{field.label}</label>
                  <input
                    id={`settings-${field.name}`}
                    name={field.name}
                    type={field.type || "text"}
                    value={form[field.name] || ""}
                    onChange={handleChange}
                    required={field.required}
                  />
                </div>
              ))}
            </div>

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
