# GoMo Core — branche de test

Branche : `test/gomo-core`

Worker de test : `gomo-core-test`

## Photos membres centrales

Le contrat public des photos membres est porté par GoMo Core :

- l'entrypoint v0.7.1 conserve sa politique de rang et utilise le moteur Core
  v0.7.4 pour invalider proprement l'ancien cache sans avatars et publier les alias canoniques ;

- `GET /api/core/members` associe d'abord les membres par `gomoId` et publie
  `aliases`, `avatarUrl`, `avatarVersion`, `avatarSource` et `avatarMatch` ;
- `aliases` expose au maximum 25 anciens pseudos distincts déjà conservés dans
  `core_member_aliases`; le pseudo canonique courant n'est pas dupliqué ;
- cinq anciens pseudos Train ont été ajoutés à la liste vérifiée de test après
  comparaison unique des photos sur les 96 membres ; les deux correspondances
  sans preuve visuelle suffisante restent volontairement exclues ;
- `GET /api/core/members/{gomoId}/avatar?v={version}` diffuse la photo
  versionnée fournie par GoMo Assistant ;
- GoMo Core appelle Assistant par Service Binding, sans nouveau KV, R2, D1 ni
  cron pour les photos ;
- le catalogue connu et chaque image versionnée sont mis en cache ; en cas
  d'indisponibilité d'Assistant, le dernier cache valide est utilisé puis la
  photo historique LastIntel reste le dernier recours ;
- une égalité de pseudo ne peut jamais remplacer un `gomoId` canonique
  différent ou ambigu.

La réponse membres contient aussi `avatarStats` et `avatarRevision` afin de
contrôler les associations avant toute suppression des anciennes photos.

## Règle absolue

Cette branche ne doit pas modifier les autres sites GoMo ni leurs bases.

- ne pas utiliser la base D1 de GoMo Power ;
- ne pas utiliser la base du Train Planner ;
- ne pas supprimer automatiquement un membre ;
- ne pas fusionner vers `main` tant que les lectures des sources et la base dédiée ne sont pas validées ;
- la base D1 dédiée reste `gomo-core-db`.

## État v0.3 — moteur de précision

GoMo Core ne se contente plus de fusionner trois sources. Il ajoute une couche d'arbitrage et de confiance au-dessus de :

1. LastIntel ;
2. LastRank ;
3. LastWarRank ;
4. l'historique propre de GoMo Core dans D1.

LastWarRank reste une source complémentaire : son indisponibilité ne doit pas empêcher GoMo Core de continuer avec LastIntel / LastRank.

### Routes

- `/core/` : tableau de contrôle du moteur de précision ;
- `/api/core/status` : état du Core, du stockage et dernière synchronisation détaillée ;
- `/api/core/live` : vue live enrichie par le moteur de précision ;
- `/api/core/precision` : même rapport de précision sous forme JSON ;
- `/api/core/compare-3` : diagnostic détaillé des 3 sources sans écriture ;
- `/api/core/lastwarrank-test` : sonde LastWarRank en lecture seule ;
- `/api/core/members` : dernière vue stockée dans D1 ;
- `POST /api/core/refresh` : synchronisation 3 sources protégée par `GOMO_CORE_ADMIN_KEY`.

## Politique de données

### QG

- si 3 sources sont disponibles et 3/3 concordent : QG confirmé 3/3 ;
- si 3 sources sont disponibles et 2/3 concordent : la majorité devient la valeur canonique ;
- si seulement 2 sources sont disponibles et concordent : QG confirmé par 2 sources ;
- sans majorité : le membre reste à vérifier ;
- l'historique D1 sert de contrôle supplémentaire : un QG inférieur à un maximum historique déjà validé est marqué comme anomalie ;
- les valeurs originales de chaque source sont toujours conservées.

Le test du 22/08/2026 a montré 46 conflits QG comparables sur les 3 sources : LastIntel et LastWarRank concordaient dans les 46 cas, LastRank dans 0 cas.

### Puissance

Pas de vote 2/3. La valeur canonique vient de la source dont l'observation horodatée est la plus fraîche.

Le moteur v0.3 ajoute ensuite :

- un score de fraîcheur ;
- un contrôle de proximité avec les autres sources ;
- une comparaison au dernier historique D1 ;
- une alerte en cas de variation extrême sur une courte période.

Toutes les observations restent conservées.

### Hero Power

Même logique que la puissance : priorité à la donnée horodatée la plus fraîche, puis contrôle de proximité inter-sources et cohérence historique.

### Rang

Le rang reste comparé entre LastIntel et LastRank. Un accord des deux sources reçoit une forte confiance. Un désaccord reste visible. La stabilité avec le dernier relevé D1 est utilisée comme information complémentaire.

### Membres

Aucune absence dans une source ne provoque une suppression automatique. Les départs doivent passer par une règle de confirmation séparée.

## Score de confiance par champ

Chaque membre reçoit désormais quatre scores séparés :

- `hq` ;
- `power` ;
- `heroPower` ;
- `rank`.

Chaque score expose :

- une valeur de 0 à 100 ;
- un niveau `high`, `medium` ou `review` ;
- la décision prise ;
- les raisons expliquant cette décision ;
- la source retenue et l'âge de la donnée lorsque cela s'applique.

Un score global membre est calculé avec une pondération :

- QG : 30 % ;
- Puissance : 30 % ;
- Hero Power : 25 % ;
- Rang : 15 %.

## Détection d'anomalies

Le moteur utilise les dernières 24 heures de snapshots D1, dans une limite volontairement bornée, pour détecter notamment :

- un QG qui redescend sous un maximum historique ;
- une chute de puissance anormalement forte en moins de 6 heures ;
- une hausse de puissance anormalement forte en moins de 6 heures ;
- une variation extrême de Hero Power sur la même période.

Une anomalie réduit la confiance du champ concerné mais n'efface jamais l'observation originale.

## Santé des sources

Pour LastIntel, LastRank et LastWarRank, GoMo Core calcule désormais :

- disponibilité ;
- couverture de l'alliance ;
- âge du dernier relevé ;
- score de santé ;
- taux de confirmation des QG lorsqu'un consensus existe.

Une source ancienne ou partielle pèse donc moins dans l'interprétation du résultat sans être supprimée de l'audit.

## Identité permanente

Chaque membre reçoit un `gomo_id` indépendant du pseudo.

La résolution utilise en priorité :

1. identifiant source LastIntel connu ;
2. identifiant source LastRank connu ;
3. identifiant / alias LastWarRank connu ;
4. alias/pseudo normalisé unique déjà connu ;
5. nouvel identifiant GoMo.

Les anciens pseudos sont conservés dans `core_member_aliases`.

## D1 dédié

Migration : `migrations/0001_gomo_core.sql`.

La base contient uniquement des tables préfixées `core_` :

- `core_members` ;
- `core_member_aliases` ;
- `core_source_links` ;
- `core_sync_runs` ;
- `core_source_observations` ;
- `core_canonical_snapshots` ;
- `core_audit_log`.

La synchronisation horaire conserve :

- la vue canonique ;
- l'observation LastIntel ;
- l'observation LastRank ;
- l'observation LastWarRank lorsqu'elle est disponible ;
- les dates d'observation ;
- les sources choisies par champ ;
- les drapeaux de conflit / consensus ;
- un audit `sync_completed_3_source`.

La v0.3 relit cet historique au moment de l'analyse. Elle ne double pas les appels externes du cron et n'ajoute pas de nouvelle table D1.

## Sécurité et charge

- aucune écriture vers les autres sites GoMo ;
- aucune écriture vers leurs bases ;
- aucune modification automatique de `main` ;
- LastWarRank ne doit jamais bloquer une synchronisation si LastIntel / LastRank restent utilisables ;
- les valeurs source ne sont pas écrasées par la valeur canonique ;
- l'analyse historique est bornée à 24 heures et 5 000 snapshots maximum ;
- la synchronisation horaire reste celle de la v0.2 afin d'éviter de doubler les requêtes vers les sources externes.

## Étape suivante

Laisser la v0.3 tourner plusieurs synchronisations, vérifier les scores de confiance, les anomalies et la santé des sources, puis seulement préparer la connexion de GoMo Power à l'API Core sur une branche de test séparée.
