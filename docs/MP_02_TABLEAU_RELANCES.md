# MP-02 — Tableau global des relances

## Objectif

Donner aux administrateurs et aux gestionnaires de campagne une vue unique des
enseignants qui nécessitent une action avant la planification des surveillances.

## Périmètre livré

- nouvelle route `/campaigns/[id]/reminders` ;
- contrôle d’accès identique au centre de pilotage : administrateur, gestionnaire
  affecté à la campagne ou gestionnaire d’une campagne non attribuée ;
- données limitées aux créneaux d’examen de la campagne sélectionnée ;
- nom, courriel, état d’activation, progression des disponibilités, dernière
  connexion, nombre et date de dernière relance, statut global et action requise ;
- exclusion des dossiers complets par défaut ;
- recherche et filtres d’activation, de disponibilité et de statut cumulables ;
- affichage responsive sous forme de lignes de tableau sur ordinateur et de fiches
  lisibles sur iPad ou smartphone ;
- accès au tableau depuis la liste des campagnes et depuis le centre de pilotage.

## Règles de calcul

Une réponse est complète lorsqu’un enseignant a renseigné une disponibilité pour
chaque créneau distinct (date et demi-journée) contenant au moins un examen de la
campagne. Les disponibilités situées hors de ces créneaux ne sont jamais comptées.

Le statut global applique l’ordre de priorité suivant :

1. compte inactif ;
2. activation à finaliser ;
3. aucune réponse ;
4. réponse incomplète ;
5. dossier complet.

Les compteurs de relance utilisent les événements d’audit
`CAMPAIGN_REMINDER_SENT`, associés à l’enseignant et à l’identifiant de campagne.
MP-02 ne réalise aucun envoi : cette action est réservée au micro-pack suivant.

## Validation

- hygiène du dépôt ;
- validation et génération Prisma ;
- ESLint ;
- TypeScript ;
- 59 tests automatisés ;
- build Next.js de production, incluant la nouvelle route dynamique.
