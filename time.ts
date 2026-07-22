# Guide administrateur — Surveillance des examens

## 1. Responsabilités

L’administrateur gère les comptes, les rôles, les activations, les imports enseignants et la configuration technique. Le rôle doit rester limité à un petit nombre de personnes.

## 2. Premier démarrage

1. Configurer les variables Vercel décrites dans `DEPLOIEMENT.md`.
2. Déployer le dépôt.
3. Ouvrir `/api/health`.
4. Ouvrir `/setup?token=<SETUP_TOKEN>`.
5. Activer le premier compte administrateur.

La page `/setup` ne doit jamais être partagée sans nécessité et son jeton doit être renouvelé après exposition accidentelle.

## 3. Import des enseignants

L’import enseignants est réservé aux administrateurs. L’adresse électronique est la clé de mise à jour.

Protections intégrées :

- doublons signalés ;
- quota limité de 0 à 100 ;
- comptes gestionnaires et administrateurs jamais convertis en enseignants ;
- désactivation par import refusée tant que l’enseignant conserve une surveillance future ;
- champs textuels et valeurs numériques soumis aux mêmes limites que les formulaires ;
- taille maximale de 5 Mo et 5 000 lignes ;
- journal d’import détaillé.

## 4. Activation des comptes

Les activations sont envoyées par lots de 20. Le lot standard exclut les comptes déjà contactés. Le renvoi individuel est disponible dans **Administration**.

Les jetons :

- sont aléatoires ;
- sont stockés sous forme hachée ;
- expirent après sept jours ;
- invalident les anciens jetons lors d’un renvoi ;
- ne peuvent être utilisés qu’une fois.

## 5. Gestion des rôles

- **TEACHER** : disponibilités et consultation personnelle ;
- **MANAGER** : examens, affectations, convocations, import examens ;
- **ADMIN** : droits précédents plus comptes et import enseignants.

Le dernier administrateur actif ne peut pas être désactivé ni rétrogradé.

## 6. Sauvegarde

La sauvegarde principale est celle de PostgreSQL/Neon. Avant une campagne importante :

1. vérifier la politique de sauvegarde du fournisseur ;
2. créer un point de restauration si l’offre le permet ;
3. exporter le planning Excel ;
4. conserver le numéro du déploiement Vercel `READY` utilisé.

## 7. Retour arrière

En cas de régression :

1. ne pas supprimer les tables ;
2. effectuer un rollback Vercel vers le dernier déploiement `READY` ;
3. conserver les journaux du build et les erreurs ;
4. vérifier `/api/health` ;
5. exécuter la recette critique.

## 8. Maintenance

À chaque mise à jour :

```bash
npm ci
npx prisma generate
npm run check
npm run build
```

Puis vérifier le déploiement de préproduction avant fusion sur `main`.

## 9. Sécurité opérationnelle

- MFA obligatoire sur GitHub, Vercel, Neon et Gmail ;
- mot de passe d’application Gmail dédié ;
- aucun secret dans GitHub ;
- révocation immédiate des comptes sortants ;
- revue périodique des rôles et du journal d’audit ;
- rotation de `NEXTAUTH_SECRET`, `SETUP_TOKEN` et `SMTP_PASS` après suspicion d’exposition.


### Protection des données déjà notifiées

La Release Candidate bloque les changements silencieux après l’envoi des convocations. Avant de désactiver un enseignant ou de modifier le statut d’un examen, réaffectez les surveillances futures et informez les personnes déjà convoquées. Le recalcul global d’une année est volontairement indisponible dès qu’une convocation de cette année a été envoyée.
