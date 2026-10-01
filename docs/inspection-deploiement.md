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

À surveiller : le Tableau de bord et la Direction comptent encore les lits et les chiffres de tous les hôpitaux
(aucune donnée nominative, mais des totaux mêlés).
- Passe 4 : revue visuelle module par module (captures ordinateur et téléphone) contre la charte.
- Passe 5 : performances (taille du paquet frontend, requêtes N+1) et préparation du déploiement (collectstatic, migrations sur base neuve, comptes par défaut).
