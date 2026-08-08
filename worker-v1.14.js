// GoMo Central v20.14 — mission ciblée : mobile, Gestion du Train et source Assistant unique.
import baseWorker from "./worker-v1.12.js";

const VERSION = "20.14";
const MANAGEMENT_PREFIX = "/gestion-train";
const ASSISTANT_ORIGIN = "https://chic-sopapillas-82fbc8.netlify.app";
const SUPABASE_ORIGIN = "https://imtfkhffwpnqdwxkwxkz.supabase.co";
const ALLIANCE_ID = "gomo-1591";
const ASSISTANT_IMAGE_PATH = "/icons/gomo-assistant.png";
const MAX_FORM_BYTES = 8192;
const LANGUAGES = new Set(["fr", "de", "en", "ro", "uk", "ko", "hr", "pt"]);

function centralTrainManagementUpgrade() {
  if (window.__GOMO_CENTRAL_TRAIN_MANAGEMENT__) return;
  window.__GOMO_CENTRAL_TRAIN_MANAGEMENT__ = true;

  const COPY = {
    fr: { title:"GESTION DU TRAIN", text:"Captures, préparation, vérification et validation du Train de la semaine.", open:"Ouvrir" },
    de: { title:"ZUGVERWALTUNG", text:"Screenshots, Vorbereitung, Prüfung und Bestätigung des Wochenzugs.", open:"Öffnen" },
    en: { title:"TRAIN MANAGEMENT", text:"Screenshots, preparation, review and validation of the weekly Train.", open:"Open" },
    ro: { title:"GESTIONAREA TRENULUI", text:"Capturi, pregătire, verificare și validare pentru Trenul săptămânii.", open:"Deschide" },
    uk: { title:"КЕРУВАННЯ ПОТЯГОМ", text:"Знімки, підготовка, перевірка та підтвердження Потяга тижня.", open:"Відкрити" },
    ko: { title:"열차 관리", text:"이번 주 열차의 캡처, 준비, 검토 및 확정.", open:"열기" },
    hr: { title:"UPRAVLJANJE VLAKOM", text:"Snimke, priprema, provjera i potvrda Vlaka za ovaj tjedan.", open:"Otvori" },
    pt: { title:"GESTÃO DO COMBOIO", text:"Capturas, preparação, verificação e validação do Comboio da semana.", open:"Abrir" }
  };

  function language() {
    const saved = localStorage.getItem("gomo-central-language") || document.documentElement.lang || "fr";
    return COPY[saved] ? saved : "fr";
  }

  function hasOwnerAccess() {
    try {
      return localStorage.getItem("gomo-central-train-owner") === "1"
        || localStorage.getItem("gomo-central-shiny-owner") === "1"
        || String(localStorage.getItem("gomo-central-owner-code") || localStorage.getItem("gomoTrustedEditorCode") || "").length > 0;
    } catch {
      return false;
    }
  }

  function addStyles() {
    if (document.getElementById("gomo-central-train-management-style")) return;
    const style = document.createElement("style");
    style.id = "gomo-central-train-management-style";
    style.textContent = `
      .gomo-train-management-card .tool-card__image{object-fit:cover;object-position:center}
      @media(max-width:620px){
        #home .royal-nav-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-flow:row!important;grid-auto-columns:auto!important;overflow:visible!important;overscroll-behavior-inline:auto!important;scroll-snap-type:none!important;gap:7px!important;padding:9px!important}
        #home .royal-nav-button{min-width:0!important;min-height:94px!important;padding:6px 4px 8px!important;gap:4px!important;font-size:.72rem!important;scroll-snap-align:none!important}
        #home .royal-nav-button img{width:54px!important;height:54px!important;max-width:54px!important;border-radius:12px!important}
        #home .royal-nav-button span{line-height:1.08!important;min-height:1.08em!important}
      }
      @media(max-width:390px){
        #home .royal-nav-grid{gap:6px!important;padding:8px!important}
        #home .royal-nav-button{min-height:88px!important;font-size:.67rem!important}
        #home .royal-nav-button img{width:49px!important;height:49px!important;max-width:49px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function syncCard() {
    addStyles();
    const existing = document.querySelector("[data-gomo-train-management-card]");
    if (!hasOwnerAccess()) {
      existing?.remove();
      return;
    }
    const grid = document.querySelector("#tools .tool-grid");
    if (!grid) return;
    const tx = COPY[language()] || COPY.fr;
    let card = existing;
    if (!card) {
      card = document.createElement("article");
      card.className = "tool-card gomo-train-management-card";
      card.dataset.gomoTrainManagementCard = "1";
      card.innerHTML = '<img class="tool-card__image" src="/assets/assets/03_GoMo_Train.png" alt=""><div><h2 data-gomo-train-management-title></h2><p data-gomo-train-management-text></p></div><button data-gomo-train-management-open type="button"></button>';
      grid.appendChild(card);
    }
    card.querySelector("[data-gomo-train-management-title]").textContent = tx.title;
    card.querySelector("[data-gomo-train-management-text]").textContent = tx.text;
    const button = card.querySelector("[data-gomo-train-management-open]");
    button.textContent = tx.open;
    button.setAttribute("aria-label", tx.title);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gomo-train-management-open]");
    if (!button) {
      queueMicrotask(syncCard);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(`/gestion-train/?lang=${encodeURIComponent(language())}`);
  }, true);
  document.addEventListener("change", () => queueMicrotask(syncCard), true);

  if (typeof translatePage === "function") {
    const previousTranslate = translatePage;
    translatePage = function (...args) {
      const result = previousTranslate.apply(this, args);
      queueMicrotask(syncCard);
      return result;
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncCard, { once:true });
  else syncCard();
  window.addEventListener("pageshow", syncCard);
}

function javascriptResponse(source, response) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("content-type", "application/javascript; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-gomo-central-version", VERSION);
  return new Response(source, { status:response.status, statusText:response.statusText, headers });
}

async function serveCentralApp(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  if (!response.ok) return response;
  const source = await response.text();
  return javascriptResponse(`${source}\n;(${centralTrainManagementUpgrade.toString()})();\n`, response);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[character]);
}

function managementHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "content-type": contentType,
    "cache-control": "no-store, no-cache, must-revalidate",
    "content-security-policy": `default-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; worker-src 'self' blob:; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-robots-tag": "noindex, nofollow",
    "x-gomo-central-version": VERSION
  };
}

function loginPage({ lang = "fr", message = "", status = 200 } = {}) {
  const activeLanguage = LANGUAGES.has(lang) ? lang : "fr";
  const error = message ? `<p class="error" role="alert">${escapeHtml(message)}</p>` : '<p class="error" aria-live="polite"></p>';
  const html = `<!doctype html>
<html lang="${activeLanguage}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#071522">
  <title>Gestion du Train · GoMo Central</title>
  <style>
    *{box-sizing:border-box}html{min-height:100%;background:#06111b}body{min-width:320px;min-height:100vh;margin:0;padding:calc(env(safe-area-inset-top,0px) + 18px) 14px calc(env(safe-area-inset-bottom,0px) + 28px);background:radial-gradient(circle at 50% 0,#153f59,#071522 48%,#050d15);color:#fff;font:17px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.back{display:inline-flex;align-items:center;min-height:44px;margin-bottom:14px;padding:0 15px;border:1px solid rgba(242,193,78,.6);border-radius:999px;background:#091b2b;color:#ffe49a;text-decoration:none;font-weight:850}.gate{width:min(100%,540px);margin:0 auto;padding:22px;border:1px solid rgba(242,193,78,.72);border-radius:25px;background:linear-gradient(160deg,#102e43,#071522);box-shadow:0 22px 58px rgba(0,0,0,.42)}.hero{display:grid;grid-template-columns:92px minmax(0,1fr);gap:15px;align-items:center;margin-bottom:18px}.hero img{width:92px;height:92px;border:1px solid rgba(242,193,78,.66);border-radius:20px;object-fit:cover}.eyebrow{margin:0;color:#f2c14e;font-size:.74rem;font-weight:950;letter-spacing:.12em}.hero h1{margin:4px 0 0;color:#ffe49a;font-size:clamp(1.7rem,8vw,2.35rem);line-height:1}.note{margin:0 0 17px;color:#c7d8e3}.workflow{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;color:#eaf9ff;font-size:.78rem;font-weight:800}.workflow span{padding:6px 8px;border:1px solid rgba(111,228,255,.24);border-radius:999px;background:rgba(111,228,255,.07)}label{display:grid;gap:6px;margin-top:12px;color:#d7e8f1;font-size:.83rem;font-weight:850}input,button{width:100%;min-height:54px;border-radius:15px;font:inherit}input{padding:10px 13px;border:1px solid #52778d;background:#061826;color:#fff}button{margin-top:15px;border:0;background:linear-gradient(135deg,#f5cc69,#dba72e);color:#241600;font-weight:950;cursor:pointer}.config{margin-top:10px;color:#b8cad6}.config summary{min-height:44px;padding:10px 0;cursor:pointer}.error{min-height:1.5em;margin:12px 0 0;color:#ffaaaa;text-align:center;font-weight:800}.privacy{margin:14px 0 0;color:#91a9b8;font-size:.74rem;text-align:center}@media(max-width:390px){.gate{padding:17px}.hero{grid-template-columns:76px minmax(0,1fr)}.hero img{width:76px;height:76px}}
  </style>
</head>
<body>
  <a class="back" href="/">← GoMo Central</a>
  <main class="gate">
    <div class="hero"><img src="${ASSISTANT_IMAGE_PATH}?v=${VERSION}" alt="GoMo Assistant avec le train"><div><p class="eyebrow">ACCÈS PERSONNEL</p><h1>Gestion du Train</h1></div></div>
    <p class="note">Cette page réutilise le code propriétaire et la source de données uniques de GoMo Assistant.</p>
    <div class="workflow" aria-label="Étapes"><span>Captures</span><span>Préparer</span><span>Vérifier</span><span>Modifier</span><span>Valider</span></div>
    <form id="ownerGate" action="${MANAGEMENT_PREFIX}/?lang=${activeLanguage}" method="post">
      <input type="hidden" name="lang" value="${activeLanguage}">
      <label>Mot de passe propriétaire<input id="ownerCode" name="ownerCode" type="password" autocomplete="current-password" maxlength="256" required></label>
      <details class="config" id="cloudConfig"><summary>Connexion GoMo Assistant</summary><label>Clé publique Supabase<input id="cloudKey" name="cloudKey" type="password" autocomplete="off" maxlength="2048" required></label></details>
      <button type="submit">OUVRIR LA GESTION DU TRAIN</button>
    </form>
    ${error}
    <p class="privacy">Le contenu de gestion n’est transmis qu’après validation du compte propriétaire.</p>
  </main>
  <script>
    (()=>{
      const form=document.getElementById("ownerGate");
      const code=document.getElementById("ownerCode");
      const key=document.getElementById("cloudKey");
      const details=document.getElementById("cloudConfig");
      try{
        code.value=localStorage.getItem("gomo-central-owner-code")||localStorage.getItem("gomoTrustedEditorCode")||"";
        key.value=localStorage.getItem("gomo-central-rankings-key")||localStorage.getItem("gomoCloudKey")||"";
        if(!key.value) details.open=true;
        if(code.value&&key.value&&${message ? "false" : "true"}) requestAnimationFrame(()=>form.requestSubmit());
      }catch{details.open=true;}
    })();
  </script>
</body>
</html>`;
  return new Response(html, { status, headers:managementHeaders() });
}

async function validateOwner(ownerCode, cloudKey) {
  const response = await fetch(`${SUPABASE_ORIGIN}/rest/v1/rpc/gomo_check_editor`, {
    method:"POST",
    headers:{
      "apikey":cloudKey,
      "authorization":`Bearer ${cloudKey}`,
      "content-type":"application/json"
    },
    body:JSON.stringify({ p_id:ALLIANCE_ID, p_code:ownerCode }),
    signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) return false;
  return (await response.json()) === true;
}

function scriptJson(value) {
  return JSON.stringify(String(value || ""))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function managementHead({ ownerCode, cloudKey, lang }) {
  return `<style id="gomo-train-management-css">
    body.gomo-train-management main{width:min(100%,780px);padding-top:calc(env(safe-area-inset-top,0px) + 14px)}
    body.gomo-train-management main>.language-card{display:none!important}
    body.gomo-train-management #admin>.card{display:none!important}
    body.gomo-train-management #admin>#trainManagementHeader,body.gomo-train-management #admin>#dailyEntryCard,body.gomo-train-management #admin>#trainVipCard{display:block!important}
    body.gomo-train-management #dailyEntryCard .economy-controls{display:none!important}
    #trainManagementHeader{position:relative;overflow:hidden;border-color:#d7a735;background:radial-gradient(circle at 92% 4%,rgba(242,193,78,.22),transparent 40%),linear-gradient(145deg,#12364d,#071522)}
    .train-management-hero{display:grid;grid-template-columns:112px minmax(0,1fr);gap:17px;align-items:center}.train-management-hero img{width:112px;height:112px;border:1px solid rgba(242,193,78,.68);border-radius:23px;object-fit:cover}.train-management-hero h1{margin:4px 0 8px;color:#ffe39a;font-size:clamp(2rem,8vw,3rem);line-height:1;text-align:left}.train-management-hero p{margin:0;color:#d8e8f0;font-size:18px}.train-management-eyebrow{color:#f2c14e!important;font-size:13px!important;font-weight:950;letter-spacing:.13em}.train-management-steps{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.train-management-steps span{padding:7px 10px;border:1px solid rgba(111,228,255,.28);border-radius:999px;background:rgba(111,228,255,.08);color:#eafaff;font-size:13px;font-weight:850}.train-management-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}.train-management-actions a,.train-management-actions button{display:grid;place-items:center;min-height:50px;margin:0;border-radius:14px;text-decoration:none;font-size:17px}.train-management-actions a{border:1px solid rgba(111,228,255,.34);background:#12364d;color:#eafaff;font-weight:850}
    #autoPrepareButton{min-height:76px;background:linear-gradient(135deg,#f5cc69,#d99f20);color:#231500;font-size:clamp(19px,5vw,25px);box-shadow:0 11px 28px rgba(218,162,32,.24)}
    #manualPrepareButton{background:#436f88}
    #validateTrainManagementButton{margin-top:18px;background:linear-gradient(135deg,#83e6ab,#35a96d);color:#042414}
    #trainManagementValidationStatus{text-align:center}
    @media(max-width:520px){body.gomo-train-management main{padding-inline:10px}.train-management-hero{grid-template-columns:82px minmax(0,1fr);gap:12px}.train-management-hero img{width:82px;height:82px;border-radius:18px}.train-management-hero p{font-size:15px}.train-management-actions{grid-template-columns:1fr}.week-plan-wrap{overflow-x:auto}.card{padding:20px;border-radius:22px}#autoPrepareButton{min-height:68px}}
  </style>
  <script>
    (()=>{
      try{
        localStorage.setItem("gomoCloudUrl",${scriptJson(SUPABASE_ORIGIN)});
        localStorage.setItem("gomoCloudKey",${scriptJson(cloudKey)});
        localStorage.setItem("gomoCloudAllianceId",${scriptJson(ALLIANCE_ID)});
        localStorage.setItem("gomoCloudAutoSync","true");
        localStorage.setItem("gomoTrustedEditorCode",${scriptJson(ownerCode)});
        localStorage.setItem("gomo-central-rankings-url",${scriptJson(SUPABASE_ORIGIN)});
        localStorage.setItem("gomo-central-rankings-key",${scriptJson(cloudKey)});
        localStorage.setItem("gomo-central-rankings-alliance",${scriptJson(ALLIANCE_ID)});
        localStorage.setItem("gomo-central-owner-code",${scriptJson(ownerCode)});
        localStorage.setItem("gomo-central-train-owner","1");
        localStorage.setItem("gomo-central-language",${scriptJson(lang)});
        localStorage.setItem("gomoLanguage",${scriptJson(lang)});
        history.replaceState(null,"",${scriptJson(`${MANAGEMENT_PREFIX}/?lang=${lang}`)});
      }catch{}
    })();
  </script>`;
}

function managementPostlude() {
  return `<script id="gomo-train-management-script">
  (()=>{
    const OWNER_ERROR="Cette page est strictement réservée à l’accès propriétaire d’Audric.";

    function forceOwnerChoice(){
      if(!editorLoginName) return;
      editorLoginName.innerHTML='<option value="__owner__">👑 Audric — propriétaire</option>';
      editorLoginName.value="__owner__";
      if(typeof updateOwnerRememberVisibility==="function") updateOwnerRememberVisibility();
    }

    function validationStatus(){
      const status=document.getElementById("trainManagementValidationStatus");
      if(!status) return;
      if(weeklyTrainPlan?.validatedAt){
        const stamp=new Date(weeklyTrainPlan.validatedAt);
        status.textContent="✅ Train validé et synchronisé le "+stamp.toLocaleString(localeMap[currentLanguage])+".";
        status.className="data-status success";
      }else{
        status.textContent=weeklyTrainPlan?.days?.length?"Vérifie les Conducteurs et VIP, corrige-les si nécessaire, puis valide.":"";
        status.className="data-status";
      }
    }

    function applyManagementCopy(){
      const dailyTitle=document.getElementById("dailyEntryTitle");
      const dailyNote=document.getElementById("dailyEntryNote");
      const trainTitle=document.querySelector("#trainVipCard>h2");
      if(dailyTitle) dailyTitle.textContent="📷 Captures — VS · Donations · Tempête du désert";
      if(dailyNote) dailyNote.textContent="Ajoute plusieurs captures depuis l’iPhone, vérifie les noms et les scores détectés, puis enregistre-les dans les données uniques de GoMo Assistant.";
      if(importDailyPhotoButton) importDailyPhotoButton.textContent="📷 AJOUTER PLUSIEURS CAPTURES";
      if(trainTitle){trainTitle.removeAttribute("data-i18n");trainTitle.textContent="🚂 Préparer → Vérifier → Modifier → Valider";}
      if(autoPrepareButton){autoPrepareButton.removeAttribute("data-i18n");autoPrepareButton.textContent="PRÉPARER LE TRAIN DE LA SEMAINE";}
      if(manualPrepareButton){manualPrepareButton.removeAttribute("data-i18n");manualPrepareButton.textContent="✍️ MODIFIER MANUELLEMENT";}
      validationStatus();
    }

    function installManagementUi(){
      document.body.classList.add("gomo-train-management");
      let header=document.getElementById("trainManagementHeader");
      if(!header){
        header=document.createElement("section");
        header.id="trainManagementHeader";
        header.className="card";
        header.innerHTML='<div class="train-management-hero"><img src="/assets/assets/03_GoMo_Train.png" alt="Mascotte GoMo Train"><div><p class="train-management-eyebrow">ESPACE PERSONNEL</p><h1>Gestion du Train</h1><p>Le même planning, les mêmes règles et les mêmes données que GoMo Assistant.</p></div></div><div class="train-management-steps" aria-label="Étapes"><span>Captures</span><span>→ Préparer le Train</span><span>→ Vérifier</span><span>→ Modifier si nécessaire</span><span>→ Valider</span></div><div class="train-management-actions"><a href="/">← GoMo Central</a><button id="trainManagementSync" class="grey" type="button">↻ Synchroniser</button></div>';
        admin.prepend(header);
        document.getElementById("trainManagementSync").onclick=async()=>{
          const button=document.getElementById("trainManagementSync");
          button.disabled=true;button.textContent="Synchronisation…";
          await downloadCloudData({confirmReplace:false,silent:true});
          applyManagementCopy();button.disabled=false;button.textContent="↻ Synchroniser";
        };
      }
      let validate=document.getElementById("validateTrainManagementButton");
      if(!validate){
        validate=document.createElement("button");
        validate.id="validateTrainManagementButton";
        validate.type="button";
        validate.textContent="✅ VALIDER LE TRAIN";
        const status=document.createElement("p");
        status.id="trainManagementValidationStatus";
        status.className="data-status";
        document.getElementById("weeklyTrainPlanCard").append(validate,status);
        validate.onclick=async()=>{
          if(!weeklyTrainPlan?.days?.length){status.textContent="Prépare d’abord le Train de la semaine.";status.className="data-status error";return;}
          const counts=manualPlanCounts();
          if(counts.drivers!==7||counts.vips!==7){status.textContent="Le planning doit contenir 7 Conducteurs et 7 VIP avant validation.";status.className="data-status error";return;}
          validate.disabled=true;validate.textContent="VALIDATION…";
          weeklyTrainPlan.validatedAt=new Date().toISOString();
          weeklyTrainPlan.validatedBy="owner";
          saveWeeklyTrainPlan();syncWeeklyPlanHistory();
          const saved=await uploadCloudData(false);
          if(saved){validationStatus();}
          else{delete weeklyTrainPlan.validatedAt;delete weeklyTrainPlan.validatedBy;saveWeeklyTrainPlan();status.textContent="La validation n’a pas pu être synchronisée. Vérifie la connexion puis recommence.";status.className="data-status error";}
          validate.disabled=false;validate.textContent="✅ VALIDER LE TRAIN";
        };
      }
      applyManagementCopy();
    }

    loadEditorAccounts=async function(){editorAccounts=[];forceOwnerChoice();return true;};
    validatePersonalEditor=async()=>false;
    trustedPersonalAuth=()=>null;
    tryDirectEditorLinkLogin=async()=>false;
    const originalOpenApplication=openApplication;
    openApplication=async function(mode,identity=null){
      if(mode!=="editor"||identity?.type!=="owner"){
        error.textContent=OWNER_ERROR;
        admin.classList.add("hidden");login.classList.remove("hidden");
        return false;
      }
      const result=await originalOpenApplication.call(this,mode,identity);
      installManagementUi();
      return result;
    };
    const originalApplyLanguage=applyLanguage;
    applyLanguage=function(...args){const result=originalApplyLanguage.apply(this,args);queueMicrotask(applyManagementCopy);return result;};
    const originalRenderWeeklyTrainPlan=renderWeeklyTrainPlan;
    renderWeeklyTrainPlan=function(...args){const result=originalRenderWeeklyTrainPlan.apply(this,args);queueMicrotask(applyManagementCopy);return result;};

    document.addEventListener("click",event=>{
      if(event.target.closest("#autoPrepareButton,#manualPrepareButton,#prepareWeekPlanButton")&&weeklyTrainPlan){delete weeklyTrainPlan.validatedAt;delete weeklyTrainPlan.validatedBy;}
    },true);
    document.addEventListener("change",event=>{
      if(event.target.matches(".plan-driver,.plan-vip")&&weeklyTrainPlan){delete weeklyTrainPlan.validatedAt;delete weeklyTrainPlan.validatedBy;}
    },true);
    forceOwnerChoice();
  })();
  </script>`;
}

function prefixRelativeAttribute(attribute) {
  return {
    element(element) {
      const value = element.getAttribute(attribute) || "";
      if (!value || /^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(value)) return;
      const target = new URL(value, "https://gomo.local/");
      element.setAttribute(attribute, `${MANAGEMENT_PREFIX}${target.pathname}${target.search}`);
    }
  };
}

async function serveManagementApplication(request, credentials) {
  const upstream = await fetch(`${ASSISTANT_ORIGIN}/`, {
    method:"GET",
    headers:{ "accept":"text/html", "accept-language":request.headers.get("accept-language") || "fr" },
    redirect:"follow",
    signal:AbortSignal.timeout(12000)
  });
  if (!upstream.ok || !(upstream.headers.get("content-type") || "").includes("text/html")) {
    return loginPage({ lang:credentials.lang, message:"GoMo Assistant est momentanément indisponible. Réessaie dans un instant.", status:502 });
  }

  const rewritten = new HTMLRewriter()
    .on("head", { element(element) { element.append(managementHead(credentials), { html:true }); } })
    .on("body", { element(element) { element.append(managementPostlude(), { html:true }); } })
    .on('img[src="gomo-accueil.png"]', { element(element) { element.setAttribute("src", `${ASSISTANT_IMAGE_PATH}?v=${VERSION}`); } })
    .on("link[href]", prefixRelativeAttribute("href"))
    .on("script[src]", prefixRelativeAttribute("src"))
    .transform(upstream);
  const headers = new Headers(rewritten.headers);
  for (const name of ["content-length", "content-encoding", "etag", "set-cookie", "content-security-policy", "content-security-policy-report-only"]) headers.delete(name);
  Object.entries(managementHeaders(rewritten.headers.get("content-type") || "text/html; charset=utf-8")).forEach(([name, value]) => headers.set(name, value));
  return new Response(rewritten.body, { status:rewritten.status, statusText:rewritten.statusText, headers });
}

async function handleManagement(request, env, ctx) {
  const url = new URL(request.url);
  const lang = LANGUAGES.has(url.searchParams.get("lang")) ? url.searchParams.get("lang") : "fr";
  if (request.method === "GET" || request.method === "HEAD") {
    const response = loginPage({ lang });
    return request.method === "HEAD" ? new Response(null, { status:response.status, headers:response.headers }) : response;
  }
  if (request.method !== "POST") return new Response("Method Not Allowed", { status:405, headers:{ ...managementHeaders("text/plain; charset=utf-8"), allow:"GET, HEAD, POST" } });
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_FORM_BYTES) return loginPage({ lang, message:"Demande trop volumineuse.", status:413 });

  try {
    const form = await request.formData();
    const ownerCode = String(form.get("ownerCode") || "");
    const cloudKey = String(form.get("cloudKey") || "").trim();
    const requestedLang = String(form.get("lang") || lang);
    const activeLanguage = LANGUAGES.has(requestedLang) ? requestedLang : lang;
    if (!ownerCode || ownerCode.length > 256 || cloudKey.length < 20 || cloudKey.length > 2048) {
      return loginPage({ lang:activeLanguage, message:"Accès propriétaire ou connexion GoMo Assistant incorrecte.", status:401 });
    }
    const valid = await validateOwner(ownerCode, cloudKey);
    if (!valid) return loginPage({ lang:activeLanguage, message:"Accès propriétaire incorrect.", status:401 });
    return serveManagementApplication(request, { ownerCode, cloudKey, lang:activeLanguage });
  } catch (error) {
    console.error("GoMo Train management authentication", error instanceof Error ? error.message : error);
    return loginPage({ lang, message:"Impossible de vérifier l’accès pour le moment.", status:503 });
  }
}

async function proxyManagementAsset(request) {
  const incoming = new URL(request.url);
  const suffix = incoming.pathname.slice(`${MANAGEMENT_PREFIX}/`.length);
  if (!new Set(["manifest.json", "icon-180.png"]).has(suffix)) return new Response("Not Found", { status:404 });
  const target = new URL(`/${suffix}${incoming.search}`, ASSISTANT_ORIGIN);
  const upstream = await fetch(target, { method:request.method, headers:{ "accept":request.headers.get("accept") || "*/*" }, redirect:"follow", signal:AbortSignal.timeout(10000) });
  const headers = new Headers(upstream.headers);
  headers.set("cache-control", "public, max-age=3600");
  headers.set("x-content-type-options", "nosniff");
  return new Response(upstream.body, { status:upstream.status, statusText:upstream.statusText, headers });
}

function versionedAssetAttribute(attribute) {
  return {
    element(element) {
      const value = element.getAttribute(attribute) || "";
      if (!/^\/?assets\//.test(value)) return;
      const target = new URL(value, "https://gomo.local/");
      target.searchParams.set("v", VERSION);
      element.setAttribute(attribute, `${target.pathname}${target.search}`);
    }
  };
}

async function versionCentralHtml(response) {
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return response;
  const rewritten = new HTMLRewriter()
    .on("script[src]", versionedAssetAttribute("src"))
    .on("link[href]", versionedAssetAttribute("href"))
    .transform(response);
  const headers = new Headers(rewritten.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("x-gomo-central-version", VERSION);
  return new Response(rewritten.body, { status:rewritten.status, statusText:rewritten.statusText, headers });
}

async function serveCentralServiceWorker(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  if (!response.ok) return response;
  let source = await response.text();
  source = source
    .replace(/const CACHE_NAME = "gomo-central-v[^"]+";/, `const CACHE_NAME = "gomo-central-v${VERSION.replace(".", "-")}";`)
    .replaceAll("?v=20.11", `?v=${VERSION}`)
    .replace(
      'url.pathname.startsWith("/shiny-radar/")) return;',
      'url.pathname.startsWith("/shiny-radar/") || url.pathname.startsWith("/gestion-train/")) return;'
    );
  return javascriptResponse(source, response);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === MANAGEMENT_PREFIX) {
      url.pathname = `${MANAGEMENT_PREFIX}/`;
      return Response.redirect(url.toString(), 308);
    }
    if (url.pathname === `${MANAGEMENT_PREFIX}/`) return handleManagement(request, env, ctx);
    if (url.pathname.startsWith(`${MANAGEMENT_PREFIX}/`)) return proxyManagementAsset(request);
    if (url.pathname === "/assets/app-v1.5.js") return serveCentralApp(request, env, ctx);
    if (url.pathname === "/sw.js") return serveCentralServiceWorker(request, env, ctx);
    if (url.pathname === ASSISTANT_IMAGE_PATH) {
      const response = await baseWorker.fetch(request, env, ctx);
      const headers = new Headers(response.headers);
      headers.set("content-type", "image/jpeg");
      headers.set("cache-control", "public, max-age=3600");
      headers.set("x-content-type-options", "nosniff");
      headers.set("x-gomo-central-version", VERSION);
      return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
    }

    const response = await baseWorker.fetch(request, env, ctx);
    if (url.pathname.startsWith("/vs-planner/")) return response;
    return versionCentralHtml(response);
  }
};
