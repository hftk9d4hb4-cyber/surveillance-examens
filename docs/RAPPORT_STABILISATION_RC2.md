# Rapport de stabilisation — V1.1.0-rc.2

Date : 20 juillet 2026  
Périmètre : code, documentation et tests de la Release Candidate V1.1.

## 1. Résultat

La RC2 corrige les écarts identifiés lors de la revue de la RC1 sans introduire de nouveau module métier.

### Contrôles réussis

| Contrôle | Résultat |
|---|---:|
| ESLint | Réussi, 0 erreur |
| TypeScript | Réussi |
| Tests automatisés | 38/38 réussis |
| Compilation Next.js | Compilation du code réussie |
| Migration initiale Prisma | Présente |
| Secrets et artefacts dans le package | Absents après nettoyage |

## 2. Correctifs de cohérence métier

### Date civile

Les recherches d’examens « à venir » utilisaient auparavant le jour UTC. Entre minuit et 02:00 en été à Nice, cela pouvait conserver le jour précédent. Une fonction commune calcule désormais la date civile en `Europe/Paris` et renvoie une valeur compatible avec les colonnes PostgreSQL `DATE`.

### Import enseignants

Un import ne peut plus désactiver un enseignant actif encore affecté à un examen publié futur. La ligne est ignorée, documentée dans le journal d’import et doit être traitée après réaffectation manuelle.

### Affectations notifiées

Une affectation liée à une convocation `SENT` ne peut plus être retirée, verrouillée ou déverrouillée depuis l’interface standard. Cette règle est vérifiée côté serveur, indépendamment de l’état du bouton affiché.

### Convocations

L’envoi par année reste limité à 25 messages. Le résultat indique désormais le reliquat exact. Lors d’un envoi ciblé, l’année est récupérée depuis l’examen en base et l’examen doit être publié et non passé.

### Invitation calendrier

La propriété `SEQUENCE` n’est plus fixée à zéro : elle évolue avec `updatedAt`, ce qui améliore le traitement d’une invitation actualisée par les logiciels de calendrier.

## 3. Validation des imports

Les imports appliquent désormais les limites suivantes :

- nom affiché : 180 caractères ;
- prénom et nom : 100 caractères chacun ;
- adresse électronique : 320 caractères ;
- service et spécialité : 120 caractères ;
- identifiant externe : 120 caractères ;
- intitulé et lieu d’examen : 180 caractères ;
- promotion : 120 caractères ;
- notes : 2 000 caractères ;
- quotas et besoins : nombres entiers uniquement.

## 4. Limitation du contrôle local

Le bac à sable ne peut pas télécharger les binaires Prisma depuis `binaries.prisma.sh`. La compilation Next.js du code a réussi, mais la qualification complète `prisma generate && next build` doit être exécutée par GitHub Actions ou Vercel avec un Prisma Client réel. Cette vérification reste un critère de non-régression avant fusion.

## 5. Décision proposée

Statut : **apte à la préproduction**, non encore déclarée version stable.

Conditions avant production :

1. pipeline GitHub Actions vert ;
2. migrations appliquées sur la base de préproduction ;
3. envoi d’une activation et d’une convocation test ;
4. ouverture de l’ICS dans Outlook et Google Agenda ;
5. recette critique signée.
