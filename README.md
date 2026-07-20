# Surveillance des examens

Archive complète de remplacement pour GitHub et Vercel.

## Import GitHub

Décompressez l’archive puis importez **le contenu du dossier**, et non le dossier parent.  
Conservez exactement l’arborescence `app/`, `components/`, `lib/`, `prisma/` et `types/`.

## Variables Vercel

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

## Important

Le schéma fourni reste en SQLite pour compatibilité avec l’ancien prototype.  
Pour une utilisation réelle sur Vercel, il faut migrer vers PostgreSQL.
