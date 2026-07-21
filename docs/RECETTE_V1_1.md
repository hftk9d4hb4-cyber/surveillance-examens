# Recette fonctionnelle V1.1

Chaque test doit être daté, signé et documenté en cas d’échec.

## A. Infrastructure

- [ ] le déploiement Vercel est `READY` ;
- [ ] le build confirme `prisma generate`, `prisma migrate deploy` et `next build` ;
- [ ] `/api/health` répond HTTP 200 avec `version: 1.1.0-rc.2` ;
- [ ] `/login` est accessible ;
- [ ] `/dashboard` redirige vers `/login` sans session ;
- [ ] `/setup` sans jeton renvoie une page introuvable ;
- [ ] `/setup?token=<SETUP_TOKEN>` affiche le diagnostic.

## B. Administration initiale

- [ ] le premier administrateur reçoit son lien d’activation ;
- [ ] un mot de passe faible est refusé ;
- [ ] le compte s’active avec un mot de passe conforme ;
- [ ] le jeton utilisé ne fonctionne plus ;
- [ ] la connexion administrateur fonctionne.

## C. Import des enseignants

- [ ] le modèle XLSX est téléchargeable ;
- [ ] un fichier valide crée les enseignants ;
- [ ] un second import met à jour les mêmes adresses sans doublon ;
- [ ] une adresse invalide est signalée ;
- [ ] une adresse dupliquée dans le fichier est signalée ;
- [ ] un compte administrateur existant n’est pas transformé en enseignant ;
- [ ] un enseignant affecté à une surveillance future ne peut pas être désactivé par import ;
- [ ] un quota ou un besoin décimal est refusé ;
- [ ] un gestionnaire ne peut pas importer les enseignants.

## D. Activations

- [ ] le lot standard envoie au maximum 20 nouveaux liens ;
- [ ] le lot suivant ne reprend pas les comptes déjà contactés ;
- [ ] le renvoi individuel fonctionne depuis Administration ;
- [ ] un compte inactif ne reçoit pas de lien ;
- [ ] les examens du jour restent visibles après minuit en heure de Paris.

## E. Examens et disponibilités

- [ ] le modèle examens est téléchargeable ;
- [ ] les dates inexistantes et horaires incohérents sont refusés ;
- [ ] un examen valide est créé ou importé ;
- [ ] la modification de date ou d’horaire d’un examen déjà affecté est refusée par import ;
- [ ] le détail d’une erreur d’import affiche le bon numéro de ligne ;
- [ ] un enseignant peut enregistrer puis modifier ses disponibilités ;
- [ ] aucune disponibilité ne peut être créée pour une session inexistante.

## F. Affectations

- [ ] les indisponibles sont exclus ;
- [ ] un quota égal à zéro est respecté ;
- [ ] une seule surveillance par jour est attribuée ;
- [ ] les affectations verrouillées sont conservées après recalcul ;
- [ ] une sous-couverture produit une alerte ;
- [ ] l’ajout manuel est bloqué si le besoin est déjà couvert ;
- [ ] l’ajout manuel est bloqué si le quota est atteint.

## G. Convocations

- [ ] un lot standard envoie au maximum 25 convocations non envoyées ;
- [ ] le lot suivant poursuit la file sans renvoyer les précédentes ;
- [ ] un renvoi groupé impose la sélection d’un examen précis ;
- [ ] le courriel contient les bonnes date, heure, promotion et salle ;
- [ ] une seule invitation `.ics` est jointe et s’ouvre dans Outlook ou Google Agenda ;
- [ ] la propriété `SEQUENCE` de l’ICS augmente après une mise à jour de l’examen ;
- [ ] le résultat d’un lot indique combien de convocations restent à envoyer ;
- [ ] l’état `SENT` et l’horodatage sont enregistrés ;
- [ ] une erreur SMTP est visible dans la page Convocations.

## H. Droits et audit

- [ ] un enseignant ne voit aucune page de gestion ;
- [ ] un gestionnaire importe les examens mais pas les enseignants ;
- [ ] seul un administrateur gère les rôles ;
- [ ] le dernier administrateur actif ne peut pas être désactivé ;
- [ ] les opérations principales apparaissent dans le journal d’audit.
