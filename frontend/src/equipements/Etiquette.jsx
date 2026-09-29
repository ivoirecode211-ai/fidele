import { QRCodeSVG } from "qrcode.react";

import { adresseEtiquette } from "./commun";

/*
 * Étiquette à coller sur l'appareil : 50 × 50 mm.
 * Le QR code occupe l'essentiel ; dessous, le code interne en
 * gros (lisible sans téléphone) et le nom de l'appareil.
 */
export default function Etiquette({ equipement, hopital }) {
  return (
    <article className="etiquette">
      <QRCodeSVG value={adresseEtiquette(equipement.token)} level="M" marginSize={0} className="etiquette-qr" />
      <strong className="etiquette-code">{equipement.code}</strong>
      <span className="etiquette-nom">{equipement.name}</span>
      {hopital && <span className="etiquette-hopital">{hopital}</span>}
    </article>
  );
}
