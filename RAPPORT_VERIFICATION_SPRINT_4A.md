# Formats d’import V1.1

Les fichiers `.xlsx` et `.csv` sont acceptés. La première ligne doit contenir les en-têtes. La taille maximale est de 5 Mo et le fichier est limité à 5 000 lignes de données.

## Enseignants

En-têtes recommandés :

| Champ | Obligatoire | Règle |
|---|---:|---|
| `prenom` | recommandé | 100 caractères maximum, combiné avec `nom` |
| `nom` | oui sauf `nom_complet` | 100 caractères maximum ; nom affiché limité à 180 |
| `email` | oui | adresse valide, unique, 320 caractères maximum |
| `service` | non | 120 caractères maximum |
| `specialite` | non | 120 caractères maximum |
| `quota_annuel` | non | entier de 0 à 100 |
| `actif` | non | Oui/Non ; vide = Oui |

Un quota égal à zéro interdit toute nouvelle affectation. Une adresse appartenant déjà à un gestionnaire ou à un administrateur n’est jamais convertie en compte enseignant. Un enseignant actif possédant une surveillance future ne peut pas être désactivé par import : il faut d’abord le réaffecter.

Les doublons d’adresse au sein du fichier sont signalés et ignorés.

## Examens

En-têtes recommandés :

| Champ | Obligatoire | Règle |
|---|---:|---|
| `identifiant` | non | stable, unique, recommandé, 120 caractères maximum |
| `date` | oui | date civile réelle, `JJ/MM/AAAA` ou `AAAA-MM-JJ` |
| `demi_journee` | oui | Matin, Après-midi, AM ou PM |
| `intitule` | oui | 180 caractères maximum |
| `promotion` | oui | 120 caractères maximum |
| `lieu` | oui | 180 caractères maximum |
| `nb_surveillants` | oui | entier de 1 à 200 |
| `heure_debut` | non | `HH:MM` |
| `heure_fin` | non | `HH:MM`, postérieure au début |
| `annee_universitaire` | non | doit correspondre à la date |
| `notes` | non | 2 000 caractères maximum |

Valeurs horaires par défaut :

- matin : 08:30–12:30 ;
- après-midi : 13:30–17:30.

Une date inexistante, un horaire invalide, une année incohérente ou un doublon dans le fichier sont rejetés ligne par ligne.

## CSV

Le séparateur peut être la virgule ou le point-virgule. L’encodage recommandé est UTF-8.

## Mise à jour d’un examen déjà affecté

Lorsque des affectations existent, l’import peut encore mettre à jour les notes, la promotion ou augmenter le besoin. Il refuse en revanche tout changement de date, demi-journée, horaire, lieu ou intitulé. Le besoin ne peut pas devenir inférieur au nombre d’affectations existantes.
