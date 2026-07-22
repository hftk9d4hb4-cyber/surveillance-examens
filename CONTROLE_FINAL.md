# Sécurité et protection des données

## Mesures intégrées

- authentification NextAuth et sessions de huit heures ;
- mots de passe hachés avec bcrypt ;
- politique de mot de passe : 12 caractères, majuscule, minuscule, chiffre et caractère spécial ;
- jetons d’activation aléatoires, stockés uniquement sous forme de hachage SHA-256 ;
- expiration à sept jours et invalidation des anciens jetons lors d’un renvoi ;
- contrôle en base du statut actif et du rôle pour chaque opération protégée ;
- protection contre la suppression du dernier administrateur actif ;
- page `/setup` inaccessible sans `SETUP_TOKEN` ;
- en-têtes HSTS, `nosniff`, `DENY`, politique de référent et permissions restrictives ;
- journal d’audit pour les opérations métier sensibles ;
- blocage des mutations silencieuses après envoi d’une convocation.

## Données traitées

L’application traite des données professionnelles : nom, adresse électronique, service, spécialité, disponibilités, affectations et historique d’envoi. Aucun mot de passe en clair n’est conservé.

## Recommandations d’exploitation

- utiliser un mot de passe d’application Google dédié ;
- activer l’authentification multifacteur sur les comptes GitHub, Vercel, Neon et Gmail ;
- limiter les rôles `ADMIN` et `MANAGER` au strict nécessaire ;
- révoquer immédiatement les comptes des personnels sortants ;
- ne jamais transmettre `SETUP_TOKEN`, `NEXTAUTH_SECRET` ou `SMTP_PASS` par courriel non sécurisé ;
- contrôler périodiquement le journal d’audit et les erreurs de convocations ;
- définir une politique institutionnelle de conservation et de suppression des données.

## Limites connues

La V1.1 n’intègre pas encore :

- l’authentification institutionnelle SSO/SAML ;
- un mécanisme distribué de limitation des tentatives de connexion ;
- l’annulation automatique d’une invitation calendrier lorsqu’un examen est annulé ;
- une purge automatique paramétrable des journaux anciens.

Ces points doivent être examinés avant une généralisation à grande échelle.
