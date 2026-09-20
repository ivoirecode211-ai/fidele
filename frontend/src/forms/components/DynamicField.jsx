import InputField from "./fields/InputField";
import TextAreaField from "./fields/TextAreaField";
import SelectField from "./fields/SelectField";
import RadioField from "./fields/RadioField";
import SwitchField from "./fields/SwitchField";

const TEXT_LIKE = ["text", "tel", "email", "number", "date"];

/*
 * ============================================================
 * DISPATCH SUR field.type
 * ============================================================
 * Le seul endroit du moteur qui connaît la liste des types de
 * champs supportés. Ajouter un type = ajouter un cas ici, sans
 * toucher au reste du moteur (FormEngine, validation...).
 * ============================================================
 */
export default function DynamicField({ field, value, error, onChange }) {
  if (TEXT_LIKE.includes(field.type)) {
    return (
      <InputField field={field} value={value} error={error} onChange={onChange} />
    );
  }

  switch (field.type) {
    case "textarea":
      return (
        <TextAreaField field={field} value={value} error={error} onChange={onChange} />
      );

    case "select":
      return (
        <SelectField field={field} value={value} error={error} onChange={onChange} />
      );

    case "radio":
      return (
        <RadioField field={field} value={value} error={error} onChange={onChange} />
      );

    case "switch":
      return (
        <SwitchField field={field} value={value} error={error} onChange={onChange} />
      );

    default:
      return (
        <div className="field field-error">
          <span>{field.label}</span>
          <span className="field-error-message">
            Type de champ non pris en charge : « {field.type} ».
          </span>
        </div>
      );
  }
}
