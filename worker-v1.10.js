// v18 : R5Fapper intégré à GoMo Central — base v17 conservée.
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

const SUPPORTED_LOCALES = new Set(["fr", "de", "en", "ro", "uk", "ko", "hr", "pt"]);

const LOCALE_NAMES = {
  fr: "français",
  de: "allemand",
  en: "anglais",
  ro: "roumain",
  uk: "ukrainien",
  ko: "coréen",
  hr: "croate",
  pt: "portugais"
};

const RESULT_TEXT = {
  fr: { confirmed:"CONFIRMÉ", probable:"PROBABLE", missing:"MANQUANT / NON VISIBLE", priorities:"3 PRIORITÉS MAXIMUM", keep:"À GARDER" },
  de: { confirmed:"BESTÄTIGT", probable:"WAHRSCHEINLICH", missing:"FEHLT / NICHT SICHTBAR", priorities:"MAXIMAL 3 PRIORITÄTEN", keep:"AUFBEWAHREN" },
  en: { confirmed:"CONFIRMED", probable:"PROBABLE", missing:"MISSING / NOT VISIBLE", priorities:"MAXIMUM 3 PRIORITIES", keep:"KEEP" },
  ro: { confirmed:"CONFIRMAT", probable:"PROBABIL", missing:"LIPSĂ / NU ESTE VIZIBIL", priorities:"MAXIMUM 3 PRIORITĂȚI", keep:"DE PĂSTRAT" },
  uk: { confirmed:"ПІДТВЕРДЖЕНО", probable:"ЙМОВІРНО", missing:"ВІДСУТНЄ / НЕ ВИДНО", priorities:"МАКСИМУМ 3 ПРІОРИТЕТИ", keep:"ЗБЕРЕГТИ" },
  ko: { confirmed:"확인됨", probable:"가능성 있음", missing:"누락 / 보이지 않음", priorities:"최대 3개 우선순위", keep:"보관" },
  hr: { confirmed:"POTVRĐENO", probable:"VJEROJATNO", missing:"NEDOSTAJE / NIJE VIDLJIVO", priorities:"NAJVIŠE 3 PRIORITETA", keep:"SAČUVATI" },
  pt: { confirmed:"CONFIRMADO", probable:"PROVÁVEL", missing:"EM FALTA / NÃO VISÍVEL", priorities:"MÁXIMO 3 PRIORIDADES", keep:"A GUARDAR" }
};

const DETECTED_LANGUAGE_LABELS = {
  fr: "Français", french: "Français", français: "Français",
  de: "Deutsch", german: "Deutsch", allemand: "Deutsch",
  en: "English", english: "English", anglais: "English",
  ro: "Română", romanian: "Română", roumain: "Română",
  uk: "Українська", ua: "Українська", ukrainian: "Українська", ukrainien: "Українська",
  ko: "한국어", korean: "한국어", coréen: "한국어",
  hr: "Hrvatski", croatian: "Hrvatski", croate: "Hrvatski",
  pt: "Português", portuguese: "Português", portugais: "Português"
};

function normalizeDetectedLanguage(value) {
  const raw = cleanMarkdown(value).trim();
  if (!raw) return "Automatique";
  const key = raw.toLowerCase();
  return DETECTED_LANGUAGE_LABELS[key] || raw;
}

function normalizeType(value) {
  const raw = cleanMarkdown(value).trim();
  if (!raw) return "À confirmer";
  const low = raw.toLowerCase();
  if (["capture", "screenshot", "image", "photo"].includes(low)) {
    return "Capture Last War";
  }
  return raw;
}

function evidenceConfidence(parsed) {
  const confirmed = asList(parsed?.confirmed).length;
  const probable = asList(parsed?.probable).length;
  const given = Number(parsed?.confidence);
  let floor = 0;
  if (confirmed >= 3) floor = 65;
  else if (confirmed === 2) floor = 50;
  else if (confirmed === 1) floor = 35;
  else if (probable > 0) floor = 25;

  if (!Number.isFinite(given)) return floor || 20;
  return Math.max(floor, Math.max(0, Math.min(100, Math.round(given))));
}

function cleanMarkdown(value) {
  return String(value || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function extractModelText(result) {
  const candidate =
    result?.answer ??
    result?.response ??
    result?.choices?.[0]?.message?.content ??
    result?.result ??
    result?.caption ??
    "";

  if (typeof candidate === "string") return candidate;

  if (candidate && typeof candidate === "object") {
    const nested =
      candidate.text ??
      candidate.content ??
      candidate.answer ??
      candidate.response ??
      candidate.output_text ??
      candidate.value;

    if (typeof nested === "string") return nested;

    try {
      return JSON.stringify(candidate);
    } catch {
      return "";
    }
  }

  return String(candidate ?? "");
}

function parseJsonFromModel(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last <= first) return null;

    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

function parseLooseModelObject(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const normal = parseJsonFromModel(raw);
  if (normal && typeof normal === "object") return normal;

  const readString = (key) => {
    const match = raw.match(new RegExp(`["']${key}["']\\s*:\\s*["']([^"']*)["']`, "i"));
    return match ? cleanMarkdown(match[1]) : "";
  };

  const readNumber = (key) => {
    const match = raw.match(new RegExp(`["']${key}["']\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, "i"));
    return match ? Number(match[1]) : NaN;
  };

  const readArray = (key, nextKeys = []) => {
    const keyMatch = raw.match(new RegExp(`["']${key}["']\\s*:\\s*\\[`, "i"));
    if (!keyMatch || keyMatch.index == null) return [];

    const start = keyMatch.index + keyMatch[0].length;
    let end = raw.length;

    for (const nextKey of nextKeys) {
      const next = raw.slice(start).match(new RegExp(`["']${nextKey}["']\\s*:`, "i"));
      if (next && next.index != null) end = Math.min(end, start + next.index);
    }

    const closing = raw.indexOf("]", start);
    if (closing !== -1) end = Math.min(end, closing);

    const segment = raw.slice(start, end);
    const values = [];
    const quoted = /["']([^"']+)["']/g;
    let match;

    while ((match = quoted.exec(segment))) {
      const value = cleanMarkdown(match[1]);
      if (value && !values.includes(value)) values.push(value);
      if (values.length >= 6) break;
    }

    return values;
  };

  const result = {
    type: readString("type") || "À confirmer",
    language: readString("language") || "Automatique",
    confidence: readNumber("confidence"),
    confirmed: readArray("confirmed", ["probable", "missing", "priorities", "keep"]),
    probable: readArray("probable", ["missing", "priorities", "keep"]),
    missing: readArray("missing", ["priorities", "keep"]),
    priorities: readArray("priorities", ["keep"]),
    keep: readArray("keep", [])
  };

  const hasUseful =
    result.type !== "À confirmer" ||
    result.language !== "Automatique" ||
    Number.isFinite(result.confidence) ||
    result.confirmed.length ||
    result.probable.length ||
    result.missing.length ||
    result.priorities.length ||
    result.keep.length;

  return hasUseful ? result : null;
}

function asList(value) {
  if (!Array.isArray(value)) return [];
  const unique = [];
  for (const item of value) {
    const cleaned = cleanMarkdown(item);
    if (!cleaned || unique.includes(cleaned)) continue;
    unique.push(cleaned);
    if (unique.length >= 6) break;
  }
  return unique;
}

function buildAnalysisText(data, locale = "fr") {
  const sections = [];
  const tx = RESULT_TEXT[locale] || RESULT_TEXT.fr;

  const confirmed = asList(data?.confirmed);
  const probable = asList(data?.probable);
  const missing = asList(data?.missing);
  const priorities = asList(data?.priorities).slice(0, 3);
  const keep = asList(data?.keep);

  if (confirmed.length) sections.push(`${tx.confirmed}\n${confirmed.map((x) => `• ${x}`).join("\n")}`);
  if (probable.length) sections.push(`${tx.probable}\n${probable.map((x) => `• ${x}`).join("\n")}`);
  if (missing.length) sections.push(`${tx.missing}\n${missing.map((x) => `• ${x}`).join("\n")}`);
  if (priorities.length) sections.push(`${tx.priorities}\n${priorities.map((x, i) => `${i + 1}. ${x}`).join("\n")}`);
  if (keep.length) sections.push(`${tx.keep}\n${keep.map((x) => `• ${x}`).join("\n")}`);

  return sections.join("\n\n") || "Analyse terminée, mais aucune information fiable n’a pu être extraite de cette capture.";
}

const APP_PATCH = String.raw`
;(() => {
  // Ajout du portugais à l'interface GoMo Central.
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
      "nav.communication":"Comunicação",
      "nav.news":"Notícias",
      "nav.tools":"Ferramentas GoMo",
      "nav.guides":"Conselhos Last War",
      "free.title":"Modo gratuito",
      "free.text":"Sem faturação automática",
      "actions.install":"Instalar no dispositivo",
      "actions.send":"Enviar",
      "actions.cancel":"Cancelar",
      "actions.publish":"Publicar",
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
      "cards.guidesTitle":"Conselhos Last War",
      "cards.guidesText":"Heróis, armas, VS, eventos e recursos.",
      "ask.eyebrow":"ASSISTENTE GOMO",
      "ask.title":"Perguntar à GoMo",
      "ask.welcome":"Explica o que não percebes. Posso simplificar, traduzir ou procurar a informação GoMo correta.",
      "ask.placeholder":"Escreve a tua pergunta…",
      "ask.examples":"Exemplos",
      "ask.example1":"Explica-me o VS de hoje",
      "ask.example2":"O que devo melhorar?",
      "ask.example3":"Traduzir uma instrução",
      "ask.demoTitle":"Base de demonstração",
      "ask.demoText":"A interface está pronta. A IA gratuita real será ligada na próxima etapa.",
      "ask.demoReply":"Recebi a tua pergunta. A ligação à IA gratuita será adicionada na próxima etapa.",
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
      "capture.validation":"Nenhum dado será guardado sem validação humana.",
      "capture.analyze":"Analisar com IA",
      "communication.eyebrow":"ENTREAJUDA",
      "communication.title":"Comunicação GoMo",
      "communication.new":"Nova mensagem",
      "communication.emptyTitle":"Inicia a conversa",
      "communication.emptyText":"Nesta base, as mensagens são guardadas no dispositivo para testes.",
      "communication.nextTitle":"Próxima etapa",
      "communication.nextText":"As contas e mensagens partilhadas entre todos os membros serão depois ligadas a uma base gratuita.",
      "communication.nameLabel":"Nome apresentado",
      "communication.namePlaceholder":"O teu nome no Last War",
      "communication.messageLabel":"Mensagem",
      "communication.placeholder":"Escreve a tua mensagem…",
      "communication.demoNotice":"Nesta primeira base, as mensagens ficam apenas neste dispositivo.",
      "communication.translate":"Traduzir",
      "communication.explain":"Explicar com a GoMo",
      "communication.local":"Guardado neste dispositivo",
      "news.eyebrow":"GOMO FOREVER",
      "news.title":"Notícias GoMo",
      "news.pinned":"Informação fixada",
      "news.demoTitle":"Bem-vindo à nova base GoMo Central",
      "news.demoText":"O site está organizado em torno de funções simples: compreender, comunicar, analisar e aceder às ferramentas.",
      "news.emptyTitle":"As próximas informações aparecerão aqui",
      "news.emptyText":"Poderão ser traduzidas automaticamente para o idioma de cada leitor.",
      "tools.eyebrow":"GOMO CENTRAL",
      "tools.title":"Todas as ferramentas GoMo",
      "tools.assistant":"Classificações, comboio, VIP e organização da aliança.",
      "tools.planner":"Preparar recursos e atingir o objetivo de 7,2 M.",
      "tools.radar":"Servidores confirmados, previsões e histórico das missões.",
      "tools.coach":"Heróis, armas, equipas, eventos e prioridades.",
      "tools.link":"Ligação a configurar",
      "tools.open":"Abrir",
      "tools.analysis":"Análise de capturas do Last War e recomendações.",
      "tools.translate":"Tradução simples para os idiomas da aliança.",
      "tools.news":"Anúncios, eventos e informações importantes.",
      "guides.title":"Conselhos e métodos",
      "guides.placeholder":"Pesquisar um herói, arma ou evento…",
      "guides.vsTitle":"Atingir 7,2 M no VS",
      "guides.vsText":"Planear os recursos sem desperdiçar os dos dias seguintes.",
      "guides.heroesTitle":"Heróis e armas",
      "guides.heroesText":"Escolher as melhorias prioritárias de acordo com a equipa utilizada.",
      "guides.shinyTitle":"Missões Shiny",
      "guides.shinyText":"Reconhecer uma missão Shiny e consultar os servidores confirmados.",
      "guides.trainTitle":"Comboio e VIP",
      "guides.trainText":"Compreender a rotação e as recompensas da semana.",
      "guides.desertTitle":"Tempestade do Deserto",
      "guides.desertText":"Preparar as equipas, horários e inscrições.",
      "guides.eventsTitle":"Eventos",
      "guides.eventsText":"Instruções simples para os eventos importantes.",
      "guides.noneTitle":"Nenhum conselho encontrado",
      "guides.noneText":"Tenta outra palavra ou pergunta diretamente à GoMo.",
      "language.title":"Escolher idioma"
    };
  }

  // Complète les 3 cartes internes sur l'accueil ET dans la page Outils.
  const toolCardText = {
    fr: {
      analysisTitle: "Analyse IA",
      analysisText: "Analyse des captures Last War et recommandations.",
      translateTitle: "Traducteur GoMo",
      translateText: "Traduire simplement les messages entre les membres.",
      newsTitle: "Actualités GoMo",
      newsText: "Informations et événements importants.",
      open: "Ouvrir"
    },
    de: {
      analysisTitle: "KI-Analyse",
      analysisText: "Last-War-Screenshots analysieren und Empfehlungen erhalten.",
      translateTitle: "GoMo-Übersetzer",
      translateText: "Nachrichten zwischen Mitgliedern einfach übersetzen.",
      newsTitle: "GoMo-Neuigkeiten",
      newsText: "Wichtige Informationen und Ereignisse.",
      open: "Öffnen"
    },
    en: {
      analysisTitle: "AI Analysis",
      analysisText: "Analyze Last War screenshots and get recommendations.",
      translateTitle: "GoMo Translator",
      translateText: "Translate messages between members easily.",
      newsTitle: "GoMo News",
      newsText: "Important information and events.",
      open: "Open"
    },
    ro: {
      analysisTitle: "Analiză IA",
      analysisText: "Analizează capturile Last War și primește recomandări.",
      translateTitle: "Traducător GoMo",
      translateText: "Tradu simplu mesajele dintre membri.",
      newsTitle: "Noutăți GoMo",
      newsText: "Informații și evenimente importante.",
      open: "Deschide"
    },
    uk: {
      analysisTitle: "Аналіз ШІ",
      analysisText: "Аналізуйте знімки Last War і отримуйте рекомендації.",
      translateTitle: "Перекладач GoMo",
      translateText: "Просто перекладайте повідомлення між учасниками.",
      newsTitle: "Новини GoMo",
      newsText: "Важлива інформація та події.",
      open: "Відкрити"
    },
    ko: {
      analysisTitle: "AI 분석",
      analysisText: "Last War 스크린샷을 분석하고 추천을 확인하세요.",
      translateTitle: "GoMo 번역기",
      translateText: "멤버 간 메시지를 간단히 번역합니다.",
      newsTitle: "GoMo 소식",
      newsText: "중요한 정보와 이벤트.",
      open: "열기"
    },
    hr: {
      analysisTitle: "AI analiza",
      analysisText: "Analiziraj Last War snimke i primi preporuke.",
      translateTitle: "GoMo prevoditelj",
      translateText: "Jednostavno prevedi poruke među članovima.",
      newsTitle: "GoMo novosti",
      newsText: "Važne informacije i događaji.",
      open: "Otvori"
    },
    pt: {
      analysisTitle: "Análise IA",
      analysisText: "Analisa capturas do Last War e recebe recomendações.",
      translateTitle: "Tradutor GoMo",
      translateText: "Traduz facilmente as mensagens entre os membros.",
      newsTitle: "Notícias GoMo",
      newsText: "Informações e eventos importantes.",
      open: "Abrir"
    }
  };

  if (typeof translations !== "undefined") {
    Object.entries(toolCardText).forEach(([code, tx]) => {
      if (!translations[code]) return;
      Object.assign(translations[code], {
        "tools.analysis": tx.analysisText,
        "tools.translate": tx.translateText,
        "tools.news": tx.newsText,
        "tools.open": tx.open
      });
    });
  }

  function syncInternalCardsLanguage() {
    const lang =
      (typeof currentLanguage !== "undefined" && currentLanguage) ||
      localStorage.getItem("gomo-central-language") ||
      "fr";
    const tx = toolCardText[lang] || toolCardText.fr;

    // ACCUEIL
    const homeCapture = document.querySelector('#home .action-card[data-go="capture"]');
    const homeTranslate = document.querySelector('#home .action-card[data-go="communication"]');
    const homeNews = document.querySelector('#home .action-card[data-go="news"]');

    const applyHome = (card, title, description) => {
      if (!card) return;
      const heading = card.querySelector("strong");
      const small = card.querySelector("small");
      if (heading) heading.textContent = title;
      if (small) small.textContent = description;
    };

    applyHome(homeCapture, tx.analysisTitle, tx.analysisText);
    applyHome(homeTranslate, tx.translateTitle, tx.translateText);
    applyHome(homeNews, tx.newsTitle, tx.newsText);

    // PAGE OUTILS
    const toolCards = [...document.querySelectorAll("#tools .tool-card")];
    const applyTool = (target, title, description) => {
      const card = toolCards.find((item) => item.getAttribute("data-go-card") === target);
      if (!card) return;
      const heading = card.querySelector("h2");
      const paragraph = card.querySelector("p");
      const button = card.querySelector(":scope > button");
      if (heading) heading.textContent = title;
      if (paragraph) paragraph.textContent = description;
      if (button) button.textContent = tx.open;
    };

    applyTool("capture", tx.analysisTitle, tx.analysisText);
    applyTool("ask", tx.translateTitle, tx.translateText);
    applyTool("news", tx.newsTitle, tx.newsText);

    toolCards.forEach((card) => {
      const button = card.querySelector(":scope > button");
      if (button) button.textContent = tx.open;
    });
  }

  if (typeof translatePage === "function") {
    const originalTranslatePage = translatePage;
    translatePage = function(...args) {
      const result = originalTranslatePage.apply(this, args);
      syncInternalCardsLanguage();
      return result;
    };
  }

  syncInternalCardsLanguage();

  const nativeFetch = window.fetch.bind(window);
  let lastAnalysis = null;

  function stripMarkdown(value) {
    return String(value || "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\x60([^\x60]+)\x60/g, "$1")
      .trim();
  }

  function setIfChanged(element, value) {
    if (!element || value == null || value === "") return;
    const next = String(value);
    if (element.textContent !== next) element.textContent = next;
  }

  function applyAnalysis(data) {
    if (!data || !data.ok) return;

    const rows = document.querySelectorAll("#analysisDemo .result-row");
    setIfChanged(rows[0]?.querySelector("strong"), data.type || "À confirmer");
    setIfChanged(rows[1]?.querySelector("strong"), data.language || "Automatique");

    const confidence = Number(data.confidence);
    setIfChanged(
      rows[2]?.querySelector("strong"),
      Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) + "%" : "—"
    );

    const box = document.getElementById("analysisText");
    if (box && data.analysis) {
      const clean = stripMarkdown(data.analysis);
      if (box.textContent !== clean) box.textContent = clean;
    }
  }

  function isAnalyzeRequest(input) {
    const url = typeof input === "string" ? input : input?.url || "";
    try {
      return new URL(url, window.location.href).pathname === "/api/analyze";
    } catch {
      return String(url).includes("/api/analyze");
    }
  }

  window.fetch = async function(input, init) {
    let nextInit = init;

    if (isAnalyzeRequest(input) && init?.body && typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body);
        body.locale = localStorage.getItem("gomo-central-language") || "fr";
        nextInit = { ...init, body: JSON.stringify(body) };
      } catch {}
    }

    const response = await nativeFetch(input, nextInit);

    if (isAnalyzeRequest(input)) {
      response.clone().json().then((data) => {
        lastAnalysis = data;
        setTimeout(() => applyAnalysis(lastAnalysis), 0);
        setTimeout(() => applyAnalysis(lastAnalysis), 80);
        setTimeout(() => applyAnalysis(lastAnalysis), 250);
      }).catch(() => {});
    }

    return response;
  };

  const demo = document.getElementById("analysisDemo");
  if (demo) {
    const observer = new MutationObserver(() => {
      if (lastAnalysis) applyAnalysis(lastAnalysis);
    });
    observer.observe(demo, { childList: true, subtree: true, characterData: true });
  }


  // ===== GoMo Central v18 : R5Fapper =====
  const R5FAPPER_TX = {
    fr:{hello:"Salut ! Je peux te guider dans GoMo.",placeholder:"Pose ta question…",send:"Envoyer",choose:"Accès rapides",fallback:"Je peux te guider vers le bon outil GoMo. Choisis un accès rapide ci-dessous.",vs:"Pour préparer 7,2 M et les ressources du VS, ouvre VS Planner.",shiny:"Pour les serveurs et missions Shiny, ouvre Shiny Radar.",train:"Pour le conducteur et les VIP, ouvre la page Train.",ranking:"Pour les résultats et podiums, ouvre Classements.",assistant:"Pour la gestion complète de l’alliance, ouvre GoMo Assistant.",translate:"Pour traduire un message, ouvre Traduction."},
    de:{hello:"Hallo! Ich kann dich in GoMo führen.",placeholder:"Stelle deine Frage…",send:"Senden",choose:"Schnellzugriff",fallback:"Ich kann dich zum richtigen GoMo-Tool führen. Wähle unten einen Schnellzugriff.",vs:"Für 7,2 Mio. und VS-Ressourcen öffne den VS Planner.",shiny:"Für Shiny-Server und Missionen öffne Shiny Radar.",train:"Für Fahrer und VIP öffne die Zug-Seite.",ranking:"Für Ergebnisse und Podien öffne Ranglisten.",assistant:"Für die komplette Allianzverwaltung öffne GoMo Assistant.",translate:"Zum Übersetzen einer Nachricht öffne Übersetzung."},
    en:{hello:"Hi! I can guide you through GoMo.",placeholder:"Ask your question…",send:"Send",choose:"Quick access",fallback:"I can guide you to the right GoMo tool. Choose a quick access below.",vs:"For 7.2M and VS resources, open VS Planner.",shiny:"For Shiny servers and missions, open Shiny Radar.",train:"For driver and VIP planning, open Train.",ranking:"For results and podiums, open Rankings.",assistant:"For full alliance management, open GoMo Assistant.",translate:"To translate a message, open Translation."},
    ro:{hello:"Salut! Te pot ghida în GoMo.",placeholder:"Scrie întrebarea…",send:"Trimite",choose:"Acces rapid",fallback:"Te pot ghida către instrumentul GoMo potrivit.",vs:"Pentru 7,2 M și resursele VS, deschide VS Planner.",shiny:"Pentru serverele și misiunile Shiny, deschide Shiny Radar.",train:"Pentru conductor și VIP, deschide pagina Tren.",ranking:"Pentru rezultate și podiumuri, deschide Clasamente.",assistant:"Pentru gestionarea alianței, deschide GoMo Assistant.",translate:"Pentru traducerea unui mesaj, deschide Traducere."},
    uk:{hello:"Привіт! Я допоможу зорієнтуватися в GoMo.",placeholder:"Постав запитання…",send:"Надіслати",choose:"Швидкий доступ",fallback:"Я можу відкрити потрібний інструмент GoMo.",vs:"Для 7,2 млн і ресурсів VS відкрий VS Planner.",shiny:"Для Shiny-серверів і місій відкрий Shiny Radar.",train:"Для водія та VIP відкрий сторінку Потяг.",ranking:"Для результатів і подіумів відкрий Рейтинги.",assistant:"Для керування альянсом відкрий GoMo Assistant.",translate:"Для перекладу повідомлення відкрий Переклад."},
    ko:{hello:"안녕하세요! GoMo에서 필요한 곳으로 안내할게요.",placeholder:"질문을 입력하세요…",send:"보내기",choose:"빠른 이동",fallback:"알맞은 GoMo 도구로 안내할 수 있어요.",vs:"7.2M과 VS 자원 계획은 VS Planner를 여세요.",shiny:"Shiny 서버와 미션은 Shiny Radar를 여세요.",train:"열차 운전수와 VIP는 열차 페이지를 여세요.",ranking:"결과와 포디움은 순위를 여세요.",assistant:"동맹 전체 관리는 GoMo Assistant를 여세요.",translate:"메시지 번역은 번역을 여세요."},
    hr:{hello:"Bok! Mogu te voditi kroz GoMo.",placeholder:"Postavi pitanje…",send:"Pošalji",choose:"Brzi pristup",fallback:"Mogu te odvesti do pravog GoMo alata.",vs:"Za 7,2 M i VS resurse otvori VS Planner.",shiny:"Za Shiny servere i misije otvori Shiny Radar.",train:"Za vozača i VIP otvori stranicu Vlak.",ranking:"Za rezultate i podije otvori Poredak.",assistant:"Za upravljanje savezom otvori GoMo Assistant.",translate:"Za prijevod poruke otvori Prijevod."},
    pt:{hello:"Olá! Posso guiar-te no GoMo.",placeholder:"Faz a tua pergunta…",send:"Enviar",choose:"Acesso rápido",fallback:"Posso levar-te à ferramenta GoMo certa.",vs:"Para preparar 7,2 M e os recursos do VS, abre VS Planner.",shiny:"Para servidores e missões Shiny, abre Shiny Radar.",train:"Para condutor e VIP, abre a página Comboio.",ranking:"Para resultados e pódios, abre Classificações.",assistant:"Para gerir a aliança, abre GoMo Assistant.",translate:"Para traduzir uma mensagem, abre Tradução."}
  };
  const R5FAPPER_LABELS = {
    "vs-planner":["vs planner","7,2","7.2","duel","vs"],
    "shiny-radar":["shiny radar","shiny"],
    train:["train","vip","conducteur","fahrer","zug","tren","vlak","comboio","потяг","열차"],
    classements:["classement","ranking","rangliste","clasament","poredak","classificação","рейтинг","순위"],
    "gomo-assistant":["gomo assistant","assistant"],
    traduction:["traduction","traducteur","translate","translation","übersetzung","prevod","traduc","переклад","번역"]
  };
  function r5Lang(){ return (typeof currentLanguage !== "undefined" && currentLanguage) || localStorage.getItem("gomo-central-language") || "fr"; }
  function r5Tx(){ return R5FAPPER_TX[r5Lang()] || R5FAPPER_TX.fr; }
  function r5Img(state){ return "/r5fapper/images/r5fapper-" + state + ".webp"; }
  function r5SetState(state){ const img=document.getElementById("gomo-r5fapper-face"); if(img) img.src=r5Img(state); const b=document.querySelector("#gomo-r5fapper-launcher img"); if(b) b.src=r5Img(state); }
  function r5Say(text,state){ const box=document.getElementById("gomo-r5fapper-message"); if(box) box.textContent=text; r5SetState(state||"explication"); }
  function r5FindTargetFromText(text){
    const low=String(text||"").toLowerCase();
    if(/7[,.]2|\bvs\b|duel|ressource|resource/.test(low)) return "vs-planner";
    if(/shiny|serveur|server/.test(low)) return "shiny-radar";
    if(/train|vip|conducteur|fahrer|zug|tren|vlak|comboio|потяг|열차/.test(low)) return "train";
    if(/classement|ranking|rangliste|clasament|poredak|classifica|рейтинг|순위|podium/.test(low)) return "classements";
    if(/trad|translate|übersetz|prevod|переклад|번역/.test(low)) return "traduction";
    if(/assistant/.test(low)) return "gomo-assistant";
    return null;
  }
  function r5ReplyFor(target){ const tx=r5Tx(); if(target==="vs-planner")return tx.vs; if(target==="shiny-radar")return tx.shiny; if(target==="train")return tx.train; if(target==="classements")return tx.ranking; if(target==="gomo-assistant")return tx.assistant; if(target==="traduction")return tx.translate; return tx.fallback; }
  function r5ClickMatching(target){
    const direct=document.querySelector('[data-go="'+target+'"],[data-page="'+target+'"]'); if(direct){ direct.click(); return true; }
    const words=R5FAPPER_LABELS[target]||[];
    const clickables=[...document.querySelectorAll('a,button,[role="button"],[data-go],[data-page]')];
    const found=clickables.find(el=>{ const txt=(el.textContent||"").trim().toLowerCase(); return words.some(w=>txt.includes(w)); });
    if(found){ found.click(); return true; }
    const external=window.GOMO_R5FAPPER_CONFIG && window.GOMO_R5FAPPER_CONFIG.links && window.GOMO_R5FAPPER_CONFIG.links[target];
    if(external){ location.href=external; return true; }
    return false;
  }
  function r5Go(target){
    r5Say(r5ReplyFor(target),"explication");
    if(r5ClickMatching(target)) return;
    const tools=document.querySelector('[data-go="tools"],[data-page="tools"]');
    if(tools){ tools.click(); setTimeout(()=>r5ClickMatching(target),180); }
  }
  function r5Build(){
    if(document.getElementById("gomo-r5fapper-launcher")) return;
    const style=document.createElement("style"); style.id="gomo-r5fapper-style"; style.textContent=
      '#gomo-r5fapper-launcher{position:fixed;right:14px;bottom:92px;width:64px;height:64px;border-radius:50%;border:2px solid rgba(86,224,255,.85);background:#071b2b;padding:0;overflow:hidden;z-index:2147483000;box-shadow:0 10px 28px rgba(0,0,0,.45)}'+
      '#gomo-r5fapper-launcher img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}'+
      '#gomo-r5fapper-panel{position:fixed;right:12px;bottom:90px;width:min(390px,calc(100vw - 24px));max-height:min(650px,calc(100vh - 120px));overflow:auto;z-index:2147483001;background:linear-gradient(180deg,#0a263a,#061724);border:1px solid rgba(84,216,255,.45);border-radius:24px;box-shadow:0 18px 55px rgba(0,0,0,.6);color:#eef9ff;font-family:system-ui,-apple-system,sans-serif;display:none}'+
      '#gomo-r5fapper-panel.open{display:block}.gomo-r5fapper-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1)}'+
      '.gomo-r5fapper-head img{width:68px;height:84px;object-fit:contain}.gomo-r5fapper-head strong{font-size:19px}.gomo-r5fapper-close{margin-left:auto;border:0;background:rgba(255,255,255,.1);color:#fff;border-radius:12px;width:38px;height:38px;font-size:20px}'+
      '.gomo-r5fapper-body{padding:14px}.gomo-r5fapper-message{background:rgba(255,255,255,.075);border-radius:16px;padding:12px;line-height:1.35;margin-bottom:12px}.gomo-r5fapper-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 14px}.gomo-r5fapper-quick button{border:1px solid rgba(84,216,255,.3);background:#0d3248;color:#eefaff;border-radius:13px;padding:10px 8px;font-weight:700}.gomo-r5fapper-form{display:flex;gap:8px}.gomo-r5fapper-form input{min-width:0;flex:1;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:#06131e;color:#fff;padding:12px;font-size:16px}.gomo-r5fapper-form button{border:0;border-radius:13px;background:#4fdcf5;color:#06202d;padding:0 14px;font-weight:800}@media(max-width:480px){#gomo-r5fapper-panel{left:8px;right:8px;width:auto;bottom:82px}}';
    document.head.appendChild(style);
    const launch=document.createElement("button"); launch.id="gomo-r5fapper-launcher"; launch.setAttribute("aria-label","R5Fapper"); launch.innerHTML='<img src="'+r5Img("normal")+'" alt="R5Fapper">';
    const panel=document.createElement("section"); panel.id="gomo-r5fapper-panel"; panel.innerHTML='<div class="gomo-r5fapper-head"><img id="gomo-r5fapper-face" src="'+r5Img("bonjour")+'" alt="R5Fapper"><strong>R5Fapper</strong><button class="gomo-r5fapper-close" type="button">×</button></div><div class="gomo-r5fapper-body"><div id="gomo-r5fapper-message" class="gomo-r5fapper-message"></div><div class="gomo-r5fapper-quick"><button data-r5-go="vs-planner">VS Planner</button><button data-r5-go="shiny-radar">Shiny Radar</button><button data-r5-go="train">Train / VIP</button><button data-r5-go="classements">Classements</button><button data-r5-go="gomo-assistant">GoMo Assistant</button><button data-r5-go="traduction">Traduction</button></div><form class="gomo-r5fapper-form"><input id="gomo-r5fapper-input" autocomplete="off"><button type="submit"></button></form></div>';
    document.body.appendChild(launch); document.body.appendChild(panel);
    function syncWords(){ const tx=r5Tx(); const msg=document.getElementById("gomo-r5fapper-message"); const input=document.getElementById("gomo-r5fapper-input"); const send=panel.querySelector('.gomo-r5fapper-form button'); if(msg && !msg.dataset.used)msg.textContent=tx.hello; if(input)input.placeholder=tx.placeholder; if(send)send.textContent=tx.send; }
    syncWords();
    launch.addEventListener("click",()=>{ panel.classList.toggle("open"); if(panel.classList.contains("open")){ r5SetState("bonjour"); syncWords(); } });
    panel.querySelector(".gomo-r5fapper-close").addEventListener("click",()=>{ panel.classList.remove("open"); r5SetState("normal"); });
    panel.querySelectorAll("[data-r5-go]").forEach(btn=>btn.addEventListener("click",()=>r5Go(btn.getAttribute("data-r5-go"))));
    panel.querySelector("form").addEventListener("submit",event=>{ event.preventDefault(); const input=document.getElementById("gomo-r5fapper-input"); const value=input.value.trim(); if(!value)return; const target=r5FindTargetFromText(value); const msg=document.getElementById("gomo-r5fapper-message"); if(msg)msg.dataset.used="1"; if(target){ r5Go(target); } else { r5Say(r5Tx().fallback,"reflexion"); } input.value=""; });
    if(typeof translatePage==="function"){ const oldTranslateR5=translatePage; translatePage=function(...args){ const result=oldTranslateR5.apply(this,args); setTimeout(syncWords,0); return result; }; }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",r5Build,{once:true}); else r5Build();
  // ===== fin R5Fapper v18 =====

})();
`;

async function servePatchedApp(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;

  const source = await asset.text();
  const headers = new Headers(asset.headers);
  headers.set("content-type", "application/javascript; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0");
  headers.delete("content-length");
  headers.delete("etag");

  return new Response(`${source}\n${APP_PATCH}`, {
    status: asset.status,
    headers
  });
}


function dataUriToBlob(dataUri) {
  const match = String(dataUri || "").match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Format d’image invalide");

  const mime = match[1] || "image/png";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

function fileExtensionForMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/bmp") return "bmp";
  return "png";
}

function descriptionLanguageFor(locale) {
  return ["fr", "de", "en", "pt"].includes(locale) ? locale : "en";
}

function addUnique(list, value, max = 6) {
  const clean = cleanMarkdown(value);
  if (!clean || list.includes(clean) || list.length >= max) return;
  list.push(clean);
}

function enrichFromVisualDescription(parsed, visualText, locale) {
  const result = parsed && typeof parsed === "object" ? parsed : {};
  result.confirmed = asList(result.confirmed);
  result.probable = asList(result.probable);
  result.missing = asList(result.missing);
  result.priorities = asList(result.priorities).slice(0, 3);
  result.keep = asList(result.keep);

  const text = String(visualText || "");

  // Reconnaissance prudente des écrans de formation Last War.
  const formationWords = /(équipe|equipe|team|formation|préréglage|prereglage|preset)/i;
  if (formationWords.test(text)) {
    const currentType = String(result.type || "").toLowerCase();
    if (!result.type || ["capture", "image", "photo", "autre", "à confirmer"].includes(currentType)) {
      result.type = locale === "fr" ? "Formation d’équipe" : "Team formation";
    }
  }

  // Quelques éléments très sûrs lorsqu'ils sont textuellement extraits.
  const power = text.match(/\b(\d{1,3}(?:[.,]\d{1,2})?\s*M)\b/i);
  if (power) {
    addUnique(
      result.confirmed,
      locale === "fr" ? `Puissance affichée : ${power[1].replace(",", ".")}` : `Displayed power: ${power[1]}`
    );
  }

  const levelMatches = [...text.matchAll(/\b(?:Niv\.?|Lv\.?|Level)\s*165\b/gi)];
  if (levelMatches.length >= 3) {
    addUnique(
      result.confirmed,
      locale === "fr"
        ? "Plusieurs héros/unités principaux sont affichés au niveau 165."
        : "Several main heroes/units are shown at level 165."
    );
  }

  if (/\bÉquipe\s*1\b/i.test(text) || /\bTeam\s*1\b/i.test(text)) {
    addUnique(
      result.confirmed,
      locale === "fr" ? "L’équipe 1 est sélectionnée." : "Team 1 is selected."
    );
  }

  return result;
}


const SCREEN_TYPES = {
  fr: {
    formation: "Formation d’équipe", ranking: "Classement", inventory: "Inventaire / ressources",
    heroes: "Héros", vs: "VS", shiny: "Shiny", event: "Événement",
    train: "Train / VIP", alliance: "Alliance", combat: "Combat", other: "À confirmer"
  },
  de: {
    formation: "Team-Formation", ranking: "Rangliste", inventory: "Inventar / Ressourcen",
    heroes: "Helden", vs: "VS", shiny: "Shiny", event: "Ereignis",
    train: "Zug / VIP", alliance: "Allianz", combat: "Kampf", other: "Zu bestätigen"
  },
  en: {
    formation: "Team formation", ranking: "Ranking", inventory: "Inventory / resources",
    heroes: "Heroes", vs: "VS", shiny: "Shiny", event: "Event",
    train: "Train / VIP", alliance: "Alliance", combat: "Combat", other: "To confirm"
  },
  ro: {
    formation: "Formație de echipă", ranking: "Clasament", inventory: "Inventar / resurse",
    heroes: "Eroi", vs: "VS", shiny: "Shiny", event: "Eveniment",
    train: "Tren / VIP", alliance: "Alianță", combat: "Luptă", other: "De confirmat"
  },
  uk: {
    formation: "Формація команди", ranking: "Рейтинг", inventory: "Інвентар / ресурси",
    heroes: "Герої", vs: "VS", shiny: "Shiny", event: "Подія",
    train: "Потяг / VIP", alliance: "Альянс", combat: "Бій", other: "Потрібне підтвердження"
  },
  ko: {
    formation: "팀 편성", ranking: "순위", inventory: "인벤토리 / 자원",
    heroes: "영웅", vs: "VS", shiny: "Shiny", event: "이벤트",
    train: "열차 / VIP", alliance: "동맹", combat: "전투", other: "확인 필요"
  },
  hr: {
    formation: "Postava tima", ranking: "Poredak", inventory: "Inventar / resursi",
    heroes: "Heroji", vs: "VS", shiny: "Shiny", event: "Događaj",
    train: "Vlak / VIP", alliance: "Savez", combat: "Borba", other: "Treba potvrditi"
  },
  pt: {
    formation: "Formação da equipa", ranking: "Classificação", inventory: "Inventário / recursos",
    heroes: "Heróis", vs: "VS", shiny: "Shiny", event: "Evento",
    train: "Comboio / VIP", alliance: "Aliança", combat: "Combate", other: "A confirmar"
  }
};

function detectExplicitScreenType(value, locale = "fr") {
  const text = normalizeForMatch(value);
  const tx = SCREEN_TYPES[locale] || SCREEN_TYPES.fr;
  const overlordLabels = {
    fr: "Suzerain / Gorille Overlord",
    de: "Overlord-Gorilla",
    en: "Overlord Gorilla",
    ro: "Gorila Overlord",
    uk: "Горила Overlord",
    ko: "오버로드 고릴라",
    hr: "Overlord Gorilla",
    pt: "Gorila Overlord"
  };

  // Un écran de détail d'objet/ressource doit gagner sur un contexte d'événement éventuel.
  // Exemple réel : "Médaille de Compétence – Pour améliorer les compétences du héros".
  if (/(nom de l['’]objet|item name|name des gegenstands|gegenstand|numele obiectului|naziv predmeta|nome do item|назва предмета|아이템 이름|medaille de competence|médaille de compétence|skill medal|hero skill medal|pour ameliorer les competences du heros|pour améliorer les compétences du héros)/i.test(text)) {
    return tx.inventory;
  }

  // Suzerain/Overlord : un nom explicite gagne sur les mots génériques d'inventaire.
  // Exception : le bloc ci-dessus conserve la priorité pour un détail d'objet clairement identifié
  // (ex. Médaille de Compétence), afin d'éviter le faux positif observé sur les ressources.
  if (/(suzerain|overlord|gorille|gorilla)/i.test(text)) {
    return overlordLabels[locale] || overlordLabels.fr;
  }

  const secondaryOverlordSignals = [
    /rookie partner/i,
    /partenaire novice/i,
    /bond rating/i,
    /tactical institute/i
  ].filter((rx) => rx.test(text)).length;

  if (secondaryOverlordSignals >= 2) {
    return overlordLabels[locale] || overlordLabels.fr;
  }

  // Inventaire/ressources générique seulement après les détections explicites ci-dessus.
  // Cela empêche un mot comme "ressource" dans la description d'un boss de voler la classification.
  if (/(inventaire|inventory|inventar|ressource|resource|resurs|recurso|sac|bag|coffre|інвентар|인벤토리)/i.test(text)) {
    return tx.inventory;
  }

  return null;
}

function detectScreenTypeFromText(value, locale = "fr") {
  const text = String(value || "").toLowerCase();
  const tx = SCREEN_TYPES[locale] || SCREEN_TYPES.fr;

  if (/(préréglage|prereglage|formation|équipe|equipe|team|preset|postava|forma[cç][aã]o)/i.test(text)) return tx.formation;
  if (/(classement|ranking|rangliste|poredak|classifica[cç][aã]o|рейтинг|순위)/i.test(text)) return tx.ranking;
  if (/(inventaire|inventory|inventar|ressource|resource|resurs|recurso|інвентар|인벤토리)/i.test(text)) return tx.inventory;
  if (/(héros|heros|heroes|helden|eroi|heroji|heróis|герої|영웅)/i.test(text)) return tx.heroes;
  if (/\bvs\b/i.test(text)) return tx.vs;
  if (/shiny/i.test(text)) return tx.shiny;
  if (/(événement|evenement|event|ereignis|eveniment|događaj|evento|подія|이벤트)/i.test(text)) return tx.event;
  if (/(train|vip|zug|tren|vlak|comboio|потяг|열차)/i.test(text)) return tx.train;
  if (/(alliance|allianz|alianță|alianta|savez|alian[cç]a|альянс|동맹)/i.test(text)) return tx.alliance;
  if (/(combat|kampf|luptă|lupta|borba|combate|бій|전투)/i.test(text)) return tx.combat;
  return tx.other;
}

function estimateVisualConfidence(value, detectedType) {
  const text = String(value || "");
  let score = 25;

  if (detectedType && !/(confirmer|confirm|bestätigen|potvrditi|confirmat|확인|підтвердж)/i.test(detectedType)) score += 20;
  if (/\b(?:Niv\.?|Lv\.?|Level)\s*\d+\b/i.test(text)) score += 15;
  if (/\b\d{1,3}(?:[.,]\d{1,2})?\s*M\b/i.test(text)) score += 15;
  if (/(préréglage|prereglage|formation|équipe|equipe|team|preset)/i.test(text)) score += 10;
  if (text.length > 350) score += 10;

  const strongSignals = [
    /\b(?:Niv\.?|Lv\.?|Level)\s*\d+\b/i.test(text),
    /\b\d{1,3}(?:[.,]\d{1,2})?\s*M\b/i.test(text),
    /(préréglage|prereglage|formation|équipe|equipe|team|preset)/i.test(text)
  ].filter(Boolean).length;

  const ceiling = strongSignals >= 3 ? 90 : strongSignals === 2 ? 80 : 70;
  return Math.max(20, Math.min(ceiling, score));
}

function languageLabelForLocale(locale) {
  return {
    fr: "Français", de: "Deutsch", en: "English", ro: "Română",
    uk: "Українська", ko: "한국어", hr: "Hrvatski", pt: "Português"
  }[locale] || "Automatique";
}


let knowledgeCache = null;

async function loadGameKnowledge(request, env) {
  if (knowledgeCache) return knowledgeCache;
  try {
    const knowledgeUrl = new URL("/data/last-war-knowledge.json", request.url);
    const response = await env.ASSETS.fetch(new Request(knowledgeUrl.toString()));
    if (response.ok) {
      const parsed = await response.json();
      if (parsed && Array.isArray(parsed.screen_categories)) {
        knowledgeCache = parsed;
        return knowledgeCache;
      }
    }
  } catch {}
  return null;
}

function normalizeForMatch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectCategoryFromKnowledge(text, knowledge, locale = "fr") {
  if (!knowledge?.screen_categories?.length) return null;
  const haystack = normalizeForMatch(text);
  let best = null;

  const priorityRank = { critical: 3, high: 2, medium: 1, low: 0 };
  const genericAliases = new Set(["equipe", "team", "formation", "resource", "ressource"]);

  for (const category of knowledge.screen_categories) {
    let score = 0;
    let aliasHits = 0;
    let longestAlias = 0;

    for (const alias of category.aliases || []) {
      const token = normalizeForMatch(alias);
      if (!token || !haystack.includes(token)) continue;

      aliasHits += 1;
      longestAlias = Math.max(longestAlias, token.length);

      if (genericAliases.has(token)) score += 1;
      else if (token.length >= 14) score += 8;
      else if (token.length >= 8) score += 5;
      else score += 3;
    }

    for (const hint of category.look_for || []) {
      const token = normalizeForMatch(hint);
      if (token && haystack.includes(token)) score += 1;
    }

    // La priorité du catalogue ne compte que si au moins un alias du type est réellement vu.
    if (aliasHits > 0) {
      score += priorityRank[category.priority] || 0;
      if (aliasHits > 1) score += Math.min(aliasHits - 1, 3) * 2;
    }

    const candidate = {
      category,
      score,
      aliasHits,
      longestAlias,
      priority: priorityRank[category.priority] || 0
    };

    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.aliasHits > best.aliasHits) ||
      (candidate.score === best.score && candidate.aliasHits === best.aliasHits && candidate.priority > best.priority) ||
      (candidate.score === best.score && candidate.aliasHits === best.aliasHits && candidate.priority === best.priority && candidate.longestAlias > best.longestAlias)
    ) {
      best = candidate;
    }
  }

  if (!best || best.aliasHits === 0 || best.score < 3) return null;
  return {
    id: best.category.id,
    label: best.category.labels?.[locale] || best.category.labels?.fr || best.category.id,
    score: best.score,
    look_for: best.category.look_for || []
  };
}

function buildKnowledgeHint(knowledge, detected) {
  if (!knowledge) return "";
  const category = detected
    ? knowledge.screen_categories?.find((item) => item.id === detected.id)
    : null;

  const rareResources = (knowledge.resources || [])
    .filter((item) => ["rare", "very_rare"].includes(item.rarity))
    .map((item) => item.labels?.[0])
    .filter(Boolean)
    .slice(0, 24);

  const relevantResources = (knowledge.resources || [])
    .filter((item) => {
      if (!category) return false;
      const groupText = `${category.id} ${(category.aliases || []).join(" ")}`;
      return groupText.includes(item.group) || item.group === category.id;
    })
    .map((item) => item.labels?.[0])
    .filter(Boolean)
    .slice(0, 18);

  const parts = [];
  if (category) {
    parts.push(`Type probable selon le catalogue GoMo : ${category.labels?.fr || category.id}.`);
    parts.push(`À vérifier sur l'écran : ${(category.look_for || []).join(", ")}.`);
  }
  if (relevantResources.length) {
    parts.push(`Ressources pertinentes possibles : ${relevantResources.join(", ")}.`);
  }
  if (rareResources.length) {
    parts.push(`Ressources rares à ne jamais conseiller de dépenser sans preuve : ${rareResources.join(", ")}.`);
  }
  return parts.join("\n");
}
function buildCompactFallbackAnalysis(text, detectedType, locale = "fr") {
  const source = String(text || "");
  const lines = [];
  const labels = {
    fr: { confirmed: "CONFIRMÉ", type: "Type d’écran", item: "Objet", power: "Puissance", team: "Équipe sélectionnée", level: "Niveau visible" },
    de: { confirmed: "BESTÄTIGT", type: "Bildschirmtyp", item: "Gegenstand", power: "Stärke", team: "Ausgewähltes Team", level: "Sichtbares Level" },
    en: { confirmed: "CONFIRMED", type: "Screen type", item: "Item", power: "Power", team: "Selected team", level: "Visible level" },
    ro: { confirmed: "CONFIRMAT", type: "Tip ecran", item: "Obiect", power: "Putere", team: "Echipă selectată", level: "Nivel vizibil" },
    uk: { confirmed: "ПІДТВЕРДЖЕНО", type: "Тип екрана", item: "Предмет", power: "Потужність", team: "Вибрана команда", level: "Видимий рівень" },
    ko: { confirmed: "확인됨", type: "화면 유형", item: "아이템", power: "전투력", team: "선택된 팀", level: "표시 레벨" },
    hr: { confirmed: "POTVRĐENO", type: "Vrsta zaslona", item: "Predmet", power: "Snaga", team: "Odabrani tim", level: "Vidljiva razina" },
    pt: { confirmed: "CONFIRMADO", type: "Tipo de ecrã", item: "Item", power: "Poder", team: "Equipa selecionada", level: "Nível visível" }
  };
  const tx = labels[locale] || labels.en;

  if (detectedType) lines.push(`• ${tx.type} : ${detectedType}`);

  const item = source.match(/(?:Nom de l['’]objet|Item name|Name des Gegenstands|Numele obiectului|Naziv predmeta|Nome do item|Назва предмета|아이템 이름)\s*[:：]\s*([^\n]{2,80})/i);
  if (item) lines.push(`• ${tx.item} : ${cleanMarkdown(item[1]).trim()}`);

  const power = source.match(/\b(\d{1,3}(?:[.,]\d{1,2})?\s*M)\b/i);
  if (power) lines.push(`• ${tx.power} : ${power[1].replace(",", ".")}`);

  const team = source.match(/\b(?:Équipe|Equipe|Team)\s*(\d+)\b/i);
  if (team) lines.push(`• ${tx.team} : ${team[1]}`);

  const level = source.match(/\b(?:Niv\.?|Lv\.?|Level)\s*(\d+)\b/i);
  if (level) lines.push(`• ${tx.level} : ${level[1]}`);

  return `${tx.confirmed}\n${lines.slice(0, 6).join("\n")}`.trim();
}

async function analyzeImage(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Méthode non autorisée" }, 405);
  }

  try {
    const body = await request.json();
    const image = body?.image;
    const requestedLocale = typeof body?.locale === "string" ? body.locale : "fr";
    const locale = SUPPORTED_LOCALES.has(requestedLocale) ? requestedLocale : "fr";

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return json({ ok: false, error: "Image manquante ou invalide" }, 400);
    }

    if (image.length > 12_000_000) {
      return json({ ok: false, error: "Capture trop volumineuse. Choisis une image plus légère." }, 413);
    }

    const outputLanguage = LOCALE_NAMES[locale] || "français";
    const knowledge = await loadGameKnowledge(request, env);
    const blob = dataUriToBlob(image);
    const extension = fileExtensionForMime(blob.type);

    let visualText = "";

    // Lecture visuelle générale (OCR + description)
    try {
      const converted = await env.AI.toMarkdown(
        {
          name: `last-war-capture.${extension}`,
          blob
        },
        {
          conversionOptions: {
            output: { format: "text" },
            image: { descriptionLanguage: descriptionLanguageFor(locale) }
          }
        }
      );

      const conversion = Array.isArray(converted) ? converted[0] : converted;
      if (conversion?.format !== "error") {
        visualText = String(conversion?.data || "").trim();
      }
    } catch {}

    // Lecture ciblée : textes, niveaux, puissance, équipe, éléments UI.
    let targetedText = "";
    try {
      const targeted = await env.AI.run(
        "@cf/moondream/moondream3.1-9B-A2B",
        {
          task: "query",
          image,
          question:
            "Lis précisément cette capture Last War. Donne uniquement les éléments réellement visibles : type d'écran, textes de l'interface, numéro d'équipe sélectionnée, niveaux, puissance, nombre de héros/unités principaux visibles et tout nombre clairement lisible. N'invente rien. N'essaie pas de donner de stratégie.",
          reasoning: true,
          stream: false,
          max_tokens: 700,
          temperature: 0.1
        }
      );
      targetedText = cleanMarkdown(extractModelText(targeted));
    } catch {}

    const combined = [visualText, targetedText].filter(Boolean).join("\n\n");
    const catalogDetection = detectCategoryFromKnowledge(combined, knowledge, locale);
    const knowledgeHint = buildKnowledgeHint(knowledge, catalogDetection);
    if (!combined) {
      return json({
        ok: true,
        type: (SCREEN_TYPES[locale] || SCREEN_TYPES.fr).other,
        language: languageLabelForLocale(locale),
        confidence: 15,
        analysis: locale === "fr"
          ? "La capture a été reçue, mais aucun détail visuel fiable n’a pu être extrait."
          : "No reliable visual detail could be extracted from the screenshot."
      });
    }

    const explicitDetection = detectExplicitScreenType(combined, locale);
    const detectedType = explicitDetection || catalogDetection?.label || detectScreenTypeFromText(combined, locale);
    const confidence = estimateVisualConfidence(combined, detectedType);

    // Le deuxième modèle ne renvoie plus du JSON : il produit directement le texte final affiché.
    const synthesis = await env.AI.run(
      "@cf/google/gemma-4-26b-a4b-it",
      {
        messages: [
          {
            role: "system",
            content:
              "Tu es GoMo Coach spécialisé dans Last War: Survival. Tu travailles uniquement à partir d'une lecture visuelle déjà extraite. Tu ne dois jamais inventer un nom de héros, une statistique, une ressource, un niveau ou un conseil."
          },
          {
            role: "user",
            content:
              `Réponds en ${outputLanguage}. Voici la lecture visuelle d'une capture Last War :\n\n${combined}\n\n` +
              (knowledgeHint ? `Catalogue GoMo utile pour cet écran :\n${knowledgeHint}\n\n` : "") +
              `Présente un résultat ULTRA COURT et très lisible sur téléphone, sans JSON et sans paragraphe descriptif. ` +
              `Utilise uniquement les rubriques réellement utiles parmi : CONFIRMÉ, PROBABLE, MANQUANT / NON VISIBLE, PRIORITÉS, À GARDER. ` +
              `Maximum 8 lignes utiles au total, titres compris. Chaque information doit tenir sur une ligne courte. ` +
              `Commence par les informations de jeu importantes : type d'écran, objet/ressource, nom lisible, rang/points, puissance, niveau, équipe ou quantité. ` +
              `INTERDIT : écrire “Description de l'image”, décrire le décor, l'arrière-plan, le style visuel, les couleurs, la disposition de l'écran ou les boutons de navigation sauf s'ils sont indispensables au résultat. ` +
              `INTERDIT : décrire le sexe, les cheveux, le visage, les vêtements, la couleur de peau, l'apparence physique des personnages ou inventer leur identité. ` +
              `Ne répète jamais la même information. N'utilise que des faits vérifiables à partir de textes, nombres, icônes ou états d'interface clairement visibles. ` +
              `N'ajoute PRIORITÉS ou À GARDER que si la capture permet vraiment de donner un conseil sûr. ` +
              `Pour une formation, limite-toi à l'équipe sélectionnée, la puissance, les niveaux visibles et les éléments de jeu clairement lisibles. ` +
              `Si une information n'est pas certaine, omets-la.`
          }
        ],
        max_completion_tokens: 360,
        temperature: 0.1
      }
    );

    let analysis = cleanMarkdown(extractModelText(synthesis));
    const verboseVisualDescription = /(description de l['’]image|description of the image|bildbeschreibung|descrierea imaginii|opis slike|descrição da imagem|опис зображення|이미지 설명|environnement et style visuel|style visuel|visual style|barre de contrôle inférieure|décor\s*:|arrière-plan suggère|background suggests|navigation button|bouton de navigation)/i.test(analysis || "");
    const analysisLines = String(analysis || "").split(/\n+/).filter((line) => line.trim());
    const tooLongForPhone = String(analysis || "").length > 900 || analysisLines.length > 12;
    if (!analysis || verboseVisualDescription || tooLongForPhone) {
      analysis = buildCompactFallbackAnalysis(combined, detectedType, locale);
    }

    // Retire les phrases de description physique qui ne sont pas utiles à l'analyse du jeu.
    const forbiddenAppearance = [
      /\bfemme\b/i, /\bhomme\b/i, /\bcheveux\b/i, /\bvisage\b/i, /\bvêtement/i,
      /\bwoman\b/i, /\bman\b/i, /\bhair\b/i, /\bface\b/i, /\bclothing\b/i,
      /\bfrau\b/i, /\bmann\b/i, /\bhaare\b/i, /\bgesicht\b/i,
      /\bmulher\b/i, /\bhomem\b/i, /\bcabelo/i, /\brosto\b/i,
      /\bfemeie\b/i, /\bbărbat\b/i, /\bpar\b/i,
      /\bžena\b/i, /\bmuškarac\b/i, /\bkosa\b/i,
      /여성/i, /남성/i, /머리카락/i,
      /жінк/i, /чоловік/i, /волос/i
    ];

    analysis = analysis
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line && !forbiddenAppearance.some((rx) => rx.test(line)))
      .join("\n")
      .trim();

    // Petite correction certaine si les éléments sont bien présents dans la lecture.
    const supplements = [];
    const power = combined.match(/\b(\d{1,3}(?:[.,]\d{1,2})?\s*M)\b/i);
    if (power && !analysis.includes(power[1])) {
      supplements.push(
        locale === "fr"
          ? `Puissance affichée : ${power[1].replace(",", ".")}`
          : `Displayed power: ${power[1]}`
      );
    }

    if ((/Équipe\s*1/i.test(combined) || /Team\s*1/i.test(combined)) &&
        !/(Équipe\s*1|Team\s*1)/i.test(analysis)) {
      supplements.push(locale === "fr" ? "Équipe 1 sélectionnée." : "Team 1 selected.");
    }

    if (supplements.length) {
      analysis = `${analysis}\n\n${supplements.join("\n")}`;
    }

    return json({
      ok: true,
      type: detectedType,
      language: languageLabelForLocale(locale),
      confidence,
      analysis
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || "Erreur pendant l’analyse IA"
      },
      500
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze") {
      return analyzeImage(request, env);
    }

    if (url.pathname === "/assets/app-v1.5.js") {
      return servePatchedApp(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
