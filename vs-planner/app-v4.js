"use strict";

(() => {
  const Core = window.GomoVSCore;
  if (!Core) throw new Error("GoMo VS core unavailable");

  const STORAGE_KEY = "gomo_vs_planner_v4";
  const LEGACY_KEY = "gomo_vs_planner_v1_1";
  const LANGS = { fr:"Français", pt:"Português", en:"English", de:"Deutsch", ro:"Română", uk:"Українська", ko:"한국어", hr:"Hrvatski" };
  const LOCALES = { fr:"fr-FR", pt:"pt-PT", en:"en-GB", de:"de-DE", ro:"ro-RO", uk:"uk-UA", ko:"ko-KR", hr:"hr-HR" };

  const EN = {
    tagline:"The right resources, on the right day, without waste.",language:"Language",planner:"Plan",week:"VS Week",settings:"Settings",
    verifiedTitle:"GoMo verified values",verifiedText:"Every resource and point value from the validated profile is shown. If your game shows another value, edit it before calculating.",
    step1:"STEP 1",chooseDay:"Choose the VS day",today:"Today",step2:"STEP 2",enterScore:"Enter your score",currentScore:"Points already earned",safetyMargin:"Safety margin",
    economyWeek:"Saving week",economyHelp:"Automatically protects rare resources. You can re-enable a line if needed.",minimum:"Minimum",recommended:"Recommended",remaining:"Still needed",potential:"Available stock",
    step3:"STEP 3",realResources:"Enter your real resources",resourceHelp:"Exact points appear on every line. Fields are saved on this device.",clear:"Clear",stock:"Available quantity",pointValue:"Point value",use:"Use",
    calculate:"Calculate my exact plan",step4:"STEP 4",applyPlan:"Mark as used",copyPlan:"Copy plan",analyzeCapture:"Analyze a screenshot",analyzeWarning:"Analysis helps read the screen, but you always confirm quantities here before calculation.",
    weekGuideEyebrow:"FULL GUIDE",weekGuideTitle:"The VS week, day by day",weekGuideText:"Open a day to see every recognized resource and its verified value.",pointSettings:"POINTS",restoreTitle:"Restore verified values",restoreText:"Removes only your manual point edits. Stocks stay saved.",restorePoints:"Restore points",
    backup:"BACKUP",backupTitle:"Keep or transfer my data",backupText:"Export a file before changing phone or browser.",export:"Export",import:"Import",installTitle:"Install like an app",installText:"In the browser menu, choose “Add to Home Screen”. The planner can then work offline.",
    reset:"RESET",resetTitle:"Erase all my data",resetText:"Deletes stocks, scores, settings and custom values from this device.",resetButton:"Erase everything",
    main:"Main resources",droneChests:"Drone component chests",trainedTroops:"Trained troops",rivalKills:"Rival VS troops eliminated",otherKills:"Other troops eliminated",ownLosses:"Your troops lost",items:"resources",
    urOnly:"Count only UR trucks or UR secret tasks. Other rarities score 0 here.",verified:"Verified",custom:"Edited",points:"points",goalReached:"Target reached",planReady:"Plan ready",stockInsufficient:"Stock insufficient",noSpend:"No resource to spend: you already reached 7.2M. Save everything else.",
    stopAtTarget:"Stop after these actions and save the rest for the next days.",missingText:"The entered usable stock is not enough for the recommended target. Missing: {points} points.",added:"Added",estimatedTotal:"Estimated total",goal:"Target",useQuantity:"Use {quantity}",
    confirmApply:"Remove the planned quantities from stock and add the estimated points?",applied:"Plan applied and stocks updated.",copied:"Plan copied.",copyFailed:"Copy is unavailable on this browser.",confirmClear:"Clear all stock quantities for this day?",cleared:"Quantities cleared.",confirmRestore:"Restore every verified point value?",restored:"Verified point values restored.",
    confirmReset:"Erase every saved VS Planner value on this device?",resetDone:"All data erased.",exported:"Backup exported.",invalidFile:"This file is not a valid VS Planner backup.",imported:"Backup imported.",day:"Day",open:"Open"
  };

  const I18N = {
    en: EN,
    fr: {
      tagline:"Le bon nombre de ressources, le bon jour, sans gaspillage.",language:"Langue",planner:"Planifier",week:"Semaine VS",settings:"Réglages",
      verifiedTitle:"Valeurs vérifiées GoMo",verifiedText:"Toutes les ressources et les points du profil validé sont affichés. Si ton jeu montre une autre valeur, modifie-la avant de calculer.",
      step1:"ÉTAPE 1",chooseDay:"Choisis le jour VS",today:"Aujourd’hui",step2:"ÉTAPE 2",enterScore:"Entre ton score",currentScore:"Points déjà obtenus",safetyMargin:"Marge de sécurité",
      economyWeek:"Semaine d’économie",economyHelp:"Protège automatiquement les ressources rares. Tu peux réactiver une ligne si nécessaire.",minimum:"Minimum",recommended:"Conseillé",remaining:"Encore nécessaire",potential:"Stock disponible",
      step3:"ÉTAPE 3",realResources:"Saisis tes ressources réelles",resourceHelp:"Les points exacts sont visibles sur chaque ligne. Les champs sont enregistrés sur cet appareil.",clear:"Effacer",stock:"Quantité disponible",pointValue:"Valeur de points",use:"Utiliser",
      calculate:"Calculer mon plan exact",step4:"ÉTAPE 4",applyPlan:"Marquer comme utilisé",copyPlan:"Copier le plan",analyzeCapture:"Analyser une capture",analyzeWarning:"L’analyse aide à lire l’écran, mais tu confirmes toujours les quantités ici avant le calcul.",
      weekGuideEyebrow:"GUIDE COMPLET",weekGuideTitle:"La semaine VS, jour par jour",weekGuideText:"Ouvre un jour pour voir toutes les ressources reconnues et leur valeur vérifiée.",pointSettings:"POINTS",restoreTitle:"Restaurer les valeurs vérifiées",restoreText:"Supprime uniquement tes modifications manuelles des points. Les stocks restent enregistrés.",restorePoints:"Restaurer les points",
      backup:"SAUVEGARDE",backupTitle:"Garder ou transférer mes données",backupText:"Exporte un fichier avant de changer de téléphone ou de navigateur.",export:"Exporter",import:"Importer",installTitle:"Installer comme une application",installText:"Dans le menu du navigateur, choisis « Ajouter à l’écran d’accueil ». Le planner fonctionne ensuite aussi hors connexion.",
      reset:"RÉINITIALISATION",resetTitle:"Effacer toutes mes données",resetText:"Supprime les stocks, les scores, les réglages et les valeurs personnalisées de cet appareil.",resetButton:"Tout effacer",
      main:"Ressources principales",droneChests:"Coffres de composants drone",trainedTroops:"Troupes entraînées",rivalKills:"Troupes adversaires VS éliminées",otherKills:"Autres troupes éliminées",ownLosses:"Tes troupes perdues",items:"ressources",
      urOnly:"Compte uniquement les camions UR ou les missions secrètes UR. Les autres raretés rapportent 0 point ici.",verified:"Vérifié",custom:"Modifié",points:"points",goalReached:"Objectif atteint",planReady:"Plan prêt",stockInsufficient:"Stock insuffisant",noSpend:"Aucune ressource à dépenser : tu as déjà atteint 7,2 M. Garde tout le reste.",
      stopAtTarget:"Arrête-toi après ces actions et garde le reste pour les prochains jours.",missingText:"Le stock utilisable saisi ne suffit pas pour l’objectif conseillé. Il manque {points} points.",added:"Ajoutés",estimatedTotal:"Total estimé",goal:"Objectif",useQuantity:"Utiliser {quantity}",
      confirmApply:"Retirer les quantités prévues du stock et ajouter les points estimés ?",applied:"Plan appliqué et stocks mis à jour.",copied:"Plan copié.",copyFailed:"La copie n’est pas disponible sur ce navigateur.",confirmClear:"Effacer toutes les quantités de ce jour ?",cleared:"Quantités effacées.",confirmRestore:"Restaurer toutes les valeurs de points vérifiées ?",restored:"Valeurs vérifiées restaurées.",
      confirmReset:"Effacer toutes les données VS Planner de cet appareil ?",resetDone:"Toutes les données ont été effacées.",exported:"Sauvegarde exportée.",invalidFile:"Ce fichier n’est pas une sauvegarde VS Planner valide.",imported:"Sauvegarde importée.",day:"Jour",open:"Ouvrir"
    },
    pt: {
      tagline:"A quantidade certa de recursos, no dia certo, sem desperdício.",language:"Idioma",planner:"Planear",week:"Semana VS",settings:"Definições",
      verifiedTitle:"Valores verificados GoMo",verifiedText:"Todos os recursos e pontos do perfil validado estão visíveis. Se o jogo mostrar outro valor, altera-o antes de calcular.",
      step1:"PASSO 1",chooseDay:"Escolhe o dia VS",today:"Hoje",step2:"PASSO 2",enterScore:"Introduz a pontuação",currentScore:"Pontos já obtidos",safetyMargin:"Margem de segurança",
      economyWeek:"Semana de poupança",economyHelp:"Protege automaticamente os recursos raros. Podes reativar uma linha se necessário.",minimum:"Mínimo",recommended:"Recomendado",remaining:"Ainda necessário",potential:"Stock disponível",
      step3:"PASSO 3",realResources:"Introduz os teus recursos reais",resourceHelp:"Os pontos exatos estão visíveis em cada linha. Os campos ficam guardados neste dispositivo.",clear:"Limpar",stock:"Quantidade disponível",pointValue:"Valor de pontos",use:"Usar",
      calculate:"Calcular o meu plano exato",step4:"PASSO 4",applyPlan:"Marcar como usado",copyPlan:"Copiar plano",analyzeCapture:"Analisar uma captura",analyzeWarning:"A análise ajuda a ler o ecrã, mas confirmas sempre as quantidades aqui antes do cálculo.",
      weekGuideEyebrow:"GUIA COMPLETO",weekGuideTitle:"A semana VS, dia a dia",weekGuideText:"Abre um dia para ver todos os recursos reconhecidos e o seu valor verificado.",pointSettings:"PONTOS",restoreTitle:"Restaurar valores verificados",restoreText:"Remove apenas as alterações manuais dos pontos. O stock fica guardado.",restorePoints:"Restaurar pontos",
      backup:"CÓPIA",backupTitle:"Guardar ou transferir os meus dados",backupText:"Exporta um ficheiro antes de mudares de telefone ou navegador.",export:"Exportar",import:"Importar",installTitle:"Instalar como aplicação",installText:"No menu do navegador, escolhe «Adicionar ao ecrã principal». O planner poderá funcionar offline.",
      reset:"REPOR",resetTitle:"Apagar todos os meus dados",resetText:"Apaga stock, pontuações, definições e valores personalizados deste dispositivo.",resetButton:"Apagar tudo",
      main:"Recursos principais",droneChests:"Baús de componentes do drone",trainedTroops:"Tropas treinadas",rivalKills:"Tropas VS rivais eliminadas",otherKills:"Outras tropas eliminadas",ownLosses:"As tuas tropas perdidas",items:"recursos",
      urOnly:"Conta apenas camiões UR ou missões secretas UR. Outras raridades dão 0 pontos aqui.",verified:"Verificado",custom:"Alterado",points:"pontos",goalReached:"Objetivo atingido",planReady:"Plano pronto",stockInsufficient:"Stock insuficiente",noSpend:"Nenhum recurso a gastar: já atingiste 7,2 M. Guarda todo o resto.",
      stopAtTarget:"Para depois destas ações e guarda o resto para os próximos dias.",missingText:"O stock utilizável não chega ao objetivo recomendado. Faltam {points} pontos.",added:"Adicionados",estimatedTotal:"Total estimado",goal:"Objetivo",useQuantity:"Usar {quantity}",
      confirmApply:"Retirar as quantidades planeadas do stock e adicionar os pontos estimados?",applied:"Plano aplicado e stock atualizado.",copied:"Plano copiado.",copyFailed:"A cópia não está disponível neste navegador.",confirmClear:"Limpar todas as quantidades deste dia?",cleared:"Quantidades limpas.",confirmRestore:"Restaurar todos os valores de pontos verificados?",restored:"Valores verificados restaurados.",
      confirmReset:"Apagar todos os dados VS Planner deste dispositivo?",resetDone:"Todos os dados foram apagados.",exported:"Cópia exportada.",invalidFile:"Este ficheiro não é uma cópia VS Planner válida.",imported:"Cópia importada.",day:"Dia",open:"Abrir"
    },
    de:{tagline:"Die richtigen Ressourcen am richtigen Tag, ohne Verschwendung.",language:"Sprache",planner:"Planen",week:"VS-Woche",settings:"Einstellungen",verifiedTitle:"Von GoMo geprüfte Werte",verifiedText:"Alle Ressourcen und Punktwerte des bestätigten Profils sind sichtbar. Zeigt das Spiel einen anderen Wert, ändere ihn vor der Berechnung.",step1:"SCHRITT 1",chooseDay:"VS-Tag wählen",today:"Heute",step2:"SCHRITT 2",enterScore:"Punktestand eingeben",currentScore:"Bereits erzielte Punkte",safetyMargin:"Sicherheitsmarge",economyWeek:"Sparwoche",economyHelp:"Schützt seltene Ressourcen automatisch.",minimum:"Minimum",recommended:"Empfohlen",remaining:"Noch benötigt",potential:"Verfügbarer Bestand",step3:"SCHRITT 3",realResources:"Echte Ressourcen eingeben",resourceHelp:"Die genauen Punkte stehen in jeder Zeile.",clear:"Löschen",stock:"Verfügbare Menge",pointValue:"Punktwert",use:"Verwenden",calculate:"Exakten Plan berechnen",step4:"SCHRITT 4",applyPlan:"Als verwendet markieren",copyPlan:"Plan kopieren",main:"Hauptressourcen",droneChests:"Drohnenkomponenten-Kisten",trainedTroops:"Trainierte Truppen",rivalKills:"Besiegte VS-Gegner",otherKills:"Andere besiegte Truppen",ownLosses:"Eigene verlorene Truppen",items:"Ressourcen",goalReached:"Ziel erreicht",planReady:"Plan bereit",stockInsufficient:"Bestand reicht nicht",noSpend:"Nichts ausgeben: 7,2 Mio. sind bereits erreicht.",stopAtTarget:"Nach diesen Aktionen stoppen und den Rest sparen."},
    ro:{tagline:"Resursele potrivite, în ziua potrivită, fără risipă.",language:"Limbă",planner:"Planifică",week:"Săptămâna VS",settings:"Setări",verifiedTitle:"Valori verificate GoMo",verifiedText:"Sunt afișate toate resursele și punctele profilului validat. Dacă jocul arată altă valoare, modific-o înainte de calcul.",step1:"PASUL 1",chooseDay:"Alege ziua VS",today:"Astăzi",step2:"PASUL 2",enterScore:"Introdu scorul",currentScore:"Puncte deja obținute",safetyMargin:"Marjă de siguranță",economyWeek:"Săptămână de economii",economyHelp:"Protejează automat resursele rare.",minimum:"Minim",recommended:"Recomandat",remaining:"Mai este necesar",potential:"Stoc disponibil",step3:"PASUL 3",realResources:"Introdu resursele reale",resourceHelp:"Punctele exacte sunt vizibile pe fiecare rând.",clear:"Șterge",stock:"Cantitate disponibilă",pointValue:"Valoare puncte",use:"Folosește",calculate:"Calculează planul exact",step4:"PASUL 4",applyPlan:"Marchează ca folosit",copyPlan:"Copiază planul",main:"Resurse principale",droneChests:"Cufere componente dronă",trainedTroops:"Trupe antrenate",rivalKills:"Trupe rivale VS eliminate",otherKills:"Alte trupe eliminate",ownLosses:"Trupele tale pierdute",items:"resurse",goalReached:"Obiectiv atins",planReady:"Plan pregătit",stockInsufficient:"Stoc insuficient",noSpend:"Nu cheltui nimic: ai atins deja 7,2 M.",stopAtTarget:"Oprește-te după aceste acțiuni și păstrează restul."},
    uk:{tagline:"Правильні ресурси в правильний день без марнотратства.",language:"Мова",planner:"План",week:"Тиждень VS",settings:"Налаштування",verifiedTitle:"Перевірені значення GoMo",verifiedText:"Показано всі ресурси й очки підтвердженого профілю. Якщо гра показує інше — змініть перед розрахунком.",step1:"КРОК 1",chooseDay:"Оберіть день VS",today:"Сьогодні",step2:"КРОК 2",enterScore:"Введіть очки",currentScore:"Уже отримані очки",safetyMargin:"Запас безпеки",economyWeek:"Тиждень економії",economyHelp:"Автоматично захищає рідкісні ресурси.",minimum:"Мінімум",recommended:"Рекомендовано",remaining:"Ще потрібно",potential:"Доступний запас",step3:"КРОК 3",realResources:"Введіть реальні ресурси",resourceHelp:"Точні очки видно в кожному рядку.",clear:"Очистити",stock:"Доступна кількість",pointValue:"Вартість в очках",use:"Використати",calculate:"Розрахувати точний план",step4:"КРОК 4",applyPlan:"Позначити використаним",copyPlan:"Копіювати план",main:"Основні ресурси",droneChests:"Скрині компонентів дрона",trainedTroops:"Натреновані війська",rivalKills:"Знищені війська суперника VS",otherKills:"Інші знищені війська",ownLosses:"Втрачені власні війська",items:"ресурсів",goalReached:"Ціль досягнута",planReady:"План готовий",stockInsufficient:"Запасу недостатньо",noSpend:"Не витрачайте ресурси: 7,2 млн уже досягнуто.",stopAtTarget:"Зупиніться після цих дій і збережіть решту."},
    ko:{tagline:"낭비 없이 알맞은 날에 알맞은 자원을 사용하세요.",language:"언어",planner:"계획",week:"VS 주간",settings:"설정",verifiedTitle:"GoMo 검증 값",verifiedText:"검증된 프로필의 모든 자원과 점수를 표시합니다. 게임 값이 다르면 계산 전에 수정하세요.",step1:"1단계",chooseDay:"VS 날짜 선택",today:"오늘",step2:"2단계",enterScore:"현재 점수 입력",currentScore:"이미 획득한 점수",safetyMargin:"안전 여유",economyWeek:"절약 주간",economyHelp:"희귀 자원을 자동으로 보호합니다.",minimum:"최소",recommended:"권장",remaining:"남은 점수",potential:"사용 가능한 보유량",step3:"3단계",realResources:"실제 자원 입력",resourceHelp:"각 줄에 정확한 점수가 표시됩니다.",clear:"지우기",stock:"사용 가능한 수량",pointValue:"점수 값",use:"사용",calculate:"정확한 계획 계산",step4:"4단계",applyPlan:"사용 완료 표시",copyPlan:"계획 복사",main:"주요 자원",droneChests:"드론 부품 상자",trainedTroops:"훈련한 병력",rivalKills:"처치한 상대 VS 병력",otherKills:"처치한 기타 병력",ownLosses:"내 병력 손실",items:"개 자원",goalReached:"목표 달성",planReady:"계획 준비 완료",stockInsufficient:"보유량 부족",noSpend:"이미 7.2M을 달성했습니다. 자원을 쓰지 마세요.",stopAtTarget:"이 행동 후 멈추고 남은 자원을 보관하세요."},
    hr:{tagline:"Pravi resursi, pravi dan, bez rasipanja.",language:"Jezik",planner:"Planiraj",week:"VS tjedan",settings:"Postavke",verifiedTitle:"GoMo provjerene vrijednosti",verifiedText:"Prikazani su svi resursi i bodovi potvrđenog profila. Ako igra prikazuje drukčije, promijeni prije izračuna.",step1:"KORAK 1",chooseDay:"Odaberi VS dan",today:"Danas",step2:"KORAK 2",enterScore:"Unesi bodove",currentScore:"Već osvojeni bodovi",safetyMargin:"Sigurnosna margina",economyWeek:"Tjedan štednje",economyHelp:"Automatski čuva rijetke resurse.",minimum:"Minimum",recommended:"Preporučeno",remaining:"Još potrebno",potential:"Dostupan zalih",step3:"KORAK 3",realResources:"Unesi stvarne resurse",resourceHelp:"Točni bodovi prikazani su u svakom retku.",clear:"Izbriši",stock:"Dostupna količina",pointValue:"Vrijednost bodova",use:"Koristi",calculate:"Izračunaj točan plan",step4:"KORAK 4",applyPlan:"Označi kao korišteno",copyPlan:"Kopiraj plan",main:"Glavni resursi",droneChests:"Škrinje komponenti drona",trainedTroops:"Obučene trupe",rivalKills:"Eliminirane suparničke VS trupe",otherKills:"Ostale eliminirane trupe",ownLosses:"Izgubljene vlastite trupe",items:"resursa",goalReached:"Cilj dosegnut",planReady:"Plan spreman",stockInsufficient:"Nedovoljne zalihe",noSpend:"Ne troši ništa: 7,2 M je već dosegnuto.",stopAtTarget:"Stani nakon ovih radnji i sačuvaj ostatak."}
  };

  const LABELS = {
    fr:{stamina:"Endurance utilisée",radarTasks:"Missions radar terminées",heroExp:"EXP de héros utilisée",droneData:"Données de combat drone",droneParts:"Pièces de drone",packDiamonds:"Diamants obtenus lors de packs",foodHarvest:"Nourriture récoltée",ironHarvest:"Fer récolté",coinHarvest:"Pièces récoltées",skillChipPremium:"Coffres de puce premium ouverts",urShards:"Fragments de héros UR",ssrShards:"Fragments de héros SSR",rareShards:"Fragments de héros R",constructionSpeed:"Accélérateurs de construction",universalSpeed:"Accélérateurs universels",buildingPower:"Puissance bâtiment",urTrucks:"Camions commerciaux UR",legendTasks:"Missions secrètes UR",survivorRecruit:"Tickets de recrutement survivant",researchSpeed:"Accélérateurs de recherche",techPower:"Puissance technologie",valorBadges:"Badges de bravoure",droneChest:"Coffre composant drone niveau {n}",eliteTickets:"Tickets de recrutement héros",skillMedals:"Médailles de compétence",weaponShards:"Fragments d’arme exclusive",trainingSpeed:"Accélérateurs d’entraînement",healingSpeed:"Accélérateurs de soins",trainedTroops:"Troupes niveau {n} entraînées",rivalKilled:"Troupes adversaires VS niveau {n} éliminées",otherKilled:"Autres troupes niveau {n} éliminées",lostTroops:"Tes troupes niveau {n} perdues"},
    pt:{stamina:"Energia utilizada",radarTasks:"Missões radar concluídas",heroExp:"EXP de herói utilizada",droneData:"Dados de combate do drone",droneParts:"Peças do drone",packDiamonds:"Diamantes obtidos em pacotes",foodHarvest:"Comida recolhida",ironHarvest:"Ferro recolhido",coinHarvest:"Moedas recolhidas",skillChipPremium:"Baús de chip premium abertos",urShards:"Fragmentos de herói UR",ssrShards:"Fragmentos de herói SSR",rareShards:"Fragmentos de herói R",constructionSpeed:"Aceleradores de construção",universalSpeed:"Aceleradores universais",buildingPower:"Poder de edifício",urTrucks:"Camiões comerciais UR",legendTasks:"Missões secretas UR",survivorRecruit:"Bilhetes de recrutamento de sobreviventes",researchSpeed:"Aceleradores de pesquisa",techPower:"Poder tecnológico",valorBadges:"Insígnias de valor",droneChest:"Baú de componente do drone nível {n}",eliteTickets:"Bilhetes de recrutamento de heróis",skillMedals:"Medalhas de habilidade",weaponShards:"Fragmentos de arma exclusiva",trainingSpeed:"Aceleradores de treino",healingSpeed:"Aceleradores de cura",trainedTroops:"Tropas nível {n} treinadas",rivalKilled:"Tropas VS rivais nível {n} eliminadas",otherKilled:"Outras tropas nível {n} eliminadas",lostTroops:"As tuas tropas nível {n} perdidas"},
    en:{stamina:"Stamina used",radarTasks:"Radar tasks completed",heroExp:"Hero EXP used",droneData:"Drone combat data",droneParts:"Drone parts",packDiamonds:"Diamonds obtained from packs",foodHarvest:"Food gathered",ironHarvest:"Iron gathered",coinHarvest:"Coins gathered",skillChipPremium:"Premium chip chests opened",urShards:"UR hero shards",ssrShards:"SSR hero shards",rareShards:"R hero shards",constructionSpeed:"Construction speed-ups",universalSpeed:"Universal speed-ups",buildingPower:"Building power",urTrucks:"UR trade trucks",legendTasks:"UR secret tasks",survivorRecruit:"Survivor recruitment tickets",researchSpeed:"Research speed-ups",techPower:"Technology power",valorBadges:"Valor badges",droneChest:"Level {n} drone component chest",eliteTickets:"Hero recruitment tickets",skillMedals:"Skill medals",weaponShards:"Exclusive weapon shards",trainingSpeed:"Training speed-ups",healingSpeed:"Healing speed-ups",trainedTroops:"Level {n} troops trained",rivalKilled:"Level {n} rival VS troops eliminated",otherKilled:"Other level {n} troops eliminated",lostTroops:"Your level {n} troops lost"},
    de:{stamina:"Verbrauchte Ausdauer",radarTasks:"Abgeschlossene Radaraufgaben",heroExp:"Verwendete Helden-EXP",droneData:"Drohnen-Kampfdaten",droneParts:"Drohnenteile",packDiamonds:"Diamanten aus Paketen",foodHarvest:"Gesammelte Nahrung",ironHarvest:"Gesammeltes Eisen",coinHarvest:"Gesammelte Münzen",skillChipPremium:"Geöffnete Premium-Chipkisten",urShards:"UR-Heldenfragmente",ssrShards:"SSR-Heldenfragmente",rareShards:"R-Heldenfragmente",constructionSpeed:"Baubeschleuniger",universalSpeed:"Universalbeschleuniger",buildingPower:"Gebäudestärke",urTrucks:"UR-Handelslaster",legendTasks:"UR-Geheimaufgaben",survivorRecruit:"Überlebenden-Rekrutierungstickets",researchSpeed:"Forschungsbeschleuniger",techPower:"Technologiestärke",valorBadges:"Tapferkeitsabzeichen",droneChest:"Drohnenkomponenten-Kiste Stufe {n}",eliteTickets:"Helden-Rekrutierungstickets",skillMedals:"Fähigkeitsmedaillen",weaponShards:"Exklusive Waffenfragmente",trainingSpeed:"Trainingsbeschleuniger",healingSpeed:"Heilungsbeschleuniger",trainedTroops:"Truppen Stufe {n} trainiert",rivalKilled:"Gegnerische VS-Truppen Stufe {n} besiegt",otherKilled:"Andere Truppen Stufe {n} besiegt",lostTroops:"Eigene Truppen Stufe {n} verloren"},
    ro:{stamina:"Energie folosită",radarTasks:"Misiuni radar finalizate",heroExp:"EXP erou folosit",droneData:"Date de luptă dronă",droneParts:"Piese de dronă",packDiamonds:"Diamante din pachete",foodHarvest:"Hrană colectată",ironHarvest:"Fier colectat",coinHarvest:"Monede colectate",skillChipPremium:"Cufere cip premium deschise",urShards:"Fragmente erou UR",ssrShards:"Fragmente erou SSR",rareShards:"Fragmente erou R",constructionSpeed:"Acceleratoare de construcție",universalSpeed:"Acceleratoare universale",buildingPower:"Putere clădiri",urTrucks:"Camioane comerciale UR",legendTasks:"Misiuni secrete UR",survivorRecruit:"Tichete recrutare supraviețuitori",researchSpeed:"Acceleratoare de cercetare",techPower:"Putere tehnologică",valorBadges:"Insigne de vitejie",droneChest:"Cufăr componente dronă nivel {n}",eliteTickets:"Tichete recrutare eroi",skillMedals:"Medalii de abilitate",weaponShards:"Fragmente armă exclusivă",trainingSpeed:"Acceleratoare de antrenament",healingSpeed:"Acceleratoare de vindecare",trainedTroops:"Trupe nivel {n} antrenate",rivalKilled:"Trupe rivale VS nivel {n} eliminate",otherKilled:"Alte trupe nivel {n} eliminate",lostTroops:"Trupele tale nivel {n} pierdute"},
    uk:{stamina:"Використана витривалість",radarTasks:"Завершені радарні завдання",heroExp:"Використаний EXP героїв",droneData:"Бойові дані дрона",droneParts:"Деталі дрона",packDiamonds:"Діаманти з пакетів",foodHarvest:"Зібрана їжа",ironHarvest:"Зібране залізо",coinHarvest:"Зібрані монети",skillChipPremium:"Відкриті преміум-скрині чипів",urShards:"Фрагменти героїв UR",ssrShards:"Фрагменти героїв SSR",rareShards:"Фрагменти героїв R",constructionSpeed:"Прискорення будівництва",universalSpeed:"Універсальні прискорення",buildingPower:"Сила споруд",urTrucks:"Торгові вантажівки UR",legendTasks:"Секретні завдання UR",survivorRecruit:"Квитки набору вцілілих",researchSpeed:"Прискорення дослідження",techPower:"Сила технологій",valorBadges:"Значки доблесті",droneChest:"Скриня компонентів дрона рівня {n}",eliteTickets:"Квитки набору героїв",skillMedals:"Медалі навичок",weaponShards:"Фрагменти ексклюзивної зброї",trainingSpeed:"Прискорення тренування",healingSpeed:"Прискорення лікування",trainedTroops:"Натреновані війська рівня {n}",rivalKilled:"Знищені війська суперника VS рівня {n}",otherKilled:"Знищені інші війська рівня {n}",lostTroops:"Втрачено власні війська рівня {n}"},
    ko:{stamina:"사용한 스태미나",radarTasks:"완료한 레이더 임무",heroExp:"사용한 영웅 EXP",droneData:"드론 전투 데이터",droneParts:"드론 부품",packDiamonds:"패키지 다이아몬드",foodHarvest:"채집한 식량",ironHarvest:"채집한 철",coinHarvest:"채집한 코인",skillChipPremium:"프리미엄 칩 상자 개봉",urShards:"UR 영웅 조각",ssrShards:"SSR 영웅 조각",rareShards:"R 영웅 조각",constructionSpeed:"건설 가속",universalSpeed:"범용 가속",buildingPower:"건물 전투력",urTrucks:"UR 교역 트럭",legendTasks:"UR 비밀 임무",survivorRecruit:"생존자 모집권",researchSpeed:"연구 가속",techPower:"기술 전투력",valorBadges:"용맹 배지",droneChest:"레벨 {n} 드론 부품 상자",eliteTickets:"영웅 모집권",skillMedals:"스킬 메달",weaponShards:"전용 무기 조각",trainingSpeed:"훈련 가속",healingSpeed:"치료 가속",trainedTroops:"레벨 {n} 병력 훈련",rivalKilled:"상대 VS 레벨 {n} 병력 처치",otherKilled:"기타 레벨 {n} 병력 처치",lostTroops:"내 레벨 {n} 병력 손실"},
    hr:{stamina:"Potrošena izdržljivost",radarTasks:"Završeni radarski zadaci",heroExp:"Potrošeni EXP heroja",droneData:"Borbeni podaci drona",droneParts:"Dijelovi drona",packDiamonds:"Dijamanti iz paketa",foodHarvest:"Prikupljena hrana",ironHarvest:"Prikupljeno željezo",coinHarvest:"Prikupljeni novčići",skillChipPremium:"Otvorene premium škrinje čipa",urShards:"UR fragmenti heroja",ssrShards:"SSR fragmenti heroja",rareShards:"R fragmenti heroja",constructionSpeed:"Ubrzanja gradnje",universalSpeed:"Univerzalna ubrzanja",buildingPower:"Snaga zgrada",urTrucks:"UR trgovački kamioni",legendTasks:"UR tajni zadaci",survivorRecruit:"Ulaznice za novačenje preživjelih",researchSpeed:"Ubrzanja istraživanja",techPower:"Tehnološka snaga",valorBadges:"Značke hrabrosti",droneChest:"Škrinja komponenti drona razine {n}",eliteTickets:"Ulaznice za novačenje heroja",skillMedals:"Medalje vještina",weaponShards:"Fragmenti ekskluzivnog oružja",trainingSpeed:"Ubrzanja obuke",healingSpeed:"Ubrzanja liječenja",trainedTroops:"Obučene trupe razine {n}",rivalKilled:"Eliminirane suparničke VS trupe razine {n}",otherKilled:"Eliminirane druge trupe razine {n}",lostTroops:"Izgubljene vlastite trupe razine {n}"}
  };

  const UNITS = {
    fr:{stamina:"endurance",mission:"mission",exp:"EXP",data:"donnée",part:"pièce",diamond:"diamant",lot100:"lot de 100",lot60:"lot de 60",chest:"coffre",shard:"fragment",minute:"minute",power:"puissance",truck:"camion",ticket:"ticket",badge:"badge",medal:"médaille",troop:"troupe"},
    pt:{stamina:"energia",mission:"missão",exp:"EXP",data:"dado",part:"peça",diamond:"diamante",lot100:"lote de 100",lot60:"lote de 60",chest:"baú",shard:"fragmento",minute:"minuto",power:"poder",truck:"camião",ticket:"bilhete",badge:"insígnia",medal:"medalha",troop:"tropa"},
    en:{stamina:"stamina",mission:"mission",exp:"EXP",data:"data",part:"part",diamond:"diamond",lot100:"lot of 100",lot60:"lot of 60",chest:"chest",shard:"shard",minute:"minute",power:"power",truck:"truck",ticket:"ticket",badge:"badge",medal:"medal",troop:"troop"}
  };

  const DAY_TEXT = {
    fr:[
      ["Lun","Radar","Radar, endurance, récolte et drone."],["Mar","Base","Construction, puissance bâtiment, camions et missions UR."],["Mer","Science","Recherche, badges et composants drone."],["Jeu","Héros","Recrutement, EXP, fragments, médailles et armes."],["Ven","Mobilisation","Accélérateurs, puissance et entraînement des troupes."],["Sam","Ennemi","Combat, soins, camions et missions UR. Bouclier hors ligne."]
    ],
    pt:[
      ["Seg","Radar","Radar, energia, recolha e drone."],["Ter","Base","Construção, poder de edifício, camiões e missões UR."],["Qua","Ciência","Pesquisa, insígnias e componentes do drone."],["Qui","Heróis","Recrutamento, EXP, fragmentos, medalhas e armas."],["Sex","Mobilização","Aceleradores, poder e treino de tropas."],["Sáb","Inimigo","Combate, cura, camiões e missões UR. Escudo offline."]
    ],
    en:[
      ["Mon","Radar","Radar, stamina, gathering and drone."],["Tue","Base","Building, building power, UR trucks and tasks."],["Wed","Science","Research, badges and drone components."],["Thu","Heroes","Recruitment, EXP, shards, medals and weapons."],["Fri","Mobilization","Speed-ups, power and troop training."],["Sat","Enemy","Combat, healing, UR trucks and tasks. Shield offline."]
    ],
    de:[["Mo","Radar","Radar, Ausdauer, Sammeln und Drohne."],["Di","Basis","Bau, Gebäudestärke, UR-Laster und Aufgaben."],["Mi","Forschung","Forschung, Abzeichen und Drohnenkomponenten."],["Do","Helden","Rekrutierung, EXP, Fragmente, Medaillen und Waffen."],["Fr","Mobilisierung","Beschleuniger, Stärke und Truppentraining."],["Sa","Feind","Kampf, Heilung, UR-Laster und Aufgaben. Offline schützen."]],
    ro:[["Lun","Radar","Radar, energie, colectare și dronă."],["Mar","Bază","Construcții, putere, camioane și misiuni UR."],["Mie","Știință","Cercetare, insigne și componente dronă."],["Joi","Eroi","Recrutare, EXP, fragmente, medalii și arme."],["Vin","Mobilizare","Acceleratoare, putere și antrenarea trupelor."],["Sâm","Inamic","Luptă, vindecare, camioane și misiuni UR. Scut offline."]],
    uk:[["Пн","Радар","Радар, витривалість, збір і дрон."],["Вт","База","Будівництво, сила, вантажівки та завдання UR."],["Ср","Наука","Дослідження, значки й компоненти дрона."],["Чт","Герої","Набір, EXP, фрагменти, медалі та зброя."],["Пт","Мобілізація","Прискорення, сила й тренування військ."],["Сб","Ворог","Бій, лікування, вантажівки й завдання UR. Щит офлайн."]],
    ko:[["월","레이더","레이더, 스태미나, 채집 및 드론."],["화","기지","건설, 건물 전투력, UR 트럭과 임무."],["수","과학","연구, 용맹 배지와 드론 부품."],["목","영웅","모집, EXP, 조각, 메달 및 무기."],["금","동원","가속, 전투력 및 병력 훈련."],["토","적","전투, 치료, UR 트럭과 임무. 오프라인 보호막."]],
    hr:[["Pon","Radar","Radar, izdržljivost, prikupljanje i dron."],["Uto","Baza","Gradnja, snaga, UR kamioni i zadaci."],["Sri","Znanost","Istraživanje, značke i komponente drona."],["Čet","Heroji","Novačenje, EXP, fragmenti, medalje i oružje."],["Pet","Mobilizacija","Ubrzanja, snaga i obuka trupa."],["Sub","Neprijatelj","Borba, liječenje, UR kamioni i zadaci. Štit offline."]]
  };

  let state = loadState();
  let toastTimer = null;

  function defaultState() {
    return { version:Core.VERSION, language:detectLanguage(), view:"planner", day:automaticDay(), currentPoints:{}, safetyMargin:Core.DEFAULT_MARGIN, economy:false, stocks:{}, overrides:{}, enabled:{}, lastPlan:null };
  }

  function detectLanguage() {
    const saved = localStorage.getItem("gomo-vs-language");
    if (saved && LANGS[saved]) return saved;
    const code = (navigator.language || "fr").toLowerCase().split("-")[0];
    return LANGS[code] ? code : "fr";
  }

  function automaticDay() {
    const weekday = new Date().getDay();
    return weekday === 0 ? 1 : Math.min(6, weekday);
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && parsed.version === Core.VERSION) return { ...defaultState(), ...parsed };
    } catch {}

    const fresh = defaultState();
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
      if (legacy) {
        if (LANGS[legacy.language]) fresh.language = legacy.language;
        if (legacy.selectedDay) fresh.day = Math.max(1, Math.min(6, Number(legacy.selectedDay)));
        fresh.currentPoints = legacy.currentPoints || {};
        fresh.safetyMargin = Number(legacy.profile?.margin ?? Core.DEFAULT_MARGIN);
        fresh.economy = Boolean(legacy.profile?.economyWeek);
        fresh.stocks[fresh.day] = {};
        Core.getDay(fresh.day).resources.forEach((item) => {
          if (Number.isFinite(Number(legacy.inventory?.[item.id]))) fresh.stocks[fresh.day][item.id] = Number(legacy.inventory[item.id]);
        });
      }
    } catch {}
    return fresh;
  }

  function saveState() {
    state.version = Core.VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem("gomo-vs-language", state.language);
  }

  function tx(key, vars = {}) {
    let value = I18N[state.language]?.[key] ?? EN[key] ?? key;
    Object.entries(vars).forEach(([name, replacement]) => { value = String(value).replaceAll(`{${name}}`, replacement); });
    return value;
  }

  function fmt(value, digits = 0) {
    return new Intl.NumberFormat(LOCALES[state.language] || "en-GB", { maximumFractionDigits:digits }).format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  }

  function dayCopy(dayId = state.day) {
    return (DAY_TEXT[state.language] || DAY_TEXT.en)[Number(dayId) - 1];
  }

  function label(item) {
    const dictionary = LABELS[state.language] || LABELS.en;
    return (dictionary[item.labelKey] || LABELS.en[item.labelKey] || item.labelKey).replaceAll("{n}", item.tier ?? "");
  }

  function unit(item) {
    const dictionary = UNITS[state.language] || UNITS.en;
    return dictionary[item.unitKey] || UNITS.en[item.unitKey] || item.unitKey;
  }

  function dayStocks(dayId = state.day) {
    if (!state.stocks[dayId]) state.stocks[dayId] = {};
    return state.stocks[dayId];
  }

  function enabledKey(item, dayId = state.day) {
    return Core.valueKey(dayId, item.id);
  }

  function isEnabled(item, dayId = state.day) {
    return state.enabled[enabledKey(item, dayId)] !== false;
  }

  function renderLanguage() {
    document.documentElement.lang = state.language;
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = tx(node.dataset.i18n); });
    const select = document.getElementById("languageSelect");
    select.innerHTML = Object.entries(LANGS).map(([code, name]) => `<option value="${code}">${name}</option>`).join("");
    select.value = state.language;
  }

  function renderNavigation() {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${state.view}View`));
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  }

  function renderDays() {
    const tabs = document.getElementById("dayTabs");
    tabs.innerHTML = Core.DAYS.map((day) => {
      const copy = dayCopy(day.id);
      return `<button class="day-tab${day.id === Number(state.day) ? " active" : ""}" type="button" data-day="${day.id}"><strong>${escapeHtml(copy[0])}</strong><small>${escapeHtml(copy[1])}</small></button>`;
    }).join("");
    const copy = dayCopy();
    document.getElementById("dayAdvice").innerHTML = `<strong>${escapeHtml(copy[1])}</strong>${escapeHtml(copy[2])}`;
  }

  function groupResources(resources) {
    const groups = new Map();
    resources.forEach((item) => {
      const group = item.group || "main";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    });
    return groups;
  }

  function pointDescription(dayId, item) {
    const points = Core.getPointValue(dayId, item, state.overrides);
    const per = item.bundle > 1 ? `${fmt(item.bundle)} ${unit(item)}` : unit(item);
    return `${fmt(points, 2)} pts / ${per}`;
  }

  function renderResources() {
    const day = Core.getDay(state.day);
    const stocks = dayStocks();
    const groups = groupResources(day.resources);
    document.getElementById("resourceGroups").innerHTML = [...groups.entries()].map(([group, items], groupIndex) => `
      <details class="resource-group"${groupIndex === 0 || items.length <= 13 ? " open" : ""}>
        <summary><span>${escapeHtml(tx(group))}</span><small>${items.length} ${escapeHtml(tx("items"))}</small></summary>
        <div class="resource-list">
          ${items.map((item) => {
            const key = enabledKey(item);
            const override = state.overrides[key];
            return `<article class="resource-row${isEnabled(item) ? "" : " disabled"}" data-resource="${item.id}">
              <div class="resource-name"><span class="resource-icon" aria-hidden="true">${item.icon}</span><span><strong>${escapeHtml(label(item))}</strong><small>${escapeHtml(pointDescription(day.id, item))} · ${override ? escapeHtml(tx("custom")) : escapeHtml(tx("verified"))}</small></span></div>
              <label class="resource-field"><span>${escapeHtml(tx("stock"))} · ${escapeHtml(unit(item))}</span><input class="stock-input" data-item="${item.id}" type="number" inputmode="numeric" min="0" step="${item.bundle || 1}" value="${Number(stocks[item.id] || 0)}"></label>
              <label class="resource-field resource-field--points"><span>${escapeHtml(tx("pointValue"))} / ${item.bundle > 1 ? `${fmt(item.bundle)} ${escapeHtml(unit(item))}` : escapeHtml(unit(item))}</span><input class="points-input" data-item="${item.id}" type="number" inputmode="decimal" min="0.0001" step="any" value="${Core.getPointValue(day.id, item, state.overrides)}"></label>
              <label class="use-check" title="${escapeHtml(tx("use"))}"><input class="enabled-input" data-item="${item.id}" type="checkbox"${isEnabled(item) ? " checked" : ""}></label>
              ${item.warningKey ? `<p class="resource-warning">⚠️ ${escapeHtml(tx(item.warningKey))}</p>` : ""}
            </article>`;
          }).join("")}
        </div>
      </details>`).join("");
  }

  function currentValue() {
    return Math.max(0, Number(state.currentPoints[state.day] || 0));
  }

  function renderSummary() {
    const current = currentValue();
    const goal = current >= Core.MINIMUM_TARGET ? current : Core.MINIMUM_TARGET + Math.max(0, Number(state.safetyMargin || 0));
    const potential = Core.calculatePotential({ dayId:state.day, stocks:dayStocks(), overrides:state.overrides, enabled:state.enabled });
    document.getElementById("minimumSummary").textContent = fmt(Core.MINIMUM_TARGET);
    document.getElementById("goalSummary").textContent = fmt(goal);
    document.getElementById("remainingSummary").textContent = fmt(Math.max(0, goal - current));
    document.getElementById("potentialSummary").textContent = fmt(potential);
    document.getElementById("currentPoints").value = current;
    document.getElementById("safetyMargin").value = Math.max(0, Number(state.safetyMargin || 0));
    document.getElementById("economyMode").checked = Boolean(state.economy);
  }

  function renderWeekGuide() {
    document.getElementById("weekGuide").innerHTML = Core.DAYS.map((day, index) => {
      const copy = dayCopy(day.id);
      return `<details class="week-day"${index === 0 ? " open" : ""}><summary><span class="week-number">${day.id}</span><span><h3>${escapeHtml(copy[0])} · ${escapeHtml(copy[1])}</h3><p>${escapeHtml(copy[2])}</p></span><b>›</b></summary><div class="week-resource-list">${day.resources.map((item) => `<div><span>${item.icon}</span><span>${escapeHtml(label(item))}</span><strong>${escapeHtml(pointDescription(day.id, item))}</strong></div>`).join("")}</div></details>`;
    }).join("");
  }

  function renderPlan(plan = state.lastPlan) {
    const panel = document.getElementById("resultPanel");
    if (!plan || Number(plan.dayId) !== Number(state.day)) {
      panel.classList.add("hidden");
      return;
    }

    const title = plan.current >= plan.minimum ? tx("goalReached") : plan.minimumReached ? tx("planReady") : tx("stockInsufficient");
    const badge = document.getElementById("resultBadge");
    document.getElementById("resultTitle").textContent = title;
    badge.textContent = plan.minimumReached ? tx("goalReached") : tx("stockInsufficient");
    badge.classList.toggle("missing", !plan.minimumReached);
    document.getElementById("resultSummary").innerHTML = `<div><span>${escapeHtml(tx("goal"))}</span><strong>${fmt(plan.goal)}</strong></div><div><span>${escapeHtml(tx("added"))}</span><strong>+${fmt(plan.added)}</strong></div><div><span>${escapeHtml(tx("estimatedTotal"))}</span><strong>${fmt(plan.total)}</strong></div>`;

    const day = Core.getDay(plan.dayId);
    document.getElementById("planList").innerHTML = plan.actions.map((action) => {
      const item = day.resources.find((candidate) => candidate.id === action.itemId);
      return `<li><span><strong>${escapeHtml(label(item))}</strong><small>${escapeHtml(tx("useQuantity", { quantity:`${fmt(action.quantity)} ${unit(item)}` }))}</small></span><span class="plan-points">+${fmt(action.points)} ${escapeHtml(tx("points"))}</span></li>`;
    }).join("");

    let note = tx("stopAtTarget");
    if (plan.current >= plan.minimum) note = tx("noSpend");
    else if (!plan.goalReached) note = tx("missingText", { points:fmt(plan.missing) });
    document.getElementById("resultNote").textContent = note;
    document.getElementById("applyPlanBtn").disabled = plan.actions.length === 0;
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  function renderAll() {
    renderLanguage();
    renderNavigation();
    renderDays();
    renderResources();
    renderSummary();
    renderWeekGuide();
    renderPlan();
  }

  function calculate() {
    state.lastPlan = Core.calculatePlan({
      dayId:state.day,
      currentPoints:currentValue(),
      safetyMargin:state.safetyMargin,
      stocks:dayStocks(),
      overrides:state.overrides,
      enabled:state.enabled
    });
    saveState();
    renderPlan(state.lastPlan);
  }

  function setEconomy(enabled) {
    state.economy = enabled;
    Core.DAYS.forEach((day) => day.resources.forEach((item) => {
      state.enabled[Core.valueKey(day.id, item.id)] = enabled ? !item.rare : true;
    }));
    state.lastPlan = null;
    saveState();
    renderResources();
    renderSummary();
    renderPlan();
  }

  function applyPlan() {
    const plan = state.lastPlan;
    if (!plan?.actions?.length || !window.confirm(tx("confirmApply"))) return;
    const stocks = dayStocks(plan.dayId);
    plan.actions.forEach((action) => { stocks[action.itemId] = Math.max(0, Number(stocks[action.itemId] || 0) - action.quantity); });
    state.currentPoints[plan.dayId] = plan.total;
    state.lastPlan = null;
    saveState();
    renderAll();
    showToast(tx("applied"));
  }

  function planText() {
    const plan = state.lastPlan;
    if (!plan) return "";
    const day = Core.getDay(plan.dayId);
    const lines = [`GoMo VS Planner — ${dayCopy(plan.dayId)[1]}`, `${tx("currentScore")}: ${fmt(plan.current)}`, `${tx("goal")}: ${fmt(plan.goal)}`];
    plan.actions.forEach((action, index) => {
      const item = day.resources.find((candidate) => candidate.id === action.itemId);
      lines.push(`${index + 1}. ${label(item)} — ${fmt(action.quantity)} ${unit(item)} — +${fmt(action.points)} ${tx("points")}`);
    });
    lines.push(`${tx("estimatedTotal")}: ${fmt(plan.total)}`);
    return lines.join("\n");
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(planText());
      showToast(tx("copied"));
    } catch { showToast(tx("copyFailed")); }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gomo-vs-planner-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(tx("exported"));
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.version !== Core.VERSION || !parsed.stocks || !parsed.currentPoints) throw new Error("invalid");
      state = { ...defaultState(), ...parsed };
      saveState();
      renderAll();
      showToast(tx("imported"));
    } catch { showToast(tx("invalidFile")); }
    document.getElementById("importInput").value = "";
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2400);
  }

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.view = viewButton.dataset.view;
      saveState();
      renderNavigation();
      window.scrollTo({ top:0, behavior:"smooth" });
      return;
    }
    const dayButton = event.target.closest("[data-day]");
    if (dayButton) {
      state.day = Number(dayButton.dataset.day);
      state.lastPlan = null;
      saveState();
      renderAll();
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches(".stock-input")) {
      dayStocks()[target.dataset.item] = Math.max(0, Number(target.value || 0));
      state.lastPlan = null;
      saveState();
      renderSummary();
    }
    if (target.matches(".points-input")) {
      const item = Core.getDay(state.day).resources.find((candidate) => candidate.id === target.dataset.item);
      const value = Number(target.value);
      const key = enabledKey(item);
      if (Number.isFinite(value) && value > 0) state.overrides[key] = value;
      else delete state.overrides[key];
      state.lastPlan = null;
      saveState();
      renderSummary();
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches(".enabled-input")) {
      const item = Core.getDay(state.day).resources.find((candidate) => candidate.id === target.dataset.item);
      state.enabled[enabledKey(item)] = target.checked;
      state.lastPlan = null;
      saveState();
      target.closest(".resource-row")?.classList.toggle("disabled", !target.checked);
      renderSummary();
    }
  });

  document.getElementById("languageSelect").addEventListener("change", (event) => {
    state.language = event.target.value;
    saveState();
    renderAll();
  });
  document.getElementById("todayBtn").addEventListener("click", () => { state.day = automaticDay(); state.lastPlan = null; saveState(); renderAll(); });
  document.getElementById("currentPoints").addEventListener("input", (event) => { state.currentPoints[state.day] = Math.max(0, Number(event.target.value || 0)); state.lastPlan = null; saveState(); renderSummary(); });
  document.getElementById("safetyMargin").addEventListener("input", (event) => { state.safetyMargin = Math.max(0, Number(event.target.value || 0)); state.lastPlan = null; saveState(); renderSummary(); });
  document.getElementById("economyMode").addEventListener("change", (event) => setEconomy(event.target.checked));
  document.getElementById("calculateBtn").addEventListener("click", calculate);
  document.getElementById("applyPlanBtn").addEventListener("click", applyPlan);
  document.getElementById("copyPlanBtn").addEventListener("click", copyPlan);
  document.getElementById("clearStocksBtn").addEventListener("click", () => {
    if (!window.confirm(tx("confirmClear"))) return;
    state.stocks[state.day] = {};
    state.lastPlan = null;
    saveState();
    renderAll();
    showToast(tx("cleared"));
  });
  document.getElementById("restorePointsBtn").addEventListener("click", () => {
    if (!window.confirm(tx("confirmRestore"))) return;
    state.overrides = {};
    state.lastPlan = null;
    saveState();
    renderAll();
    showToast(tx("restored"));
  });
  document.getElementById("exportBtn").addEventListener("click", exportBackup);
  document.getElementById("importInput").addEventListener("change", (event) => importBackup(event.target.files?.[0]));
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!window.confirm(tx("confirmReset"))) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    saveState();
    renderAll();
    showToast(tx("resetDone"));
  });

  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
  renderAll();
})();
