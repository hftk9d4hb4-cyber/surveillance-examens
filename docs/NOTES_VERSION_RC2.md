# Notes de version — V1.1.0-rc.2

La RC2 est une itération de stabilisation ciblée de la RC1. Elle ne modifie pas le périmètre fonctionnel principal.

## Correctifs intégrés

- calcul du « jour courant » à partir de l’heure civile `Europe/Paris`, et non de la date UTC ;
- protection de la désactivation par import d’un enseignant encore affecté à une surveillance future ;
- verrouillage de l’interface et du serveur pour les affectations dont la convocation a déjà été envoyée ;
- validation homogène des longueurs de champs importés ;
- refus des quotas et nombres de surveillants non entiers ;
- retour explicite du nombre de convocations restant dans la file après un lot ;
- contrôle de l’examen sélectionné avant envoi : publié, à venir et année universitaire réelle ;
- propriété ICS `SEQUENCE` dérivée de la dernière mise à jour de l’examen afin de faciliter la prise en compte d’une invitation actualisée ;
- version applicative centralisée pour l’endpoint de santé ;
- configuration ESLint rendue indépendante des fichiers générés par Next.js.

## Tests

La suite passe de 27 à **38 tests automatisés**. Les nouveaux scénarios couvrent notamment :

- les changements de jour et d’année en heure de Paris ;
- les protections de l’import enseignants ;
- les valeurs décimales interdites ;
- les limites de longueur ;
- l’évolution de la séquence ICS.

## Recette attendue

La RC2 doit être déployée sur une URL de préproduction Vercel. La fusion dans `main` reste conditionnée à un pipeline GitHub Actions vert et à la recette fonctionnelle décrite dans `RECETTE_V1_1.md`.
