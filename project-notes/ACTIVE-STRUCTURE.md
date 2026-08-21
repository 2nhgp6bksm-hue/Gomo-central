# GoMo Central — structure active de la branche test

Ce document décrit la structure de `test/central-cleanup-review` après le retrait du planificateur VS intégré.

## Point d’entrée Cloudflare

`wrangler.jsonc` définit :

- Worker : `gomo-central-site`
- fichier principal de la branche test : `worker-v1.15-test-no-vs-planner.js`
- ressources statiques : racine du dépôt via le binding `ASSETS`
- service Shiny : `gomo-shiny-central`
- binding IA : `AI`

## Chaîne Worker actuelle

`worker-v1.15-test-no-vs-planner.js` importe `worker-v1.14.js`, qui importe `worker-v1.12.js`.

Cette couche de test retire le planificateur VS sans modifier les anciennes dépendances qui font encore fonctionner GoMo Central.

## Routes actives conservées

- `/`
- `/index.html`
- `/api/*`
- `/fallback.json`
- `/assets/app-v1.5.js`
- `/assets/gomo-v19.js`
- `/icons/gomo-assistant.png`
- `/gestion-train`
- `/gestion-train/*`
- `/sw.js`
- `/shiny-radar`
- `/shiny-radar/*`

Les anciennes routes du planificateur VS ne sont plus exposées sur cette branche et répondent désormais `404`.

## Modules spécialisés conservés

### GoMo Assistant

GoMo Central sert de passerelle vers GoMo Assistant et réutilise ses données lorsqu’une fonction l’exige.

### Train

La gestion intégrée actuelle reste inchangée pendant cette première étape.

### Shiny Radar

Relié comme service Cloudflare séparé via le binding `SHINY`.

### Workers AI

Utilisé pour l’assistant, la traduction et l’analyse.

## Retrait effectué

Sur cette branche uniquement :

- suppression du dossier intégré du planificateur VS ;
- suppression de son icône locale ;
- suppression de ses routes de `wrangler.jsonc` ;
- suppression de sa règle dans le service worker ;
- masquage/retrait des boutons, cartes, liens et mentions visibles correspondants dans l’interface.

Le dépôt autonome du planificateur n’a pas été modifié.

## Fichiers historiques

Les anciens Workers restent présents car ils appartiennent à la chaîne de dépendances actuelle. Ils ne doivent pas être supprimés uniquement parce qu’ils contiennent d’anciennes références internes.

## Principe pour la suite

GoMo Central doit rester le portail central. Une seule version du planificateur VS sera choisie, remise au propre puis réintégrée ultérieurement après validation.
