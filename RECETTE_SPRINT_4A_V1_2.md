# Rapport de Livraison A — V1.1.0-rc.1

## Objet

Cette livraison transforme la version initiale en Release Candidate exploitable pour la préparation de la rentrée universitaire. Le périmètre est volontairement limité à la fiabilité, la sécurité, la traçabilité, les imports, les affectations, les convocations et la documentation.

## Principales consolidations

- rôles et statut actif vérifiés en base sur les opérations protégées ;
- page d’installation protégée par `SETUP_TOKEN` et sans exposition de l’adresse administrateur ;
- création du premier administrateur sans mot de passe par défaut ;
- validation stricte des mots de passe, dates, horaires et années universitaires ;
- imports XLSX/CSV limités à 5 Mo et 5 000 lignes, avec numéros de lignes sources et rapport d’erreurs ;
- protection des comptes gestionnaires et administrateurs lors des imports enseignants ;
- protection des examens déjà affectés lors d’un réimport ;
- moteur d’affectation déterministe, respectant quota zéro, indisponibilités et affectations verrouillées ;
- blocage du recalcul global après envoi d’une convocation ;
- blocage de la suppression d’une affectation ou du retrait de publication d’un examen déjà notifié ;
- blocage de la désactivation d’un enseignant encore affecté à une surveillance future ;
- envoi des convocations par lots et suppression du doublon de pièce jointe ICS ;
- journalisation des imports, affectations, convocations et opérations administratives ;
- modèles Excel professionnels et documentés ;
- chaîne CI GitHub : installation, Prisma, lint, TypeScript, tests et build.

## Contrôles locaux

- `npm run check` : réussi ;
- ESLint : 0 erreur, 0 avertissement ;
- TypeScript : réussi ;
- tests automatisés : 27/27 réussis ;
- modèles Excel : feuilles et en-têtes vérifiés, aucune erreur de formule détectée ;
- package : aucun secret, fichier `.env`, dépendance locale ou répertoire de build inclus.

## Contrôles restant à exécuter en environnement connecté

L’environnement local ne peut pas télécharger les binaires Prisma depuis `binaries.prisma.sh`. La qualification finale nécessite donc le passage de GitHub Actions et le build de préproduction Vercel :

1. `npm ci` ;
2. `prisma generate` ;
3. `prisma migrate deploy` ;
4. `next build` ;
5. recette fonctionnelle sur la préproduction.

## Décision de mise en production

La branche Release Candidate ne doit être fusionnée dans `main` qu’après succès de la CI et de la recette de préproduction décrite dans `docs/RECETTE_V1_1.md`.
