# Module Consultation — les spécialités

Proposition à valider avant de coder. Un seul module, **Consultation** ; chaque
spécialité est une configuration du même moteur que la médecine générale.

## Le principe

- **Tronc commun**, identique partout (déjà construit pour la médecine générale) :
  1. *Interrogatoire* : motif, histoire, signes rapportés, antécédents (repris du dossier).
  2. *Diagnostic* : tests rapides, diagnostic retenu (aide IA), examens au laboratoire.
  3. *Traitement et issue* : ordonnance (aide IA), conseils, actes, issue.
- **Bloc de la spécialité** : il remplace la carte *Examen physique* de l'étape 1, ou
  s'ajoute comme étape propre quand il est long (dentaire, ophtalmologie, accouchement).
- **Carnet de suivi** pour les programmes (CPN, CPON, PF, vaccination, VIH, diabète,
  hémodialyse) : ce qui se suit d'une visite à l'autre est repris automatiquement.
- **Rôle ≠ spécialité** : le rôle donne les droits (médecin, sage-femme, infirmier,
  kinésithérapeute…), les spécialités donnent les formulaires. La **caisse** envoie le
  patient vers un service : le formulaire suit le patient, pas le praticien.
- Règle de tri, comme pour la médecine générale : **obligatoire** (sans lui la consultation
  ne vaut rien) · **repris** (déjà connu) · **replié** (utile, déplié à la demande) ·
  **supprimé**. Tout appareil ou élément d'examen est « normal » par défaut.

Légende : **gras** = obligatoire · *(replié)* = derrière un bouton · → = alimente un
indicateur national (DHIS2 / SNIS).

---

## A. Consultations de spécialité

### 1. Médecine générale — en service
Référence : déjà en place (66 champs, 10 obligatoires). Sert de modèle.

### 2. Pédiatrie
Sources : PCIME / IMCI (OMS-UNICEF), calendrier PEV Côte d'Ivoire.
- **Tranche d'âge** (0-2 mois / 2 mois-5 ans / plus de 5 ans), calculée depuis la naissance.
- **Signes généraux de danger** (PCIME) : incapable de boire ou téter, vomit tout,
  convulsions, léthargie ou inconscience. Un seul coché → alerte rouge et orientation.
- **Poids** (repris des constantes, obligatoire chez l'enfant : les doses en dépendent),
  taille, périmètre crânien *(replié, avant 2 ans)*, **PB (MUAC)** de 6 à 59 mois.
- Courbes : poids pour l'âge, taille pour l'âge (z-score OMS calculé), état nutritionnel
  (normal / MAM / MAS) → malnutrition.
- Classification PCIME par symptôme : toux ou difficulté respiratoire (fréquence
  respiratoire selon l'âge, tirage), diarrhée (déshydratation), fièvre (TDR palu), oreille.
- Statut vaccinal *(repris du carnet de vaccination, affiché)*.
- Supprimé : examen neuro-musculaire détaillé de l'adulte.

### 3. Cabinet dentaire
Constat : le DPI réutilise le formulaire de médecine générale sans rien de dentaire.
- **Schéma dentaire** (numérotation FDI, 32 dents adultes / 20 lactéales selon l'âge) :
  un clic par dent → état (saine, carie, absente, obturée, couronne, à extraire, mobile).
- **Motif dentaire** (douleur, gonflement, saignement, contrôle, esthétique).
- Examen endobuccal : gencives, muqueuses, occlusion, hygiène (bonne / moyenne / mauvaise).
- **Actes par dent** (lignes répétables) : dent, acte (détartrage, extraction, obturation,
  dévitalisation, prothèse…), facturés en caisse.
- *(replié)* Radiographie rétro-alvéolaire / panoramique demandée.
- Supprimé : les 8 appareils de l'examen général (seul l'état général reste).

### 4. Cardiologie
- **TA aux deux bras**, pouls, **auscultation** (bruits du cœur, souffles : temps, siège,
  intensité), œdèmes, turgescence jugulaire, pouls périphériques.
- **Facteurs de risque** (repris des antécédents) : HTA, diabète, tabac, dyslipidémie, obésité.
- *(replié)* **ECG** (rythme, fréquence, anomalies), **écho-cœur** (FEVG), classe **NYHA**.
- Examens proposés : bilan lipidique, créatinine, ionogramme, troponine si douleur thoracique.

### 5. Chirurgie
- **Siège et nature de la lésion / de la plainte**, examen local (schéma du corps :
  zone cliquée), signes péritonéaux *(si abdomen)*.
- **Indication opératoire** : oui / non, **urgence** (immédiate / différée / programmée).
- Si opération : intervention prévue, date, **orientation CPA** (consultation
  pré-anesthésie), bilan pré-opératoire.
- *(replié)* Soins de plaie : type de plaie, pansement, sutures, ablation des fils.

### 6. CPA — Consultation pré-anesthésie
- **Intervention prévue** (repris de la chirurgie), date.
- **Score ASA** (1 à 5), **Mallampati** (1 à 4), ouverture de bouche, dents mobiles,
  **allergies** (repris), traitements en cours (repris), antécédents anesthésiques.
- **Jeûne**, groupe sanguin *(repris)*, bilan (NFS, TP/TCA, créatinine, glycémie).
- **Décision** : apte / apte sous réserve / inapte ; type d'anesthésie prévue.

### 7. Dermatologie
- **Lésion** : type (macule, papule, vésicule, plaque, ulcère…), siège (schéma du corps),
  taille, nombre, couleur, prurit, évolution.
- *(replié)* Photo de la lésion (déposée dans la GED, rattachée au patient).
- Examens proposés : prélèvement mycologique, biopsie.

### 8. Gynécologie
- **Date des dernières règles**, cycle (régulier / irrégulier), gestité, parité, contraception.
- Examen : seins *(replié)*, **spéculum** (col, leucorrhées), toucher vaginal
  (utérus, annexes, douleur).
- **Dépistage cancer du col** (IVA/IVL : positif / négatif / non fait) → dépistage.
- Si grossesse : bascule vers **CPN**.

### 9. Kinésithérapie
- **Prescription d'origine** (médecin, diagnostic), zone atteinte, douleur (EVA 0-10).
- Bilan : mobilité (amplitudes), force (0-5), autonomie.
- **Séance** : techniques réalisées, n° de séance sur le total prescrit (carnet de suivi).

### 10. Ophtalmologie
- **Acuité visuelle** OD / OG (sans et avec correction), **tension oculaire** OD / OG.
- Examen : paupières, conjonctive, cornée, cristallin, fond d'œil *(replié)*.
- *(replié)* Réfraction / **prescription de lunettes** (sphère, cylindre, axe, addition).

### 11. ORL
- Otoscopie OD / OG (tympan normal, perforé, bombé, cérumen), rhinoscopie, gorge
  (amygdales), aires cervicales.
- *(replié)* Audition (test simple), nasofibroscopie.

### 12. Clinique de diabétologie (avec carnet)
- **Glycémie** (repris des constantes), **HbA1c** *(dernier résultat repris du labo)*.
- **Pied diabétique** : pouls pédieux, sensibilité (monofilament), plaie → alerte.
- Complications : yeux, reins (créatinine), cœur. Traitement de fond (repris, ajustable).
- → suivi des diabétiques.

### 13. Neuro-psychiatrie
- Neuro : conscience (score de Glasgow), déficit moteur ou sensitif (siège), réflexes,
  convulsions (fréquence).
- Psy : humeur, idées suicidaires (**obligatoire à poser** → alerte), hallucinations,
  comportement, sommeil. *(replié)* Échelles (PHQ-9, GAD-7).

### 14. Urologie
- Troubles mictionnels (dysurie, pollakiurie, rétention, hématurie), toucher rectal *(replié)*,
  bourses. Examens : ECBU, PSA, échographie.

### 15. Rhumatologie
- Articulations douloureuses / gonflées (schéma des articulations), raideur matinale (durée),
  EVA. Examens : VS / CRP, acide urique, radiographie.

### 16. Pneumologie
- Auscultation détaillée, SpO₂ (repris), **toux de plus de 2 semaines → recherche de
  tuberculose** (GeneXpert / crachats) → tuberculose.
- *(replié)* Spirométrie / débit de pointe, asthme (fréquence des crises).

### 17. Hémodialyse (avec carnet de séances)
- **Poids avant / après**, TA avant / pendant / après, abord vasculaire (fistule / cathéter,
  état), durée de séance, ultrafiltration, incidents.
- Pas de diagnostic à chaque séance : le tronc commun est allégé (motif = « Séance »).

### 18. Télémédecine
- Pas un formulaire à part : **mode de la consultation** (présentiel / à distance) dans le
  tronc commun, avec le médecin distant et le lien de l'appel.

---

## B. Programmes de santé (avec carnet de suivi)

### 19. CPN — Consultation prénatale (DAK OMS, indicateurs CPN1 / CPN4)
- **N° de la CPN** (1, 2, 3, 4… calculé), **DDR** → âge gestationnel et **date prévue
  d'accouchement** calculés.
- Obstétrique : gestité, parité, avortements, césarienne antérieure.
- Examen : **TA**, poids, **hauteur utérine**, **BCF**, présentation *(après 36 SA)*, œdèmes.
- Dépistages : **VIH**, syphilis, Hb, glycémie, protéinurie, groupe / rhésus → PTME.
- Prévention : **TPI (SP) dose n°**, **VAT / Td dose n°**, fer-acide folique, **MILDA remise**.
- **Signes de danger** (saignement, céphalées + troubles visuels, convulsions, fièvre,
  perte de liquide) → alerte et orientation.
- *(replié)* Plan d'accouchement, lieu prévu.

### 20. Accouchement (partogramme)
- Admission : heure, dilatation, poche des eaux, présentation, BCF.
- **Partogramme** : dilatation / heure, BCF, contractions, TA de la mère (lignes répétables).
- Issue : **mode** (voie basse / césarienne / instrumental), **date et heure**, **sexe**,
  **poids**, **Apgar 1 et 5 min**, réanimation du nouveau-né, **GATPA**, complications
  (hémorragie, déchirure) → accouchements assistés, naissances vivantes, décès maternels.

### 21. CPON — Consultation postnatale
- Mère : n° de la visite (J3, J7, S6), TA, saignement, involution utérine, cicatrice,
  allaitement, contraception post-partum.
- Nouveau-né : poids, cordon, ictère, allaitement, vaccins de naissance (BCG, VPO0, HepB0).

### 22. Planning familial (DAK OMS)
- **Méthode** (pilule, injectable, implant, DIU, préservatif, naturelle…), **nouvelle
  utilisatrice / renouvellement**, date du prochain rendez-vous (calculée selon la méthode).
- Critères d'éligibilité (OMS) : grossesse exclue, TA, allaitement, effets secondaires.
- → nouvelles acceptantes, utilisatrices par méthode.

### 23. Vaccination (PEV — 8 contacts avec le vaccin antipaludique R21 depuis 2024)
- **Calendrier** affiché selon l'âge : BCG, VPO, Penta (DTC-HepB-Hib), pneumocoque,
  rotavirus, VPI, RR, fièvre jaune, **VAP (4 doses)**… doses faites / dues / en retard.
- Par vaccin donné : **dose**, **lot**, site, date → carnet et registre PEV.
- Enfant complètement vacciné calculé ; *(replié)* manifestation post-vaccinale (MAPI).

### 24. VIH (DAK OMS)
- **Statut**, date du diagnostic, **stade OMS**, **CD4** / **charge virale** (reprise du labo).
- **Traitement ARV** : schéma, date de début, observance, effets secondaires.
- Dépistage TB à chaque visite, prophylaxie (cotrimoxazole, TPT).
- Accès restreint (confidentialité) : visible seulement du praticien VIH.

---

## Ce que ça donne

| | Nombre |
|---|---|
| Modules du DPI couverts par Consultation | 24 |
| Formulaires à écrire (le reste est du tronc commun) | 23 blocs de spécialité |
| Carnets de suivi | CPN, CPON, PF, vaccination, VIH, diabète, hémodialyse, kiné |
| Nouveaux types de champ nécessaires | schéma dentaire, schéma du corps, courbes de croissance, partogramme |

## Ordre de construction proposé
1. Séparer **rôle** et **spécialités** (comptes, administration) et envoyer le patient vers
   le **formulaire de son service** depuis la caisse.
2. Les spécialités sans nouveau type de champ : gynécologie, cardiologie, ORL, urologie,
   rhumatologie, pneumologie, dermatologie, neuro-psychiatrie, CPA, chirurgie.
3. Les programmes avec carnet : CPN, CPON, PF, vaccination, VIH, diabète.
4. Les champs graphiques : schéma dentaire, schéma du corps, courbes, partogramme.

## Sources
- OMS — Digital Adaptation Kit for Antenatal Care : https://www.who.int/publications/i/item/9789240020306
- OMS — Digital Adaptation Kit for Family Planning : https://www.who.int/publications/i/item/9789240029743
- OMS — Digital adaptation kit for immunizations : https://www.who.int/publications/b/72832
- OMS — Digital adaptation kit for HIV (2e édition) : https://www.who.int/publications/i/item/9789240085138
- OMS — Manuel sur la PCIME : https://www.who.int/fr/publications/i/item/9241546441
- Ministère de la Santé CI — nouveau calendrier vaccinal du PEV : https://www.sante.gouv.ci/actualite/1770
- Countdown 2030 — revue documentaire Côte d'Ivoire (CPN, DHIS2) : https://www.countdown2030.org/wp-content/uploads/2025/11/RAPPORT-REVUEDOCUMENTAIRE-CD2030_CIV_Vers-26-01-2021.pdf
- JMIR — mise en œuvre des DAK en Afrique : https://medinform.jmir.org/2025/1/e58858
