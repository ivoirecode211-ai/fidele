# MA SANTÉ — Gestion de Clinique

Application full-stack basée sur le cahier des charges fourni :

- Frontend : React.js + Vite
- Backend/API : Django + Django REST Framework
- Base de données : PostgreSQL
- Authentification : JWT
- Interface responsive : ordinateur, tablette et mobile
- Architecture préparée pour les modules pharmacie, laboratoire, stocks, maintenance, statistiques et IA.

> Cette version est un socle MVP fonctionnel et extensible. Les modules sont séparés afin de faciliter la personnalisation.

## 1. Structure

```text
ma-sante-clinique/
├── backend/
│   ├── config/
│   ├── accounts/
│   ├── patients/
│   ├── appointments/
│   ├── consultations/
│   ├── prescriptions/
│   ├── hospitalization/
│   ├── billing/
│   ├── dashboard/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── public/images/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── routes/
│   │   ├── styles/
│   │   └── assets/
│   ├── package.json
│   └── vite.config.js
├── database/
│   └── init.sql
├── docs/
│   └── PERSONNALISATION.md
└── .env.example
```

## 2. Installation

Depuis la racine du projet, copier `.env.example` vers `.env`, puis renseigner les paramètres PostgreSQL et la clé Django. Le backend lit ce fichier à la racine.

```bash
cp .env.example .env
```

### Backend

```bash
cd backend
python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows (à la place de la commande précédente)
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_default_users
python manage.py runserver
```

### PostgreSQL

Créer une base PostgreSQL :

```sql
CREATE DATABASE ma_sante;
```

Les paramètres de connexion doivent correspondre à ceux du fichier `.env` à la racine du projet.

### Frontend

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

Ouvrir l'adresse indiquée par Vite, généralement :

```text
http://localhost:5173
```

Le backend tourne généralement sur :

```text
http://127.0.0.1:8000
```

## 3. Comptes par défaut

La commande `python manage.py seed_default_users` crée les profils demandés dans le cahier des charges.

Les mots de passe ci-dessous sont des identifiants de DÉVELOPPEMENT uniquement. Ils doivent être changés avant toute mise en production.

| Profil | Identifiant | Mot de passe |
|---|---|---|
| Administrateur | admin@masante.local | Admin@2026! |
| Directeur de clinique | directeur@masante.local | Directeur@2026! |
| Médecin | medecin@masante.local | Medecin@2026! |
| Infirmier/infirmière | infirmier@masante.local | Infirmier@2026! |
| Réceptionniste | reception@masante.local | Reception@2026! |
| Laborantin | laborantin@masante.local | Laborantin@2026! |
| Pharmacien | pharmacien@masante.local | Pharmacien@2026! |
| Comptable | comptable@masante.local | Comptable@2026! |
| Responsable des stocks | stocks@masante.local | Stocks@2026! |
| Responsable RH | rh@masante.local | RH@2026! |
| Responsable maintenance | maintenance@masante.local | Maintenance@2026! |

## 4. Identité visuelle

La maquette fournie est respectée dans l'esprit :

- bleu médical comme couleur principale ;
- vert santé pour les actions et indicateurs positifs ;
- fond clair ;
- cartes blanches ;
- navigation latérale ;
- en-tête MA SANTÉ ;
- slogan « Santé – Proximité – Confiance » ;
- typographie moderne et lisible.

Les couleurs sont centralisées dans `frontend/src/styles/variables.css`.

## 5. Images

Toutes les images personnalisables sont regroupées dans :

```text
frontend/public/images/
```

Le fichier `README.md` de ce dossier explique où placer le logo, les photos et les illustrations.

## 6. Sécurité

Le projet utilise JWT, des mots de passe Django hashés, des permissions par rôle et une séparation API/frontend.

Pour la production, ajouter obligatoirement HTTPS, rotation/stockage sécurisé des secrets, sauvegardes PostgreSQL, politique de mots de passe, journalisation et durcissement serveur.
