import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";

export function Button({ children, secondary = false, danger = false, busy = false, ...props }) {
  return <button type="button" {...props} disabled={props.disabled || busy}
    className={`cd-button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""} ${props.className || ""}`}>
    {busy && <LoaderCircle size={16} className="cd-spin" aria-hidden="true" />}{children}
  </button>;
}
export function Field({ label, required = false, children, hint, ...props }) {
  return <label className="cd-field"><span>{label}{required && <span className="cd-required" aria-label="obligatoire"> *</span>}</span>
    {children || <input {...props} required={required} />}{hint && <small>{hint}</small>}</label>;
}
export function Select({ label, required, children, ...props }) {
  return <Field label={label} required={required}><select {...props} required={required}>{children}</select></Field>;
}
export function Alert({ children, success = false }) {
  if (!children) return null;
  return <div className={`cd-alert ${success ? "success" : ""}`} role={success ? "status" : "alert"}>
    <AlertCircle size={19} aria-hidden="true" /><span>{children}</span></div>;
}
export function Panel({ title, subtitle, actions, children }) {
  return <section className="cd-panel"><div className="cd-section-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="cd-actions">{actions}</div>}</div>{children}</section>;
}
export function LoadState({ resource, children }) {
  if (resource.loading) return <p className="cd-loading" role="status"><LoaderCircle className="cd-spin" size={20} />Chargement…</p>;
  if (resource.error) return <><Alert>{resource.error}</Alert><Button secondary onClick={resource.reload}><RefreshCw size={16} />Réessayer</Button></>;
  return children;
}
export function Empty({ children = "Aucun résultat pour cette recherche." }) {
  return <p className="cd-empty">{children}</p>;
}
export function Pager({ data, onChange }) {
  if (!data || data.count <= 25) return null;
  return <div className="cd-pager"><Button secondary disabled={data.page <= 1} onClick={() => onChange(data.page - 1)}><ChevronLeft size={16} />Précédent</Button>
    <span>Page {data.page} sur {Math.ceil(data.count / 25)}</span>
    <Button secondary disabled={data.page * 25 >= data.count} onClick={() => onChange(data.page + 1)}>Suivant<ChevronRight size={16} /></Button></div>;
}
export function Table({ headers, children, label }) {
  return <div className="cd-table-wrap" role="region" aria-label={label} tabIndex={0}><table><thead><tr>{headers.map((h, i) => <th key={`${h}-${i}`}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
