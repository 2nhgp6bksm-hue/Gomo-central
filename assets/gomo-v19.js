"use strict";

(() => {
  const RANKINGS_URL = "https://chic-sopapillas-82fbc8.netlify.app/#weeklyChampionsCard";
  const CENTRAL_URL = "https://gomo-central-site.gjp86wh7p2.workers.dev/";
  const PLANNER_URL = "/vs-planner/";

  if (typeof languages !== "undefined") {
    languages.pt = { flag: "🇵🇹", label: "Português", short: "PT" };
  }

  if (typeof translations !== "undefined" && typeof fr !== "undefined") {
    translations.pt = {
      ...fr,
      "equal.title":"Todos juntos",
      "equal.text":"O mesmo acesso e o mesmo lugar para cada membro.",
      "nav.home":"Início",
      "nav.ask":"Perguntar à GoMo",
      "nav.capture":"Analisar uma captura",
      "nav.communication":"Tradutor",
      "nav.news":"Notícias",
      "nav.tools":"Ferramentas GoMo",
      "nav.guides":"GoMo Coach",
      "free.title":"Modo gratuito",
      "free.text":"Sem faturação automática",
      "actions.install":"Instalar no dispositivo",
      "actions.send":"Enviar",
      "actions.cancel":"Cancelar",
      "actions.publish":"Adicionar",
      "actions.original":"Ver texto original",
      "actions.delete":"Eliminar",
      "home.title":"Tudo GoMo. Simples.",
      "home.subtitle":"Um único espaço para compreender, comunicar, analisar capturas e aceder a todas as ferramentas GoMo.",
      "home.ask":"Perguntar à GoMo",
      "home.capture":"Enviar uma captura",
      "home.quick":"ACESSO RÁPIDO",
      "home.choose":"O que queres fazer?",
      "status.base":"Base central ativa",
      "status.detail":"8 idiomas • iPhone • Android • computador",
      "cards.askTitle":"Não percebi",
      "cards.askText":"Pede uma explicação simples no teu idioma.",
      "cards.captureTitle":"Analisar uma captura",
      "cards.captureText":"Envia uma imagem do Last War e verifica o resultado.",
      "cards.communicationTitle":"Falar com a GoMo",
      "cards.communicationText":"Faz uma pergunta ou ajuda outro membro.",
      "cards.toolsTitle":"Todas as ferramentas",
      "cards.toolsText":"Assistant, VS Planner, Shiny Radar e Coach.",
      "cards.newsTitle":"Notícias GoMo",
      "cards.newsText":"Informações e eventos importantes.",
      "cards.guidesTitle":"GoMo Coach",
      "cards.guidesText":"Estratégias simples para todos os eventos.",
      "ask.eyebrow":"ASSISTENTE GOMO",
      "ask.title":"Perguntar à GoMo",
      "ask.welcome":"Explica o que não percebes. Posso simplificar, traduzir ou procurar a informação GoMo correta.",
      "ask.placeholder":"Escreve a tua pergunta…",
      "ask.examples":"Exemplos",
      "ask.example1":"Explica-me o VS de hoje",
      "ask.example2":"O que devo melhorar?",
      "ask.example3":"Traduzir uma instrução",
      "ask.demoTitle":"Assistente GoMo ativo",
      "ask.demoText":"As respostas usam informações GoMo e Last War já verificadas.",
      "ask.demoReply":"Não consegui responder agora.",
      "ask.loading":"A GoMo está a preparar a resposta…",
      "ask.error":"A resposta está temporariamente indisponível.",
      "capture.eyebrow":"CAPTURAS LAST WAR",
      "capture.title":"Analisar uma captura",
      "capture.dropTitle":"Escolhe uma captura",
      "capture.dropText":"Classificação, recursos, Shiny, VS, heróis ou evento.",
      "capture.select":"Selecionar uma imagem",
      "capture.result":"Resultado proposto",
      "capture.waiting":"Em espera",
      "capture.ready":"Imagem pronta",
      "capture.empty":"O resultado aparecerá aqui depois de enviares uma captura.",
      "capture.type":"Tipo detetado",
      "capture.unknown":"A confirmar",
      "capture.language":"Idioma detetado",
      "capture.auto":"Automático",
      "capture.confidence":"Confiança",
      "capture.validation":"A captura é enviada à IA para análise e depois não é guardada pela GoMo Central. Verifica sempre o resultado.",
      "capture.analyze":"Analisar com IA",
      "capture.choose":"Escolhe primeiro uma captura.",
      "capture.running":"Análise em curso…",
      "capture.done":"Análise concluída",
      "capture.error":"Análise indisponível",
      "communication.eyebrow":"TRADUÇÃO",
      "communication.title":"Tradutor GoMo",
      "communication.new":"Novo texto",
      "communication.emptyTitle":"Adiciona um texto para traduzir",
      "communication.emptyText":"O texto fica guardado neste dispositivo e só é enviado à IA quando pedes uma tradução.",
      "communication.nextTitle":"Modo privado",
      "communication.nextText":"Nada é publicado nem partilhado com outros membros.",
      "communication.nameLabel":"Nome (opcional)",
      "communication.namePlaceholder":"Nome ou jogador",
      "communication.messageLabel":"Texto",
      "communication.placeholder":"Escreve o texto…",
      "communication.demoNotice":"O texto fica guardado localmente e só é enviado à IA para a ação pedida.",
      "communication.translate":"Traduzir",
      "communication.explain":"Explicar com a GoMo",
      "communication.local":"Guardado neste dispositivo",
      "communication.translating":"A traduzir…",
      "communication.explaining":"A explicar…",
      "communication.failed":"Ação temporariamente indisponível.",
      "news.eyebrow":"GOMO FOREVER",
      "news.title":"Notícias GoMo",
      "news.pinned":"Informação fixada",
      "news.demoTitle":"GoMo Central está pronta",
      "news.demoText":"Comboio, classificações, VS Planner, Shiny Radar, análise IA, tradução e Coach estão reunidos num só lugar.",
      "news.emptyTitle":"GoMo um dia, GoMo para sempre",
      "news.emptyText":"As informações importantes da aliança serão adicionadas aqui depois de confirmadas.",
      "tools.eyebrow":"GOMO CENTRAL",
      "tools.title":"Todas as ferramentas GoMo",
      "tools.assistant":"Classificações, comboio, VIP e organização da aliança.",
      "tools.planner":"Preparar recursos e atingir o objetivo de 7,2 M.",
      "tools.radar":"Servidores confirmados, previsões e histórico das missões.",
      "tools.coach":"Estratégias, eventos, equipas e prioridades fáceis de seguir.",
      "tools.link":"Ligação a configurar",
      "tools.open":"Abrir",
      "tools.rankings":"Pódios VS, donativos e Tempestade do Deserto.",
      "tools.rankingsTitle":"Classificações",
      "tools.analysis":"Análise de capturas do Last War com resultados verificáveis.",
      "tools.translate":"Tradução simples para os idiomas da aliança.",
      "tools.news":"Anúncios e informações importantes da aliança.",
      "guides.title":"GoMo Coach",
      "guides.placeholder":"Pesquisar um evento, estratégia ou recurso…",
      "guides.noneTitle":"Nenhuma estratégia encontrada",
      "guides.noneText":"Tenta outra palavra ou pergunta diretamente à GoMo.",
      "language.title":"Escolher idioma"
    };

    const languageUpdates = {
      fr:{"nav.guides":"GoMo Coach","guides.title":"GoMo Coach","guides.placeholder":"Rechercher un événement, une stratégie ou une ressource…","status.detail":"8 langues • iPhone • Android • ordinateur","cards.guidesTitle":"GoMo Coach","cards.guidesText":"Stratégies simples pour tous les événements."},
      de:{"nav.guides":"GoMo Coach","guides.title":"GoMo Coach","guides.placeholder":"Ereignis, Strategie oder Ressource suchen…","status.detail":"8 Sprachen • iPhone • Android • Computer","cards.guidesTitle":"GoMo Coach","cards.guidesText":"Einfache Strategien für alle Ereignisse."},
      en:{"nav.guides":"GoMo Coach","guides.title":"GoMo Coach","guides.placeholder":"Search for an event, strategy or resource…","status.detail":"8 languages • iPhone • Android • computer","cards.guidesTitle":"GoMo Coach","cards.guidesText":"Simple strategies for every event."},
      ro:{"nav.guides":"GoMo Coach","guides.title":"GoMo Coach","guides.placeholder":"Caută un eveniment, o strategie sau o resursă…","status.detail":"8 limbi • iPhone • Android • computer","cards.guidesTitle":"GoMo Coach","cards.guidesText":"Strategii simple pentru toate evenimentele."},
      uk:{"nav.guides":"GoMo Coach","guides.title":"GoMo Coach","guides.placeholder":"Пошук події, стратегії або ресурсу…","status.detail":"8 мов • iPhone • Android • комп’ютер","cards.guidesTitle":"GoMo Coach","cards.guidesText":"Прості стратегії для всіх подій."},
      ko:{"nav.guides":"GoMo Coach","guides.title":"GoMo Coach","guides.placeholder":"이벤트, 전략 또는 자원 검색…","status.detail":"8개 언어 • iPhone • Android • 컴퓨터","cards.guidesTitle":"GoMo Coach","cards.guidesText":"모든 이벤트를 위한 쉬운 전략."},
      hr:{"nav.guides":"GoMo Coach","guides.title":"GoMo Coach","guides.placeholder":"Traži događaj, strategiju ili resurs…","status.detail":"8 jezika • iPhone • Android • računalo","cards.guidesTitle":"GoMo Coach","cards.guidesText":"Jednostavne strategije za sve događaje."}
    };
    Object.entries(languageUpdates).forEach(([code, values]) => Object.assign(translations[code], values));
  }

  try {
    if (localStorage.getItem("gomo-central-language") === "pt" && typeof currentLanguage !== "undefined") {
      currentLanguage = "pt";
    }
  } catch {}

  const UI = {
    fr:{eyebrow:"STRATÉGIES LAST WAR",title:"GoMo Coach",intro:"Choisis un événement et suis les étapes dans l’ordre. Les consignes sont courtes, vérifiables et pensées pour être lues facilement sur téléphone.",safety:"Le jeu reste la référence : vérifie toujours le jour, le minuteur, le nombre d’attaques et les valeurs affichées sur ton serveur.",search:"Rechercher un événement, une stratégie ou une ressource…",all:"Tous",alliance:"Alliance",combat:"Combat",planning:"Planification",daily:"Quotidien",prepare:"Préparer",during:"Pendant",avoid:"À éviter",resources:"Ressources utiles",source:"Voir le guide source",noneTitle:"Aucune stratégie trouvée",noneText:"Essaie “ver”, “zombie”, “buster”, “train”, “VS” ou demande à GoMo."},
    pt:{eyebrow:"ESTRATÉGIAS LAST WAR",title:"GoMo Coach",intro:"Escolhe um evento e segue as etapas pela ordem. As instruções são curtas, verificáveis e fáceis de ler no telemóvel.",safety:"O jogo continua a ser a referência: confirma sempre o dia, o temporizador, o número de ataques e os valores mostrados no teu servidor.",search:"Pesquisar um evento, estratégia ou recurso…",all:"Todos",alliance:"Aliança",combat:"Combate",planning:"Planeamento",daily:"Diário",prepare:"Preparar",during:"Durante",avoid:"Evitar",resources:"Recursos úteis",source:"Ver o guia de referência",noneTitle:"Nenhuma estratégia encontrada",noneText:"Tenta “verme”, “zombie”, “buster”, “comboio”, “VS” ou pergunta à GoMo."},
    en:{eyebrow:"LAST WAR STRATEGIES",title:"GoMo Coach",intro:"Choose an event and follow the steps in order. The instructions are short, verifiable and easy to read on a phone.",safety:"The game remains the source of truth: always check the day, timer, attack count and values shown on your server.",search:"Search for an event, strategy or resource…",all:"All",alliance:"Alliance",combat:"Combat",planning:"Planning",daily:"Daily",prepare:"Prepare",during:"During",avoid:"Avoid",resources:"Useful resources",source:"Open source guide",noneTitle:"No strategy found",noneText:"Try “worm”, “zombie”, “buster”, “train”, “VS” or ask GoMo."},
    de:{eyebrow:"LAST-WAR-STRATEGIEN",title:"GoMo Coach",intro:"Wähle ein Ereignis und folge den Schritten. Die Hinweise sind kurz, prüfbar und auf dem Handy gut lesbar.",safety:"Das Spiel ist maßgeblich: Prüfe immer Tag, Timer, Angriffsanzahl und die auf deinem Server angezeigten Werte.",search:"Ereignis, Strategie oder Ressource suchen…",all:"Alle",alliance:"Allianz",combat:"Kampf",planning:"Planung",daily:"Täglich",prepare:"Vorbereiten",during:"Währenddessen",avoid:"Vermeiden",resources:"Nützliche Ressourcen",source:"Quellleitfaden öffnen",noneTitle:"Keine Strategie gefunden",noneText:"Versuche „Wurm“, „Zombie“, „Buster“, „Zug“, „VS“ oder frage GoMo."},
    ro:{eyebrow:"STRATEGII LAST WAR",title:"GoMo Coach",intro:"Alege un eveniment și urmează pașii în ordine. Instrucțiunile sunt scurte, verificabile și ușor de citit pe telefon.",safety:"Jocul rămâne referința: verifică mereu ziua, cronometrul, numărul de atacuri și valorile afișate pe server.",search:"Caută un eveniment, o strategie sau o resursă…",all:"Toate",alliance:"Alianță",combat:"Luptă",planning:"Planificare",daily:"Zilnic",prepare:"Pregătire",during:"În timpul",avoid:"De evitat",resources:"Resurse utile",source:"Deschide ghidul sursă",noneTitle:"Nicio strategie găsită",noneText:"Încearcă „vierme”, „zombie”, „buster”, „tren”, „VS” sau întreabă GoMo."},
    uk:{eyebrow:"СТРАТЕГІЇ LAST WAR",title:"GoMo Coach",intro:"Оберіть подію та виконуйте кроки по черзі. Поради короткі, перевірені й зручні для телефона.",safety:"Гра є головним джерелом: завжди перевіряйте день, таймер, кількість атак і значення на вашому сервері.",search:"Пошук події, стратегії або ресурсу…",all:"Усі",alliance:"Альянс",combat:"Бій",planning:"Планування",daily:"Щоденні",prepare:"Підготовка",during:"Під час",avoid:"Уникати",resources:"Корисні ресурси",source:"Відкрити джерело",noneTitle:"Стратегію не знайдено",noneText:"Спробуйте «черв’як», «зомбі», «buster», «потяг», «VS» або запитайте GoMo."},
    ko:{eyebrow:"LAST WAR 전략",title:"GoMo Coach",intro:"이벤트를 선택하고 순서대로 따라 하세요. 짧고 확인 가능한 안내로 휴대폰에서도 쉽게 읽을 수 있습니다.",safety:"게임 화면이 최종 기준입니다. 서버에 표시된 날짜, 타이머, 공격 횟수와 점수를 항상 확인하세요.",search:"이벤트, 전략 또는 자원 검색…",all:"전체",alliance:"동맹",combat:"전투",planning:"계획",daily:"일일",prepare:"준비",during:"진행",avoid:"주의",resources:"유용한 자원",source:"출처 가이드 열기",noneTitle:"전략을 찾지 못했습니다",noneText:"‘벌레’, ‘좀비’, ‘buster’, ‘열차’, ‘VS’를 검색하거나 GoMo에게 물어보세요."},
    hr:{eyebrow:"LAST WAR STRATEGIJE",title:"GoMo Coach",intro:"Odaberi događaj i slijedi korake redom. Upute su kratke, provjerljive i lako čitljive na telefonu.",safety:"Igra je glavni izvor: uvijek provjeri dan, mjerač vremena, broj napada i vrijednosti prikazane na serveru.",search:"Traži događaj, strategiju ili resurs…",all:"Svi",alliance:"Savez",combat:"Borba",planning:"Planiranje",daily:"Dnevno",prepare:"Priprema",during:"Tijekom",avoid:"Izbjegni",resources:"Korisni resursi",source:"Otvori izvorni vodič",noneTitle:"Strategija nije pronađena",noneText:"Pokušaj „crv“, „zombi“, „buster“, „vlak“, „VS“ ili pitaj GoMo."}
  };

  const META = [
    {id:"vs",icon:"📊",category:"planning",aliases:"vs duel 7.2 7,2 points ressources resources planner",source:"https://lastwarvault.com/guides/general/vs-guide/"},
    {id:"marshal",icon:"🪱",category:"alliance",aliases:"garde du ver vers worm maréchal marshal guard alliance exercise exercice",source:"https://lastwarvault.com/guides/general/marshals-guard-guide/"},
    {id:"zombie",icon:"🧟",category:"combat",aliases:"vagues zombie siege siège 20 waves",source:"https://lastwarvault.com/guides/general/zombie-siege-guide/"},
    {id:"buster",icon:"⚔️",category:"combat",aliases:"bustier buster enemy ennemi samedi day 6 pvp",source:"https://lastwarvault.com/guides/general/enemy-buster-guide/"},
    {id:"train",icon:"🚂",category:"alliance",aliases:"train comboio zug tren vlak vip conducteur driver wagons",source:"https://lastwarvault.com/guides/general/alliance-train-guide/"},
    {id:"desert",icon:"🌪️",category:"combat",aliases:"tempête desert storm désert équipes inscription",source:"https://lastwarvault.com/guides/"},
    {id:"sky",icon:"🦅",category:"alliance",aliases:"prédateur ciel sky predator donation token",source:"https://lastwarvault.com/guides/general/sky-predator-guide/"},
    {id:"capital",icon:"🏰",category:"combat",aliases:"capitale capital conquest ville city contaminated",source:"https://lastwarvault.com/guides/general/capital-conquest-guide/"},
    {id:"arms",icon:"⏱️",category:"daily",aliases:"course armement arms race phases 4 heures",source:"https://lastwarvault.com/guides/general/arms-race-guide/"},
    {id:"shiny",icon:"✨",category:"daily",aliases:"shiny radar serveur 1591 missions mardi samedi",source:"https://gomo-shiny-central.gjp86wh7p2.workers.dev/"}
  ];

  const EVENT_COPY = {
    fr:[
      ["Duel d’alliance · VS","Atteindre le palier sans vider les jours suivants.","Vérifie le jour VS et les valeurs de points affichées, puis saisis tes stocks dans VS Planner.","Utilise uniquement les ressources du jour et arrête-toi dès le palier conseillé atteint.","Ne dépense pas une ressource réservée à un autre jour. Si le jeu affiche une autre valeur, le jeu prévaut.","VS Planner, stocks réels, valeur de points visible dans le jeu."],
      ["Garde du Maréchal · Ver géant","Rallye coopératif de 30 minutes contre le ver.","Rappelle toutes tes escouades, donne au terrain d’exercice et choisis une difficulté que l’alliance peut terminer.","Lance un seul rallye avec une équipe plus faible et rejoins les autres rallyes avec ta meilleure équipe. Les rallyes durent 3 minutes.","Ne lance pas une difficulté trop haute et ne laisse pas tes meilleures escouades occupées ailleurs.","Endurance, meilleure escouade, soins et marqueurs R4/R5."],
      ["Siège de zombies · 20 vagues","Tenir les défenses et aider les membres les plus fragiles.","Rappelle les troupes, soigne-les et place tes meilleures unités en défense du mur. Le bouclier n’arrête pas les vagues.","À partir d’environ la vague 10, renforce les membres faibles. Deux défenses ratées éliminent un joueur de la suite.","Ne gaspille pas un bouclier et ne garde pas toutes tes escouades en marche extérieure.","Soins, renforts, défense du mur et communication d’alliance."],
      ["Enemy Buster · Jour 6","Marquer en PvP sans offrir ses troupes gratuitement.","Avant le samedi, prépare bouclier, soins et téléportations. Active le bouclier dès que tu es hors ligne.","Repère des cibles ennemies non protégées et coordonne les attaques. Les troupes de l’alliance rivale rapportent davantage.","N’attaque pas une base vide et ne reste jamais sans protection lorsque tu ne joues pas.","Bouclier 24 h, soins, téléportations, camions UR et missions secrètes UR."],
      ["Train d’alliance · VIP","Préparer le Gold Express et répartir les places équitablement.","Pendant les 4 h de préparation, donne les contrats. Cinq rafraîchissements, soit 25 contrats, permettent de viser le Gold Express.","Choisis un conducteur solide, remplis les wagons et respecte la rotation GoMo. Chaque wagon accepte au maximum 5 passagers.","Ne monopolise pas les places et ne change pas le conducteur sans vérifier le planning.","Contrats commerciaux, planning Train GoMo et liste VIP."],
      ["Tempête du désert","Jouer les objectifs en équipe plutôt que chercher les éliminations seul.","Confirme ton inscription et ton créneau GoMo, prépare soins, téléportations et deux équipes disponibles.","Suis les appels R4/R5, occupe les bâtiments demandés et déplace-toi avec ton groupe.","Ne pars pas seul, ne brûle pas tous tes soins au début et n’ignore pas les objectifs de points.","Soins, téléportations, équipes assignées et canal d’alliance."],
      ["Prédateur céleste","Une semaine d’alliance : dons, combat, puis calcul.","Fais les dons du lundi au jeudi et garde ta meilleure équipe prête pour les jours de combat.","Combats le vendredi et le samedi, utilise chaque attaque utile et collecte les jetons des activités.","Ne gaspille pas une attaque sur un niveau que ton équipe ne peut pas terminer.","Dons, meilleure escouade, quota d’attaques et jetons d’événement."],
      ["Conquête de la capitale","Progression de villes coordonnée par les R4/R5.","Attends la déclaration et les marqueurs R4/R5, puis prépare téléportations, soins et escouades.","Avance avec l’alliance et contrôle les objectifs annoncés. Le terrain contaminé désactive boucliers et radar et ralentit les marches.","N’entre pas seul en zone contaminée et ne te fie pas au bouclier une fois dedans.","Téléportations, soins, marqueurs d’alliance et escouades de renfort."],
      ["Course à l’armement","Six phases de 4 heures pour convertir les bonnes actions en coffres.","Regarde d’abord la phase active et son minuteur sur ton serveur.","Effectue les améliorations correspondant à la phase et arrête une fois les coffres visés obtenus.","L’ordre peut varier : ne dépense jamais en te fiant seulement à un ancien planning.","Radar, construction, recherche, héros, entraînement et drones selon la phase."],
      ["Shiny Radar · Serveur 1591","Consulter les confirmations avant de choisir un serveur extérieur.","Sur le serveur 1591, les jours Shiny GoMo sont mardi et samedi.","Ouvre Shiny Radar pour voir les confirmations du Bot et l’historique avant de te déplacer.","Le serveur 1591 ne doit jamais être ajouté à la liste des serveurs extérieurs.","Capture du Bot, Shiny Radar et validation humaine." ]
    ],
    pt:[
      ["Duelo da aliança · VS","Atingir o patamar sem esvaziar os dias seguintes.","Confirma o dia VS e os pontos mostrados no jogo; depois introduz o stock no VS Planner.","Usa apenas os recursos do dia e para assim que atingires o patamar recomendado.","Não gastes recursos reservados para outro dia. Se o jogo mostrar outro valor, vale o valor do jogo.","VS Planner, stock real e pontos visíveis no jogo."],
      ["Guarda do Marechal · Verme gigante","Rally cooperativo de 30 minutos contra o verme.","Recolhe todas as equipas, doa ao campo de treino e escolhe uma dificuldade que a aliança consiga terminar.","Abre um rally com uma equipa mais fraca e entra nos outros com a melhor equipa. Cada rally dura 3 minutos.","Não escolhas uma dificuldade demasiado alta nem deixes as melhores equipas ocupadas noutro lugar.","Energia, melhor equipa, cura e marcadores R4/R5."],
      ["Cerco de zombies · 20 vagas","Defender e ajudar os membros mais frágeis.","Recolhe e cura as tropas; coloca as melhores unidades no muro. O escudo não bloqueia as vagas.","A partir de cerca da vaga 10, reforça os membros mais fracos. Duas defesas falhadas eliminam o jogador.","Não desperdices um escudo nem deixes todas as equipas fora da base.","Cura, reforços, defesa do muro e comunicação da aliança."],
      ["Enemy Buster · Dia 6","Marcar em PvP sem oferecer tropas ao adversário.","Antes de sábado prepara escudo, cura e teleportes. Ativa o escudo sempre que estiveres offline.","Procura alvos rivais sem proteção e coordena os ataques. As tropas da aliança rival valem mais pontos.","Não ataques bases vazias e não fiques desprotegido quando não estás a jogar.","Escudo 24 h, cura, teleportes, camiões UR e missões secretas UR."],
      ["Comboio da aliança · VIP","Preparar o Gold Express e repartir os lugares.","Durante as 4 h de preparação, doa contratos. Cinco atualizações, ou 25 contratos, permitem procurar o Gold Express.","Escolhe um condutor forte, enche os vagões e respeita a rotação GoMo. Cada vagão leva no máximo 5 passageiros.","Não monopolizes lugares nem mudes o condutor sem consultar o planeamento.","Contratos comerciais, planeamento do Comboio GoMo e lista VIP."],
      ["Tempestade do Deserto","Jogar os objetivos em equipa, não apenas eliminações.","Confirma a inscrição e o horário GoMo; prepara cura, teleportes e duas equipas.","Segue as chamadas R4/R5, ocupa os edifícios pedidos e desloca-te com o grupo.","Não jogues sozinho, não gastes toda a cura no início e não ignores os objetivos.","Cura, teleportes, equipas atribuídas e canal da aliança."],
      ["Predador Celeste","Uma semana de aliança: doações, combate e cálculo.","Faz doações de segunda a quinta e guarda a melhor equipa para os dias de combate.","Combate sexta e sábado, usa cada ataque útil e recolhe fichas nas atividades.","Não desperdices ataques num nível que a tua equipa não consegue terminar.","Doações, melhor equipa, limite de ataques e fichas do evento."],
      ["Conquista da Capital","Progressão de cidades coordenada pelos R4/R5.","Espera pela declaração e marcadores R4/R5; prepara teleportes, cura e equipas.","Avança com a aliança. O terreno contaminado desativa escudos e radar e abranda as marchas.","Não entres sozinho na zona contaminada e não confies no escudo lá dentro.","Teleportes, cura, marcadores da aliança e equipas de reforço."],
      ["Corrida Armamentista","Seis fases de 4 horas para transformar ações certas em baús.","Consulta primeiro a fase ativa e o temporizador no teu servidor.","Faz as melhorias da fase e para quando obtiveres os baús desejados.","A ordem pode variar: não gastes seguindo apenas um planeamento antigo.","Radar, construção, pesquisa, heróis, treino e drone conforme a fase."],
      ["Shiny Radar · Servidor 1591","Ver confirmações antes de escolher um servidor exterior.","No servidor 1591, os dias Shiny GoMo são terça-feira e sábado.","Abre o Shiny Radar para ver confirmações do Bot e histórico antes de te deslocares.","O servidor 1591 nunca deve entrar na lista de servidores exteriores.","Captura do Bot, Shiny Radar e validação humana."]
    ],
    en:[
      ["Alliance Duel · VS","Reach the milestone without draining future days.","Check the VS day and point values shown in game, then enter real stock in VS Planner.","Use only the day’s resources and stop as soon as the recommended milestone is reached.","Do not spend resources saved for another day. If the game shows another value, the game wins.","VS Planner, real stock and the point value visible in game."],
      ["Marshal’s Guard · Giant worm","A 30-minute co-op rally against the worm.","Recall every squad, donate to the drill ground and select a difficulty the alliance can finish.","Start one rally with a weaker squad and join other rallies with your strongest squad. Rallies last 3 minutes.","Do not choose an excessive difficulty or leave your strongest squads busy elsewhere.","Stamina, strongest squad, healing and R4/R5 markers."],
      ["Zombie Siege · 20 waves","Hold the defenses and help weaker members.","Recall and heal troops; place your best units on wall defense. Shields do not stop the waves.","From around wave 10, reinforce weaker members. Two failed defenses remove a player from later waves.","Do not waste a shield or leave every squad marching outside.","Healing, reinforcements, wall defense and alliance chat."],
      ["Enemy Buster · Day 6","Score in PvP without giving troops away.","Before Saturday prepare a shield, healing and teleports. Shield whenever you go offline.","Scout unshielded rival targets and coordinate hits. Rival-alliance troops award more points.","Do not attack empty bases or stay unshielded while offline.","24-hour shield, healing, teleports, UR trucks and UR secret tasks."],
      ["Alliance Train · VIP","Prepare Gold Express and share seats fairly.","During the 4-hour preparation, donate contracts. Five refreshes, or 25 contracts, can target Gold Express.","Choose a strong conductor, fill wagons and follow the GoMo rotation. Each wagon holds at most 5 passengers.","Do not monopolize seats or change the conductor without checking the schedule.","Trade contracts, GoMo Train schedule and VIP list."],
      ["Desert Storm","Play objectives as a team instead of chasing solo kills.","Confirm registration and the GoMo slot; prepare healing, teleports and two available squads.","Follow R4/R5 calls, occupy assigned buildings and move with your group.","Do not roam alone, burn all healing early or ignore scoring objectives.","Healing, teleports, assigned squads and alliance chat."],
      ["Sky Predator","An alliance week: donations, battle, then settlement.","Donate Monday through Thursday and keep your strongest squad ready for battle days.","Fight Friday and Saturday, use every valuable attack and collect event tokens from activities.","Do not waste an attack on a level your squad cannot finish.","Donations, strongest squad, attack quota and event tokens."],
      ["Capital Conquest","City progression coordinated by R4/R5.","Wait for the declaration and R4/R5 markers; prepare teleports, healing and squads.","Advance with the alliance. Contaminated land disables shields and radar and slows marches.","Do not enter contaminated land alone or rely on a shield inside it.","Teleports, healing, alliance markers and reinforcement squads."],
      ["Arms Race","Six 4-hour phases that turn the right actions into chests.","Check the active phase and timer on your server first.","Perform actions matching the phase and stop once the desired chests are secured.","Phase order can vary; never spend based only on an old schedule.","Radar, building, research, heroes, training and drone according to the phase."],
      ["Shiny Radar · Server 1591","Check confirmations before choosing an outside server.","On server 1591, GoMo Shiny days are Tuesday and Saturday.","Open Shiny Radar for Bot confirmations and history before moving.","Server 1591 must never appear in the outside-server list.","Bot screenshot, Shiny Radar and human validation."]
    ]
  };

  // Concise native-language versions keep every current alliance language usable.
  EVENT_COPY.de = EVENT_COPY.en.map((row, i) => [
    ["Allianzduell · VS","Marshalswache · Riesenwurm","Zombie-Belagerung · 20 Wellen","Enemy Buster · Tag 6","Allianzzug · VIP","Wüstensturm","Himmelsräuber","Eroberung der Hauptstadt","Rüstungsrennen","Shiny Radar · Server 1591"][i],
    row[1], row[2], row[3], row[4], row[5]
  ]);
  EVENT_COPY.ro = EVENT_COPY.en.map((row, i) => [["Duelul alianței · VS","Garda Mareșalului · Vierme uriaș","Asediu zombie · 20 valuri","Enemy Buster · Ziua 6","Trenul alianței · VIP","Furtuna din deșert","Prădătorul ceresc","Cucerirea Capitalei","Cursa înarmării","Shiny Radar · Server 1591"][i],row[1],row[2],row[3],row[4],row[5]]);
  EVENT_COPY.uk = EVENT_COPY.en.map((row, i) => [["Дуель альянсів · VS","Варта Маршала · Гігантський черв’як","Облога зомбі · 20 хвиль","Enemy Buster · День 6","Потяг альянсу · VIP","Буря в пустелі","Небесний хижак","Завоювання столиці","Гонка озброєнь","Shiny Radar · Сервер 1591"][i],row[1],row[2],row[3],row[4],row[5]]);
  EVENT_COPY.ko = EVENT_COPY.en.map((row, i) => [["동맹 결투 · VS","마셜 가드 · 거대 벌레","좀비 공성 · 20웨이브","Enemy Buster · 6일차","동맹 열차 · VIP","사막 폭풍","하늘 포식자","수도 정복","군비 경쟁","Shiny Radar · 서버 1591"][i],row[1],row[2],row[3],row[4],row[5]]);
  EVENT_COPY.hr = EVENT_COPY.en.map((row, i) => [["Duel saveza · VS","Maršalova straža · Divovski crv","Opsada zombija · 20 valova","Enemy Buster · 6. dan","Vlak saveza · VIP","Pustinjska oluja","Nebeski predator","Osvajanje glavnog grada","Utrka u naoružanju","Shiny Radar · Server 1591"][i],row[1],row[2],row[3],row[4],row[5]]);

  let activeCategory = "all";

  function lang() {
    return (typeof currentLanguage !== "undefined" && currentLanguage) || localStorage.getItem("gomo-central-language") || "fr";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  }

  function coachCopy() {
    return EVENT_COPY[lang()] || EVENT_COPY.en;
  }

  function renderCoach() {
    const section = document.getElementById("guides");
    if (!section) return;
    const ui = UI[lang()] || UI.en;
    const copy = coachCopy();
    const filters = ["all", "alliance", "combat", "planning", "daily"];

    section.innerHTML = `
      <div class="page-header"><div><span class="eyebrow">${escapeHtml(ui.eyebrow)}</span><h1>${escapeHtml(ui.title)}</h1></div></div>
      <section class="coach-intro"><div><h2>${escapeHtml(ui.title)}</h2><p>${escapeHtml(ui.intro)}</p></div><div class="coach-safety">✅ ${escapeHtml(ui.safety)}</div></section>
      <div class="coach-controls">
        <label class="search-box"><span>🔎</span><input id="guideSearch" type="search" placeholder="${escapeHtml(ui.search)}" autocomplete="off"></label>
        <div class="coach-filters" role="group" aria-label="${escapeHtml(ui.title)}">
          ${filters.map((key) => `<button class="coach-filter${activeCategory === key ? " active" : ""}" type="button" data-coach-filter="${key}">${escapeHtml(ui[key])}</button>`).join("")}
        </div>
      </div>
      <div class="coach-grid" id="guideList">
        ${META.map((meta, index) => {
          const row = copy[index] || EVENT_COPY.en[index];
          const search = `${meta.aliases} ${row.join(" ")}`;
          return `<details class="coach-card guide-card" data-category="${meta.category}" data-search="${escapeHtml(search)}"${index < 2 ? " open" : ""}>
            <summary><span class="coach-icon" aria-hidden="true">${meta.icon}</span><span class="coach-heading"><h3>${escapeHtml(row[0])}</h3><p>${escapeHtml(row[1])}</p></span><span class="coach-chevron" aria-hidden="true">›</span></summary>
            <div class="coach-body">
              <div class="coach-step"><strong>${escapeHtml(ui.prepare)}</strong><p>${escapeHtml(row[2])}</p></div>
              <div class="coach-step"><strong>${escapeHtml(ui.during)}</strong><p>${escapeHtml(row[3])}</p></div>
              <div class="coach-step coach-step--avoid"><strong>${escapeHtml(ui.avoid)}</strong><p>${escapeHtml(row[4])}</p></div>
              <div class="coach-step coach-step--resource"><strong>${escapeHtml(ui.resources)}</strong><p>${escapeHtml(row[5])}</p></div>
              <a class="coach-source" href="${meta.source}" target="_blank" rel="noopener noreferrer">↗ ${escapeHtml(ui.source)}</a>
            </div>
          </details>`;
        }).join("")}
      </div>
      <div class="empty-state hidden" id="guideEmpty"><span>🔎</span><h3>${escapeHtml(ui.noneTitle)}</h3><p>${escapeHtml(ui.noneText)}</p></div>`;

    const applyFilters = () => {
      const query = document.getElementById("guideSearch")?.value.trim().toLocaleLowerCase(lang()) || "";
      let visible = 0;
      section.querySelectorAll(".guide-card").forEach((card) => {
        const categoryMatch = activeCategory === "all" || card.dataset.category === activeCategory;
        const searchable = `${card.dataset.search || ""} ${card.textContent}`.toLocaleLowerCase(lang());
        const matches = categoryMatch && (!query || searchable.includes(query));
        card.classList.toggle("hidden", !matches);
        if (matches) visible += 1;
      });
      document.getElementById("guideEmpty")?.classList.toggle("hidden", visible > 0);
    };

    document.getElementById("guideSearch")?.addEventListener("input", applyFilters);
    section.querySelectorAll("[data-coach-filter]").forEach((button) => button.addEventListener("click", () => {
      activeCategory = button.dataset.coachFilter;
      section.querySelectorAll("[data-coach-filter]").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
      applyFilters();
    }));
  }

  function addCoachTool() {
    const grid = document.querySelector("#tools .tool-grid");
    if (!grid || grid.querySelector("[data-gomo-coach-card]")) return;
    const article = document.createElement("article");
    article.className = "tool-card tool-card--internal";
    article.dataset.gomoCoachCard = "1";
    article.innerHTML = `<img alt="" class="tool-card__image" src="icons/gomo-assistant.png"><div><h2>GoMo Coach</h2><p data-coach-tool-text></p></div><button data-go="guides" type="button"></button>`;
    grid.prepend(article);
  }

  function syncCoachTool() {
    addCoachTool();
    const ui = UI[lang()] || UI.en;
    const descriptions = {
      fr:"Stratégies ordonnées pour le VS, le ver géant, les zombies, Enemy Buster et les grands événements.",
      pt:"Estratégias organizadas para VS, verme gigante, zombies, Enemy Buster e grandes eventos.",
      en:"Ordered strategies for VS, the giant worm, zombies, Enemy Buster and major events.",
      de:"Geordnete Strategien für VS, Riesenwurm, Zombies, Enemy Buster und große Ereignisse.",
      ro:"Strategii ordonate pentru VS, viermele uriaș, zombie, Enemy Buster și evenimentele mari.",
      uk:"Упорядковані стратегії для VS, гігантського черв’яка, зомбі, Enemy Buster та великих подій.",
      ko:"VS, 거대 벌레, 좀비, Enemy Buster 및 주요 이벤트 전략.",
      hr:"Uređene strategije za VS, divovskog crva, zombije, Enemy Buster i velike događaje."
    };
    const textNode = document.querySelector("[data-coach-tool-text]");
    const button = document.querySelector("[data-gomo-coach-card] button");
    if (textNode) textNode.textContent = descriptions[lang()] || descriptions.en;
    if (button) button.textContent = translations?.[lang()]?.["tools.open"] || ui.source;
  }

  function repairLinks() {
    if (typeof EXTERNAL_LINKS !== "undefined") {
      delete EXTERNAL_LINKS.train;
      EXTERNAL_LINKS["vs-planner"] = PLANNER_URL;
      EXTERNAL_LINKS.rankings = RANKINGS_URL;
      EXTERNAL_LINKS.classements = RANKINGS_URL;
    }
    document.querySelectorAll('a[href*="-GoMo-VS-Planner-"]').forEach((anchor) => { anchor.href = PLANNER_URL; });
    document.querySelectorAll('[onclick*="-GoMo-VS-Planner-"]').forEach((button) => {
      button.removeAttribute("onclick");
      button.addEventListener("click", () => window.location.assign(PLANNER_URL));
    });
    document.querySelectorAll('a[href*="goto=weeklyChampionsCard"]').forEach((anchor) => { anchor.href = RANKINGS_URL; });
    document.querySelectorAll('[onclick*="goto=weeklyChampionsCard"]').forEach((button) => {
      button.removeAttribute("onclick");
      button.addEventListener("click", () => window.location.assign(RANKINGS_URL));
    });
  }

  document.addEventListener("click", (event) => {
    const quick = event.target.closest("[data-r5-go]");
    if (!quick) return;
    const target = quick.getAttribute("data-r5-go");
    if (target === "train" || target === "classements") {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById("gomo-r5fapper-panel")?.classList.remove("open");
      if (target === "train") {
        if (typeof openPage === "function") openPage("train");
        else window.location.assign(`${CENTRAL_URL}#train`);
      } else {
        window.location.assign(RANKINGS_URL);
      }
    }
  }, true);

  if (typeof translatePage === "function") {
    const baseTranslatePage = translatePage;
    translatePage = function enhancedTranslatePage() {
      baseTranslatePage();
      renderCoach();
      syncCoachTool();
      repairLinks();
    };
  }

  repairLinks();
  renderCoach();
  syncCoachTool();
  if (typeof renderLanguageList === "function") renderLanguageList();
  if (typeof translatePage === "function") translatePage();
})();
