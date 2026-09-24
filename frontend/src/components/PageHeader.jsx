/*
 * Le titre et le sous-titre du module s'affichent dans la barre
 * du haut (AppLayout) ; la page ne garde que ses actions.
 */
export default function PageHeader({ action }) {
  if (!action) {
    return null;
  }

  return <div className="page-header page-header-actions">{action}</div>;
}
