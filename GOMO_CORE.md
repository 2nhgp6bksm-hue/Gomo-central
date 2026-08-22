# GoMo Core — branche de test

Branche : `test/gomo-core`

Worker de test : `gomo-core-test`

## Règle absolue

Cette branche ne doit pas modifier les autres sites GoMo ni leurs bases.

- ne pas utiliser la base D1 de GoMo Power ;
- ne pas utiliser la base du Train Planner ;
- ne pas supprimer automatiquement un membre ;
- ne pas fusionner vers `main` tant que les lectures des sources et la base dédiée ne sont pas validées ;
- la base D1 dédiée reste `gomo-core-db`.

## État v0.2 — comparaison 3 sources

GoMo Core compare maintenant :

1. LastIntel ;
2. LastRank ;
3. LastWarRank.

LastWarRank est une source complémentaire : son indisponibilité ne doit pas empêcher GoMo Core de continuer avec LastIntel / LastRank.

### Routes

- `/core/` : tableau de contrôle 3 sources ;
- `/api/core/status` : état du Core et du stockage ;
- `/api/core/live` : vue live avec arbitrage 3 sources ;
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
- les valeurs originales de chaque source sont toujours conservées.

Le test du 22/08/2026 a montré 46 conflits QG comparables sur les 3 sources : LastIntel et LastWarRank concordaient dans les 46 cas, LastRank dans 0 cas.

### Puissance

Pas de vote 2/3. La valeur canonique vient de la source dont l'observation horodatée est la plus fraîche. Les écarts restent visibles et toutes les observations restent conservées.

### Hero Power

Même logique que la puissance : priorité à la donnée horodatée la plus fraîche, avec conservation de toutes les valeurs source.

### Rang

Le rang reste comparé entre LastIntel et LastRank. Les désaccords restent visibles et ne sont pas masqués par LastWarRank.

### Membres

Aucune absence dans une source ne provoque une suppression automatique. Les départs doivent passer par une règle de confirmation séparée.

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

La synchronisation horaire du Worker stocke maintenant :

- la vue canonique ;
- l'observation LastIntel ;
- l'observation LastRank ;
- l'observation LastWarRank lorsqu'elle est disponible ;
- les dates d'observation ;
- les sources choisies par champ ;
- les drapeaux de conflit / consensus ;
- un audit `sync_completed_3_source`.

## Sécurité

- aucune écriture vers les autres sites GoMo ;
- aucune écriture vers leurs bases ;
- aucune modification automatique de `main` ;
- LastWarRank ne doit jamais bloquer une synchronisation si LastIntel / LastRank restent utilisables ;
- les valeurs source ne sont pas écrasées par la valeur canonique.

## Étape suivante

Laisser plusieurs synchronisations horaires s'accumuler dans `gomo-core-db`, vérifier la stabilité des QG / rangs / puissances et la couverture LastWarRank, puis seulement préparer la connexion de GoMo Power à l'API Core sur une branche de test séparée.
