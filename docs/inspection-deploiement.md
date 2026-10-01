# Inspection avant déploiement — MA SANTÉ

Journal tenu passe par passe. Chaque passe corrige ce qui relève de cette session
et signale le reste à la session qui tient les fichiers concernés.

## Passe 1 — contrôles automatiques (1er octobre 2026)

| Contrôle | Résultat |
|---|---|
| Tests backend | 229 tests OK (avant cette passe) |
| `manage.py check --deploy` | Corrigé : bloc production dans `config/settings.py` (DEBUG=False ⇒ clé longue obligatoire, HTTPS forcé, cookies sécurisés, HSTS, X-Frame DENY, `STATIC_ROOT`, CORS et CSRF par variables d'environnement) ; `.env.example` documenté. Restent deux avertissements facultatifs (HSTS sous-domaines, préchargement), réglables dans `.env`. |
| Compilation frontend | OK |
| Couleurs hors charte | 40 couleurs vives ramenées aux jetons de la charte dans 14 fichiers (rouge vif → `--danger`, bleu non officiel → `--primary`, vert vif → `--green`, orange → `--warning-soft-text-strong`…). Les gris neutres proches de la palette sont conservés. |
| Icônes | Lucide seul. Le « ✓ » texte du ticket remplacé par l'icône `Check`. |
| API, lecture | 111 routes × 14 rôles (1 554 appels) : aucune erreur serveur. |
| Navigateur, 21 modules | Aucune erreur JS, console ou API, sur ordinateur et téléphone. |

### Signalé à la session fidele-47 (fichiers en cours chez elle)
- Téléphone : débordement horizontal de `/laboratory` (40 px) et `/reports` (395 px).
- `styles/Laboratory.css` : 2 × `#d97706` (orange hors charte) → `var(--warning-soft-text-strong)`.

## Passe 2 — parcours métier entre modules

Test automatique `dossier.tests.ParcoursEntreModulesTests` : caisse → constantes → consultation → pharmacie,
puis comptabilité, dossier patient et espace patient ; issues de consultation (rendez-vous, analyses,
hospitalisation). Résultat : cohérent partout (l'allergie notée en consultation remonte dans le dossier ;
le rendez-vous de contrôle apparaît dans l'agenda, le dossier et l'espace patient). Aucune correction nécessaire.

## Passe 3 — cloisonnement par hôpital

Un second hôpital fictif tente de lire les données de MA SANTÉ (111 listes, 43 fiches de détail, 12 rôles).
Fuites trouvées puis corrigées :
- `/api/patients/` : liste et fiche limitées à son hôpital ; hôpital et n° de dossier fixés par le serveur.
- `/api/appointments/` et l'agenda : limités à son hôpital ; refus d'un patient ou d'un praticien d'un autre hôpital.
- Hospitalisation : chambres rattachées à un hôpital (migration 0004, chambres existantes → MA SANTÉ) ;
  service, lits et séjours limités à son hôpital ; routes génériques passées en lecture seule.
- Ancienne caisse `/api/cashdesk/` (remplacée, non cloisonnée) : fermée par défaut (`LEGACY_CASHDESK`).
- Patient ou chambre créés sans hôpital : rattachés d'office au premier hôpital.
Après correction : 0 fuite sur les listes et les fiches. Tests `dossier/tests_cloisonnement.py`. Suite complète : 259 tests OK.

Tableau de bord et Direction : chiffres, lits, recettes et alertes désormais calculés pour l'hôpital de
l'utilisateur. Exception connue : Stocks et Hygiène n'ont pas encore de rattachement à un hôpital (un seul
stock et un seul planning pour toute l'installation) : sans conséquence tant qu'un seul hôpital est en service.

## Passe 5 — préparation du déploiement

| Contrôle | Résultat |
|---|---|
| Migrations | `makemigrations --check` : aucune en attente. La base de test est reconstruite depuis zéro à chaque lancement : les migrations passent sur une base neuve. |
| Comptes par défaut | Corrigé : `seed_default_users` remettait les mots de passe connus (`Admin@2026!`…). Avec DEBUG=False il exige `--production`, ne modifie aucun compte existant et donne aux nouveaux un mot de passe aléatoire affiché une seule fois. |
| Paquet frontend | 1 326 kB d'un seul bloc → bibliothèques séparées (`react`, `pdf`, `icones`) gardées en cache entre deux mises à jour ; code de l'application : 654 kB (170 kB compressé). |

### Signalé à la session fidele-47
- `pages/Laboratory.jsx` importe `jspdf` au démarrage : 139 kB compressés chargés par tous les utilisateurs. Un `await import("jspdf")` au moment d'imprimer les retire du chargement initial.
- `App.jsx` : aucune page chargée à la demande (`React.lazy`) ; à faire une fois ses modifications commitées.

## Passe 4 — revue visuelle

Contrôle automatique des couleurs réellement affichées (textes, fonds, bordures, graphiques SVG), 22 pages,
contre la nouvelle charte vert sapin (encore en cours dans l'autre session) :
- Seule anomalie : la palette des services de la Direction, codée en bleu dans `dashboard/services.py`.
  Corrigé : elle envoie maintenant les jetons `var(--primary-…)` et suit la charte, quelle qu'elle soit.
- Soins infirmiers : les icônes Lucide des constantes étaient masquées sous 600 px. Corrigé : toujours visibles
  (au-dessus du libellé sur une rangée serrée, à côté sur téléphone).
- Téléphone, 24 pages : aucune erreur JS ni erreur serveur.

- Débordements sur téléphone corrigés (à la demande d'Antoine, dans des fichiers de la session fidele-47) :
  - `/reports` (443 px) : la grille de la page et celle du document refusaient de rétrécir sous leur
    contenu (sélecteur de 680 px, tableaux). Correctif en fin de `styles/rapports.css` : à commiter avec
    ce fichier, encore jamais commité.
  - `/laboratory` (40 px) : la zone principale gardait 100 % de largeur en plus de la marge de la barre fixe.
    Correctif dans `styles/shell.css` (commité) ; la barre étroite ne montre plus que les icônes.
  - Contrôle final : 24 pages sur téléphone, aucun débordement, aucune erreur JS ni serveur ;
    22 pages sur ordinateur, aucune couleur hors charte.

### Signalé à la session fidele-47
- Glycémie et Tension partagent l'icône `Activity` dans `pages/Nursing.jsx` : `Droplet` distinguerait la glycémie.

## Après le commit de la charte (7d8fb43, session fidele-32)

- Contrôle des couleurs : 22 pages, aucune hors charte vert sapin. Téléphone : 24 pages, ni débordement ni erreur.
- Chargement allégé : chaque module est téléchargé à sa première ouverture (`App.jsx`, `differe`) et `jspdf`
  seulement à l'impression d'un résultat de laboratoire. Démarrage : environ 104 kB compressés au lieu de 382 kB.
  Vérifié : 26 pages ouvertes sans erreur ; impression PDF d'un résultat de laboratoire réussie.

## Isolation complète des hôpitaux (2 octobre 2026)

Un hôpital témoin, avec un compte par rôle (13 rôles), interroge toutes les routes de lecture (115) et
tente d'ouvrir les fiches de MA SANTÉ par leur numéro (53 routes × 48 numéros × 7 rôles). On cherche dans
chaque réponse les noms, numéros de dossier, produits, employés, équipements et documents de MA SANTÉ.

Fuites trouvées puis corrigées :
- Laboratoire : liste de travail et demandes ouvertes par numéro, tous hôpitaux confondus.
- Archives : patients, comptes rendus, factures et résultats de tous les hôpitaux.
- `/api/consultations/` et `/api/prescriptions/` (routes génériques inutilisées par l'écran) : lecture et
  écriture de tous les hôpitaux pour tout compte connecté → lecture seule, par hôpital, rôles médicaux ;
  consultations VIH réservées aux médecins et à l'administrateur.
- Stocks : produits, mouvements (avec noms de patients) et fournisseurs rattachés à un hôpital
  (migration : l'existant à MA SANTÉ) ; la Pharmacie, la Consultation, l'assistant IA, le reçu de
  pharmacie, les rapports, les notifications et le tableau de bord lisent le stock de leur hôpital.
- Hygiène (tâches, produits, déchets, audits) et RH (employés, matricules par hôpital) rattachés à un hôpital.
- Références de la Consultation : chambres de tous les hôpitaux → celles de l'hôpital.
- Module IA : alertes cliniques et activité de tous les hôpitaux → celles de l'hôpital.

Résultat : 0 fuite sur les listes, 0 fuite sur les fiches, aucune erreur serveur. Tests ajoutés :
`dossier/tests_cloisonnement.py` (modules), `ia/tests.py`, `administration/tests.py` (logo).

## Reste à faire
