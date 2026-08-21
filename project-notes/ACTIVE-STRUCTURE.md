# GoMo Central — structure active de la branche test

Ce document décrit la structure de `test/central-cleanup-review` après le retrait du VS Planner intégré et de GoMo Coach.

## Point d’entrée Cloudflare

`wrangler.jsonc` définit :

- Worker : `gomo-central-site`
- fichier principal de la branche test : `worker-v1.16-test-cleanup.js`
- ressources statiques : racine du dépôt via le binding `ASSETS`
- service Shiny : `gomo-shiny-central`
- binding IA : `AI`

## Chaîne Worker actuelle

`worker-v1.16-test-cleanup.js` importe `worker-v1.14.js`, qui importe `worker-v1.12.js`.

Cette couche de test retire le VS Planner et GoMo Coach sans modifier les anciennes dépendances qui font encore fonctionner GoMo Central.

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

Les anciennes routes du VS Planner ne sont plus exposées sur cette branche et répondent désormais `404`.

## Modules spécialisés conservés

### GoMo Assistant

GoMo Central sert de passerelle vers GoMo Assistant et réutilise ses données lorsqu’une fonction l’exige.

### Train

La gestion intégrée actuelle reste inchangée pendant cette étape.

### Shiny Radar

Relié comme service Cloudflare séparé via le binding `SHINY`.

### Workers AI

Utilisé pour l’assistant, la traduction et l’analyse.

## Retraits effectués

Sur cette branche uniquement :

### VS Planner

- suppression du dossier intégré `vs-planner/` ;
- suppression de son icône locale ;
- suppression de ses routes de `wrangler.jsonc` ;
- suppression de sa règle dans le service worker ;
- retrait des boutons, cartes, liens et mentions visibles correspondants dans l’interface ;
- blocage des anciennes routes `/vs-planner` et `/vs-planner/*`.

### GoMo Coach

- suppression de l’icône `icons/gomo-coach.png` ;
- retrait du bouton de navigation ;
- retrait de la page/section Coach ;
- retrait des cartes et liens d’accès rapide ;
- retrait des mentions visibles de GoMo Coach dans l’interface.

Les données Last War partagées utilisées également par « Demander à GoMo » restent conservées afin de ne pas casser l’assistant général.
Le dépôt autonome du VS Planner n’a pas été modifié.

## Fichiers historiques

Les anciens Workers restent présents car ils appartiennent à la chaîne de dépendances actuelle. Ils ne doivent pas être supprimés uniquement parce qu’ils contiennent d’anciennes références internes.

## Principe pour la suite

GoMo Central doit rester le portail central. Les outils spécialisés seront choisis puis réintégrés un par un après validation.
