# GoMo Central — v20.15

Portail central de l’alliance GoMo sur le serveur 1591.

## Version de référence

- Version de production actuelle : **20.15**.
- Worker de production (`main`) : `worker-v1.14.js`.
- Branche de test : `test/central-cleanup-review`.
- Worker utilisé uniquement sur la branche de test : `worker-v1.16-test-cleanup.js`.
- Le Worker de test s’appuie sur `worker-v1.14.js`, qui s’appuie lui-même sur `worker-v1.12.js`.
- Ne pas supprimer ou déplacer les anciens Workers sans audit des imports.

## Rôle de GoMo Central

GoMo Central est le portail d’entrée de l’écosystème GoMo. Il doit centraliser l’accès aux outils sans dupliquer inutilement leur logique métier.

## Fonctions conservées sur la branche test

- Accueil central.
- Assistant « Demander à GoMo » via Cloudflare Workers AI.
- Analyse de captures Last War.
- Traducteur privé dans les 8 langues de l’alliance.
- Actualités GoMo.
- Accès aux classements et à GoMo Assistant.
- Shiny Radar relié au service `gomo-shiny-central`.
- Gestion du Train protégée et reliée aux données existantes.
- PWA et consultation partielle hors connexion.

## Retraits effectués sur la branche test

Les deux modules suivants ont été retirés de GoMo Central afin de repartir d’une base neutre :

- VS Planner intégré ;
- GoMo Coach.

Le retrait concerne les boutons, cartes, icônes/images, pages/sections, liens et routes correspondants dans GoMo Central.

Le dépôt autonome du VS Planner n’est pas modifié par cette opération.
Les données Last War partagées nécessaires à « Demander à GoMo » restent conservées afin de ne pas casser l’assistant général.

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
3. Tester chaque changement sur une branche séparée et une URL de preview distincte.
4. Ne supprimer aucun Worker historique utilisé comme dépendance sans audit.
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
