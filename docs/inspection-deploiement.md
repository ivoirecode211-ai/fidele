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

## Reste à inspecter
- Passe 2 : parcours métier de bout en bout avec écriture (caisse → soins → consultation → pharmacie → comptabilité, laboratoire, hospitalisation, rendez-vous) ; cohérence des données entre modules.
- Passe 3 : droits et cloisonnement par hôpital sur les routes de détail (`<id>`), et compte plateforme.
- Passe 4 : revue visuelle module par module (captures ordinateur et téléphone) contre la charte.
- Passe 5 : performances (taille du paquet frontend, requêtes N+1) et préparation du déploiement (collectstatic, migrations sur base neuve, comptes par défaut).
