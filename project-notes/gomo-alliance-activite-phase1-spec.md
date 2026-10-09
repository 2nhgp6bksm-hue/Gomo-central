# GoMo Alliance — Page Activité (cahier des charges TEST v1)

Statut : conception uniquement, aucun site déployé. Date de référence : 2026-10-09.
Projet de validation : GoMo, serveur 1591, 93 membres. Destination future non confirmée (1613 candidat).
Objectif : aide aux responsables R5/R4, valorisation et accompagnement, jamais une liste d'exclusion.

## 1. Sources et degré de confiance

- Source historique vérifiée : `archive/gomo-alliance/2026-10-01_to_2026-10-09/` (9 snapshots J0–J8, 8 diffs, 1 événement et manifeste). UID = clé de jointure, jamais le pseudo.
- Snapshots : `uid`, `name`, `rank`, `hq`, `power`, `kills`, `serverId`, `currentServerId`, `joinTimeRaw` ; `snapshotDate` et métadonnées de capture. Ne pas inventer `online`, `offline_time`, dons, participation guerre ou force des héros si absents de ces snapshots.
- Captures vidéo du 09/10 : classements des dons, puissance, kills et dernière connexion ; données ponctuelles à dater avec source, fenêtre hebdomadaire éventuelle et confiance de lecture. Ne pas traiter comme un flux automatisé.
- L'événement `2026-10-07` « guerre du mercredi annulée » doit exclure cette guerre du dénominateur de participation, sans supprimer l'activité ordinaire.
- Coût LWT : `configured-known-cost` (2 tokens indiqués), jamais présenter comme débit vérifié.

## 2. Interface iPhone d'abord

Quatre sections maximum : Accueil, Membres, Activité, Historique. FR / DE / EN.
Design sobre ivoire / doré / gris, angles discrets, lisibilité et performance avant animations.

**Accueil** : membres, puissance alliance, évolution depuis le dernier relevé, derniers événements importants, fraîcheur de la donnée.
**Membres** : recherche par pseudo, filtre R1–R5, QG, fiches compactes, ouverture d'une fiche détaillée.
**Activité** : trois dimensions séparées : développement (puissance/QG/rang), combat (kills nouveaux), contribution (dons/présence lorsque vérifiés). Afficher « non disponible » au lieu de zéro pour les données manquantes.
**Historique** : graphiques individuels 7/30 jours / tout l'historique, séries datées et variations, événements annotés.

Éviter les catégories accusatoires « inactif », « mauvais joueur », « à exclure ».
Utiliser « évolution non détectée », « données à vérifier », « contribution observée » et une explication des limites.

## 3. Calculs factuels et contrôles

- Delta membre : comparer deux snapshots adjacents par UID.
- Ne pas confondre baisse de puissance et inactivité (combat, soutien, pertes, changement de composition possibles).
- Ne pas confondre absence de kills et absence de présence/dons.
- Les intervalles entre deux captures peuvent dépasser 24 heures ; montrer heures de début/fin et durée si disponible.
- Les kills gagnés sur un intervalle indiquent une variation observée, pas une participation prouvée à une guerre.
- Participation guerre : seulement lorsque la fenêtre et le type d'événement sont vérifiés ; guerre annulée exclue ; distinguer « activité combat pendant fenêtre » de « participation confirmée ».
- Contrôles d'import : UID uniques, cardinalité cohérente, somme des puissances égale au total annoncé, non-régression de l'archive, gestion des changements de nom et des transferts de serveur.
- Les classements ne sont pas limités arbitrairement à 10 ou 20 : pagination/filtrage sur tous les membres.

## 4. Modèle de données proposé (sans modifier D1)

`AllianceConfig`: `allianceKey`, `name`, `tag`, `serverId`, `lwtAllianceId`, `activeFrom`, `activeTo`, `status`.
`Member`: `uid`, `name`, `rank`, `hq`, `avatarRef?`.
`Snapshot`: `date`, `capturedAt?`, `source`, `allianceKey`, `totalPower`, `members[]`.
`MemberDelta`: `uid`, `from`, `to`, `powerDelta`, `killsDelta`, `hqDelta`, `rankChange`, `nameChange`.
`ManualObservation`: `uid`, `observedAt`, `type`, `value`, `periodStart?`, `periodEnd?`, `source`, `verification`.
`AllianceEvent`: `eventDate`, `type`, `status`, `notes`.

Ne jamais mélanger les observations vidéo aux valeurs quotidiennes LWT comme si elles provenaient du même instant.

## 5. Accès et confidentialité

Le site est destiné aux chefs. La visibilité détaillée R5/R4 doit reposer sur une vraie authentification/autorisation côté serveur ; jamais sur le simple pseudo ou un filtre JavaScript.
Avant tout déploiement, vérifier le statut public/privé du dépôt et éviter de publier les informations sensibles des membres dans un bundle statique public.
Aucun jeton API, clé ni secret dans le front-end. Préserver la propriété et les droits de gestion de l'utilisateur.

## 6. Performance et coûts

- Pas de requête LWT déclenchée par une visite de page.
- Pré-calculer les vues synthétiques depuis les snapshots existants et charger l'historique détaillé à la demande.
- Aucun appel D1 ni Worker requis pour cette phase de conception.
- Budget LWT conservé selon la procédure existante ; ne pas modifier les règles de coût ni déclencher un relevé.
- Tests de cohérence sur 93 UID, internationalisation FR/DE/EN, mobile, pagination, événement guerre annulée, date/heure et changement de serveur.

## 7. Séquence de réalisation

1. Valider la présente spécification et les règles de confidentialité.
2. Construire une maquette isolée, lecture seule, avec données non sensibles ou anonymisées.
3. Tester recherche, filtres, fiches et graphiques avec les 9 snapshots sans appel LWT.
4. Vérifier l'intégration réelle au site TEST GoMo Alliance existant et ses contrôles d'accès.
5. Importer les observations vidéos après transcription et validation, en indiquant leur date et leur fiabilité.
6. Déployer en TEST seulement après autorisation et vérification ; production intacte.
7. Préparer migration éventuelle 1591 → nouveau serveur sans supposer 1613 confirmé.

## Critères d'acceptation

- Une fiche peut retracer 01/10 → 09/10 par UID et distinguer puissance/kills/QG/rang.
- Aucun faux « 0 don » ou « hors ligne » lorsque la donnée manque.
- Les 93 membres restent visibles, sans classement arbitrairement tronqué.
- Guerre annulée du 07/10 jamais comptée comme absence de participation.
- Aucune modification de D1, sites, Workers, Cron ou archives lors de la conception.
