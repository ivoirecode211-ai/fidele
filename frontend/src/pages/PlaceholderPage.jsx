import PageHeader from "../components/PageHeader";
import {
  Stethoscope,
} from "lucide-react";
export default function PlaceholderPage({ title }) {
  return (
    <>
      <PageHeader title={title} subtitle="Module prévu dans l'architecture MA SANTÉ"/>
      <div className="panel empty-module">
        <div className="coming-icon"><Stethoscope size={32} strokeWidth={2} aria-hidden="true" /></div>
        <h2>Module prêt à être développé</h2>
        <p>Cette page est déjà reliée au menu et à l'architecture. Les modèles et endpoints peuvent être ajoutés progressivement selon le phasage du cahier des charges.</p>
      </div>
    </>
  );
}
