# Journal des versions

## 1.1.0-rc.2 — 20 juillet 2026

### Stabilisation

- date civile calculée en `Europe/Paris` pour les examens à venir ;
- désactivation par import interdite pour un enseignant affecté dans le futur ;
- affectations notifiées rendues immuables dans le parcours standard ;
- file résiduelle de convocations affichée après chaque lot ;
- validation renforcée des envois ciblés ;
- séquence ICS actualisée à partir de la dernière modification de l’examen ;
- limites de longueur harmonisées entre formulaires et imports ;
- quotas et besoins décimaux refusés ;
- version applicative centralisée ;
- fichiers générés Next.js exclus du lint.

### Qualité

- suite portée à 38 tests automatisés ;
- lint et vérification TypeScript réussis ;
- documentation, recette et formats d’import mis à jour.

## 1.1.0-rc.1 — 20 juillet 2026

### Sécurité

- protection de `/setup` par `SETUP_TOKEN` ;
- suppression de l’adresse administrateur et de l’état SMTP dans les endpoints publics ;
- contrôle en base du compte actif et du rôle pour les routes API ;
- import enseignants et activation réservés aux administrateurs ;
- conservation obligatoire du dernier administrateur actif ;
- comparaison bcrypt factice pour limiter la différence de temps entre compte connu et inconnu ;
- sécurisation du seed : plus aucun mot de passe par défaut.

### Imports

- validation stricte des dates civiles, horaires et années universitaires ;
- détection des doublons enseignants et examens ;
- limite de 5 Mo et de 5 000 lignes ;
- numéros de lignes source conservés dans les erreurs ;
- détail des erreurs consultable dans l’historique ;
- protection des comptes gestionnaires et administrateurs ;
- blocage de la modification de la planification d’un examen déjà affecté ;
- blocage d’un besoin inférieur au nombre d’affectations existantes.

### Affectations

- moteur déterministe, indépendant de l’ordre des données ;
- respect d’un quota annuel égal à zéro ;
- limitation à une surveillance par jour ;
- conservation des affectations verrouillées ;
- contrôle de la capacité, de la disponibilité et du quota lors des ajouts manuels ;
- blocage de la suppression d’un examen déjà affecté.

### Convocations et calendrier

- envoi standard limité aux convocations non envoyées ;
- renvoi massif limité à un examen précis ;
- exclusion des examens passés et des comptes inactifs ;
- correction de la double pièce jointe ICS ;
- amélioration de l’échappement et du pliage des lignes ICS ;
- téléchargement ICS protégé et non mis en cache.

### Qualité et documentation

- 27 tests automatisés ;
- lint et vérification TypeScript sans erreur ;
- workflow GitHub Actions ;
- guides utilisateur et administrateur ;
- recette fonctionnelle, sécurité, déploiement et formats d’import documentés.

## 1.0.0

Première version : authentification, imports, disponibilités, affectations, convocations, exports et audit.
