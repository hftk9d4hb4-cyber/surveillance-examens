Surveillance des examens — V1.2.0 bêta

Application métier de la Faculté de médecine destinée à organiser les surveillances d’examens : campagnes, enseignants, examens, disponibilités, affectations, convocations, imports, exports et suivi opérationnel.

Statut de cette branche

Branche de développement : feature/v1.2-dashboard-relancesVersion applicative : 1.2.0-beta.1-4bCette version est une bêta de travail. Elle ne doit pas être fusionnée dans main avant validation complète du déploiement Vercel et de la recette fonctionnelle.

Fonctionnalités principales

Gestion des utilisateurs

authentification par adresse électronique et mot de passe ;

rôles Enseignant, Gestionnaire et Administrateur ;

activation initiale des comptes ;

gestion des droits, de l’état actif/inactif et des quotas annuels ;

journalisation des opérations sensibles.

Organisation des examens

création et modification des examens ;

import XLSX ou CSV des enseignants et des examens ;

gestion de la date, de la demi-journée, des horaires, de la promotion, du lieu et du nombre de surveillants requis ;

rattachement facultatif des examens à une campagne ;

conservation des examens V1.1 existants sans campagne.

Campagnes et tableau de bord

création de campagnes par année universitaire et promotion ;

suivi des statuts de campagne ;

tableau de bord de couverture et de progression ;

détection des disponibilités manquantes, sous-effectifs, quotas dépassés et affectations incohérentes ;

suivi des relances et de l’avancement opérationnel.

Disponibilités et affectations

déclaration des disponibilités par demi-journée ;

moteur d’affectation déterministe ;

prise en compte des quotas, indisponibilités et contraintes ;

simulation avant validation ;

corrections manuelles ;

verrouillage des affectations sensibles ;

limitation à une surveillance par jour.

Convocations et exports

envoi des convocations par courrier électronique ;

invitations calendrier au format .ics ;

suivi du statut des convocations ;

export Excel du planning et de la charge ;

historique des imports et journal d’audit.

Rôles

Fonction

Enseignant

Gestionnaire

Administrateur

Renseigner ses disponibilités

Oui

Oui

Oui

Consulter ses surveillances

Oui

Oui

Oui

Gérer les campagnes

Non

Oui

Oui

Gérer les examens

Non

Oui

Oui

Calculer et corriger les affectations

Non

Oui

Oui

Envoyer les convocations

Non

Oui

Oui

Importer les examens

Non

Oui

Oui

Importer et activer les enseignants

Non

Non

Oui

Gérer les rôles et les comptes

Non

Non

Oui

Consulter le journal d’audit

Non

Non

Oui

Parcours opérationnel

L’administrateur importe ou crée les comptes enseignants.

Il envoie les liens d’activation.

Un gestionnaire ou un administrateur crée une campagne.

Il importe ou crée les examens.

Les enseignants renseignent leurs disponibilités.

Le gestionnaire contrôle le tableau de bord et effectue les relances nécessaires.

Il lance une simulation d’affectation.

Il corrige et verrouille les exceptions.

Il valide les affectations.

Il envoie les convocations.

Il exporte le planning et les indicateurs de charge.

Une fois les convocations envoyées, certaines modifications sont volontairement limitées afin d’éviter une incohérence entre le planning enregistré et les courriers déjà reçus.

Architecture technique

Next.js 15

React 19

TypeScript

NextAuth

Prisma 6

PostgreSQL / Neon

Vercel

ExcelJS

Nodemailer

La version de Node.js attendue est :

22.x

Installation locale

Prérequis

Node.js 22 ;

npm ;

une base PostgreSQL ;

les variables d’environnement nécessaires.

Installation

npm install
npx prisma generate
npm run dev

L’application locale est ensuite accessible sur :

http://localhost:3000

Contrôles avant déploiement

npm run lint
npm run typecheck
npm test
npm run build

La commande complète est :

npm run check

Elle exécute successivement le lint, la vérification TypeScript et les tests automatisés.

Déploiement Vercel

Le dépôt est conçu pour être déployé avec GitHub, Vercel et PostgreSQL/Neon.

Vercel exécute automatiquement :

prisma generate
prisma migrate deploy
next build

Commande définie dans package.json :

npm run vercel-build

Variables d’environnement

Variables principales :

DATABASE_URL
DATABASE_URL_UNPOOLED
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAIL
SETUP_TOKEN
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MAIL_FROM

Variable facultative :

ADMIN_PASSWORD

Sans mot de passe administrateur initial conforme, l’application utilise le parcours d’activation prévu.

Le diagnostic d’installation est protégé et accessible par :

/setup?token=<SETUP_TOKEN>

L’état minimal de l’application est disponible sur :

/api/health

Sécurité

mots de passe hachés avec bcryptjs ;

sessions JWT limitées dans le temps ;

contrôle des rôles côté serveur ;

protection des routes applicatives ;

validation des imports ;

journal d’audit ;

en-têtes HTTP de sécurité ;

blocage de certaines modifications après notification.

Les secrets et mots de passe ne doivent jamais être enregistrés dans GitHub.

Structure utile du dépôt

app/                 Routes et pages Next.js
components/          Composants d’interface
lib/                 Logique métier et services
prisma/              Schéma, migrations et données initiales
tests/               Tests automatisés
public/              Ressources statiques

Documentation

Documents disponibles dans le dépôt :

GUIDE_UTILISATEUR.md

GUIDE_ADMINISTRATEUR.md

FORMAT_IMPORTS.md

DEPLOIEMENT.md

SECURITE.md

CONTROLE_FINAL.md

CHANGELOG.md

RECETTE_V1_1.md

RECETTE_SPRINT_2_V1_2.md

RECETTE_SPRINT_3_V1_2.md

RECETTE_SPRINT_4A_V1_2.md

RECETTE_SPRINT_4B_V1_2.md

Branche de production et branche de développement

main : version stable de référence ;

feature/v1.2-dashboard-relances : développement de la V1.2 bêta.

Avant toute fusion vers main, vérifier :

que le build Vercel est en état Ready ;

que les migrations Prisma sont appliquées ;

que l’authentification fonctionne ;

que les imports enseignants et examens fonctionnent ;

que les campagnes et le tableau de bord sont utilisables ;

que les affectations peuvent être simulées puis validées ;

qu’une convocation test peut être envoyée ;

que le fichier .ics est lisible ;

que les exports Excel sont corrects ;

qu’aucun fichier parasite issu d’un téléversement manuel ne subsiste.

Licence et usage

Projet métier destiné à la gestion des surveillances d’examens de la Faculté de médecine. Toute mise en production doit respecter les procédures internes, les règles de sécurité et les obligations applicables à la protection des données.
