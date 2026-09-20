export default function FormHeader({ title, stepTitle }) {
  return (
    <div className="form-engine-header">
      <h1>{title}</h1>
      {stepTitle && <p>{stepTitle}</p>}
    </div>
  );
}
