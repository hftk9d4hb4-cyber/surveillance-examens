# Cahier des charges — Organisation des surveillances d’examen

## Objectif

Créer une application web permettant à une faculté d’organiser les surveillances d’examen par demi-journée, avec saisie des disponibilités par les enseignants, création des examens par la scolarité, affectation automatique équitable, convocation et export.

## Rôles

### Enseignant

- se connecter à son espace personnel ;
- déclarer ses disponibilités, préférences et indisponibilités ;
- consulter le tableau synthétique de ses surveillances ;
- voir le statut de ses convocations ;
- télécharger l’invitation calendrier `.ics` de chaque surveillance.

### Gestionnaire de scolarité

- créer les examens ;
- préciser la date, la demi-journée, la promotion, la salle et le nombre de surveillants requis ;
- lancer la génération automatique des affectations ;
- contrôler les enseignants affectés ;
- vérifier les enseignants à convoquer ;
- envoyer les convocations par e-mail avec invitation calendrier ;
- suivre les erreurs ou renvois de convocation ;
- exporter le planning en Excel.

### Administrateur

- gérer les comptes ;
- activer ou désactiver les enseignants ;
- contrôler les paramètres généraux.

## Règles d’affectation

L’algorithme doit :

- éviter les indisponibilités déclarées ;
- privilégier les préférences fortes ;
- répartir équitablement la charge entre enseignants ;
- éviter les doublons sur une même demi-journée ;
- signaler les examens insuffisamment couverts ;
- permettre une modification manuelle ultérieure par la scolarité.

## Convocations

Chaque convocation doit comprendre :

- nom de l’enseignant ;
- intitulé de l’examen ;
- promotion ;
- date ;
- horaire estimé selon demi-journée ;
- lieu ;
- invitation calendrier `.ics` ;
- statut d’envoi.

Les statuts minimaux sont :

- `À envoyer` ;
- `Envoyée` ;
- `Erreur`.

## Exports

Le fichier Excel doit contenir :

- planning par examen ;
- enseignants affectés ;
- couverture attendue / réalisée ;
- statut des convocations ;
- synthèse par enseignant.
