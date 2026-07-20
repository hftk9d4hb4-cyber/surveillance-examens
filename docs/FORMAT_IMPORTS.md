# Formats d'import

## Enseignants

Colonnes recommandées :

| Colonne | Obligatoire | Exemple |
|---|---:|---|
| `nom` | oui, sauf `nom_complet` | Durand |
| `prenom` | non | Anne |
| `email` | oui | anne.durand@univ.fr |
| `service` | non | Chirurgie digestive |
| `specialite` | non | Chirurgie viscérale |
| `quota_annuel` | non | 4 |
| `actif` | non | Oui |

L'adresse électronique est la clé de mise à jour. Un nouvel import peut donc corriger le service, la spécialité, le quota ou l'état actif sans créer de doublon.

## Examens

| Colonne | Obligatoire | Exemple |
|---|---:|---|
| `identifiant` | non, recommandé | ECOS-DFASM2-2026-01 |
| `date` | oui | 15/10/2026 |
| `demi_journee` | oui | Matin |
| `heure_debut` | non | 08:00 |
| `heure_fin` | non | 12:00 |
| `intitule` | oui | ECOS DFASM2 |
| `promotion` | oui | DFASM2 |
| `lieu` | oui | Faculté — salles ECOS |
| `nb_surveillants` | oui | 8 |
| `annee_universitaire` | non | 2026-2027 |
| `notes` | non | Briefing à 07:45 |

`Matin`, `AM`, `Après-midi` et `PM` sont reconnus. Les dates françaises `JJ/MM/AAAA` et ISO `AAAA-MM-JJ` sont acceptées.
