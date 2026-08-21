# GoMo Central — règles de travail sur la branche test

Branche de référence pour les prochaines modifications :

`test/central-cleanup-review`

## Interdictions

- ne pas modifier `main` directement ;
- ne pas déployer sur l’URL de production pendant un test ;
- ne pas fusionner sans validation ;
- ne pas supprimer de données existantes ;
- ne pas supprimer d’anciens Workers avant audit ;
- ne pas reconstruire le site pour corriger une fonction ciblée.

## Méthode obligatoire

Pour chaque amélioration :

1. analyser les fichiers concernés ;
2. modifier le minimum de fichiers possible ;
3. conserver toutes les fonctions déjà opérationnelles ;
4. tester la modification seule ;
5. vérifier la navigation mobile et ordinateur ;
6. vérifier les huit langues si l’interface est touchée ;
7. vérifier le mode PWA/hors connexion si des assets ou le service worker sont touchés ;
8. vérifier les routes API si le Worker est touché ;
9. déployer uniquement une preview/test séparée si un test réel est nécessaire ;
10. ne proposer un merge qu’après validation.

## Ordre conseillé des prochains chantiers

1. Audit des doublons et anciennes règles sans modification fonctionnelle.
2. Train : définir une seule source de vérité pour les règles et le planning.
3. GoMo Power : intégrer l’accès sans recopier sa logique dans Central.
4. GoMo Événements : relier les guides complets et limiter les doublons avec GoMo Coach.
5. Sécurité : vérifier les accès propriétaires et les données conservées localement.
6. Nettoyage final des fichiers historiques uniquement après tests complets.

## Critère de validation

Une modification est acceptable uniquement si elle améliore la fonction ciblée sans changer le comportement des autres parties du site.
