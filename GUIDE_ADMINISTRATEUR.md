# Déploiement V1.1 sur GitHub, Vercel et Neon

## 1. Préparation du dépôt

Le contenu de l’archive doit être placé à la racine du dépôt. La racine doit notamment contenir :

```text
app/
components/
lib/
prisma/
public/
tests/
types/
package.json
package-lock.json
vercel.json
```

Ne déposez pas le dossier parent dans le dépôt. Ne déposez jamais de fichier `.env`.

## 2. Variables Vercel

Dans **Project Settings → Environment Variables**, configurez au minimum :

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ADMIN_EMAIL`
- `SETUP_TOKEN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

Les variables doivent être disponibles dans l’environnement **Production**. `NEXTAUTH_URL` doit correspondre à l’URL réellement utilisée par les utilisateurs.

## 3. Commande de build

`vercel.json` appelle :

```bash
npm run vercel-build
```

Cette commande exécute successivement :

```bash
prisma generate
prisma migrate deploy
next build
```

La migration est idempotente : après son premier passage, Prisma doit afficher `No pending migrations to apply`.

## 4. Contrôle immédiat

Après un déploiement `READY` :

1. ouvrir `/api/health` et vérifier un statut HTTP 200 ;
2. ouvrir `/login` ;
3. vérifier `/setup?token=<SETUP_TOKEN>` ;
4. activer le premier administrateur ;
5. exécuter la recette de `RECETTE_V1_1.md`.

## 5. Retour arrière

En cas d’erreur fonctionnelle :

- utiliser le rollback Vercel vers le dernier déploiement `READY` ;
- ne pas supprimer manuellement les tables Neon ;
- conserver les journaux du build et les erreurs d’exécution ;
- corriger le code dans une nouvelle version plutôt que modifier la base directement.

La Release Candidate conserve la migration initiale. Toute base existante doit être sauvegardée avant déploiement et `prisma migrate deploy` doit être exécuté uniquement par le pipeline.
