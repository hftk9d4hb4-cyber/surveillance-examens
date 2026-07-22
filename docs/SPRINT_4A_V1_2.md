# Sprint 4A — Centre de pilotage

Version : `1.2.0-beta.1-4a`.

## Fonctionnalités

- tableau de bord dédié à chaque campagne ;
- KPI de couverture, disponibilités, convocations et progression globale ;
- détection des disponibilités manquantes, examens sous-dotés, doubles affectations, affectations incompatibles et quotas dépassés ;
- distinction des examens tiers-temps sous-dotés ;
- résolution manuelle auditée et résolution automatique lors d’un nouveau calcul ;
- historique des changements de statut issu du journal d’audit ;
- contrôle d’accès pour les gestionnaires affectés et les administrateurs.

## Déploiement

Exécuter `npx prisma migrate deploy` avant le démarrage de l’application.
