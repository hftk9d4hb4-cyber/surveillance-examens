# V1.2.0-alpha.1 — Sprint 1

## Périmètre livré

Ce sprint introduit la notion de campagne d’examens sans modifier ni supprimer les données de la V1.1.

- modèle Prisma `Campaign` et enum `CampaignStatus` ;
- relation optionnelle `Exam.campaignId` ;
- migration PostgreSQL additive et rétrocompatible ;
- création, lecture, modification, changement de statut et suppression sécurisée ;
- désignation d’une gestionnaire active de rôle `MANAGER` ou `ADMIN` ;
- rattachement ou détachement d’un examen à une campagne ;
- validation de la promotion et de la période lors du rattachement ;
- journalisation des opérations dans `AuditLog` ;
- tests unitaires du cycle de statut et des limites calendaires.

## Cycle de vie

Le parcours normal est :

`PREPARATION → COLLECTING → ASSIGNING → PUBLISHED → CLOSED`

Des retours contrôlés sont possibles entre étapes voisines. Une campagne clôturée peut être réouverte en préparation. Le passage en collecte, affectations ou publication nécessite au moins un examen.

## Compatibilité avec la V1.1

La colonne `Exam.campaignId` est nullable. Après migration, tous les examens existants restent utilisables et apparaissent comme « Sans campagne ». La suppression d’une campagne est refusée tant qu’elle contient des examens.

## Déploiement

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run check
npm run build
```

Une sauvegarde de la base de production reste recommandée avant l’exécution de la migration.
