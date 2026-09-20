# GoMo Core v0.8 — protocole de mesure one-shot

Date de préparation : 2026-09-20
Branche figée : `prepare/core-v08-final-2026-09-20`
Candidat validé : `b02c909a851e7f35deedd13d7980d34d598a6223`

## Baseline production au repos

Mesure Cloudflare `gomo-core-db`, dernières 24 h :
- ~1,47 k lignes lues
- 0 ligne écrite
- 75 requêtes
- 0 requête d'écriture

Cette baseline sert uniquement de référence. La production ne participe pas au test.

## Cible autorisée

- Worker : `gomo-core-test`
- Mode : `test`
- D1 : `gomo-core-v08-read-test-db`
- D1 ID : `45ca2537-70d2-409c-9db1-2fa1772c0a2d`
- Cron : aucun

## Interdictions

- ne jamais cibler `gomo-central`
- ne jamais cibler `gomo-core-db` / `ac1b5094-c1f9-4706-b29b-8507e6f85a92`
- aucun Cron pendant le protocole
- aucune migration ou backfill
- aucun merge vers `main`
- aucune modification de Power, Train, Assistant ou Shiny
- ne pas lancer le protocole sans précontrôle et autorisation explicite

## Mesure A — avant

Relever sur la D1 test, sans écriture :
- total queries
- read queries
- write queries
- rows read
- rows written
- storage
- fenêtre temporelle exacte

Contrôler aussi le Worker :
- version active
- D1 binding exact
- absence de Cron
- mode test

## Synchronisation 1

Déclencher exactement UNE synchronisation v0.8 sur le Worker test, puis attendre sa fin.
Aucun second refresh automatique ou manuel.

## Mesure B — après synchro 1

Relever les mêmes métriques et calculer le delta B-A.
Contrôler :
- 94 membres attendus
- statut de synchronisation
- meaningfulRows
- rowsChanged
- statementsSkippedAsUnchanged
- derivedMetadataRowsSuppressed
- freshnessOnlyCanonicalRowsSuppressed

## Synchronisation 2

Après une période courte où aucune modification importante n'est attendue, déclencher exactement UNE deuxième synchronisation.
Cette étape mesure surtout le coût lorsque les données sont quasi inchangées.

## Mesure C — après synchro 2

Relever les mêmes métriques et calculer C-B.

Le critère principal est que la seconde synchronisation ne recrée pas massivement des snapshots/observations inchangés.

## Décision de fréquence

À partir du coût mesuré d'une synchronisation stable, projeter :
- 1 / jour
- 2 / jour
- 4 / jour
- 6 / jour
- 24 / jour

Ajouter le bruit de fond mesuré et conserver une marge de sécurité importante sous les quotas Cloudflare.

Aucune fréquence n'est choisie à l'avance.

## Stop immédiat

Arrêter le test sans seconde synchronisation si :
- cible Worker/D1 différente
- Cron présent
- nombre de membres incohérent
- erreur de synchronisation
- hausse anormale des écritures
- migration/backfill requis
- garde-fou en échec
