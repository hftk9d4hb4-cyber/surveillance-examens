# Recette fonctionnelle — V1.2.0-rc.1

Chaque contrôle doit être daté et documenté en cas d’échec. La fusion vers
`main` reste interdite tant que les contrôles bloquants ne sont pas validés.

## A. Déploiement

- [ ] le déploiement Vercel de la branche `release/v1.2.0-rc.1` est `READY` ;
- [ ] le journal confirme `prisma generate`, `prisma migrate deploy` et
  `next build` ;
- [ ] `/api/health` répond HTTP 200 avec `version: 1.2.0-rc.1` ;
- [ ] les migrations existantes sont appliquées sans suppression de données ;
- [ ] `/login` est accessible et les pages protégées redirigent sans session.

## B. Rôles et campagnes

- [ ] un enseignant ne voit aucune page de gestion ;
- [ ] un gestionnaire n’accède qu’aux campagnes autorisées ;
- [ ] un administrateur accède à toutes les campagnes ;
- [ ] le dernier administrateur actif ne peut pas être désactivé ;
- [ ] création, modification et changement de statut d’une campagne ;
- [ ] rattachement d’un examen à une campagne compatible.

## C. Disponibilités et relances

- [ ] un enseignant renseigne chaque demi-journée sur ordinateur et mobile ;
- [ ] le tableau de relances distingue activation, absence de réponse,
  réponse partielle et réponse complète ;
- [ ] une relance ne cible qu’un enseignant ;
- [ ] une deuxième relance avant J+7 est refusée ;
- [ ] une relance à partir de J+7 est autorisée ;
- [ ] après deux relances, le gestionnaire de campagne reçoit le signalement ;
- [ ] l’historique affiche les tentatives et leurs résultats.

## D. Affectations

- [ ] les indisponibilités et absences sont bloquantes ;
- [ ] les quotas et la limite d’une surveillance par jour sont respectés ;
- [ ] deux simulations identiques produisent le même résultat ;
- [ ] la simulation explique le score et les anomalies ;
- [ ] les affectations verrouillées sont conservées ;
- [ ] l’ajout et le retrait manuels respectent les protections.

## E. Convocations et confirmations

- [ ] un lot envoie au maximum 25 convocations ;
- [ ] le courriel et le fichier ICS contiennent les bonnes informations ;
- [ ] l’enseignant ne voit que ses convocations ;
- [ ] une convocation envoyée et future peut être confirmée ;
- [ ] une confirmation répétée reste idempotente ;
- [ ] la scolarité voit le statut et la date de confirmation.

## F. Modifications après notification

- [ ] l’interface exige un examen notifié et un motif ;
- [ ] l’aperçu affiche les personnes touchées et les conséquences ;
- [ ] une double validation ou un aperçu devenu obsolète est refusé ;
- [ ] annulation, horaire, lieu, correction, ajout, retrait et remplacement
  produisent les notifications attendues ;
- [ ] les erreurs de notification restent visibles et auditables.

## G. Exports

- [ ] l’export annuel des affectations reste téléchargeable ;
- [ ] l’export d’une campagne contient les six feuilles attendues ;
- [ ] les KPI, postes manquants, quotas et confirmations sont cohérents ;
- [ ] un gestionnaire ne peut pas exporter la campagne d’un autre ;
- [ ] la génération apparaît dans le journal d’audit.

## H. Ergonomie mobile

Tester au minimum à 390 × 844 px et à 768 × 1024 px.

- [ ] aucune page ne provoque de débordement horizontal global ;
- [ ] la navigation reste accessible par défilement horizontal ;
- [ ] cartes et indicateurs s’empilent sans chevauchement ;
- [ ] formulaires, boutons et listes déroulantes sont utilisables au toucher ;
- [ ] les tableaux défilent dans leur conteneur sans déplacer toute la page ;
- [ ] la page **Mes convocations** permet la confirmation sans zoom ;
- [ ] les pages Campagnes, Relances, Affectations, Convocations et
  Modifications restent lisibles ;
- [ ] le focus clavier est visible et le lien d’évitement fonctionne.

## Décision

- [ ] recette V1.2.0-rc.1 acceptée ;
- [ ] anomalies bloquantes : aucune ;
- [ ] déploiement Vercel final : `READY` ;
- [ ] autorisation explicite de préparer la fusion, sans fusion automatique
  vers `main`.
