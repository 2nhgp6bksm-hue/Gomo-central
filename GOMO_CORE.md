# GoMo Core — branche de test

Branche : `test/gomo-core`

Worker de test : `gomo-core-test`

## Règle absolue

Cette branche ne doit pas modifier les autres sites GoMo ni leurs bases.

- ne pas utiliser la base D1 de GoMo Power ;
- ne pas utiliser la base du Train Planner ;
- ne pas supprimer automatiquement un membre ;
- ne pas fusionner vers `main` tant que les lectures LastIntel / LastRank et la base dédiée ne sont pas validées ;
- toute future base D1 doit être une base dédiée nommée `gomo-core-db`.

## État v0.1

Le Core fonctionne d'abord en lecture seule, même sans D1.

### Routes

- `/core/` : tableau de contrôle GoMo Core ;
- `/api/core/status` : état du Core et du stockage ;
- `/api/core/live` : lecture et comparaison LastIntel + LastRank ;
- `/api/core/members` : dernière vue stockée si D1 existe, sinon vue live ;
- `POST /api/core/refresh` : future synchronisation D1, protégée par `GOMO_CORE_ADMIN_KEY`.

## Politique de données

### QG

LastIntel est prioritaire lorsque la valeur existe. LastRank sert de secours. Toute différence est conservée comme conflit visible.

### Puissance et Hero Power

La source dont l'observation d'alliance est la plus fraîche est utilisée. Une différence entre sources reste visible.

### Rang

L'accord des sources est privilégié. En cas de différence, la valeur LastIntel peut être affichée mais le membre est marqué à vérifier.

### Membres

Aucune absence dans une source ne provoque une suppression automatique. Les départs devront passer par une règle de confirmation séparée.

## Identité permanente

Quand D1 sera activé, chaque membre recevra un `gomo_id` indépendant du pseudo.

La résolution utilisera dans cet ordre :

1. identifiant source LastIntel connu ;
2. identifiant source LastRank connu ;
3. alias/pseudo normalisé unique déjà connu ;
4. nouvel identifiant GoMo.

Les anciens pseudos seront conservés dans `core_member_aliases`.

## D1 dédié

Migration préparée : `migrations/0001_gomo_core.sql`.

La migration crée uniquement des tables préfixées `core_` :

- `core_members` ;
- `core_member_aliases` ;
- `core_source_links` ;
- `core_sync_runs` ;
- `core_source_observations` ;
- `core_canonical_snapshots` ;
- `core_audit_log`.

Tant que le binding `CORE_DB` n'existe pas, GoMo Core reste automatiquement en lecture seule.

## Étape suivante

Créer une base D1 séparée `gomo-core-db`, appliquer `migrations/0001_gomo_core.sql`, ajouter le binding `CORE_DB` uniquement au Worker `gomo-core-test`, puis effectuer plusieurs synchronisations de contrôle avant de connecter GoMo Power.
