# Déploiement Vercel + Neon

## Import GitHub

Décompresser l'archive et importer **le contenu intérieur** du dossier à la racine du dépôt `surveillance-examens`.

La racine GitHub doit contenir directement :

```text
app/
components/
docs/
lib/
prisma/
public/
tests/
package.json
package-lock.json
vercel.json
```

Ne pas importer `.env`, `.env.local`, `node_modules` ou `.next`.

## Processus automatique

`vercel.json` demande à Vercel d'exécuter `npm run vercel-build`. Ce script :

1. utilise `DATABASE_URL` ou, à défaut, `POSTGRES_PRISMA_URL` ;
2. utilise `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING` ou `POSTGRES_URL` pour les migrations ;
3. génère le client Prisma ;
4. applique la migration PostgreSQL initiale et les migrations futures ;
5. compile l'application Next.js.

## Premier administrateur

Au premier accès à `/login`, l'application initialise automatiquement le premier compte administrateur si la base est vide.

- adresse : `ADMIN_EMAIL`, ou à défaut `SMTP_USER` ;
- si `ADMIN_PASSWORD` est absent, un lien d'activation valable 7 jours est envoyé par Gmail ;
- aucun mot de passe par défaut n'est exposé dans le dépôt.

## Contrôles après déploiement

- le dernier déploiement doit être `READY` ;
- `/api/health` doit indiquer `status: ok` et `database: ok` ;
- `/setup` doit indiquer une base accessible et un SMTP configuré ;
- le premier lien d'activation doit arriver à `ADMIN_EMAIL` ou `SMTP_USER`.

## Données et sécurité

- les secrets restent exclusivement dans Vercel ;
- la base Neon n'est jamais stockée dans GitHub ;
- les mots de passe sont hachés avec bcrypt ;
- les liens d'activation sont stockés sous forme de condensat SHA-256 et expirent après 7 jours ;
- les opérations sensibles sont journalisées dans `AuditLog` ;
- les envois SMTP échouent explicitement en production si la configuration Gmail est incomplète.
