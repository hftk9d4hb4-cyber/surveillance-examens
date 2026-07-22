# Surveillance des examens — V1.2.0-alpha.1-rc.2

Application métier de la Faculté de médecine destinée à organiser les surveillances d’examens : enseignants, examens, disponibilités, affectations, convocations et exports.

## Périmètre de la Release Candidate

- authentification par adresse électronique et mot de passe ;
- rôles **Enseignant**, **Gestionnaire** et **Administrateur** ;
- import XLSX/CSV des enseignants et des examens ;
- déclaration des disponibilités par demi-journée ;
- moteur d’affectation déterministe avec quotas, indisponibilités et limite d’une surveillance par jour ;
- corrections manuelles et verrouillage des affectations ;
- convocations par e-mail avec invitation calendrier `.ics` versionnée ;
- export Excel du planning et de la charge ;
- journal des imports et journal d’audit.

## Rôles

| Fonction | Enseignant | Gestionnaire | Administrateur |
|---|:---:|:---:|:---:|
| Renseigner ses disponibilités | Oui | Oui | Oui |
| Consulter ses surveillances | Oui | Oui | Oui |
| Gérer les examens | Non | Oui | Oui |
| Calculer et corriger les affectations | Non | Oui | Oui |
| Envoyer les convocations | Non | Oui | Oui |
| Importer les examens | Non | Oui | Oui |
| Importer et activer les enseignants | Non | Non | Oui |
| Gérer les rôles | Non | Non | Oui |

## Déploiement

Le dépôt est conçu pour GitHub, Vercel et PostgreSQL/Neon. Vercel exécute :

```bash
prisma generate
prisma migrate deploy
next build
```

Variables requises :

```text
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
```

`ADMIN_PASSWORD` est facultatif. Sans mot de passe initial conforme, le premier administrateur reçoit un lien d’activation.

Le diagnostic d’installation est protégé et accessible uniquement par :

```text
/setup?token=<SETUP_TOKEN>
```

L’état minimal de l’application est disponible sur `/api/health`.

## Parcours opérationnel

1. L’administrateur importe les enseignants.
2. Il envoie les liens d’activation.
3. Un gestionnaire ou un administrateur importe les examens.
4. Les enseignants renseignent leurs disponibilités.
5. Le gestionnaire lance le calcul des affectations.
6. Il corrige et verrouille les exceptions.
7. Il envoie les convocations par lots.
8. Il exporte le planning Excel.

Une fois des convocations envoyées pour une année, le recalcul global et la modification des affectations notifiées sont bloqués afin d’éviter de rendre les courriers déjà reçus incohérents. Les corrections restent possibles de manière ciblée avant information des personnes concernées.

## Contrôles locaux

```bash
npm ci
npx prisma generate
npm run check
npm run build
```

`npm run check` exécute le lint, la vérification TypeScript et les tests automatisés.

## Documentation

- `docs/GUIDE_UTILISATEUR.md`
- `docs/GUIDE_ADMINISTRATEUR.md`
- `docs/FORMAT_IMPORTS.md`
- `docs/DEPLOIEMENT.md`
- `docs/RECETTE_V1_1.md`
- `docs/SECURITE.md`
- `docs/CONTROLE_FINAL.md`
- `docs/CHANGELOG.md`


## V1.2 — Sprint 1

La version alpha 1 ajoute la gestion des campagnes et le rattachement optionnel des examens. Voir `docs/SPRINT_1_V1_2.md`.


## V1.2.0-alpha.3 — Sprint 3

Moteur d’affectation explicable : simulation, validation différée, pondérations configurables, contraintes bloquantes, tiers-temps et indice d’équité. Voir `docs/SPRINT_3_V1_2.md`.
