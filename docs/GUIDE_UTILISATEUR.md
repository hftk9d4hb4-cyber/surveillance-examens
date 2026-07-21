# Guide utilisateur — Surveillance des examens

## 1. Connexion

Ouvrir l’adresse de l’application, saisir l’adresse professionnelle et le mot de passe. Lors de la première utilisation, utiliser le lien d’activation reçu par e-mail pour définir un mot de passe conforme.

## 2. Enseignant : renseigner ses disponibilités

1. Ouvrir **Disponibilités**.
2. Pour chaque demi-journée, choisir :
   - Indisponible ;
   - Disponible si nécessaire ;
   - Disponible ;
   - Disponible prioritairement.
3. Cliquer sur **Enregistrer toutes les réponses**.

Une absence de réponse n’interdit pas l’affectation, mais elle est moins prioritaire qu’une disponibilité déclarée.

## 3. Enseignant : consulter ses surveillances

Le tableau de bord affiche les prochaines surveillances, le lieu, l’horaire et l’état de la convocation. Le fichier calendrier peut être ajouté depuis l’e-mail ou téléchargé par un gestionnaire.

## 4. Gestionnaire : importer les examens

1. Ouvrir **Imports**.
2. Télécharger le modèle examens.
3. Compléter une ligne par examen.
4. Importer le fichier `.xlsx` ou `.csv`.
5. Vérifier le bilan et, en cas d’erreur, ouvrir le détail dans l’historique.

Un examen déjà affecté ne peut plus changer de date, de session, d’horaire, de lieu ou d’intitulé par import. Cette protection évite de conserver des convocations incohérentes.

## 5. Gestionnaire : calculer les affectations

1. Ouvrir **Affectations**.
2. Choisir l’année universitaire.
3. Cliquer sur **Calculer les affectations**.
4. Contrôler la couverture de chaque examen.
5. Ajouter manuellement les exceptions si nécessaire.
6. Verrouiller les affectations qui doivent être conservées lors du prochain recalcul.

Le moteur respecte les indisponibilités, les quotas, la limite d’une surveillance par jour et les affectations verrouillées.

## 6. Gestionnaire : envoyer les convocations

1. Ouvrir **Convocations**.
2. Choisir l’année universitaire.
3. Envoyer les prochaines convocations par lots de 25.
4. Répéter jusqu’à ce que le compteur atteigne zéro.

Pour renvoyer des convocations déjà envoyées, sélectionner obligatoirement un examen précis avant de cocher **Renvoyer**.

## 7. Exporter le planning

Dans **Affectations**, cliquer sur **Exporter Excel**. Le classeur contient :

- le détail des affectations ;
- la charge par enseignant ;
- l’état des convocations.

## 8. Messages d’erreur fréquents

- **Quota atteint** : augmenter le quota ou choisir un autre enseignant.
- **Déjà affecté le même jour** : choisir un autre enseignant.
- **Examen entièrement couvert** : retirer une affectation avant d’en ajouter une autre.
- **Import partiel** : consulter le détail des lignes rejetées dans l’historique.
- **Erreur SMTP** : vérifier la configuration de messagerie ou relancer ultérieurement.


## 8. Protections après envoi des convocations

Dès qu’une convocation a été envoyée, l’application empêche les opérations qui pourraient rendre le courrier reçu incohérent : recalcul global de l’année, suppression de l’affectation correspondante et retrait de publication de l’examen. Les corrections doivent alors être réalisées de manière ciblée et accompagnées d’une information explicite de l’enseignant concerné.
