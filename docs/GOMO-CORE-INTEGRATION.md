# Préparation GoMo Central → GoMo Core

Cette préparation ne déploie pas GoMo Core et ne modifie aucune branche de test existante.

## État par défaut

- `GOMO_CORE_ENABLED=false`.
- Aucun appel vers GoMo Core n'est effectué tant que cette variable reste à `false`.
- GoMo Central continue d'utiliser `worker-v1.14.js` pour toutes ses fonctions existantes via le wrapper `worker-v1.15-core-ready.js`.
- Aucun endpoint d'écriture, de refresh ou de collecte live de GoMo Core n'est exposé par GoMo Central.

## Routes préparées

Toutes les routes sont en lecture seule :

- `/api/central-core/health` : état local de préparation, ne contacte jamais GoMo Core.
- `/api/central-core/status` → futur `/api/core/status`.
- `/api/central-core/members` → futur `/api/core/members`.
- `/api/central-core/power` → futur `/api/core/power`.
- `/api/central-core/precision` → futur `/api/core/precision`.

Les routes `status`, `members`, `power` et `precision` répondent 503 tant que l'intégration est désactivée.

## Activation future recommandée

Quand la version définitive de GoMo Core aura été validée :

1. créer le Worker définitif GoMo Core séparément ;
2. ajouter à GoMo Central un Service Binding Cloudflare :
   - binding : `GOMO_CORE`
   - service : nom du Worker GoMo Core définitif ;
3. passer `GOMO_CORE_ENABLED` de `false` à `true` ;
4. ne pas configurer `GOMO_CORE_BASE_URL` si le Service Binding est disponible ;
5. vérifier `/api/central-core/health` puis `/api/central-core/status` ;
6. vérifier que le nombre de membres correspond au jeu ;
7. seulement ensuite migrer les composants GoMo Central qui consomment des données communes.

## Repli

Le repli est immédiat : remettre `GOMO_CORE_ENABLED=false`. Les fonctions historiques de GoMo Central restent servies par `worker-v1.14.js`.

## Objectif quota

GoMo Central ne doit jamais recollecter LastIntel/LastRank lui-même. Il doit lire uniquement les données déjà collectées et mises en cache par GoMo Core. Le Service Binding est préféré afin d'éviter des appels publics inutiles et de conserver une architecture interne Cloudflare.
