# GoMo Central — v19.1

Portail central de l’alliance GoMo sur le serveur 1591.

## Principes respectés

- Aucun grade visible : chaque membre est présenté à la même hauteur.
- Interface simple, sans salons ou fonctions inutiles.
- Choix parmi 8 langues :
  français, allemand, anglais, roumain, ukrainien, coréen, croate et portugais.
- Adapté à l’iPhone, Android et ordinateur.
- Installable sur l’écran d’accueil comme une application web.
- Déployé sur Cloudflare Workers avec des ressources statiques.

## Fonctions incluses

- Accueil central
- Assistant « Demander à GoMo » relié à Workers AI et au catalogue Last War
- Analyse de captures Last War avec résultat, type, langue et confiance
- Traducteur privé dans les 8 langues de l’alliance
- Actualités GoMo
- Accès direct à GoMo Assistant, Train/VIP, Classements, VS Planner intégré et Shiny Radar
- GoMo Coach structuré pour le VS, le ver géant, les zombies, Enemy Buster,
  le Train, la Tempête du désert et les principaux événements
- Sauvegarde locale de la langue et des textes du traducteur
- Consultation du portail et des guides hors connexion après la première ouverture

## Données et sécurité

- Les textes sont sauvegardés localement. Ils sont transmis à Workers AI uniquement
  lorsqu’une traduction ou une explication est demandée, sans être publiés aux membres.
- Les captures sont transmises pour l’analyse puis ne sont pas enregistrées par GoMo Central.
- L’assistant, la traduction et l’analyse nécessitent une connexion internet.
- Les réponses doivent distinguer ce qui est confirmé de ce qui reste à confirmer.
- Les appels IA refusent les requêtes provenant d’un autre site.

## Développement

Le Worker principal est défini dans `wrangler.jsonc`. Toute nouvelle version doit être
testée sur une branche séparée avant de remplacer la version publique.
