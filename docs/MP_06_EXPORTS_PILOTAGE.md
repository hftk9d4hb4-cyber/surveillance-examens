# MP-06 — Exports opérationnels et pilotage

## Objectif

Fournir à la scolarité un état de campagne immédiatement exploitable, sans
retraitement manuel ni mélange entre campagnes.

## Fonctionnement

Le centre de pilotage propose désormais **Exporter le pilotage**. Le classeur
Excel produit contient six feuilles :

1. **Synthèse** : campagne, progression, couverture, réponses, convocations,
   prises de connaissance et alertes ;
2. **Planning** : examens, besoins, postes affectés ou manquants et liste des
   surveillants ;
3. **Affectations** : détail nominatif, source, verrouillage, convocation et
   confirmation ;
4. **Charges** : charge de campagne, charge annuelle, quota et solde par
   enseignant ;
5. **Alertes** : alertes actives et résolues avec leur niveau de sévérité ;
6. **Modifications** : historique des changements intervenus après
   convocation.

Chaque feuille de données comporte une ligne d’en-tête figée, des filtres et des
largeurs de colonnes adaptées.

## Sécurité et traçabilité

- seuls les administrateurs et le gestionnaire autorisé peuvent exporter une
  campagne ;
- les données sont strictement limitées à la campagne demandée ;
- la réponse interdit la mise en cache partagée ;
- chaque génération est enregistrée dans le journal d’audit avec le nom du
  fichier et le nombre d’examens, d’affectations, d’alertes et de
  modifications exportés.

## Compatibilité

L’export annuel déjà disponible dans **Affectations** est conservé. L’export
MP-06 complète ce fichier par une vision de pilotage centrée sur une campagne.
