# MP-03 — Relances ciblées et traçabilité

## Objectif

Permettre aux administrateurs et aux gestionnaires de campagne d’envoyer depuis
le tableau MP-02 la relance adaptée à chaque enseignant et d’en contrôler le
résultat.

## Périmètre livré

- relance uniquement individuelle depuis chaque ligne éligible ;
- confirmation explicite avant chaque envoi ;
- nouveau lien d’activation valable sept jours pour un compte non activé ;
- courriel de demande de disponibilités pour un compte activé dont la réponse est
  absente ou incomplète ;
- relance de disponibilités limitée aux campagnes en collecte ou en affectation ;
- exclusion des comptes inactifs, dossiers complets et campagnes clôturées ;
- message standardisé et envoi immédiat après confirmation ;
- nouvelle relance autorisée uniquement à J+7 ;
- information de la gestionnaire de campagne après la deuxième relance ;
- résultat récapitulatif après traitement : envoyées, échecs et ignorées ;
- audit par enseignant et par lot, associé à la campagne et à l’acteur ;
- historique visible des 100 dernières tentatives dans le tableau de campagne.

## Sécurité et confidentialité

- les droits sont recalculés côté serveur au moment de l’envoi ;
- les identifiants reçus du formulaire sont recoupés avec les enseignants de la
  campagne et leur état courant ;
- aucune adresse ni erreur SMTP détaillée n’est inscrite dans l’URL ;
- le journal d’échec conserve uniquement la catégorie technique de l’erreur ;
- le serveur recalcule le type de relance : le navigateur ne peut pas l’imposer.

## Événements d’audit

- `CAMPAIGN_REMINDER_SENT` ;
- `CAMPAIGN_REMINDER_FAILED` ;
- `CAMPAIGN_REMINDER_SKIPPED` ;
- `CAMPAIGN_REMINDER_ESCALATION_SENT` ;
- `CAMPAIGN_REMINDER_ESCALATION_FAILED`.

Chaque événement individuel contient l’identifiant de campagne, le type de
relance et le résultat. Les relances envoyées alimentent automatiquement la date
et le compteur affichés par MP-02.
