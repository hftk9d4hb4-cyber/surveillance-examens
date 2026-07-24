# MP-05 — Annulation et remplacement après convocation

## Objectif

Empêcher toute modification silencieuse d’un examen ou d’une affectation après
l’envoi d’une convocation.

## Workflow

1. choisir un examen comportant au moins une convocation envoyée ;
2. sélectionner le type de changement et saisir un motif obligatoire ;
3. identifier les enseignants concernés et prévisualiser les conséquences ;
4. confirmer explicitement l’application ;
5. appliquer la modification, réinitialiser les prises de connaissance concernées
   et envoyer immédiatement les nouvelles convocations ou annulations ;
6. conserver le dossier et le résultat des notifications dans l’historique.

## Changements couverts

- annulation de l’examen ;
- modification d’horaire ou de lieu ;
- correction des informations de convocation ;
- ajout ou retrait d’un enseignant ;
- remplacement d’un enseignant ;
- indisponibilité tardive avec remplacement.

## Garde-fous

- droits administrateur ou gestionnaire de la campagne recalculés côté serveur ;
- motif de 5 à 500 caractères ;
- prévisualisation impossible sans convocation envoyée ;
- refus d’une prévisualisation devenue obsolète ;
- remplaçant actif, non déjà affecté, non indisponible, sans conflit journalier
  et sous son quota annuel ;
- conservation d’un instantané avant modification ;
- journalisation de l’acteur, du motif et des éventuelles erreurs d’envoi ;
- annulations calendrier `METHOD:CANCEL` et convocations mises à jour
  `METHOD:REQUEST`.

## Exclusions

Ce micro-pack ne permet pas à l’enseignant de refuser lui-même une affectation. Il
n’autorise pas non plus une modification directe sans prévisualisation ni motif.
