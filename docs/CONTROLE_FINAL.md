# Contrôle de déploiement

## Vérifications exécutées sur le pack

- installation propre des dépendances avec `npm ci --ignore-scripts` ;
- intégrité de `package.json` et `package-lock.json` ;
- présence de la migration PostgreSQL initiale ;
- contrôle syntaxique de tous les fichiers TypeScript et TSX ;
- 7 tests unitaires réussis : moteur d'affectation et parseurs d'import ;
- ouverture et lecture des deux modèles Excel ;
- recherche de secrets et de fichiers interdits dans le pack.

## Vérifications automatiques réalisées par Vercel après l'import GitHub

Le premier déploiement exécute successivement :

1. `prisma generate` ;
2. `prisma migrate deploy` sur Neon ;
3. `next build`.

Ces trois contrôles utilisent l'environnement réel Vercel/Neon et constituent la validation finale de production.

## Contrôles fonctionnels après un déploiement `READY`

- `/api/health` répond avec une base accessible ;
- `/setup` indique que Neon et Gmail sont configurés ;
- le lien d'activation du premier administrateur est reçu ;
- import test de deux enseignants ;
- import test de deux examens ;
- calcul d'affectations ;
- envoi d'une convocation test ;
- export Excel des affectations.
