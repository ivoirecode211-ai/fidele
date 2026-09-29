# Avancement — module Consultation multi-spécialités

Journal de la boucle de construction (plan : docs/specialites.md).

## Itération 1 — Rôle ≠ spécialité — terminée

- **Compte** : `User.specialites` (liste de codes). Attribuées dans Administration → utilisateur
  (grille « Spécialités exercées »). Aucune = médecine générale.
- **Prestation** : `MedicalService.specialite`. Migration de données : les 15 prestations de
  consultation existantes reçoivent leur spécialité ; 12 prestations manquantes créées
  **désactivées, à 0 FCFA** (dentaire, CPA, diabétologie, neuro-psychiatrie, urologie,
  rhumatologie, pneumologie, hémodialyse, accouchement, CPON, planning familial, VIH) :
  l'administrateur fixe le prix et les active (admin Django → Services médicaux).
- **Consultation** : `Consultation.specialite`, fixée à la première ouverture d'après la
  prestation payée. Le dossier renvoie `specialite`, `specialiteNom` et le **carnet** (visites
  précédentes de la même spécialité, pour les programmes de suivi).
- **File d'attente** : chaque praticien voit les patients de ses spécialités (+ ceux qu'il a pris) ;
  direction et administrateur voient tout. La spécialité s'affiche sous le motif.
- **Obligatoires par spécialité** : `backend/consultations/specialites.py` (le serveur les exige à la
  clôture) ; étapes propres à une spécialité acceptées (`croissance`, `partogramme`…).
- **Frontend** : `configConsultation` = tronc commun + **bloc** de spécialité (examen, synthèse,
  histoire / diagnostic facultatifs, tests rapides, étapes propres, champs de diagnostic).
  Médecine générale = `BLOC_GENERAL`. Registre : `frontend/src/catalogue/specialites.js`.
- Tests : +5 (file par spécialité, formulaire suivant la prestation, obligatoires, étape propre,
  attribution par l'administration). Build OK, vérifié au navigateur.

## Ajout demandé — Administration › Prestations et tarifs — terminé

- Sous-module dans la barre latérale de l'Administration (à côté de « Utilisateurs »).
- Tableau cherchable et filtrable (consultations, soins, examens, non proposées) ; création et
  modification dans la même fenêtre que la caisse : nom, prix, catégorie, service de destination,
  **formulaire de consultation** (spécialité), proposée ou non à la caisse.
- Une prestation ne se supprime pas, on la désactive ; un prix modifié ne touche pas les passages
  déjà encaissés. Réservé à l'administrateur. API : `/api/administration/prestations/`. +2 tests.
- Limite connue : le catalogue des prestations est commun à tous les hôpitaux de la plateforme
  (le modèle `MedicalService` n'a pas d'hôpital). À cloisonner si des hôpitaux doivent avoir des tarifs
  différents.

## Itération 2 — 12 spécialités sans nouveau type de champ — terminée

- Briques communes (`frontend/src/consultation/briques.js`) : carte, ligne « Normal / Anormal » qui
  déplie signes et précisions, **« Normal » par défaut**, synthèse calculée depuis la saisie
  (enregistrée dans la consultation : dossier patient, rapports, GED).
- Blocs (`frontend/src/consultation/blocs.js`), inscrits au Catalogue :
  gynécologie, cardiologie, ORL, urologie, rhumatologie, pneumologie (recherche de tuberculose
  proposée dès 14 jours de toux), dermatologie, neuro-psychiatrie (idées suicidaires obligatoires),
  CPA (ASA, Mallampati, aptitude), chirurgie (indication opératoire), ophtalmologie (acuité,
  tension, lunettes), kinésithérapie (zone, séance n°/sur, techniques).
- Champs obligatoires alignés sur le serveur ; histoire de la maladie facultative là où elle
  n'apporte rien (ORL, dermatologie…), diagnostic facultatif pour la CPA et la kinésithérapie.
- Vérifié : les 13 formulaires au Catalogue (toutes étapes, repliables ouverts, aucun débordement) ;
  parcours complet en gynécologie avec un médecin gynécologue de test (file filtrée, formulaire de
  gynécologie, synthèse enregistrée). Données de test supprimées.

## Ajout demandé — Catalogue de prestations par hôpital — terminé

- `MedicalService.hospital` : chaque hôpital a **son** catalogue (nom unique par hôpital).
- **Catalogue modèle** (`backend/parcours/catalogue_modele.py`, 32 prestations) : tout hôpital créé en
  reçoit automatiquement une copie (signal à la création, depuis la plateforme ou l'admin Django).
- Migration : le catalogue existant revient à l'hôpital MAS ; tout autre hôpital déjà créé reçoit sa copie.
- Caisse, accueil et Administration › Prestations ne voient et n'acceptent que les prestations de
  l'hôpital de l'agent (une prestation d'un autre hôpital est refusée côté serveur).
- +2 tests (copie à la création et prix indépendants ; refus en caisse). La limite notée plus haut est levée.

## Itération 3 — Programmes avec carnet de suivi — terminée

- **Carnet** : le dossier renvoie les visites précédentes de la même spécialité ; chaque programme en
  reprend ce qui ne change pas (`reprise`) et s'intitule lui-même (pas de diagnostic à poser).
- `frontend/src/consultation/programmes.js`, inscrits au Catalogue :
  - **CPN** : n° de CPN calculé, DDR → terme (SA) et date prévue d'accouchement, TA, HU, BCF,
    présentation, signes de danger, dépistages (VIH, syphilis, TDR palu, Hb, protéinurie, groupe),
    TPI, Td, fer-acide folique, MILDA, plan d'accouchement. DDR et gestité reprises à la CPN suivante.
  - **CPON** : visite (J3, J7, S6), mère (TA, saignements, involution, périnée, allaitement,
    contraception) et nouveau-né (poids, cordon, peau, tétée, vaccins de naissance).
  - **Planning familial** : méthode, nouvelle / renouvellement (déduit du carnet), prochain RDV
    conseillé selon la méthode, critères d'éligibilité OMS, effets secondaires.
  - **Vaccination** : calendrier PEV CI (VAP R21 à 6, 8, 9, 15 mois d'après le ministère ; le reste
    selon le calendrier habituel du PEV — **à faire valider par le district**), vaccins dus
    calculés depuis la naissance et le carnet, présélectionnés ; lot, site, MAPI.
  - **VIH** : situation ARV, stade OMS, schéma, observance, CV, CD4, dépistage TB, TPT, cotrimoxazole.
  - **Diabétologie** : type, glycémie, HbA1c, créatinine, pieds, yeux, hypoglycémies.
  - **Hémodialyse** : séance n°, poids sec / avant / après (prise de poids calculée), TA, abord, UF, incidents.
- Corrigé en chemin : la DDR apparaissait deux fois en CPN (carte « Grossesse » du tronc commun) —
  cette carte s'efface quand la spécialité suit la grossesse ; l'histoire de la maladie est masquée
  pour les programmes. Le Catalogue signale désormais tout identifiant de champ en double.
- Tests : +1 (deux CPN successives : carnet, obligatoires de la CPN, intitulé). Vérifié au navigateur :
  les 20 formulaires au Catalogue sans débordement ni doublon ; CPN et vaccination de bout en bout
  avec une sage-femme de test. Données de test supprimées.

## Itération 4 — Champs graphiques — terminée

- Trois nouveaux types de champ dans le moteur de formulaires (`frontend/src/forms/components/fields/`) :
  - **`dents`** — schéma dentaire FDI (32 dents adulte / 20 lactéales, bascule automatique selon l'âge) :
    on choisit un état (carie, obturée, absente, à extraire, couronne, mobile, fracturée) puis on touche
    les dents ; résumé en une ligne sous le schéma.
  - **`courbe`** — courbe poids pour l'âge 0–5 ans (repères OMS 2006 : médiane, −2 ET, −3 ET, +2 ET,
    arrondis au dixième de kg — aide à la lecture, pas un z-score exact), pesées du carnet + poids du jour,
    statut en couleur (rouge si insuffisance sévère).
  - **`partogramme`** — partogramme OMS tracé depuis les relevés (heure, dilatation, BCF…) : ligne d'alerte
    à 1 cm/h dès 4 cm, ligne d'action 4 h plus tard ; relevés au-delà en rouge et message de décision.
- `frontend/src/consultation/graphiques.js`, inscrits au Catalogue :
  - **Pédiatrie** : signes de danger PCIME, carte « Croissance et nutrition » (poids, taille, PC avant
    2 ans, PB de 6 à 59 mois avec malnutrition sévère / modérée, œdèmes, courbe), évaluation par symptôme.
  - **Cabinet dentaire** : examen endobuccal, étape « Schéma et actes » (schéma, actes par dent, radiographie).
  - **Accouchement** : admission, étapes « Partogramme » et « Naissance » (mode obligatoire, GATPA,
    délivrance, complications, nouveau-né : sexe, poids, Apgar, réanimation, peau à peau).
- Les champs graphiques ne sont pas repris tels quels dans la synthèse texte (seul leur résumé l'est).
- Les 23 spécialités de docs/specialites.md sont inscrites au Catalogue.
- Vérifié au navigateur : les 23 formulaires au Catalogue, toutes étapes, sans débordement ni doublon ;
  de bout en bout avec un praticien de test : nourrisson (PB 118 mm → malnutrition modérée, point sur la
  courbe), dentaire (36 carie, 21 absente), parturiente (4 relevés, lignes d'alerte et d'action tracées).
  Tests backend : 224, tous verts. Données de test supprimées.

## Bilan

Les quatre itérations sont faites. À la charge de l'établissement :
- Fixer le prix des 12 prestations créées à 0 FCFA et les activer (Administration › Prestations et tarifs).
- Faire valider le calendrier PEV par le district.
- Courbe de croissance : repères OMS arrondis (aide à la lecture), pas un z-score exact.
