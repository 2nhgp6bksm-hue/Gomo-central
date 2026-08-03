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
    const blob = dataUriToBlob(image);
    const extension = fileExtensionForMime(blob.type);

    // Étape 1 : pipeline vision Cloudflare prévu pour les captures/images.
    // Cloudflare applique détection d'objets + modèle vision/OCR avant de produire du texte.
    let visualText = "";

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
    } catch {
      visualText = "";
    }

    // Secours : si le pipeline de conversion ne renvoie rien, on conserve Moondream.
    if (!visualText) {
      const fallback = await env.AI.run(
        "@cf/moondream/moondream3.1-9B-A2B",
        {
          task: "query",
          image,
          question:
            "Décris précisément cette capture Last War. Lis les textes, niveaux, puissance, équipe sélectionnée, héros/unités et éléments d’interface réellement visibles. N’invente rien.",
          reasoning: true,
          stream: false,
          max_tokens: 650,
          temperature: 0.1
        }
      );
      visualText = extractModelText(fallback);
    }

    if (!visualText) {
      return json({
        ok: true,
        type: "À confirmer",
        language: "Automatique",
        confidence: 15,
        analysis: "La capture a été reçue, mais aucun détail visuel fiable n’a pu être extrait."
      });
    }

    // Étape 2 : Gemma 4 transforme la lecture visuelle en résultat GoMo structuré.
    const result = await env.AI.run(
      "@cf/google/gemma-4-26b-a4b-it",
      {
        messages: [
          {
            role: "system",
            content:
              "Tu es GoMo Coach spécialisé dans Last War: Survival. Tu dois rester strictement fidèle aux informations visibles/extraites. N’invente jamais un nom de héros, une statistique, un niveau ou une ressource."
          },
          {
            role: "user",
            content:
              `Voici la lecture visuelle d'une capture Last War :\n\n${visualText}\n\n` +
              `Réponds en ${outputLanguage}. Identifie précisément le type d'écran parmi : formation d'équipe, classement, inventaire/ressources, héros, VS, Shiny, événement, train/VIP, alliance, combat, autre. ` +
              `Retourne UNIQUEMENT un objet JSON valide avec exactement ces clés : ` +
              `{"type":"type d'écran précis ou À confirmer","language":"langue visible sur la capture ou Automatique","confidence":0,"confirmed":["faits certains et uniques"],"probable":["éléments plausibles mais non certains"],"missing":["informations utiles non visibles"],"priorities":["maximum 3 actions utiles uniquement si justifiées"],"keep":["éléments ou ressources à conserver uniquement si pertinent"]}. ` +
              `Règles : confidence entre 0 et 100 ; aucune répétition ; maximum 6 confirmed, 3 probable, 3 missing, 3 priorities, 3 keep ; ne transforme pas une simple observation en conseil si la capture ne permet pas de le justifier.`
          }
        ],
        max_completion_tokens: 900,
        temperature: 0.1
      }
    );

    const raw = extractModelText(result);
    let parsed = parseLooseModelObject(raw);

    if (!parsed) {
      return json({
        ok: true,
        type: "À confirmer",
        language: "Automatique",
        confidence: 25,
        analysis:
          locale === "fr"
            ? `Lecture visuelle obtenue, mais résultat non structuré :\n${cleanMarkdown(visualText).slice(0, 1200)}`
            : cleanMarkdown(visualText).slice(0, 1200)
      });
    }

    parsed = enrichFromVisualDescription(parsed, visualText, locale);

    const normalizedConfidence = evidenceConfidence(parsed);

    return json({
      ok: true,
      type: normalizeType(parsed.type),
      language: normalizeDetectedLanguage(parsed.language),
      confidence: normalizedConfidence,
      analysis: cleanMarkdown(buildAnalysisText(parsed, locale))
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



