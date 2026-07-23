# MP-01 — Stabilisation technique

Version cible : `1.2.0-beta.2`

## Changements

- alignement de la version déclarée dans `package.json` et exposée par `/api/health` ;
- génération et suivi d’un `package-lock.json` reproductible ;
- suppression des copies, téléchargements et artefacts de compilation introduits lors des imports manuels ;
- ajout d’un contrôle automatisé des noms suspects et de l’organisation du dépôt ;
- exécution des tests TypeScript sans serveur IPC auxiliaire ;
- ajout d’une CI complète sous Node.js 22.

## Validation attendue

```bash
npm ci
npm run check:hygiene
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test
npm run build
```

La route `/api/health` doit renvoyer `status`, `database` et la version `1.2.0-beta.2`.
