import BirthDateField from "./fields/BirthDateField";
import ChipsField from "./fields/ChipsField";
import CochesField from "./fields/CochesField";
import CourbeField from "./fields/CourbeField";
import DentsField from "./fields/DentsField";
import ComboboxField from "./fields/ComboboxField";
import InputField from "./fields/InputField";
import ListeField from "./fields/ListeField";
import PartogrammeField from "./fields/PartogrammeField";
import RadioField from "./fields/RadioField";
import RepeaterField from "./fields/RepeaterField";
import SelectField from "./fields/SelectField";
import SwitchField from "./fields/SwitchField";
import TextAreaField from "./fields/TextAreaField";

const COMME_UN_INPUT = ["text", "tel", "email", "number", "date", "time"];

/*
 * ============================================================
 * AIGUILLAGE SUR field.type
 * ============================================================
 * Seul endroit du moteur qui connaît la liste des types de
 * champs. Ajouter un type = ajouter un cas ici, sans toucher
 * au reste (StepModal, validation, conditions).
 *
 * `values` est transmis aux champs qui en ont besoin : il
 * permet à une liste déroulante de dépendre d'une réponse
 * précédente (une commune dépend de sa ville).
 * ============================================================
 */
export default function DynamicField({ field, value, values, error, onChange }) {
  if (COMME_UN_INPUT.includes(field.type)) {
    return <InputField field={field} value={value} error={error} onChange={onChange} />;
  }

  switch (field.type) {
    case "birthdate":
      return <BirthDateField field={field} value={value} error={error} onChange={onChange} />;

    case "textarea":
      return <TextAreaField field={field} value={value} error={error} onChange={onChange} />;

    case "select":
      return <SelectField field={field} value={value} values={values} error={error} onChange={onChange} />;

    case "radio":
      return <RadioField field={field} value={value} error={error} onChange={onChange} />;

    case "switch":
      return <SwitchField field={field} value={value} error={error} onChange={onChange} />;

    case "chips":
      return <ChipsField field={field} value={value} values={values} error={error} onChange={onChange} />;

    case "dents":
      return <DentsField field={field} value={value} values={values} error={error} onChange={onChange} />;

    case "courbe":
      return <CourbeField field={field} values={values} />;

    case "partogramme":
      return <PartogrammeField field={field} values={values} />;

    case "coches":
      return <CochesField field={field} values={values} onChange={onChange} />;

    case "liste":
      return <ListeField field={field} value={value} values={values} error={error} onChange={onChange} />;

    case "combobox":
      return <ComboboxField field={field} value={value} values={values} error={error} onChange={onChange} />;

    case "repeater":
      return <RepeaterField field={field} value={value} values={values} error={error} onChange={onChange} />;

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
