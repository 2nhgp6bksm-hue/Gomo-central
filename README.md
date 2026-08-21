# GoMo Central — v20.15

Portail central de l’alliance GoMo sur le serveur 1591.

## Version de référence

- Version applicative actuelle : **20.15**.
- Worker Cloudflare actif défini par `wrangler.jsonc` : `worker-v1.14.js`.
- `worker-v1.14.js` s’appuie actuellement sur `worker-v1.12.js` : ne pas supprimer ou déplacer les anciens Workers sans audit des imports.
- Branche de production : `main`.
- Branche de rangement et de futurs essais : `test/central-cleanup-review`.

## Rôle de GoMo Central

GoMo Central est le portail d’entrée de l’écosystème GoMo. Il doit centraliser l’accès aux outils sans dupliquer inutilement leur logique métier.

## Fonctions actuellement incluses

- Accueil central.
- Assistant « Demander à GoMo » via Cloudflare Workers AI.
- Analyse de captures Last War.
- Traducteur privé dans les 8 langues de l’alliance.
- Actualités GoMo.
- GoMo Coach.
- Accès aux classements et à GoMo Assistant.
- VS Planner intégré.
- Shiny Radar relié au service `gomo-shiny-central`.
- Gestion du Train protégée et reliée aux données existantes.
- PWA et consultation partielle hors connexion.

## Langues

Français, allemand, anglais, roumain, ukrainien, coréen, croate et portugais.

## Hébergement

- Site et API : Cloudflare Workers.
- Ressources statiques : Cloudflare Worker Assets.
- IA : Cloudflare Workers AI.
- Shiny Radar : service Worker séparé `gomo-shiny-central`.

## Règles de sécurité du projet

1. Ne jamais travailler directement sur `main` pour une nouvelle modification.
2. Ne jamais remplacer le déploiement de production pour tester une fonction.
3. Tester chaque changement sur une branche séparée et, lorsque nécessaire, une URL de preview distincte.
4. Ne supprimer aucun Worker, fichier historique, image, route ou donnée avant d’avoir confirmé qu’il n’est plus utilisé.
5. Conserver les fonctions qui marchent déjà et modifier le minimum de fichiers nécessaire.
6. Ne jamais mettre de secret, mot de passe ou jeton privé dans GitHub.

## Organisation technique

La structure active et les fichiers sensibles sont décrits dans `project-notes/ACTIVE-STRUCTURE.md`.
Les règles pour les futures modifications sont décrites dans `project-notes/TEST-WORKFLOW.md`.

## Données et confidentialité

- Les textes du traducteur sont sauvegardés localement et ne sont transmis à l’IA que pour l’action demandée.
- Les captures envoyées pour analyse ne doivent pas être conservées par GoMo Central après traitement.
- Les fonctions IA nécessitent une connexion internet.
- Les résultats incertains doivent rester présentés comme à confirmer.
