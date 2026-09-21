# Checklist avant activation de GoMo Core dans GoMo Central

- [ ] GoMo Core définitif validé plusieurs synchronisations de suite.
- [ ] Nombre de membres identique au jeu.
- [ ] QG vérifiés sur plusieurs membres.
- [ ] Puissances vérifiées sur plusieurs membres.
- [ ] Cache et quota Cloudflare contrôlés.
- [ ] Worker GoMo Core définitif créé séparément du Worker de test.
- [ ] Service Binding `GOMO_CORE` ajouté à GoMo Central.
- [ ] `/api/central-core/health` indique `coreSourceConfigured: true`.
- [ ] `GOMO_CORE_ENABLED=true` uniquement après les contrôles précédents.
- [ ] `/api/central-core/status` retourne une synchronisation fraîche.
- [ ] `/api/central-core/members` retourne la liste complète.
- [ ] `/api/central-core/power` retourne les valeurs attendues.
- [ ] Aucun endpoint d'écriture ou de refresh exposé dans GoMo Central.
- [ ] Plan de repli vérifié : `GOMO_CORE_ENABLED=false`.
- [ ] Migration des consommateurs effectuée un site/composant à la fois.
