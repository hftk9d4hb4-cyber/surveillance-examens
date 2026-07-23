# Notes de version — V1.2.0-rc.1

La V1.2.0-rc.1 clôt le périmètre fonctionnel prévu pour la version 1.2. Elle
doit être validée sur un déploiement Vercel avant toute fusion vers `main`.

## Campagnes et pilotage

- cycle de vie des campagnes et accès par gestionnaire ;
- centre de pilotage avec indicateurs de collecte, couverture et convocation ;
- alertes opérationnelles auditables ;
- tableau consolidé des réponses, activations et relances ;
- export Excel de campagne en six feuilles : synthèse, planning, affectations,
  charges, alertes et modifications.

## Affectations

- moteur déterministe prenant en compte disponibilités, absences, préférences,
  quotas, équité, ancienneté et tiers-temps ;
- simulation préalable, validation différée et explication des scores ;
- corrections manuelles et verrouillage des exceptions ;
- détection des sous-effectifs, doubles affectations et indisponibilités.

## Relances et convocations

- relances strictement individuelles avec message fixe ;
- nouvelle relance autorisée uniquement à partir de J+7 ;
- signalement au gestionnaire de campagne après deux relances sans réponse ;
- prise de connaissance personnelle et idempotente par l’enseignant ;
- suivi des convocations envoyées, erreurs et confirmations.

## Modifications après notification

- aperçu obligatoire des conséquences avant validation ;
- motif obligatoire et journalisation ;
- annulation, changement d’horaire ou de lieu et correction ;
- ajout, retrait ou remplacement d’un surveillant ;
- traitement d’une indisponibilité tardive ;
- notifications d’annulation ou de mise à jour avec fichier calendrier.

## Ergonomie mobile

- interface visuelle homogène sur l’ensemble des pages ;
- navigation principale utilisable par défilement horizontal sur petit écran ;
- grilles, cartes et formulaires ramenés à une colonne lorsque nécessaire ;
- zones tactiles d’au moins 44 pixels pour les actions principales ;
- tableaux consultables par défilement horizontal avec en-tête conservé ;
- tailles de champs compatibles avec Safari iOS sans zoom automatique ;
- lien d’accès direct au contenu principal et focus clavier visible.

## Validation automatisée

La release candidate doit réussir :

1. l’hygiène du dépôt ;
2. ESLint et TypeScript ;
3. les 81 tests automatisés ;
4. `prisma validate` et `prisma generate` ;
5. le build Next.js de production.

La validation finale doit ensuite être réalisée par Vercel avec
`prisma generate`, `prisma migrate deploy` puis `next build`.
