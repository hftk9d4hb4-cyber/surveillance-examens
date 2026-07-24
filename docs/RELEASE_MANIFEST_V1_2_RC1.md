# Manifeste de release — V1.2.0-rc.1

## Identité

- version : `1.2.0-rc.1` ;
- branche : `release/v1.2.0-rc.1` ;
- branche de base des pull requests : `feature/v1.2-dashboard-relances` ;
- environnement de validation finale : Vercel ;
- fusion automatique vers `main` : interdite.

## Micro-packs inclus

1. MP-01 — Stabilisation de la base V1.2 ;
2. MP-02 — Tableau global des relances ;
3. MP-03 — Relances ciblées et traçabilité ;
4. MP-04 — Confirmation de prise de connaissance ;
5. MP-05 — Annulation et remplacement après convocation ;
6. MP-06 — Exports opérationnels et pilotage ;
7. MP-07 — Ergonomie mobile et préparation de la release.

## Chaîne de validation

```bash
npm ci
npm run check
npm run db:validate
npm run db:generate
npm run build
```

Le build Vercel doit exécuter la commande définie dans `vercel.json`, soit
`npm run vercel-build`. Celle-ci enchaîne :

1. `prisma generate` ;
2. `prisma migrate deploy` ;
3. `next build`.

## Critères de promotion

- tous les contrôles locaux sont verts ;
- la pull request MP-07 cible la branche V1.2, jamais `main` ;
- le déploiement Vercel est `READY` ;
- `/api/health` expose `1.2.0-rc.1` ;
- la recette `RECETTE_V1_2_RC1.md` est réalisée ;
- aucune anomalie bloquante n’est ouverte ;
- la fusion finale fait l’objet d’une décision explicite distincte.
