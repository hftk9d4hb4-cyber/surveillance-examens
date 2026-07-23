# MP-04 — Confirmation de prise de connaissance des convocations

## Objectif

Obtenir une confirmation explicite et traçable de chaque enseignant après l’envoi
d’une convocation, sans confondre cette confirmation avec une acceptation ou un
refus d’affectation.

## Périmètre livré

- modèle `AssignmentAcknowledgement`, unique par affectation ;
- page enseignant `/my-convocations`, adaptée au smartphone et à l’iPad ;
- lien vers cette page dans la navigation, le tableau de bord et le courriel de
  convocation ;
- bouton « J’ai pris connaissance de cette convocation » ;
- date et heure de confirmation visibles par l’enseignant ;
- statut et date de confirmation visibles dans le tableau dense de la scolarité ;
- compteur des confirmations attendues ;
- journal d’audit `ASSIGNMENT_ACKNOWLEDGED` ;
- réinitialisation de la confirmation lors d’un nouvel envoi de convocation.

## Garde-fous

La confirmation est acceptée uniquement si :

- l’utilisateur authentifié est l’enseignant affecté ;
- le compte est actif ;
- la convocation a été envoyée avec succès ;
- l’examen est publié et n’est pas passé ;
- aucune confirmation n’existe déjà.

L’action est idempotente : une seconde confirmation ne crée ni doublon ni nouvel
événement d’audit. Un gestionnaire ou un administrateur ne peut pas confirmer à
la place de l’enseignant.

## Exclusions

MP-04 n’ajoute ni acceptation/refus de la mission, ni signature électronique, ni
confirmation depuis un lien public sans authentification.
