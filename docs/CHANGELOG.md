# 1.2.0-rc.1

- stabilisation technique et sécuritaire de la base V1.2 ;
- tableau consolidé des réponses et relances par campagne ;
- relances individuelles à J+7 et signalement au gestionnaire après deux relances ;
- confirmation personnelle de prise de connaissance des convocations ;
- annulation, correction et remplacement sécurisés après notification ;
- export opérationnel complet du pilotage de campagne ;
- socle visuel responsive, navigation et formulaires adaptés aux écrans mobiles ;
- cahier de recette et manifeste de release candidate.

# 1.2.0-beta.1-4a

- centre de pilotage de campagne ;
- KPI et progression ;
- moteur d’alertes auditables ;
- contrôles d’accès par gestionnaire.

# Changelog

## 1.2.0-alpha.1 — Sprint 1

### Ajouté

- campagnes d’examens et cycle de statut ;
- gestionnaire référente ;
- rattachement des examens aux campagnes ;
- migration PostgreSQL additive ;
- contrôles d’autorisation et journal d’audit ;
- tests et cahier de recette du Sprint 1.

### Compatibilité

Les examens antérieurs restent valides sans campagne grâce à une relation nullable.

## 1.2.0-alpha.3 — Sprint 3

- moteur d’affectation explicable et configurable ;
- simulation préalable et validation différée ;
- contraintes bloquantes intégrant les absences ;
- préférences, quotas, équité, ancienneté et tiers-temps dans le score ;
- indice d’équité et anomalies de sous-effectif ;
- historique des simulations et audit ;
- tests unitaires complémentaires.
