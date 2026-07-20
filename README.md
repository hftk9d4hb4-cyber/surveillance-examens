# Surveillance des examens — V1 Neon

Application Next.js destinée à la gestion des disponibilités, des affectations équitables et des convocations de surveillance d'examens.

## Fonctionnalités

- base PostgreSQL Neon persistante ;
- authentification sécurisée avec rôles Enseignant, Gestionnaire et Administrateur ;
- création automatique du premier administrateur et activation par e-mail ;
- import XLSX/CSV des enseignants et du calendrier des examens ;
- déclaration des disponibilités par demi-journée ;
- affectation automatique avec contraintes d'indisponibilité, quota, charge et une surveillance maximum par jour ;
- corrections manuelles et verrouillage ;
- convocations Gmail par lots avec invitation calendrier `.ics` ;
- export Excel des affectations et des charges ;
- journal des imports et audit des opérations sensibles.

## Installation sur le dépôt GitHub existant

1. Décompresser l'archive.
2. Ouvrir le dossier `surveillance-examens-neon-v1-final`.
3. Sélectionner **tout son contenu**, puis le déposer à la racine du dépôt GitHub `surveillance-examens`.
4. Accepter le remplacement des fichiers existants et valider le commit sur `main`.
5. Ne jamais importer `.env`, `.env.local`, `node_modules` ou `.next`.

La structure correcte est :

```text
surveillance-examens/
  app/
  components/
  lib/
  prisma/
  public/
  tests/
  package.json
  vercel.json
```

Si GitHub refuse de remplacer `app/api/auth/[...nextauth]/route.ts`, ce n'est pas bloquant lorsque l'ancien fichier contient déjà les quatre lignes NextAuth correctes.

## Premier démarrage

Le déploiement Vercel exécute automatiquement :

```text
prisma generate
prisma migrate deploy
next build
```

Au premier affichage de `/login`, l'application crée le premier administrateur :

- adresse utilisée : `ADMIN_EMAIL`, ou à défaut `SMTP_USER` ;
- si `ADMIN_PASSWORD` n'est pas défini, un lien d'activation est envoyé par Gmail.

Le diagnostic est disponible sur `/setup`. L'état technique est disponible sur `/api/health`.

## Variables Vercel requises

### Neon

- `DATABASE_URL` ou `POSTGRES_PRISMA_URL`
- `DATABASE_URL_UNPOOLED` ou `POSTGRES_URL_NON_POOLING`

### NextAuth

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://surveillance-examens.vercel.app`

### Gmail

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

### Facultatives

- `ADMIN_EMAIL` : adresse du premier administrateur ;
- `ADMIN_PASSWORD` : mot de passe initial conforme à la politique de sécurité. Sans cette variable, l'activation se fait par e-mail.

## Utilisation

1. Se connecter comme administrateur.
2. Ouvrir **Imports**.
3. Télécharger et compléter les deux modèles Excel.
4. Importer les enseignants.
5. Envoyer les liens d'activation par lots de 20.
6. Importer le calendrier des examens.
7. Les enseignants renseignent leurs disponibilités.
8. Ouvrir **Affectations** et lancer le calcul.
9. Corriger ou verrouiller manuellement si nécessaire.
10. Ouvrir **Convocations** et envoyer les convocations par lots de 25.

Voir également `docs/FORMAT_IMPORTS.md`, `docs/DEPLOIEMENT.md` et `docs/CONTROLE_FINAL.md`. Après l’import, Vercel réalise la validation finale sur la base Neon réellement connectée.
