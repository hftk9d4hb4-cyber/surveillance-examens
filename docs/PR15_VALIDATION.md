# PR 15 — environnement et recette

## Isolement

La branche `feature/pr15-pilotage-scolarite` désactive son déploiement Git automatique dans `vercel.json` via `git.deploymentEnabled`. La prévisualisation Vercel actuelle partageant ses connexions avec la production, elle n’est pas utilisée pour cette recette.

GitHub Actions démarre PostgreSQL 16 sur localhost, base `surveillance_test`, applique les migrations puis compile et lance l’application avec Node 22. Les tests refusent toute base non locale ou un nom de base différent. Le serveur SMTP de test écoute uniquement sur 127.0.0.1 ; les adresses sont fictives (`example.invalid`). Aucune connexion Neon, aucune donnée ni messagerie réelles ne sont utilisées. La production et ses variables ne sont pas modifiées.

## Contrôles

1. Contrôles d’hygiène, Prisma, ESLint, TypeScript, suite unitaire et compilation.
2. Régressions PR13 (import, activation, rôles) et PR14 (filtre, export Excel, droits).
3. PR15 HTTP sur l’application compilée : campagnes accessibles, refus enseignant/anonyme et autre gestionnaire ; bilan en lecture seule ; sous-effectif, compte inactif, conflit externe et indisponibilité ; contrôle refait après modification entre affichage et publication ; confirmation obligatoire ; publication sans courriel ; convocations capturées localement et suivi des confirmations.
4. Activation ciblée : lien expiré, renouvellement, journal individuel, simulation d’un refus SMTP et filtre des échecs ; aucun token ou hash publié dans la page.
5. Explications enregistrées et affectations manuelles, guide réservé à la scolarité, onglet Excel Équité relu par ExcelJS.

La recette automatisée ne remplace pas une revue métier par la scolarité. Cette branche ne constitue pas une prévisualisation interactive publique ; la validation porte sur l’application compilée dans l’environnement temporaire de CI. Une base Preview indépendante devra être provisionnée pour permettre ensuite une recette interactive sur Vercel.

## Limites fonctionnelles

Le contrôle est effectué avant chaque action et chaque lot d’envoi ; il ne verrouille pas les modifications concurrentes pendant la transmission SMTP. Les pondérations et quotas décrivent la charge, ils ne définissent pas à eux seuls une équité organisationnelle. Le statut SMTP n’est pas une preuve de lecture. Les anciens envois d’activation sans journal individuel ne sont pas reconstitués.
