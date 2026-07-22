# Contrôle du package V1.1.0-rc.2

## Contrôles exécutés localement

- `npm run lint` : **0 erreur** ;
- `npm run typecheck` : **réussi** ;
- `npm test` : **38 tests réussis sur 38** ;
- `npm run check` : **réussi** ;
- compilation du code Next.js : **réussie** avant l’étape de collecte des pages ;
- cohérence de `package.json` et `package-lock.json` ;
- présence du schéma Prisma et de la migration initiale ;
- présence des deux modèles Excel ;
- absence de `.env`, `.next`, `node_modules`, `tsbuildinfo` et journaux dans l’archive finale ;
- protection des rôles sur les routes sensibles ;
- protection de `/setup` ;
- déterminisme du moteur d’affectation ;
- validations de dates, horaires, mots de passe, longueurs et valeurs entières ;
- date civile vérifiée pour `Europe/Paris` ;
- protection des examens, enseignants et affectations déjà engagés ou notifiés ;
- invitation ICS unique, échappée, pliée et munie d’une séquence évolutive.

## Validation encore requise dans l’environnement connecté

Le bac à sable n’a pas accès aux binaires Prisma distants. La chaîne complète suivante doit être confirmée par GitHub Actions ou Vercel :

1. `npm ci` ;
2. `npx prisma generate` ;
3. `npx prisma migrate deploy` ;
4. `npm run build` ;
5. statut GitHub Actions vert ;
6. déploiement Vercel `READY`.

La Release Candidate ne doit être fusionnée sur `main` qu’après ces contrôles.

## Recette fonctionnelle minimale après déploiement

- `/api/health` répond HTTP 200 et indique `1.1.0-rc.2` ;
- `/setup` sans jeton est introuvable ;
- activation et connexion administrateur ;
- import test enseignants puis examens ;
- refus de désactivation d’un enseignant affecté ;
- saisie d’une disponibilité ;
- calcul d’affectations ;
- ajout manuel et verrouillage ;
- envoi d’un lot de convocations et contrôle du reliquat ;
- ouverture du fichier ICS ;
- export Excel ;
- présence des opérations dans l’audit.
