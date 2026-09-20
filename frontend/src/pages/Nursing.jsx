

import { useMemo, useState } from "react";

import {
  Activity,
  AlertCircle,
  BedDouble,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Droplets,
  HeartPulse,
  Plus,
  RefreshCw,
  Search,
  Thermometer,
  UserRound,
  Users,
  Weight,
  X,
  Stethoscope,
  ShieldCheck,
  MessageSquareText,
} from "lucide-react";

import "../styles/nursing.css";


const INITIAL_PATIENTS = [
  {
    id: "PAT-0001",
    name: "Kouassi Jean",
    age: 46,
    sex: "H",
    room: "Chambre 102",
    bed: "Lit 2",
    diagnosis: "Paludisme",
    priority: "NORMAL",
    treatment: "Perfusion + traitement antipaludéen",
    temperature: 37.2,
    systolic: 120,
    diastolic: 78,
    pulse: 82,
    oxygen: 98,
    weight: 71,
    glucose: 0.98,
    lastCare: "08:20",
  },
  {
    id: "PAT-0002",
    name: "Yao Marie",
    age: 32,
    sex: "F",
    room: "Chambre 104",
    bed: "Lit 1",
    diagnosis: "Infection respiratoire",
    priority: "URGENT",
    treatment: "Antibiotique + oxygène",
    temperature: 38.6,
    systolic: 135,
    diastolic: 86,
    pulse: 96,
    oxygen: 93,
    weight: 62,
    glucose: 1.02,
    lastCare: "09:05",
  },
  {
    id: "PAT-0003",
    name: "Adjoua Esther",
    age: 58,
    sex: "F",
    room: "Chambre 201",
    bed: "Lit 2",
    diagnosis: "Hypertension",
    priority: "NORMAL",
    treatment: "Antihypertenseur",
    temperature: 36.8,
    systolic: 148,
    diastolic: 91,
    pulse: 79,
    oxygen: 97,
    weight: 74,
    glucose: 1.01,
    lastCare: "08:45",
  },
  {
    id: "PAT-0004",
    name: "N'Guessan Paul",
    age: 67,
    sex: "H",
    room: "Chambre 203",
    bed: "Lit 1",
    diagnosis: "Diabète",
    priority: "SURVEILLANCE",
    treatment: "Insuline + surveillance glycémie",
    temperature: 36.7,
    systolic: 129,
    diastolic: 82,
    pulse: 76,
    oxygen: 96,
    weight: 80,
    glucose: 1.84,
    lastCare: "09:15",
  },
  {
    id: "PAT-0005",
    name: "Aka Bernard",
    age: 41,
    sex: "H",
    room: "Chambre 105",
    bed: "Lit 1",
    diagnosis: "Traumatisme",
    priority: "URGENT",
    treatment: "Pansement + antalgiques",
    temperature: 37.6,
    systolic: 127,
    diastolic: 80,
    pulse: 88,
    oxygen: 98,
    weight: 77,
    glucose: 1.05,
    lastCare: "08:50",
  },
  {
    id: "PAT-0006",
    name: "Koffi Clarisse",
    age: 25,
    sex: "F",
    room: "Chambre 206",
    bed: "Lit 2",
    diagnosis: "Déshydratation",
    priority: "NORMAL",
    treatment: "Réhydratation IV",
    temperature: 37.1,
    systolic: 114,
    diastolic: 73,
    pulse: 84,
    oxygen: 99,
    weight: 56,
    glucose: 0.92,
    lastCare: "09:00",
  },
];


const INITIAL_CARES = [
  {
    id: 1,
    patient: "Yao Marie",
    patientId: "PAT-0002",
    care: "Surveillance température",
    time: "09:30",
    type: "Surveillance",
    priority: "URGENT",
    done: false,
  },
  {
    id: 2,
    patient: "Aka Bernard",
    patientId: "PAT-0005",
    care: "Réfection du pansement",
    time: "10:00",
    type: "Pansement",
    priority: "URGENT",
    done: false,
  },
  {
    id: 3,
    patient: "N'Guessan Paul",
    patientId: "PAT-0004",
    care: "Contrôle glycémie",
    time: "10:30",
    type: "Glycémie",
    priority: "SURVEILLANCE",
    done: false,
  },
  {
    id: 4,
    patient: "Kouassi Jean",
    patientId: "PAT-0001",
    care: "Administration traitement",
    time: "11:00",
    type: "Traitement",
    priority: "NORMAL",
    done: true,
  },
  {
    id: 5,
    patient: "Koffi Clarisse",
    patientId: "PAT-0006",
    care: "Contrôle perfusion",
    time: "11:30",
    type: "Perfusion",
    priority: "NORMAL",
    done: false,
  },
];


const INITIAL_TRANSMISSIONS = [
  {
    id: 1,
    patient: "Yao Marie",
    time: "09:10",
    author: "Infirmière de garde",
    text: "Température élevée. Surveillance renforcée mise en place.",
  },
  {
    id: 2,
    patient: "N'Guessan Paul",
    time: "08:55",
    author: "Infirmier référent",
    text: "Glycémie supérieure à la normale. Médecin informé.",
  },
  {
    id: 3,
    patient: "Aka Bernard",
    time: "08:40",
    author: "Infirmière de garde",
    text: "Pansement propre. Douleur signalée modérée.",
  },
];


function getPatientState(patient) {
  if (patient.priority === "URGENT") {
    return "urgent";
  }

  if (patient.priority === "SURVEILLANCE") {
    return "surveillance";
  }

  return "stable";
}


function PriorityBadge({ priority }) {

  if (priority === "URGENT") {
    return (
      <span className="nursing-priority nursing-priority-urgent">
        <AlertCircle size={14} />
        Urgent
      </span>
    );
  }

  if (priority === "SURVEILLANCE") {
    return (
      <span className="nursing-priority nursing-priority-watch">
        <Clock3 size={14} />
        Surveillance
      </span>
    );
  }

  return (
    <span className="nursing-priority nursing-priority-normal">
      <CheckCircle2 size={14} />
      Stable
    </span>
  );
}


export default function Nursing() {


  const [patients, setPatients] =
    useState(INITIAL_PATIENTS);


  const [cares, setCares] =
    useState(INITIAL_CARES);


  const [transmissions, setTransmissions] =
    useState(INITIAL_TRANSMISSIONS);


  const [search, setSearch] =
    useState("");


  const [patientFilter, setPatientFilter] =
    useState("ALL");


  const [selectedPatient, setSelectedPatient] =
    useState(null);


  const [showVitalsModal, setShowVitalsModal] =
    useState(false);


  const [showTransmissionModal, setShowTransmissionModal] =
    useState(false);


  const [vitalsForm, setVitalsForm] = useState({
    temperature: "",
    systolic: "",
    diastolic: "",
    pulse: "",
    oxygen: "",
    weight: "",
    glucose: "",
  });


  const [transmissionForm, setTransmissionForm] =
    useState({
      text: "",
    });


  const stats = useMemo(() => {

    const urgentPatients =
      patients.filter(
        (patient) =>
          patient.priority === "URGENT"
      ).length;

    const surveillancePatients =
      patients.filter(
        (patient) =>
          patient.priority === "SURVEILLANCE"
      ).length;

    const pendingCares =
      cares.filter(
        (care) => !care.done
      ).length;

    const completedCares =
      cares.filter(
        (care) => care.done
      ).length;

    return {
      patients: patients.length,
      urgentPatients,
      surveillancePatients,
      pendingCares,
      completedCares,
    };

  }, [patients, cares]);


  const filteredPatients = useMemo(() => {

    const value =
      search.trim().toLowerCase();

    return patients.filter((patient) => {

      const matchesSearch =
        !value
        ||
        patient.name
          .toLowerCase()
          .includes(value)
        ||
        patient.id
          .toLowerCase()
          .includes(value)
        ||
        patient.room
          .toLowerCase()
          .includes(value)
        ||
        patient.diagnosis
          .toLowerCase()
          .includes(value);

      const matchesFilter =
        patientFilter === "ALL"
        ||
        getPatientState(patient) === patientFilter;

      return matchesSearch && matchesFilter;

    });

  }, [patients, search, patientFilter]);


  function toggleCare(careId) {

    setCares((currentCares) =>
      currentCares.map((care) =>
        care.id === careId
          ? {
              ...care,
              done: !care.done,
            }
          : care
      )
    );

  }


  function openVitalsModal(patient) {

    setSelectedPatient(patient);

    setVitalsForm({
      temperature: patient.temperature || "",
      systolic: patient.systolic || "",
      diastolic: patient.diastolic || "",
      pulse: patient.pulse || "",
      oxygen: patient.oxygen || "",
      weight: patient.weight || "",
      glucose: patient.glucose || "",
    });

    setShowVitalsModal(true);

  }


  function handleSaveVitals(event) {

    event.preventDefault();

    if (!selectedPatient) {
      return;
    }

    setPatients((currentPatients) =>
      currentPatients.map((patient) =>
        patient.id === selectedPatient.id
          ? {
              ...patient,
              temperature:
                Number(vitalsForm.temperature),
              systolic:
                Number(vitalsForm.systolic),
              diastolic:
                Number(vitalsForm.diastolic),
              pulse:
                Number(vitalsForm.pulse),
              oxygen:
                Number(vitalsForm.oxygen),
              weight:
                Number(vitalsForm.weight),
              glucose:
                Number(vitalsForm.glucose),
              lastCare:
                new Date().toLocaleTimeString(
                  "fr-FR",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                ),
            }
          : patient
      )
    );

    setShowVitalsModal(false);

    setSelectedPatient(null);

  }


  function openTransmissionModal(patient = null) {

    setSelectedPatient(patient);

    setTransmissionForm({
      text: "",
    });

    setShowTransmissionModal(true);

  }


  function handleSaveTransmission(event) {

    event.preventDefault();

    if (!transmissionForm.text.trim()) {
      return;
    }

    const now =
      new Date().toLocaleTimeString(
        "fr-FR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    const newTransmission = {
      id:
        Date.now(),
      patient:
        selectedPatient?.name ||
        "Patient",
      time:
        now,
      author:
        "Utilisateur connecté",
      text:
        transmissionForm.text.trim(),
    };

    setTransmissions((current) => [
      newTransmission,
      ...current,
    ]);

    setTransmissionForm({
      text: "",
    });

    setSelectedPatient(null);

    setShowTransmissionModal(false);

  }


  function handleRefresh() {

    setSearch("");

    setPatientFilter("ALL");

  }


  return (

    <div className="nursing-page">


      <header className="nursing-header">

        <div className="nursing-header-left">

          <div className="nursing-header-icon">
            <HeartPulse size={31} />
          </div>

          <div>

            <h1>
              Espace Infirmiers
            </h1>

            <p>
              Soins, surveillance et suivi quotidien des patients
            </p>

          </div>

        </div>


        <div className="nursing-header-actions">

          <div className="nursing-shift">

            <div className="nursing-shift-icon">
              <Clock3 size={17} />
            </div>

            <div>

              <span>
                Service actuel
              </span>

              <strong>
                Garde de jour
              </strong>

            </div>

          </div>


          <button
            type="button"
            className="nursing-refresh-button"
            onClick={handleRefresh}
            title="Actualiser"
          >
            <RefreshCw size={18} />
          </button>

        </div>

      </header>


      <div className="nursing-alert-banner">

        <div className="nursing-alert-icon">
          <Bell size={20} />
        </div>

        <div>

          <strong>
            {stats.urgentPatients} patient(s) nécessitent une
            attention particulière
          </strong>

          <p>
            Consultez les patients prioritaires et les soins
            en attente ci-dessous.
          </p>

        </div>

      </div>


      <section className="nursing-stats-grid">


        <div className="nursing-stat-card">

          <div className="nursing-stat-icon nursing-stat-blue">
            <Users size={23} />
          </div>

          <div>

            <span>
              Patients en charge
            </span>

            <strong>
              {stats.patients}
            </strong>

            <small>
              Patients suivis aujourd'hui
            </small>

          </div>

        </div>


        <div className="nursing-stat-card">

          <div className="nursing-stat-icon nursing-stat-red">
            <AlertCircle size={23} />
          </div>

          <div>

            <span>
              Priorités
            </span>

            <strong>
              {stats.urgentPatients}
            </strong>

            <small>
              Attention requise
            </small>

          </div>

        </div>


        <div className="nursing-stat-card">

          <div className="nursing-stat-icon nursing-stat-orange">
            <ClipboardList size={23} />
          </div>

          <div>

            <span>
              Soins en attente
            </span>

            <strong>
              {stats.pendingCares}
            </strong>

            <small>
              À réaliser
            </small>

          </div>

        </div>


        <div className="nursing-stat-card">

          <div className="nursing-stat-icon nursing-stat-green">
            <CheckCircle2 size={23} />
          </div>

          <div>

            <span>
              Soins réalisés
            </span>

            <strong>
              {stats.completedCares}
            </strong>

            <small>
              Aujourd'hui
            </small>

          </div>

        </div>

      </section>


      <div className="nursing-main-grid">


        <section className="nursing-panel nursing-patients-panel">

          <div className="nursing-panel-header">

            <div>

              <h2>
                Patients à prendre en charge
              </h2>

              <p>
                Patients actuellement sous surveillance
              </p>

            </div>


            <div className="nursing-panel-header-icon">
              <Users size={20} />
            </div>

          </div>


          {/* Recherche */}

          <div className="nursing-patient-toolbar">

            <div className="nursing-search">

              <Search size={18} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Rechercher un patient..."
              />

              {search && (

                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="nursing-clear-search"
                >
                  <X size={16} />
                </button>

              )}

            </div>


            <select
              value={patientFilter}
              onChange={(event) =>
                setPatientFilter(event.target.value)
              }
              className="nursing-filter"
            >

              <option value="ALL">
                Tous
              </option>

              <option value="urgent">
                Urgents
              </option>

              <option value="surveillance">
                Surveillance
              </option>

              <option value="stable">
                Stables
              </option>

            </select>

          </div>


          {/* Liste patients */}

          <div className="nursing-patients-list">

            {filteredPatients.length > 0 ? (

              filteredPatients.map((patient) => (

                <div
                  className="nursing-patient-row"
                  key={patient.id}
                >

                  <div className="nursing-patient-main">

                    <div className="nursing-patient-avatar">
                      <UserRound size={19} />
                    </div>


                    <div className="nursing-patient-info">

                      <div className="nursing-patient-name">

                        <strong>
                          {patient.name}
                        </strong>

                        <span>
                          {patient.age} ans · {patient.sex}
                        </span>

                      </div>


                      <div className="nursing-patient-meta">

                        <span>
                          <BedDouble size={13} />
                          {patient.room} · {patient.bed}
                        </span>

                        <span>
                          <Stethoscope size={13} />
                          {patient.diagnosis}
                        </span>

                      </div>

                    </div>

                  </div>


                  <div className="nursing-patient-vitals">


                    <div className="nursing-vital-mini">

                      <Thermometer size={14} />

                      <span>
                        {patient.temperature} °C
                      </span>

                    </div>


                    <div className="nursing-vital-mini">

                      <HeartPulse size={14} />

                      <span>
                        {patient.systolic}/{patient.diastolic}
                      </span>

                    </div>


                    <div className="nursing-vital-mini">

                      <Activity size={14} />

                      <span>
                        {patient.pulse} bpm
                      </span>

                    </div>


                    <div className="nursing-vital-mini">

                      <Droplets size={14} />

                      <span>
                        {patient.oxygen} %
                      </span>

                    </div>

                  </div>


                  <div className="nursing-patient-status">

                    <PriorityBadge
                      priority={patient.priority}
                    />

                    <span className="nursing-last-care">
                      Dernier soin : {patient.lastCare}
                    </span>

                  </div>


                  <div className="nursing-patient-actions">

                    <button
                      type="button"
                      className="nursing-small-action"
                      onClick={() =>
                        openVitalsModal(patient)
                      }
                      title="Saisir les constantes"
                    >
                      <Activity size={16} />
                    </button>


                    <button
                      type="button"
                      className="nursing-view-button"
                      onClick={() =>
                        setSelectedPatient(patient)
                      }
                    >
                      Voir
                      <ChevronRight size={15} />
                    </button>

                  </div>

                </div>

              ))

            ) : (

              <div className="nursing-empty">

                <Search size={38} />

                <strong>
                  Aucun patient trouvé
                </strong>

                <span>
                  Modifiez votre recherche ou votre filtre.
                </span>

              </div>

            )}

          </div>

        </section>


        <section className="nursing-panel">

          <div className="nursing-panel-header">

            <div>

              <h2>
                Soins à réaliser
              </h2>

              <p>
                Planning des soins infirmiers
              </p>

            </div>


            <div className="nursing-panel-header-icon">
              <ClipboardList size={20} />
            </div>

          </div>


          <div className="nursing-care-list">

            {cares.map((care) => (

              <div
                key={care.id}
                className={
                  `nursing-care-item ${
                    care.done
                      ? "nursing-care-done"
                      : ""
                  }`
                }
              >

                <button
                  type="button"
                  className="nursing-care-check"
                  onClick={() =>
                    toggleCare(care.id)
                  }
                  title={
                    care.done
                      ? "Marquer comme non réalisé"
                      : "Marquer comme réalisé"
                  }
                >

                  {care.done && (
                    <Check size={15} />
                  )}

                </button>


                <div className="nursing-care-content">

                  <div className="nursing-care-top">

                    <strong>
                      {care.care}
                    </strong>

                    <span>
                      {care.time}
                    </span>

                  </div>


                  <div className="nursing-care-bottom">

                    <span>
                      {care.patient}
                    </span>

                    <small>
                      {care.type}
                    </small>

                  </div>

                </div>


                <PriorityBadge
                  priority={care.priority}
                />

              </div>

            ))}

          </div>


          <button
            type="button"
            className="nursing-add-care-button"
            onClick={() =>
              alert(
                "La création des soins sera connectée au backend Django."
              )
            }
          >
            <Plus size={17} />
            Ajouter un soin
          </button>

        </section>


      </div>


      <div className="nursing-bottom-grid">


        <section className="nursing-panel">

          <div className="nursing-panel-header">

            <div>

              <h2>
                Surveillance des constantes
              </h2>

              <p>
                Dernières valeurs enregistrées
              </p>

            </div>


            <Activity size={21} className="nursing-header-blue-icon" />

          </div>


          <div className="nursing-vitals-grid">


            <div className="nursing-vital-card">

              <div className="nursing-vital-card-icon nursing-vital-temp">
                <Thermometer size={20} />
              </div>

              <div>

                <span>
                  Température moyenne
                </span>

                <strong>
                  37,3 °C
                </strong>

                <small>
                  Sur les patients affichés
                </small>

              </div>

            </div>


            <div className="nursing-vital-card">

              <div className="nursing-vital-card-icon nursing-vital-heart">
                <HeartPulse size={20} />
              </div>

              <div>

                <span>
                  Pression artérielle
                </span>

                <strong>
                  129 / 82
                </strong>

                <small>
                  Moyenne actuelle
                </small>

              </div>

            </div>


            <div className="nursing-vital-card">

              <div className="nursing-vital-card-icon nursing-vital-oxygen">
                <Droplets size={20} />
              </div>

              <div>

                <span>
                  Saturation O₂
                </span>

                <strong>
                  97 %
                </strong>

                <small>
                  Niveau moyen
                </small>

              </div>

            </div>


            <div className="nursing-vital-card">

              <div className="nursing-vital-card-icon nursing-vital-weight">
                <Weight size={20} />
              </div>

              <div>

                <span>
                  Poids
                </span>

                <strong>
                  70 kg
                </strong>

                <small>
                  Moyenne actuelle
                </small>

              </div>

            </div>

          </div>


          <button
            type="button"
            className="nursing-primary-button nursing-full-button"
            onClick={() => {

              if (patients.length > 0) {
                openVitalsModal(patients[0]);
              }

            }}
          >
            <Plus size={18} />
            Saisir des constantes
          </button>

        </section>


        <section className="nursing-panel">

          <div className="nursing-panel-header">

            <div>

              <h2>
                Transmissions infirmières
              </h2>

              <p>
                Dernières observations et informations
              </p>

            </div>


            <MessageSquareText
              size={21}
              className="nursing-header-purple-icon"
            />

          </div>


          <div className="nursing-transmission-list">

            {transmissions.map((item) => (

              <div
                className="nursing-transmission-item"
                key={item.id}
              >

                <div className="nursing-transmission-line" />

                <div className="nursing-transmission-content">

                  <div className="nursing-transmission-top">

                    <strong>
                      {item.patient}
                    </strong>

                    <span>
                      {item.time}
                    </span>

                  </div>


                  <p>
                    {item.text}
                  </p>


                  <small>
                    {item.author}
                  </small>

                </div>

              </div>

            ))}

          </div>


          <button
            type="button"
            className="nursing-secondary-button nursing-full-button"
            onClick={() =>
              openTransmissionModal()
            }
          >
            <Plus size={17} />
            Nouvelle transmission
          </button>

        </section>


      </div>


      {showVitalsModal && selectedPatient && (

        <div
          className="nursing-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setShowVitalsModal(false);
            }

          }}
        >

          <div className="nursing-modal">


            <div className="nursing-modal-header">

              <div>

                <h2>
                  Constantes vitales
                </h2>

                <p>
                  {selectedPatient.name} · {selectedPatient.id}
                </p>

              </div>


              <button
                type="button"
                className="nursing-modal-close"
                onClick={() =>
                  setShowVitalsModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="nursing-form"
              onSubmit={handleSaveVitals}
            >


              <div className="nursing-form-grid">


                <div className="nursing-form-group">

                  <label>
                    Température (°C)
                  </label>

                  <div className="nursing-input-icon">

                    <Thermometer size={17} />

                    <input
                      type="number"
                      step="0.1"
                      value={vitalsForm.temperature}
                      onChange={(event) =>
                        setVitalsForm((current) => ({
                          ...current,
                          temperature:
                            event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="nursing-form-group">

                  <label>
                    Pouls (bpm)
                  </label>

                  <div className="nursing-input-icon">

                    <HeartPulse size={17} />

                    <input
                      type="number"
                      value={vitalsForm.pulse}
                      onChange={(event) =>
                        setVitalsForm((current) => ({
                          ...current,
                          pulse:
                            event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="nursing-form-group">

                  <label>
                    Tension systolique
                  </label>

                  <div className="nursing-input-icon">

                    <Activity size={17} />

                    <input
                      type="number"
                      value={vitalsForm.systolic}
                      onChange={(event) =>
                        setVitalsForm((current) => ({
                          ...current,
                          systolic:
                            event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="nursing-form-group">

                  <label>
                    Tension diastolique
                  </label>

                  <div className="nursing-input-icon">

                    <Activity size={17} />

                    <input
                      type="number"
                      value={vitalsForm.diastolic}
                      onChange={(event) =>
                        setVitalsForm((current) => ({
                          ...current,
                          diastolic:
                            event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="nursing-form-group">

                  <label>
                    Saturation O₂ (%)
                  </label>

                  <div className="nursing-input-icon">

                    <Droplets size={17} />

                    <input
                      type="number"
                      value={vitalsForm.oxygen}
                      onChange={(event) =>
                        setVitalsForm((current) => ({
                          ...current,
                          oxygen:
                            event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="nursing-form-group">

                  <label>
                    Poids (kg)
                  </label>

                  <div className="nursing-input-icon">

                    <Weight size={17} />

                    <input
                      type="number"
                      step="0.1"
                      value={vitalsForm.weight}
                      onChange={(event) =>
                        setVitalsForm((current) => ({
                          ...current,
                          weight:
                            event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="nursing-form-group">

                  <label>
                    Glycémie (g/L)
                  </label>

                  <div className="nursing-input-icon">

                    <Droplets size={17} />

                    <input
                      type="number"
                      step="0.01"
                      value={vitalsForm.glucose}
                      onChange={(event) =>
                        setVitalsForm((current) => ({
                          ...current,
                          glucose:
                            event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


              </div>


              <div className="nursing-modal-actions">

                <button
                  type="button"
                  className="nursing-secondary-button"
                  onClick={() =>
                    setShowVitalsModal(false)
                  }
                >
                  Annuler
                </button>


                <button
                  type="submit"
                  className="nursing-primary-button"
                >
                  <CheckCircle2 size={17} />
                  Enregistrer
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {showTransmissionModal && (

        <div
          className="nursing-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setShowTransmissionModal(false);
            }

          }}
        >

          <div className="nursing-modal">


            <div className="nursing-modal-header">

              <div>

                <h2>
                  Nouvelle transmission
                </h2>

                <p>
                  Ajouter une observation infirmière
                </p>

              </div>


              <button
                type="button"
                className="nursing-modal-close"
                onClick={() =>
                  setShowTransmissionModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="nursing-form"
              onSubmit={handleSaveTransmission}
            >

              <div className="nursing-form-group">

                <label>
                  Patient
                </label>

                <select
                  value={selectedPatient?.id || ""}
                  onChange={(event) => {

                    const patient =
                      patients.find(
                        (item) =>
                          item.id === event.target.value
                      );

                    setSelectedPatient(patient || null);

                  }}
                >

                  <option value="">
                    Sélectionner un patient
                  </option>

                  {patients.map((patient) => (

                    <option
                      key={patient.id}
                      value={patient.id}
                    >
                      {patient.name} — {patient.id}
                    </option>

                  ))}

                </select>

              </div>


              <div className="nursing-form-group">

                <label>
                  Observation / transmission
                </label>

                <textarea
                  rows="6"
                  value={transmissionForm.text}
                  onChange={(event) =>
                    setTransmissionForm({
                      text: event.target.value,
                    })
                  }
                  placeholder="Saisir l'observation, l'évolution du patient ou les informations importantes..."
                  required
                />

              </div>


              <div className="nursing-modal-actions">

                <button
                  type="button"
                  className="nursing-secondary-button"
                  onClick={() =>
                    setShowTransmissionModal(false)
                  }
                >
                  Annuler
                </button>


                <button
                  type="submit"
                  className="nursing-primary-button"
                >
                  <MessageSquareText size={17} />
                  Enregistrer la transmission
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {selectedPatient &&
       !showVitalsModal &&
       !showTransmissionModal && (

        <div
          className="nursing-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setSelectedPatient(null);
            }

          }}
        >

          <div className="nursing-modal nursing-patient-detail-modal">


            <div className="nursing-modal-header">

              <div>

                <h2>
                  Dossier infirmier
                </h2>

                <p>
                  {selectedPatient.name}
                </p>

              </div>


              <button
                type="button"
                className="nursing-modal-close"
                onClick={() =>
                  setSelectedPatient(null)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="nursing-detail-summary">

              <div className="nursing-detail-avatar">
                <UserRound size={28} />
              </div>

              <div>

                <strong>
                  {selectedPatient.name}
                </strong>

                <span>
                  {selectedPatient.age} ans · {selectedPatient.sex} · {selectedPatient.id}
                </span>

                <span>
                  {selectedPatient.room} · {selectedPatient.bed}
                </span>

              </div>

              <PriorityBadge
                priority={selectedPatient.priority}
              />

            </div>


            <div className="nursing-detail-grid">


              <div className="nursing-detail-card">

                <Thermometer size={19} />

                <span>
                  Température
                </span>

                <strong>
                  {selectedPatient.temperature} °C
                </strong>

              </div>


              <div className="nursing-detail-card">

                <HeartPulse size={19} />

                <span>
                  Tension
                </span>

                <strong>
                  {selectedPatient.systolic}/
                  {selectedPatient.diastolic}
                </strong>

              </div>


              <div className="nursing-detail-card">

                <Activity size={19} />

                <span>
                  Pouls
                </span>

                <strong>
                  {selectedPatient.pulse} bpm
                </strong>

              </div>


              <div className="nursing-detail-card">

                <Droplets size={19} />

                <span>
                  Saturation
                </span>

                <strong>
                  {selectedPatient.oxygen} %
                </strong>

              </div>


              <div className="nursing-detail-card">

                <Weight size={19} />

                <span>
                  Poids
                </span>

                <strong>
                  {selectedPatient.weight} kg
                </strong>

              </div>


              <div className="nursing-detail-card">

                <Droplets size={19} />

                <span>
                  Glycémie
                </span>

                <strong>
                  {selectedPatient.glucose} g/L
                </strong>

              </div>


            </div>


            <div className="nursing-detail-section">

              <span>
                Diagnostic
              </span>

              <strong>
                {selectedPatient.diagnosis}
              </strong>

            </div>


            <div className="nursing-detail-section">

              <span>
                Traitement en cours
              </span>

              <strong>
                {selectedPatient.treatment}
              </strong>

            </div>


            <div className="nursing-modal-actions">

              <button
                type="button"
                className="nursing-secondary-button"
                onClick={() =>
                  openTransmissionModal(
                    selectedPatient
                  )
                }
              >
                <MessageSquareText size={17} />
                Transmission
              </button>


              <button
                type="button"
                className="nursing-primary-button"
                onClick={() =>
                  openVitalsModal(
                    selectedPatient
                  )
                }
              >
                <Activity size={17} />
                Saisir constantes
              </button>

            </div>


          </div>

        </div>

      )}


      <footer className="nursing-footer">

        <div>

          <ShieldCheck size={16} />

          <span>
            Les données affichées sont protégées par le système
            d'accès de MA SANTÉ.
          </span>

        </div>

        <span>
          Dernière actualisation : maintenant
        </span>

      </footer>


    </div>

  );

}

