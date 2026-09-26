import { useEffect, useState } from "react";
import { Users, CalendarCheck2, Stethoscope, BedDouble, Wallet, AlertTriangle, Activity } from "lucide-react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  const [data, setData] = useState({
    patients: 0, new_patients: 0, consultations_today: 0, appointments_today: 0,
    beds_available: 0, beds_occupied: 0, beds_reserved: 0, beds_cleaning: 0, unpaid_invoices: 0
  });

  useEffect(() => {
    api.get("/dashboard/").then(r => setData(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue globale de l'activité de la clinique MA SANTÉ" />
      <div className="welcome-banner">
        <div><strong>Bienvenue dans MA SANTÉ</strong><p>Une clinique plus organisée, plus humaine et plus intelligente.</p></div>
        <div className="pulse"><Activity size={28}/></div>
      </div>

      <section className="stats-grid">
        <StatCard icon={<Users/>} label="Patients" value={data.patients} detail={`+${data.new_patients} aujourd'hui`} tone="blue"/>
        <StatCard icon={<Stethoscope/>} label="Consultations du jour" value={data.consultations_today} detail="Consultations" tone="green"/>
        <StatCard icon={<CalendarCheck2/>} label="Rendez-vous du jour" value={data.appointments_today} detail="Programmés" tone="purple"/>
        <StatCard icon={<BedDouble/>} label="Lits disponibles" value={data.beds_available} detail={`${data.beds_occupied} occupés`} tone="orange"/>
        <StatCard icon={<Wallet/>} label="Factures impayées" value={data.unpaid_invoices} detail="À suivre" tone="red"/>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title"><h2>État des lits</h2><span>Actualisé</span></div>
          <div className="bed-overview">
            <div><b>{data.beds_available}</b><span>Disponible</span></div>
            <div><b>{data.beds_occupied}</b><span>Occupé</span></div>
            <div><b>{data.beds_reserved}</b><span>Réservé</span></div>
            <div><b>{data.beds_cleaning}</b><span>Désinfection</span></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Alertes</h2><AlertTriangle size={19}/></div>
          <ul className="alert-list">
            {(data.alerts || []).length === 0 && <li>Aucune alerte pour le moment</li>}
            {(data.alerts || []).map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel quick-panel">
        <div className="panel-title"><h2>Accès rapide</h2></div>
        <div className="quick-actions">
          <a href="/patients">Nouveau patient</a>
          <a href="/appointments">Nouveau rendez-vous</a>
          <a href="/consultations">Nouvelle consultation</a>
          <a href="/billing">Nouvelle facture</a>
        </div>
      </section>
    </>
  );
}
