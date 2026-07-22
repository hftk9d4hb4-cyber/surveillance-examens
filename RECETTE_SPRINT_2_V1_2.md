# Sprint 4B — Portail enseignant

Version : `1.2.0-beta.1-4b`

## Fonctions livrées

- portail enseignant dédié `/teacher/dashboard` ;
- prochaine surveillance mise en avant ;
- convocations à venir avec fichier ICS ;
- états de confirmation : en attente, consultée, confirmée, refusée, remplacée ;
- confirmation explicite ;
- refus motivé transmis au gestionnaire ;
- historique personnel récent ;
- affichage du quota, des préférences et des absences ;
- suivi global des confirmations dans la page gestionnaire ;
- journalisation des lectures, confirmations et refus ;
- empreinte de planification permettant de signaler une modification après confirmation.

## Migration

La migration `20260722150000_teacher_portal_confirmations` est additive. Elle ne supprime ni ne transforme les convocations existantes. Les convocations antérieures sont initialisées à `PENDING`.

## Contrôles d'accès

Toutes les actions enseignant filtrent simultanément sur l'identifiant de convocation et l'identifiant de l'utilisateur connecté. Un enseignant ne peut donc pas consulter ou modifier la réponse d'un autre enseignant.
