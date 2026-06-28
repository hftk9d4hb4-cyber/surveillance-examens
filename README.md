# Exam Surveillance

Application web de gestion des surveillances d’examen pour une faculté de médecine.

## Fonctions

- comptes enseignants, scolarité et administrateurs ;
- saisie des disponibilités et indisponibilités par demi-journée ;
- création des examens par la scolarité ;
- affectation automatique équitable des enseignants ;
- tableau synthétique enseignant : dates de surveillance, statut de convocation, invitation calendrier ;
- tableau scolarité : couverture des examens, enseignants à convoquer, convocations envoyées ou en erreur ;
- envoi groupé des convocations par e-mail ;
- invitation calendrier `.ics` compatible Outlook, Google Calendar et Apple Calendar ;
- export Excel du planning avec statut des convocations.

## Installation locale

```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Puis ouvrir : http://localhost:3000

Compte administrateur de démonstration :

```text
admin@faculte.fr / admin123
```

Compte scolarité :

```text
scolarite@faculte.fr / admin123
```

Compte enseignant de démonstration :

```text
enseignant1@faculte.fr / enseignant123
```

## Envoi des convocations

La page **Convocations** permet aux gestionnaires de sélectionner un examen ou l’ensemble des examens affectés, puis d’envoyer les convocations. Chaque message contient :

- les informations de l’examen ;
- la date, la demi-journée et le lieu ;
- une pièce jointe `convocation.ics` ;
- un suivi de statut : `À envoyer`, `Envoyée`, `Erreur`.

En développement, si `SMTP_HOST` est vide, l’application utilise un transport local Nodemailer : les messages sont générés sans être envoyés à un serveur externe. Pour un envoi réel, renseigner :

```env
MAIL_FROM="Scolarité <scolarite@faculte.fr>"
SMTP_HOST="smtp.votre-universite.fr"
SMTP_PORT="587"
SMTP_USER="identifiant"
SMTP_PASS="mot-de-passe-ou-secret"
```

## Pages principales

- `/dashboard` : synthèse générale et tableau personnel enseignant ;
- `/availability` : saisie des disponibilités ;
- `/exams` : création des examens ;
- `/assignments` : génération et contrôle des affectations ;
- `/convocations` : envoi et suivi des convocations ;
- `/admin` : administration des comptes.

## Prochaines évolutions utiles

- import Excel massif des enseignants ;
- relances automatiques des enseignants n’ayant pas rempli leurs disponibilités ;
- modification manuelle fine des affectations ;
- historique annuel par enseignant ;
- authentification institutionnelle CAS/LDAP/SSO.
