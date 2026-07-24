# Recette fonctionnelle — Sprint 1 V1.2

| ID | Scénario | Résultat attendu |
|---|---|---|
| C01 | Connexion enseignant puis accès direct à `/campaigns` | Redirection pour accès non autorisé |
| C02 | Création d’une campagne valide | Campagne créée en statut Préparation et audit enregistré |
| C03 | Création d’un doublon même année/promotion/nom | Refus explicite |
| C04 | Date limite postérieure au début des examens | Refus de validation |
| C05 | Désignation d’un enseignant comme gestionnaire | Refus |
| C06 | Modification d’une campagne ouverte | Données mises à jour |
| C07 | Réduction de période excluant un examen rattaché | Refus |
| C08 | Passage Préparation directement à Publiée | Refus |
| C09 | Passage en Collecte sans examen | Refus |
| C10 | Rattachement d’un examen de même promotion et dans la période | Succès |
| C11 | Rattachement d’un examen hors période ou autre promotion | Refus |
| C12 | Suppression d’une campagne contenant un examen | Refus |
| C13 | Détachement des examens puis suppression en Préparation | Succès |
| C14 | Migration d’une base V1.1 existante | Examens conservés avec campagne nulle |
