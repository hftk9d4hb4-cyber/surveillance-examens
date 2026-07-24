# Sprint 3 — Moteur d’affectation explicable

Version : `1.2.0-alpha.3`

## Fonctionnalités livrées

- simulation sans écriture immédiate des affectations ;
- validation explicite d’une simulation ;
- moteur déterministe avec score normalisé sur 100 ;
- exclusions bloquantes : indisponibilité, absence, double affectation, limite quotidienne et quota atteint ;
- pondérations configurables par année universitaire ;
- prise en compte des préférences de demi-journée ;
- équilibrage selon la charge pondérée ;
- prise en compte de l’ancienneté de la dernière surveillance ;
- coefficient renforcé pour les examens identifiés comme tiers-temps ;
- détail du score pour chaque proposition ;
- indice synthétique d’équité ;
- détection des examens en sous-effectif ;
- historique des simulations et journal d’audit.

## Limites volontaires du Sprint 3

Le moteur reste une bibliothèque interne au projet Next.js. Aucun service autonome, ordonnanceur externe ou microservice n’a été ajouté. Les remplacements après convocation restent traités manuellement afin de préserver la traçabilité.
