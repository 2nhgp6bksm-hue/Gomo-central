function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

const SUPPORTED_LOCALES = new Set(["fr", "de", "en", "ro", "uk", "ko", "hr"]);

const LOCALE_NAMES = {
  fr: "français",
  de: "allemand",
  en: "anglais",
  ro: "roumain",
  uk: "ukrainien",
  ko: "coréen",
  hr: "croate"
};

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
  return (
    result?.response ??
    result?.choices?.[0]?.message?.content ??
    result?.result ??
    ""
  );
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

function asList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanMarkdown(item))
    .filter(Boolean)
    .slice(0, 8);
}

function buildAnalysisText(data) {
  const sections = [];

  const confirmed = asList(data?.confirmed);
  const probable = asList(data?.probable);
  const missing = asList(data?.missing);
  const priorities = asList(data?.priorities).slice(0, 3);
  const keep = asList(data?.keep);

  if (confirmed.length) sections.push(`CONFIRMÉ\n${confirmed.map((x) => `• ${x}`).join("\n")}`);
  if (probable.length) sections.push(`PROBABLE\n${probable.map((x) => `• ${x}`).join("\n")}`);
  if (missing.length) sections.push(`MANQUANT / NON VISIBLE\n${missing.map((x) => `• ${x}`).join("\n")}`);
  if (priorities.length) sections.push(`3 PRIORITÉS MAXIMUM\n${priorities.map((x, i) => `${i + 1}. ${x}`).join("\n")}`);
  if (keep.length) sections.push(`À GARDER\n${keep.map((x) => `• ${x}`).join("\n")}`);

  return sections.join("\n\n") || "Analyse terminée, mais aucune information fiable n’a pu être extraite de cette capture.";
}

const APP_PATCH = String.raw`
;(() => {
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

    const result = await env.AI.run(
      "@cf/google/gemma-4-26b-a4b-it",
      {
        messages: [
          {
            role: "system",
            content:
              "Tu es GoMo Coach pour Last War: Survival. Analyse uniquement les éléments réellement visibles sur la capture. N’invente jamais un nombre, un niveau, une ressource, un héros ou un événement. Sépare strictement ce qui est confirmé, ce qui est probable et ce qui manque. Ne conseille jamais de gaspiller une ressource rare."
          },
          {
            role: "user",
            content:
              `Analyse cette capture Last War et réponds en ${outputLanguage}. Retourne UNIQUEMENT un objet JSON valide, sans Markdown ni bloc de code, avec exactement ces clés : ` +
              `{"type":"type de capture ou À confirmer","language":"langue visible sur la capture ou Automatique","confidence":0,"confirmed":["faits certains"],"probable":["éléments plausibles mais non certains"],"missing":["informations nécessaires non visibles"],"priorities":["maximum 3 actions utiles"],"keep":["ressources ou éléments à conserver"]}. ` +
              "confidence doit être un entier de 0 à 100. Si la capture ne permet pas une conclusion fiable, baisse la confiance et indique clairement ce qui manque."
          }
        ],
        image,
        max_tokens: 900,
        temperature: 0.1
      }
    );

    const raw = extractModelText(result);
    const parsed = parseJsonFromModel(raw);

    if (!parsed) {
      return json({
        ok: true,
        type: "À confirmer",
        language: "Automatique",
        confidence: 35,
        analysis: cleanMarkdown(raw) || "Analyse terminée, mais la réponse n’a pas pu être structurée correctement."
      });
    }

    const confidence = Number(parsed.confidence);
    const normalizedConfidence = Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : 50;

    return json({
      ok: true,
      type: cleanMarkdown(parsed.type) || "À confirmer",
      language: cleanMarkdown(parsed.language) || "Automatique",
      confidence: normalizedConfidence,
      analysis: cleanMarkdown(buildAnalysisText(parsed))
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
