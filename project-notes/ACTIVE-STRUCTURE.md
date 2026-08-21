# GoMo Central — structure active

Ce document décrit la structure à considérer comme active avant toute nouvelle modification.

## Point d’entrée Cloudflare

`wrangler.jsonc` définit :

- Worker : `gomo-central-site`
- fichier principal : `worker-v1.14.js`
- ressources statiques : racine du dépôt via le binding `ASSETS`
- service Shiny : `gomo-shiny-central`
- binding IA : `AI`

## Chaîne Worker actuelle

`worker-v1.14.js` importe `worker-v1.12.js`.

Conséquence : les anciens fichiers Worker ne doivent pas être considérés comme inutiles uniquement parce qu’un numéro plus récent existe.

Avant toute suppression ou déplacement :

1. rechercher les imports directs et indirects ;
2. vérifier `wrangler.jsonc` ;
3. vérifier les routes servies ;
4. tester le site complet sur une preview séparée.

## Routes explicitement traitées par le Worker

- `/`
- `/index.html`
- `/api/*`
- `/fallback.json`
- `/assets/app-v1.5.js`
- `/assets/gomo-v19.js`
- `/icons/gomo-assistant.png`
- `/gestion-train`
- `/gestion-train/*`
- `/vs-planner`
- `/vs-planner/*`
- `/sw.js`
- `/shiny-radar`
- `/shiny-radar/*`

## Modules spécialisés

### GoMo Assistant

GoMo Central doit servir de passerelle vers GoMo Assistant et réutiliser ses données lorsqu’une fonction l’exige, sans créer une seconde source indépendante de vérité.

### Train

La gestion intégrée actuelle est sensible car elle dépend du Worker principal et des données de GoMo Assistant. Toute évolution de règles de sélection devra être faite séparément après validation du rangement.

### VS Planner

Présent dans `vs-planner/`. Ne pas fusionner son code dans le Worker principal sans nécessité.

### Shiny Radar

Relié comme service Cloudflare séparé via le binding `SHINY`. Conserver cette séparation.

### Workers AI

Utilisé pour l’assistant, la traduction et l’analyse. Les changements IA doivent rester séparés des changements de navigation ou de données.

## Fichiers historiques

Le dépôt contient plusieurs versions de Workers et de scripts. Pour l’instant :

- aucune suppression ;
- aucun renommage ;
- aucun déplacement ;
- uniquement documentation et identification progressive de leur rôle.

Une suppression ne pourra être envisagée qu’après preuve qu’aucune route, import, asset, service worker ou ancienne compatibilité n’en dépend.

## Principe pour la suite

GoMo Central doit devenir le portail central, tandis que les fonctions spécialisées restent dans leurs projets ou modules dédiés. Une règle métier ne doit idéalement avoir qu’une seule source de vérité.
