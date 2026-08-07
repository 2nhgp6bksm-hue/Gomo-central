// GoMo Central v20.5 — langues synchronisées, classements internes et mascottes dédiées.
// Les routes transformées passent par le Worker avant les ressources statiques.
import baseWorker from "./worker-v1.10.js";
import legacyRankingsWorker from "./worker-v1.6.js";

const VERSION = "20.5";
const SHINY_ORIGIN = "https://gomo-shiny-central.gjp86wh7p2.workers.dev";
const SHINY_PREFIX = "/shiny-radar";
const SHINY_FORWARDED_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-range",
  "range"
];

let cachedRankingsPatch = "";

function clientFunctionCall(fn) {
  return `(() => { const __name = (target) => target; (${fn.toString()})(); })()`;
}

function centralUpgrade() {
  if (window.__GOMO_CENTRAL_V20__) return;
  window.__GOMO_CENTRAL_V20__ = true;

  const LOCALES = {
    fr: "fr-BE", de: "de-DE", en: "en-GB", ro: "ro-RO",
    uk: "uk-UA", ko: "ko-KR", hr: "hr-HR", pt: "pt-PT"
  };
  const COPY = {
    fr: { label: "Copier le lien du site", done: "Lien du site copié", failed: "Impossible de copier le lien" },
    de: { label: "Website-Link kopieren", done: "Website-Link kopiert", failed: "Link konnte nicht kopiert werden" },
    en: { label: "Copy site link", done: "Site link copied", failed: "Could not copy the link" },
    ro: { label: "Copiază linkul site-ului", done: "Linkul site-ului a fost copiat", failed: "Linkul nu a putut fi copiat" },
    uk: { label: "Копіювати посилання на сайт", done: "Посилання скопійовано", failed: "Не вдалося скопіювати посилання" },
    ko: { label: "사이트 링크 복사", done: "사이트 링크가 복사되었습니다", failed: "링크를 복사할 수 없습니다" },
    hr: { label: "Kopiraj poveznicu stranice", done: "Poveznica je kopirana", failed: "Poveznicu nije moguće kopirati" },
    pt: { label: "Copiar ligação do site", done: "Ligação do site copiada", failed: "Não foi possível copiar a ligação" }
  };
  const TRAIN = {
    fr: { eyebrow: "GOMO FOREVER", title: "Train de la semaine", subtitle: "Conducteurs et VIP en cours", day: "Jour", driver: "Conducteur", vip: "VIP", select: "À sélectionner" },
    de: { eyebrow: "GOMO FOREVER", title: "Zug der Woche", subtitle: "Aktuelle Zugführer und VIP", day: "Tag", driver: "Zugführer", vip: "VIP", select: "Auswählen" },
    en: { eyebrow: "GOMO FOREVER", title: "Train of the week", subtitle: "Current conductors and VIPs", day: "Day", driver: "Conductor", vip: "VIP", select: "Select" },
    ro: { eyebrow: "GOMO FOREVER", title: "Trenul săptămânii", subtitle: "Conductorii și VIP-urile curente", day: "Zi", driver: "Conductor", vip: "VIP", select: "De selectat" },
    uk: { eyebrow: "GOMO FOREVER", title: "Потяг тижня", subtitle: "Поточні провідники та VIP", day: "День", driver: "Провідник", vip: "VIP", select: "Обрати" },
    ko: { eyebrow: "GOMO FOREVER", title: "이번 주 열차", subtitle: "현재 차장 및 VIP", day: "요일", driver: "차장", vip: "VIP", select: "선택" },
    hr: { eyebrow: "GOMO FOREVER", title: "Vlak tjedna", subtitle: "Trenutačni voditelji i VIP-ovi", day: "Dan", driver: "Voditelj", vip: "VIP", select: "Odaberi" },
    pt: { eyebrow: "GOMO FOREVER", title: "Comboio da semana", subtitle: "Condutores e VIP atuais", day: "Dia", driver: "Condutor", vip: "VIP", select: "Selecionar" }
  };
  const NEWS = {
    fr: "Actualités GoMo", de: "GoMo-Neuigkeiten", en: "GoMo News", ro: "Noutăți GoMo",
    uk: "Новини GoMo", ko: "GoMo 소식", hr: "GoMo novosti", pt: "Notícias GoMo"
  };
  const ROWS = [
    { date: "2026-08-02", driver: "Blabsl", vip: "" },
    { date: "2026-08-03", driver: "RL050", vip: "MIHAI 07" },
    { date: "2026-08-04", driver: "Dr Jackyl443", vip: "Bamtross" },
    { date: "2026-08-05", driver: "NOPEE", vip: "Biko1" },
    { date: "2026-08-06", driver: "ElFronzo", vip: "Reversedlearner" },
    { date: "2026-08-07", driver: "Rob1922", vip: "by Voty" },
    { date: "2026-08-08", driver: "Kommander 007", vip: "Ninschaa" }
  ];

  const language = () => {
    const value = (typeof currentLanguage !== "undefined" && currentLanguage)
      || localStorage.getItem("gomo-central-language") || "fr";
    return LOCALES[value] ? value : "fr";
  };
  const copyText = () => COPY[language()] || COPY.fr;
  const requestedLanguage = new URLSearchParams(location.search).get("lang");
  if (requestedLanguage && LOCALES[requestedLanguage] && typeof currentLanguage !== "undefined") {
    currentLanguage = requestedLanguage;
    localStorage.setItem("gomo-central-language", requestedLanguage);
  }

  function addStyles() {
    if (document.getElementById("gomo-central-v20-style")) return;
    const style = document.createElement("style");
    style.id = "gomo-central-v20-style";
    style.textContent = `
      .gomo-copy-link{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px}
      .gomo-v20-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));z-index:2147483600;transform:translate(-50%,18px);max-width:calc(100vw - 32px);padding:11px 15px;border:1px solid rgba(242,193,78,.46);border-radius:999px;background:#0a1c2d;color:#fff4cf;box-shadow:0 14px 38px rgba(0,0,0,.45);font-weight:800;opacity:0;pointer-events:none;transition:.2s ease;text-align:center}
      .gomo-v20-toast.show{opacity:1;transform:translate(-50%,0)}
      .gomo-train-visual{display:none!important}
      .translated-train{overflow:hidden;border:1px solid rgba(242,193,78,.36);border-radius:24px;background:linear-gradient(145deg,rgba(9,31,49,.98),rgba(5,18,31,.98));box-shadow:0 20px 48px rgba(0,0,0,.24)}
      .translated-train__head{padding:22px 20px 18px;border-bottom:1px solid rgba(255,255,255,.09);background:radial-gradient(circle at 92% 0,rgba(242,193,78,.18),transparent 36%)}
      .translated-train__head .eyebrow{display:block;margin-bottom:6px;color:#f2c14e}.translated-train__head h1{margin:0 0 5px}.translated-train__head p{margin:0;color:#bfd0df}.translated-train__dates{display:inline-flex;margin-top:12px;padding:6px 10px;border-radius:999px;background:rgba(242,193,78,.1);color:#ffe4a0;font-weight:800}
      .translated-train__scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}.translated-train table{width:100%;border-collapse:collapse;min-width:570px}.translated-train th,.translated-train td{padding:13px 15px;border-bottom:1px solid rgba(255,255,255,.07);text-align:left}.translated-train th{color:#f5d477;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;background:rgba(255,255,255,.025)}.translated-train tbody tr:last-child td{border-bottom:0}.translated-train__person{display:flex;align-items:center;gap:10px;font-weight:800}.translated-train__avatar{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(242,193,78,.34);background:linear-gradient(145deg,#163c59,#0a2034);color:#ffe29b;font-size:.72rem}.translated-train__pending{color:#9db2c4;font-style:italic}
      .tool-card__symbol{display:grid;place-items:center;width:56px;height:56px;border:1px solid rgba(242,193,78,.34);border-radius:14px;background:linear-gradient(145deg,#173754,#091c2e);font-size:31px;box-shadow:0 7px 18px rgba(0,0,0,.28)}
      .coach-intro.gomo-coach-with-mascot{grid-template-columns:112px minmax(0,1.35fr) minmax(220px,.65fr)}.gomo-coach-mascot{width:112px;aspect-ratio:1;object-fit:cover;border-radius:22px;border:1px solid rgba(242,199,103,.55);box-shadow:0 12px 30px rgba(0,0,0,.32)}
      @media(max-width:760px){.coach-intro.gomo-coach-with-mascot{grid-template-columns:84px minmax(0,1fr)}.gomo-coach-mascot{width:84px}.coach-intro.gomo-coach-with-mascot .coach-safety{grid-column:1/-1}}
      @media(max-width:600px){.translated-train__scroll{overflow:visible}.translated-train table{min-width:0}.translated-train thead{display:none}.translated-train tbody{display:grid;gap:10px;padding:12px}.translated-train tr{display:grid;border:1px solid rgba(255,255,255,.09);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.025)}.translated-train td{display:grid;grid-template-columns:88px minmax(0,1fr);align-items:center;gap:9px;padding:10px 12px}.translated-train td::before{content:attr(data-label);color:#f5d477;font-size:.72rem;font-weight:900;letter-spacing:.045em;text-transform:uppercase}.translated-train tbody tr:last-child td{border-bottom:1px solid rgba(255,255,255,.07)}.translated-train tbody tr:last-child td:last-child,.translated-train td:last-child{border-bottom:0}}
      @media(max-width:460px){.translated-train__head{padding:18px 16px}.coach-intro.gomo-coach-with-mascot{grid-template-columns:72px minmax(0,1fr)}.gomo-coach-mascot{width:72px}}
    `;
    document.head.appendChild(style);
  }

  let toastTimer = 0;
  function showToast(message) {
    let toast = document.getElementById("gomoV20Toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gomoV20Toast";
      toast.className = "gomo-v20-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
  }

  async function copySiteLink() {
    const value = `${location.origin}/?lang=${encodeURIComponent(language())}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        if (!document.execCommand("copy")) throw new Error("copy unavailable");
        field.remove();
      }
      showToast(`✓ ${copyText().done}`);
    } catch {
      showToast(copyText().failed);
    }
  }

  function addCopyButton() {
    const footer = document.querySelector(".sidebar-footer");
    if (!footer) return;
    let button = document.getElementById("copySiteLinkButton");
    if (!button) {
      button = document.createElement("button");
      button.id = "copySiteLinkButton";
      button.type = "button";
      button.className = "secondary-button gomo-copy-link";
      button.innerHTML = '<span aria-hidden="true">🔗</span><span data-copy-site-label></span>';
      button.addEventListener("click", copySiteLink);
      footer.prepend(button);
    }
    const label = button.querySelector("[data-copy-site-label]");
    if (label) label.textContent = copyText().label;
    button.setAttribute("aria-label", copyText().label);
  }

  function initials(value) {
    return String(value).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function renderTrain() {
    const section = document.getElementById("train");
    if (!section) return;
    const lang = language();
    const tx = TRAIN[lang] || TRAIN.fr;
    let card = document.getElementById("translatedTrainSchedule");
    if (!card) {
      card = document.createElement("article");
      card.id = "translatedTrainSchedule";
      card.className = "translated-train";
      const home = section.querySelector(".gomo-train-home-wrap");
      section.insertBefore(card, home || section.firstChild);
    }
    const locale = LOCALES[lang] || LOCALES.fr;
    const date = (value, options) => new Intl.DateTimeFormat(locale, options).format(new Date(`${value}T12:00:00`));
    const period = `${date(ROWS[0].date, { day: "2-digit", month: "long" })} – ${date(ROWS[ROWS.length - 1].date, { day: "2-digit", month: "long", year: "numeric" })}`;
    const rows = ROWS.map((row) => {
      const vip = row.vip
        ? `<span class="gomo-train__person"><span class="translated-train__avatar">${initials(row.vip)}</span>${row.vip}</span>`
        : `<span class="translated-train__pending">${tx.select}</span>`;
      return `<tr><td data-label="${tx.day}"><strong>${date(row.date, { weekday: "long", day: "2-digit", month: "2-digit" })}</strong></td><td data-label="${tx.driver}"><span class="translated-train__person"><span class="translated-train__avatar">${initials(row.driver)}</span>${row.driver}</span></td><td data-label="${tx.vip}">${vip}</td></tr>`;
    }).join("");
    card.innerHTML = `<header class="translated-train__head"><span class="eyebrow">${tx.eyebrow}</span><h1>${tx.title}</h1><p>${tx.subtitle}</p><span class="translated-train__dates">📅 ${period}</span></header><div class="translated-train__scroll"><table><thead><tr><th>${tx.day}</th><th>${tx.driver}</th><th>${tx.vip}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function syncTools() {
    const grid = document.querySelector("#tools .tool-grid");
    if (!grid) return;
    const coach = grid.querySelector("[data-gomo-coach-card]");
    const plannerImage = [...grid.querySelectorAll("img")].find((image) => (image.getAttribute("src") || "").includes("vs-planner"));
    const planner = plannerImage?.closest(".tool-card");
    if (coach) {
      const image = coach.querySelector("img");
      if (image) {
        image.src = "/mascots/gomo-coach-mascot.webp?v=20.5";
        image.alt = "GoMo Coach";
      }
      if (planner && planner.nextElementSibling !== coach) planner.after(coach);
    }
    if (plannerImage) {
      plannerImage.src = "/mascots/gomo-vs-planner-mascot.webp?v=20.5";
      plannerImage.alt = "GoMo VS Planner";
      planner?.setAttribute("data-gomo-planner-card", "1");
    }
    const rankingsTitle = grid.querySelector('[data-i18n="tools.rankingsTitle"]');
    const rankings = rankingsTitle?.closest(".tool-card");
    if (rankings) {
      rankings.setAttribute("data-gomo-rankings-card", "1");
      const image = rankings.querySelector("img");
      if (image) {
        const symbol = document.createElement("span");
        symbol.className = "tool-card__symbol";
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = "🏆";
        image.replaceWith(symbol);
      }
    }
    const newsCard = grid.querySelector('[data-go-card="news"]');
    const newsTitle = newsCard?.querySelector("h2");
    if (newsTitle) newsTitle.textContent = NEWS[language()] || NEWS.fr;
  }

  function syncCoachMascot() {
    const intro = document.querySelector("#guides .coach-intro");
    if (!intro || intro.querySelector(".gomo-coach-mascot")) return;
    intro.classList.add("gomo-coach-with-mascot");
    const image = document.createElement("img");
    image.className = "gomo-coach-mascot";
    image.src = "/mascots/gomo-coach-mascot.webp?v=20.5";
    image.alt = "GoMo Coach";
    intro.prepend(image);
  }

  function syncLinks() {
    const lang = language();
    if (typeof EXTERNAL_LINKS !== "undefined") {
      EXTERNAL_LINKS.shiny = `/shiny-radar/?lang=${encodeURIComponent(lang)}`;
      EXTERNAL_LINKS["shiny-radar"] = `/shiny-radar/?lang=${encodeURIComponent(lang)}`;
      EXTERNAL_LINKS["vs-planner"] = `/vs-planner/?lang=${encodeURIComponent(lang)}`;
      delete EXTERNAL_LINKS.rankings;
      delete EXTERNAL_LINKS.classements;
    }
  }

  function syncAll() {
    addStyles();
    addCopyButton();
    renderTrain();
    syncTools();
    syncCoachMascot();
    syncLinks();
  }

  document.addEventListener("click", (event) => {
    const rankings = event.target.closest('[data-gomo-rankings-card] button,[data-r5-go="classements"]');
    if (rankings) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof EXTERNAL_LINKS !== "undefined") {
        delete EXTERNAL_LINKS.rankings;
        delete EXTERNAL_LINKS.classements;
      }
      document.getElementById("gomo-r5fapper-panel")?.classList.remove("open");
      if (typeof openPage === "function") openPage("rankings");
      else location.hash = "rankings";
      return;
    }
    const planner = event.target.closest('[data-gomo-planner-card] button,[data-r5-go="vs-planner"]');
    if (planner) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(`/vs-planner/?lang=${encodeURIComponent(language())}`);
      return;
    }
    const shiny = event.target.closest('[data-page="shiny"],[data-go="shiny"],[data-page="shiny-radar"],[data-go="shiny-radar"],[data-r5-go="shiny-radar"]');
    if (shiny) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(`/shiny-radar/?lang=${encodeURIComponent(language())}`);
    }
  }, true);

  if (typeof translatePage === "function") {
    const previousTranslate = translatePage;
    translatePage = function (...args) {
      const result = previousTranslate.apply(this, args);
      setTimeout(syncAll, 0);
      return result;
    };
    if (requestedLanguage && LOCALES[requestedLanguage]) translatePage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncAll, { once: true });
  else syncAll();
  window.addEventListener("pageshow", syncAll);
}

function plannerDictionaryUpgrade() {
  const requested = new URLSearchParams(location.search).get("lang");
  if (requested && LANGS[requested]) {
    localStorage.setItem("gomo-vs-language", requested);
    localStorage.setItem("gomo-central-language", requested);
  }

  Object.assign(I18N.de, {
    analyzeCapture:"Screenshot analysieren",analyzeWarning:"Die Analyse hilft beim Lesen des Bildschirms. Bestätige die Mengen hier immer vor der Berechnung.",weekGuideEyebrow:"VOLLSTÄNDIGER LEITFADEN",weekGuideTitle:"Die VS-Woche, Tag für Tag",weekGuideText:"Öffne einen Tag, um alle erkannten Ressourcen und ihren geprüften Wert zu sehen.",pointSettings:"PUNKTE",restoreTitle:"Geprüfte Werte wiederherstellen",restoreText:"Entfernt nur deine manuellen Punktänderungen. Bestände bleiben gespeichert.",restorePoints:"Punkte wiederherstellen",
    backup:"SICHERUNG",backupTitle:"Meine Daten sichern oder übertragen",backupText:"Exportiere eine Datei, bevor du Telefon oder Browser wechselst.",export:"Exportieren",import:"Importieren",installTitle:"Wie eine App installieren",installText:"Wähle im Browsermenü „Zum Home-Bildschirm“. Danach kann der Planner auch offline funktionieren.",reset:"ZURÜCKSETZEN",resetTitle:"Alle meine Daten löschen",resetText:"Löscht Bestände, Punktestände, Einstellungen und eigene Werte von diesem Gerät.",resetButton:"Alles löschen",
    urOnly:"Hier zählen nur UR-LKW oder geheime UR-Aufträge. Andere Seltenheiten bringen 0 Punkte.",verified:"Geprüft",custom:"Bearbeitet",points:"Punkte",missingText:"Der eingegebene nutzbare Bestand reicht nicht für das empfohlene Ziel. Es fehlen {points} Punkte.",added:"Hinzugefügt",estimatedTotal:"Geschätzte Summe",goal:"Ziel",useQuantity:"{quantity} verwenden",confirmApply:"Geplante Mengen vom Bestand abziehen und die geschätzten Punkte hinzufügen?",applied:"Plan angewendet und Bestände aktualisiert.",copied:"Plan kopiert.",copyFailed:"Kopieren ist in diesem Browser nicht verfügbar.",confirmClear:"Alle Bestandsmengen für diesen Tag löschen?",cleared:"Mengen gelöscht.",confirmRestore:"Alle geprüften Punktwerte wiederherstellen?",restored:"Geprüfte Punktwerte wiederhergestellt.",confirmReset:"Alle gespeicherten VS-Planner-Daten auf diesem Gerät löschen?",resetDone:"Alle Daten gelöscht.",exported:"Sicherung exportiert.",invalidFile:"Diese Datei ist keine gültige VS-Planner-Sicherung.",imported:"Sicherung importiert.",day:"Tag",open:"Öffnen"
  });
  Object.assign(I18N.ro, {
    analyzeCapture:"Analizează o captură",analyzeWarning:"Analiza ajută la citirea ecranului, dar confirmă întotdeauna cantitățile aici înainte de calcul.",weekGuideEyebrow:"GHID COMPLET",weekGuideTitle:"Săptămâna VS, zi cu zi",weekGuideText:"Deschide o zi pentru a vedea toate resursele recunoscute și valoarea lor verificată.",pointSettings:"PUNCTE",restoreTitle:"Restaurează valorile verificate",restoreText:"Elimină doar modificările manuale ale punctelor. Stocurile rămân salvate.",restorePoints:"Restaurează punctele",
    backup:"COPIE DE SIGURANȚĂ",backupTitle:"Păstrează sau transferă datele",backupText:"Exportă un fișier înainte de a schimba telefonul sau browserul.",export:"Exportă",import:"Importă",installTitle:"Instalează ca aplicație",installText:"În meniul browserului, alege „Adaugă la ecranul principal”. Planificatorul poate apoi funcționa offline.",reset:"RESETARE",resetTitle:"Șterge toate datele",resetText:"Șterge stocurile, scorurile, setările și valorile personalizate de pe acest dispozitiv.",resetButton:"Șterge tot",
    urOnly:"Aici se iau în calcul doar camioanele UR sau misiunile secrete UR. Alte rarități oferă 0 puncte.",verified:"Verificat",custom:"Modificat",points:"puncte",missingText:"Stocul utilizabil introdus nu ajunge la obiectivul recomandat. Lipsesc {points} puncte.",added:"Adăugate",estimatedTotal:"Total estimat",goal:"Obiectiv",useQuantity:"Folosește {quantity}",confirmApply:"Scazi cantitățile planificate din stoc și adaugi punctele estimate?",applied:"Plan aplicat și stocuri actualizate.",copied:"Plan copiat.",copyFailed:"Copierea nu este disponibilă în acest browser.",confirmClear:"Ștergi toate cantitățile din stoc pentru această zi?",cleared:"Cantități șterse.",confirmRestore:"Restaurezi toate valorile verificate ale punctelor?",restored:"Valorile verificate au fost restaurate.",confirmReset:"Ștergi toate datele VS Planner salvate pe acest dispozitiv?",resetDone:"Toate datele au fost șterse.",exported:"Copia de siguranță a fost exportată.",invalidFile:"Fișierul nu este o copie VS Planner validă.",imported:"Copia de siguranță a fost importată.",day:"Zi",open:"Deschide"
  });
  Object.assign(I18N.uk, {
    analyzeCapture:"Проаналізувати знімок",analyzeWarning:"Аналіз допомагає прочитати екран, але перед розрахунком завжди підтверджуйте кількість тут.",weekGuideEyebrow:"ПОВНИЙ ПОСІБНИК",weekGuideTitle:"Тиждень VS, день за днем",weekGuideText:"Відкрийте день, щоб побачити всі розпізнані ресурси та їх перевірену вартість.",pointSettings:"ОЧКИ",restoreTitle:"Відновити перевірені значення",restoreText:"Видаляє лише ручні зміни очок. Запаси залишаються збереженими.",restorePoints:"Відновити очки",
    backup:"РЕЗЕРВНА КОПІЯ",backupTitle:"Зберегти або перенести дані",backupText:"Експортуйте файл перед зміною телефона чи браузера.",export:"Експортувати",import:"Імпортувати",installTitle:"Встановити як застосунок",installText:"У меню браузера виберіть «Додати на початковий екран». Після цього планувальник може працювати офлайн.",reset:"СКИДАННЯ",resetTitle:"Видалити всі дані",resetText:"Видаляє запаси, очки, налаштування та власні значення з цього пристрою.",resetButton:"Видалити все",
    urOnly:"Тут зараховуються лише вантажівки UR або секретні завдання UR. Інші рідкості дають 0 очок.",verified:"Перевірено",custom:"Змінено",points:"очок",missingText:"Введеного доступного запасу недостатньо для рекомендованої цілі. Бракує {points} очок.",added:"Додано",estimatedTotal:"Орієнтовний підсумок",goal:"Ціль",useQuantity:"Використати {quantity}",confirmApply:"Відняти заплановану кількість із запасу та додати орієнтовні очки?",applied:"План застосовано, запаси оновлено.",copied:"План скопійовано.",copyFailed:"Копіювання недоступне в цьому браузері.",confirmClear:"Очистити весь запас на цей день?",cleared:"Кількість очищено.",confirmRestore:"Відновити всі перевірені значення очок?",restored:"Перевірені значення відновлено.",confirmReset:"Видалити всі збережені дані VS Planner на цьому пристрої?",resetDone:"Усі дані видалено.",exported:"Резервну копію експортовано.",invalidFile:"Цей файл не є дійсною резервною копією VS Planner.",imported:"Резервну копію імпортовано.",day:"День",open:"Відкрити"
  });
  Object.assign(I18N.ko, {
    analyzeCapture:"스크린샷 분석",analyzeWarning:"분석은 화면을 읽는 데 도움을 주지만 계산 전에는 항상 여기에서 수량을 확인하세요.",weekGuideEyebrow:"전체 가이드",weekGuideTitle:"VS 주간 일별 안내",weekGuideText:"날짜를 열어 인식된 모든 자원과 검증된 점수를 확인하세요.",pointSettings:"점수",restoreTitle:"검증된 값 복원",restoreText:"직접 수정한 점수만 삭제합니다. 보유량은 저장된 상태로 유지됩니다.",restorePoints:"점수 복원",
    backup:"백업",backupTitle:"데이터 보관 또는 이전",backupText:"휴대폰이나 브라우저를 변경하기 전에 파일을 내보내세요.",export:"내보내기",import:"가져오기",installTitle:"앱처럼 설치",installText:"브라우저 메뉴에서 ‘홈 화면에 추가’를 선택하세요. 이후 오프라인에서도 사용할 수 있습니다.",reset:"초기화",resetTitle:"모든 데이터 삭제",resetText:"이 기기의 보유량, 점수, 설정, 사용자 지정 값을 삭제합니다.",resetButton:"모두 삭제",
    urOnly:"UR 트럭 또는 UR 비밀 임무만 계산됩니다. 다른 등급은 여기에서 0점입니다.",verified:"검증됨",custom:"수정됨",points:"점",missingText:"입력한 사용 가능 보유량이 권장 목표에 부족합니다. {points}점이 더 필요합니다.",added:"추가 점수",estimatedTotal:"예상 합계",goal:"목표",useQuantity:"{quantity} 사용",confirmApply:"계획 수량을 보유량에서 차감하고 예상 점수를 추가할까요?",applied:"계획이 적용되고 보유량이 업데이트되었습니다.",copied:"계획이 복사되었습니다.",copyFailed:"이 브라우저에서는 복사를 사용할 수 없습니다.",confirmClear:"이 날짜의 모든 보유 수량을 지울까요?",cleared:"수량이 지워졌습니다.",confirmRestore:"검증된 모든 점수 값을 복원할까요?",restored:"검증된 점수 값이 복원되었습니다.",confirmReset:"이 기기에 저장된 모든 VS Planner 데이터를 지울까요?",resetDone:"모든 데이터가 삭제되었습니다.",exported:"백업을 내보냈습니다.",invalidFile:"올바른 VS Planner 백업 파일이 아닙니다.",imported:"백업을 가져왔습니다.",day:"날짜",open:"열기"
  });
  Object.assign(I18N.hr, {
    analyzeCapture:"Analiziraj snimku",analyzeWarning:"Analiza pomaže pročitati zaslon, ali prije izračuna uvijek potvrdi količine ovdje.",weekGuideEyebrow:"CIJELI VODIČ",weekGuideTitle:"VS tjedan, dan po dan",weekGuideText:"Otvori dan kako bi vidio sve prepoznate resurse i njihovu provjerenu vrijednost.",pointSettings:"BODOVI",restoreTitle:"Vrati provjerene vrijednosti",restoreText:"Uklanja samo ručne izmjene bodova. Zalihe ostaju spremljene.",restorePoints:"Vrati bodove",
    backup:"SIGURNOSNA KOPIJA",backupTitle:"Sačuvaj ili prenesi podatke",backupText:"Izvezi datoteku prije promjene telefona ili preglednika.",export:"Izvezi",import:"Uvezi",installTitle:"Instaliraj kao aplikaciju",installText:"U izborniku preglednika odaberi „Dodaj na početni zaslon“. Planer tada može raditi i izvan mreže.",reset:"PONIŠTAVANJE",resetTitle:"Izbriši sve podatke",resetText:"Briše zalihe, bodove, postavke i prilagođene vrijednosti s ovog uređaja.",resetButton:"Izbriši sve",
    urOnly:"Ovdje se računaju samo UR kamioni ili UR tajni zadaci. Ostale rijetkosti donose 0 bodova.",verified:"Provjereno",custom:"Izmijenjeno",points:"bodova",missingText:"Unesena iskoristiva zaliha nije dovoljna za preporučeni cilj. Nedostaje {points} bodova.",added:"Dodano",estimatedTotal:"Procijenjeni zbroj",goal:"Cilj",useQuantity:"Upotrijebi {quantity}",confirmApply:"Oduzeti planirane količine od zalihe i dodati procijenjene bodove?",applied:"Plan je primijenjen, a zalihe su ažurirane.",copied:"Plan je kopiran.",copyFailed:"Kopiranje nije dostupno u ovom pregledniku.",confirmClear:"Izbrisati sve količine zaliha za ovaj dan?",cleared:"Količine su izbrisane.",confirmRestore:"Vratiti sve provjerene vrijednosti bodova?",restored:"Provjerene vrijednosti bodova su vraćene.",confirmReset:"Izbrisati sve spremljene VS Planner podatke na ovom uređaju?",resetDone:"Svi podaci su izbrisani.",exported:"Sigurnosna kopija je izvezena.",invalidFile:"Ova datoteka nije valjana VS Planner sigurnosna kopija.",imported:"Sigurnosna kopija je uvezena.",day:"Dan",open:"Otvori"
  });
}

function coachDictionaryUpgrade() {
  EVENT_COPY.de = [
    ["Allianzduell · VS","Das Ziel erreichen, ohne die nächsten Tage leerzuräumen.","Prüfe VS-Tag und Punktwerte im Spiel und trage deine Bestände im VS Planner ein.","Nutze nur die Ressourcen des Tages und stoppe am empfohlenen Ziel.","Verbrauche nichts, was für einen anderen Tag vorgesehen ist. Bei abweichenden Werten gilt das Spiel.","VS Planner, echte Bestände und die im Spiel angezeigten Punktwerte."],
    ["Marshalswache · Riesenwurm","30 Minuten gemeinsamer Rallye-Kampf gegen den Wurm.","Rufe alle Trupps zurück, spende am Übungsplatz und wähle eine machbare Schwierigkeit.","Starte eine Rallye mit einem schwächeren Trupp und tritt anderen mit deinem stärksten bei. Eine Rallye dauert 3 Minuten.","Wähle keine zu hohe Schwierigkeit und binde deine besten Trupps nicht anderswo.","Ausdauer, stärkster Trupp, Heilung und R4/R5-Markierungen."],
    ["Zombie-Belagerung · 20 Wellen","Die Verteidigung halten und schwächere Mitglieder unterstützen.","Rufe Truppen zurück, heile sie und stelle die besten Einheiten an die Mauer. Schilde stoppen die Wellen nicht.","Verstärke ab etwa Welle 10 schwächere Mitglieder. Nach zwei Niederlagen scheidet ein Spieler aus.","Verschwende keinen Schild und lasse nicht alle Trupps außerhalb marschieren.","Heilung, Verstärkungen, Mauerverteidigung und Allianzchat."],
    ["Enemy Buster · Tag 6","Im PvP punkten, ohne dem Gegner Truppen zu schenken.","Bereite vor Samstag Schild, Heilung und Teleporter vor. Aktiviere den Schild, sobald du offline bist.","Suche ungeschützte Rivalen und koordiniere Angriffe. Truppen der Rivalenallianz bringen mehr Punkte.","Greife keine leeren Basen an und bleibe offline nie ungeschützt.","24-Stunden-Schild, Heilung, Teleporter, UR-LKW und geheime UR-Aufträge."],
    ["Allianzzug · VIP","Den Gold Express vorbereiten und Plätze fair verteilen.","Spende während der 4-stündigen Vorbereitung Verträge. Fünf Aktualisierungen beziehungsweise 25 Verträge ermöglichen den Gold Express.","Wähle einen starken Zugführer, fülle die Waggons und beachte die GoMo-Rotation. Pro Waggon höchstens 5 Fahrgäste.","Belege Plätze nicht dauerhaft und wechsle den Zugführer nicht ohne Planprüfung.","Handelsverträge, GoMo-Zugplan und VIP-Liste."],
    ["Wüstensturm","Als Team Ziele spielen statt allein Abschüsse zu jagen.","Bestätige Anmeldung und GoMo-Zeitfenster. Bereite Heilung, Teleporter und zwei Trupps vor.","Folge R4/R5-Aufrufen, besetze zugewiesene Gebäude und bleibe bei deiner Gruppe.","Gehe nicht allein, verbrauche Heilung nicht sofort und ignoriere keine Punktziele.","Heilung, Teleporter, zugewiesene Trupps und Allianzkanal."],
    ["Himmelsräuber","Eine Allianzwoche aus Spenden, Kampf und Abrechnung.","Spende Montag bis Donnerstag und halte den stärksten Trupp für die Kampftage bereit.","Kämpfe Freitag und Samstag, nutze wertvolle Angriffe und sammle Ereignismarken.","Verschwende keinen Angriff auf eine Stufe, die dein Trupp nicht abschließen kann.","Spenden, stärkster Trupp, Angriffskontingent und Ereignismarken."],
    ["Eroberung der Hauptstadt","Von R4/R5 koordinierter Städtefortschritt.","Warte auf Erklärung und Markierungen und bereite Teleporter, Heilung und Trupps vor.","Rücke mit der Allianz vor. Verseuchtes Gebiet deaktiviert Schild und Radar und verlangsamt Märsche.","Betritt verseuchtes Gebiet nicht allein und verlasse dich dort nicht auf den Schild.","Teleporter, Heilung, Allianzmarkierungen und Verstärkungstrupps."],
    ["Rüstungsrennen","Sechs 4-Stunden-Phasen verwandeln passende Aktionen in Truhen.","Prüfe zuerst aktive Phase und Timer auf deinem Server.","Führe nur passende Verbesserungen aus und stoppe nach den gewünschten Truhen.","Die Reihenfolge kann variieren. Gib nie nur nach einem alten Plan aus.","Radar, Bau, Forschung, Helden, Ausbildung und Drohne je nach Phase."],
    ["Shiny Radar · Server 1591","Bestätigungen prüfen, bevor ein externer Server gewählt wird.","Auf Server 1591 sind Dienstag und Samstag die GoMo-Shiny-Tage.","Öffne Shiny Radar und prüfe Bot-Bestätigungen sowie Verlauf vor dem Wechsel.","Server 1591 darf nie in der Liste externer Server stehen.","Bot-Screenshot, Shiny Radar und menschliche Prüfung."]
  ];
  EVENT_COPY.ro = [
    ["Duelul alianței · VS","Atinge pragul fără să golești resursele zilelor următoare.","Verifică ziua VS și punctele din joc, apoi introdu stocurile în VS Planner.","Folosește doar resursele zilei și oprește-te când atingi pragul recomandat.","Nu cheltui resurse păstrate pentru altă zi. Dacă jocul arată altă valoare, jocul are prioritate.","VS Planner, stocuri reale și valorile afișate în joc."],
    ["Garda Mareșalului · Vierme uriaș","Raliu cooperativ de 30 de minute împotriva viermelui.","Retrage toate echipele, donează la terenul de antrenament și alege o dificultate realizabilă.","Pornește un raliu cu o echipă mai slabă și intră în celelalte cu cea mai bună echipă. Raliurile durează 3 minute.","Nu alege o dificultate prea mare și nu ține cele mai bune echipe ocupate în altă parte.","Energie, cea mai bună echipă, vindecare și marcaje R4/R5."],
    ["Asediu zombie · 20 de valuri","Apără baza și ajută membrii mai slabi.","Retrage și vindecă trupele, apoi pune cele mai bune unități pe zid. Scutul nu oprește valurile.","După aproximativ valul 10, întărește membrii mai slabi. Două apărări ratate elimină jucătorul.","Nu irosi un scut și nu lăsa toate echipele în marș.","Vindecare, întăriri, apărarea zidului și comunicarea alianței."],
    ["Enemy Buster · Ziua 6","Obține puncte PvP fără să oferi trupele adversarului.","Pregătește înainte de sâmbătă scut, vindecare și teleportări. Activează scutul când ești offline.","Caută ținte rivale fără scut și coordonează atacurile. Trupele alianței rivale valorează mai mult.","Nu ataca baze goale și nu rămâne neprotejat când nu joci.","Scut de 24 h, vindecare, teleportări, camioane UR și misiuni secrete UR."],
    ["Trenul alianței · VIP","Pregătește Gold Express și împarte locurile corect.","Donează contracte în cele 4 ore de pregătire. Cinci reîmprospătări, adică 25 de contracte, permit obținerea Gold Express.","Alege un conductor puternic, umple vagoanele și respectă rotația GoMo. Maximum 5 pasageri pe vagon.","Nu monopoliza locurile și nu schimba conductorul fără să verifici planificarea.","Contracte comerciale, planificarea Trenului GoMo și lista VIP."],
    ["Furtuna din deșert","Joacă obiectivele în echipă, nu doar eliminările individuale.","Confirmă înscrierea și intervalul GoMo; pregătește vindecare, teleportări și două echipe.","Urmează indicațiile R4/R5, ocupă clădirile cerute și deplasează-te cu grupul.","Nu pleca singur, nu consuma toate vindecările la început și nu ignora obiectivele.","Vindecare, teleportări, echipe alocate și canalul alianței."],
    ["Prădătorul ceresc","O săptămână de alianță: donații, luptă și calcul.","Donează de luni până joi și păstrează cea mai bună echipă pentru zilele de luptă.","Luptă vineri și sâmbătă, folosește atacurile utile și adună jetoanele evenimentului.","Nu irosi un atac pe un nivel pe care echipa nu îl poate termina.","Donații, cea mai bună echipă, număr de atacuri și jetoane."],
    ["Cucerirea Capitalei","Progresul orașelor coordonat de R4/R5.","Așteaptă declarația și marcajele R4/R5; pregătește teleportări, vindecare și echipe.","Avansează cu alianța. Zona contaminată dezactivează scutul și radarul și încetinește marșurile.","Nu intra singur în zona contaminată și nu te baza pe scut în interior.","Teleportări, vindecare, marcaje ale alianței și echipe de întărire."],
    ["Cursa înarmării","Șase faze de câte 4 ore transformă acțiunile potrivite în cufere.","Verifică mai întâi faza activă și cronometrul serverului.","Fă îmbunătățirile fazei și oprește-te după cuferele dorite.","Ordinea poate varia; nu cheltui doar după un program vechi.","Radar, construcție, cercetare, eroi, antrenament și dronă, în funcție de fază."],
    ["Shiny Radar · Server 1591","Verifică confirmările înainte de a alege un server extern.","Pe serverul 1591, zilele Shiny GoMo sunt marți și sâmbătă.","Deschide Shiny Radar și verifică confirmările Botului și istoricul înainte de deplasare.","Serverul 1591 nu trebuie adăugat niciodată în lista serverelor externe.","Captură Bot, Shiny Radar și validare umană."]
  ];
  EVENT_COPY.uk = [
    ["Дуель альянсів · VS","Досягніть цілі, не витрачаючи ресурси наступних днів.","Перевірте день VS і значення очок у грі, а потім введіть запаси у VS Planner.","Використовуйте лише ресурси поточного дня й зупиніться після рекомендованої цілі.","Не витрачайте ресурс, залишений на інший день. Якщо значення відрізняється, орієнтуйтеся на гру.","VS Planner, реальні запаси та значення очок у грі."],
    ["Варта Маршала · Гігантський черв’як","30-хвилинне спільне ралі проти черв’яка.","Поверніть усі загони, зробіть внесок у тренувальний майданчик і виберіть посильну складність.","Запустіть одне ралі слабшим загоном, а до інших приєднуйтеся найсильнішим. Ралі триває 3 хвилини.","Не вибирайте надмірну складність і не залишайте найсильніші загони зайнятими в іншому місці.","Витривалість, найсильніший загін, лікування та мітки R4/R5."],
    ["Облога зомбі · 20 хвиль","Утримуйте оборону й допомагайте слабшим учасникам.","Поверніть і вилікуйте війська, поставте найкращі підрозділи на захист стіни. Щит не зупиняє хвилі.","Приблизно з 10-ї хвилі підсилюйте слабших учасників. Після двох поразок гравець вибуває.","Не витрачайте щит і не залишайте всі загони в поході.","Лікування, підкріплення, захист стіни та зв’язок альянсу."],
    ["Enemy Buster · День 6","Набирайте PvP-очки, не віддаючи війська супернику.","До суботи підготуйте щит, лікування й телепорти. Вмикайте щит, коли виходите з гри.","Шукайте незахищені цілі суперника й координуйте атаки. Війська ворожого альянсу дають більше очок.","Не атакуйте порожні бази й не залишайтеся без щита офлайн.","Щит на 24 години, лікування, телепорти, вантажівки UR і секретні завдання UR."],
    ["Потяг альянсу · VIP","Підготуйте Gold Express і справедливо розподіліть місця.","Протягом 4 годин підготовки жертвуйте контракти. П’ять оновлень, тобто 25 контрактів, дають шанс на Gold Express.","Оберіть сильного провідника, заповніть вагони й дотримуйтеся ротації GoMo. У вагоні максимум 5 пасажирів.","Не займайте місця постійно й не змінюйте провідника без перевірки розкладу.","Торгові контракти, розклад потяга GoMo та VIP-список."],
    ["Буря в пустелі","Грайте командні цілі, а не полюйте поодинці за вбивствами.","Підтвердьте реєстрацію й час GoMo; підготуйте лікування, телепорти та два загони.","Дотримуйтеся команд R4/R5, займайте потрібні будівлі й рухайтеся зі своєю групою.","Не йдіть самі, не витрачайте все лікування на початку й не ігноруйте цілі.","Лікування, телепорти, призначені загони та канал альянсу."],
    ["Небесний хижак","Тиждень альянсу: внески, бій і підрахунок.","Робіть внески з понеділка до четверга й бережіть найсильніший загін для бойових днів.","Бийтеся у п’ятницю й суботу, використовуйте корисні атаки та збирайте жетони події.","Не витрачайте атаку на рівень, який загін не здатний завершити.","Внески, найсильніший загін, ліміт атак і жетони події."],
    ["Завоювання столиці","Просування міст, координоване R4/R5.","Дочекайтеся оголошення й міток R4/R5; підготуйте телепорти, лікування та загони.","Просувайтеся з альянсом. Забруднена зона вимикає щити й радар та сповільнює марші.","Не входьте в забруднену зону самі й не покладайтеся там на щит.","Телепорти, лікування, мітки альянсу та загони підкріплення."],
    ["Гонка озброєнь","Шість 4-годинних фаз перетворюють правильні дії на скрині.","Спочатку перевірте активну фазу й таймер на своєму сервері.","Виконуйте поліпшення цієї фази й зупиніться після потрібних скринь.","Порядок може змінюватися; не витрачайте ресурси лише за старим розкладом.","Радар, будівництво, дослідження, герої, тренування та дрон залежно від фази."],
    ["Shiny Radar · Сервер 1591","Перевірте підтвердження перед вибором зовнішнього сервера.","На сервері 1591 дні Shiny GoMo — вівторок і субота.","Перед переходом відкрийте Shiny Radar і перевірте підтвердження Bot та історію.","Сервер 1591 ніколи не додається до списку зовнішніх серверів.","Знімок Bot, Shiny Radar і перевірка людиною."]
  ];
  EVENT_COPY.ko = [
    ["동맹 결투 · VS","다음 날 자원을 소진하지 않고 목표 구간을 달성하세요.","VS 날짜와 게임 내 점수를 확인한 뒤 VS Planner에 실제 보유량을 입력하세요.","당일 자원만 사용하고 권장 목표에 도달하면 즉시 멈추세요.","다른 날을 위해 보관한 자원은 쓰지 마세요. 값이 다르면 게임 표시를 따르세요.","VS Planner, 실제 보유량, 게임에 표시된 점수."],
    ["마셜 가드 · 거대 벌레","거대 벌레를 상대로 30분 동안 진행하는 협동 랠리입니다.","모든 부대를 귀환시키고 훈련장에 기부한 뒤 동맹이 완료할 수 있는 난이도를 고르세요.","약한 부대로 랠리 하나를 열고 가장 강한 부대로 다른 랠리에 참가하세요. 랠리는 3분입니다.","너무 높은 난이도를 선택하거나 주력 부대를 다른 곳에 묶어 두지 마세요.","스태미나, 주력 부대, 치료, R4/R5 표식."],
    ["좀비 공성 · 20웨이브","방어선을 지키고 전력이 낮은 동맹원을 지원하세요.","병력을 귀환·치료하고 가장 강한 유닛을 성벽 방어에 배치하세요. 보호막은 웨이브를 막지 못합니다.","약 10웨이브부터 약한 동맹원에게 지원군을 보내세요. 두 번 방어에 실패하면 이후 웨이브에서 제외됩니다.","보호막을 낭비하거나 모든 부대를 외부 행군에 두지 마세요.","치료, 지원군, 성벽 방어, 동맹 소통."],
    ["Enemy Buster · 6일차","상대에게 병력을 내주지 않으면서 PvP 점수를 얻으세요.","토요일 전에 보호막, 치료, 텔레포트를 준비하고 오프라인일 때는 보호막을 켜세요.","보호막이 없는 적을 찾고 공격을 조율하세요. 상대 동맹 병력이 더 많은 점수를 줍니다.","빈 기지를 공격하거나 오프라인 상태로 무방비하게 있지 마세요.","24시간 보호막, 치료, 텔레포트, UR 트럭, UR 비밀 임무."],
    ["동맹 열차 · VIP","Gold Express를 준비하고 좌석을 공정하게 나누세요.","4시간 준비 동안 계약서를 기부하세요. 5회 갱신, 즉 25개 계약서로 Gold Express를 노릴 수 있습니다.","강한 차장을 선택하고 객차를 채우며 GoMo 순번을 지키세요. 객차당 최대 5명입니다.","좌석을 독점하거나 일정 확인 없이 차장을 바꾸지 마세요.","무역 계약서, GoMo 열차 일정, VIP 목록."],
    ["사막 폭풍","혼자 처치만 노리지 말고 팀으로 목표를 수행하세요.","참가 등록과 GoMo 시간을 확인하고 치료, 텔레포트, 두 개 부대를 준비하세요.","R4/R5 지시에 따라 지정 건물을 점령하고 팀과 함께 이동하세요.","혼자 움직이거나 초반에 치료를 모두 쓰거나 점수 목표를 무시하지 마세요.","치료, 텔레포트, 배정 부대, 동맹 채널."],
    ["하늘 포식자","기부, 전투, 정산으로 이어지는 동맹 주간입니다.","월요일부터 목요일까지 기부하고 전투일을 위해 주력 부대를 준비하세요.","금요일과 토요일에 전투하고 유효한 공격을 모두 사용하며 이벤트 토큰을 모으세요.","부대가 완료할 수 없는 단계에 공격을 낭비하지 마세요.","기부, 주력 부대, 공격 횟수, 이벤트 토큰."],
    ["수도 정복","R4/R5가 조율하는 도시 진격입니다.","선포와 R4/R5 표식을 기다리고 텔레포트, 치료, 부대를 준비하세요.","동맹과 함께 전진하세요. 오염 지역에서는 보호막과 레이더가 꺼지고 행군이 느려집니다.","오염 지역에 혼자 들어가거나 그 안에서 보호막을 믿지 마세요.","텔레포트, 치료, 동맹 표식, 지원 부대."],
    ["군비 경쟁","6개의 4시간 단계에서 알맞은 행동으로 상자를 얻습니다.","먼저 서버의 현재 단계와 타이머를 확인하세요.","현재 단계에 맞는 강화를 하고 원하는 상자를 얻으면 멈추세요.","순서는 달라질 수 있으니 오래된 일정만 믿고 자원을 쓰지 마세요.","단계에 따라 레이더, 건설, 연구, 영웅, 훈련, 드론."],
    ["Shiny Radar · 서버 1591","외부 서버를 고르기 전에 확인 정보를 살펴보세요.","1591 서버의 GoMo Shiny 날짜는 화요일과 토요일입니다.","이동 전에 Shiny Radar에서 Bot 확인과 기록을 확인하세요.","1591 서버는 외부 서버 목록에 절대 추가하지 마세요.","Bot 스크린샷, Shiny Radar, 사람의 최종 확인."]
  ];
  EVENT_COPY.hr = [
    ["Duel saveza · VS","Dosegni prag bez trošenja resursa za sljedeće dane.","Provjeri VS dan i bodove u igri, zatim unesi stvarne zalihe u VS Planner.","Koristi samo resurse dana i stani čim dosegneš preporučeni prag.","Ne troši resurse namijenjene drugom danu. Ako igra pokazuje drugu vrijednost, igra ima prednost.","VS Planner, stvarne zalihe i bodovi prikazani u igri."],
    ["Maršalova straža · Divovski crv","Zajednički rally od 30 minuta protiv crva.","Vrati sve postrojbe, doniraj na vježbalište i odaberi težinu koju savez može završiti.","Pokreni jedan rally slabijom postrojbom, a drugima se pridruži najjačom. Rally traje 3 minute.","Ne biraj previsoku težinu i ne drži najbolje postrojbe zauzete drugdje.","Izdržljivost, najjača postrojba, liječenje i oznake R4/R5."],
    ["Opsada zombija · 20 valova","Zadrži obranu i pomozi slabijim članovima.","Vrati i izliječi trupe te postavi najbolje jedinice na zid. Štit ne zaustavlja valove.","Od približno 10. vala pojačaj slabije članove. Dva neuspjeha izbacuju igrača iz nastavka.","Ne troši štit i ne ostavljaj sve postrojbe u vanjskom maršu.","Liječenje, pojačanja, obrana zida i komunikacija saveza."],
    ["Enemy Buster · 6. dan","Osvoji PvP bodove bez poklanjanja trupa protivniku.","Prije subote pripremi štit, liječenje i teleportacije. Uključi štit kad si izvan mreže.","Traži nezaštićene suparnike i uskladi napade. Trupe suparničkog saveza vrijede više.","Ne napadaj prazne baze i ne ostaj nezaštićen dok ne igraš.","Štit od 24 sata, liječenje, teleportacije, UR kamioni i UR tajni zadaci."],
    ["Vlak saveza · VIP","Pripremi Gold Express i pravedno podijeli mjesta.","Tijekom 4 sata pripreme doniraj ugovore. Pet osvježavanja, odnosno 25 ugovora, omogućuje Gold Express.","Odaberi jakog voditelja, popuni vagone i poštuj GoMo rotaciju. Najviše 5 putnika po vagonu.","Ne zauzimaj mjesta stalno i ne mijenjaj voditelja bez provjere rasporeda.","Trgovački ugovori, raspored GoMo vlaka i VIP popis."],
    ["Pustinjska oluja","Igraj timske ciljeve umjesto samostalnog lova na eliminacije.","Potvrdi prijavu i GoMo termin; pripremi liječenje, teleportacije i dvije postrojbe.","Prati upute R4/R5, zauzmi tražene zgrade i kreći se sa skupinom.","Ne idi sam, ne potroši sve liječenje na početku i ne zanemaruj ciljeve.","Liječenje, teleportacije, dodijeljene postrojbe i kanal saveza."],
    ["Nebeski predator","Tjedan saveza: donacije, borba i obračun.","Doniraj od ponedjeljka do četvrtka i čuvaj najjaču postrojbu za dane borbe.","Bori se u petak i subotu, iskoristi korisne napade i skupljaj žetone događaja.","Ne troši napad na razinu koju postrojba ne može završiti.","Donacije, najjača postrojba, broj napada i žetoni događaja."],
    ["Osvajanje glavnog grada","Napredovanje gradovima pod vodstvom R4/R5.","Pričekaj objavu i oznake R4/R5; pripremi teleportacije, liječenje i postrojbe.","Napreduj sa savezom. Kontaminirano područje isključuje štit i radar te usporava marš.","Ne ulazi sam u kontaminirano područje i ne oslanjaj se ondje na štit.","Teleportacije, liječenje, oznake saveza i postrojbe za pojačanje."],
    ["Utrka u naoružanju","Šest faza od 4 sata pretvara odgovarajuće radnje u škrinje.","Najprije provjeri aktivnu fazu i mjerač vremena na serveru.","Radi poboljšanja koja odgovaraju fazi i stani nakon željenih škrinja.","Redoslijed se može promijeniti; ne troši samo prema starom rasporedu.","Radar, gradnja, istraživanje, heroji, obuka i dron prema fazi."],
    ["Shiny Radar · Server 1591","Provjeri potvrde prije odabira vanjskog servera.","Na serveru 1591 GoMo Shiny dani su utorak i subota.","Prije prelaska otvori Shiny Radar i provjeri Bot potvrde i povijest.","Server 1591 nikada se ne dodaje na popis vanjskih servera.","Bot snimka, Shiny Radar i ljudska potvrda."]
  ];
}

function shinyBootstrap() {
  const LANGS = ["fr", "de", "en", "ro", "uk", "ko", "hr", "pt"];
  const COPY = {
    fr:["📋 Copier les serveurs","✓ Copié"],de:["📋 Server kopieren","✓ Kopiert"],en:["📋 Copy servers","✓ Copied"],ro:["📋 Copiază serverele","✓ Copiat"],
    uk:["📋 Копіювати сервери","✓ Скопійовано"],ko:["📋 서버 복사","✓ 복사됨"],hr:["📋 Kopiraj servere","✓ Kopirano"],pt:["📋 Copiar servidores","✓ Copiado"]
  };
  const STATIC = {
    fr:{ local:"Serveur 1591", language:"Langue", serverNumber:"Numéro du serveur" },
    de:{ local:"Server 1591", language:"Sprache", serverNumber:"Servernummer" },
    en:{ local:"Server 1591", language:"Language", serverNumber:"Server number" },
    ro:{ local:"Server 1591", language:"Limbă", serverNumber:"Numărul serverului" },
    uk:{ local:"Сервер 1591", language:"Мова", serverNumber:"Номер сервера" },
    ko:{ local:"1591 서버", language:"언어", serverNumber:"서버 번호" },
    hr:{ local:"Server 1591", language:"Jezik", serverNumber:"Broj servera" },
    pt:{ local:"Servidor 1591", language:"Idioma", serverNumber:"Número do servidor" }
  };
  const params = new URLSearchParams(location.search);
  const requested = params.get("lang");
  const central = localStorage.getItem("gomo-central-language");
  const selected = LANGS.includes(requested) ? requested : (LANGS.includes(central) ? central : "fr");
  localStorage.setItem("gomo-shiny-central-lang", selected);
  localStorage.setItem("gomo-central-language", selected);

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("copyTodayBtn");
    const language = document.getElementById("language");
    const localServer = document.querySelector(".local-card strong");
    const serverSearch = document.getElementById("serverSearch");
    const sync = () => {
      const lang = LANGS.includes(language?.value) ? language.value : selected;
      if (button) button.textContent = COPY[lang][0];
      if (localServer) localServer.textContent = STATIC[lang].local;
      if (language) language.setAttribute("aria-label", STATIC[lang].language);
      if (serverSearch) serverSearch.setAttribute("aria-label", STATIC[lang].serverNumber);
      localStorage.setItem("gomo-central-language", lang);
    };
    if (button) {
      button.addEventListener("click", async () => {
        const lang = LANGS.includes(language?.value) ? language.value : selected;
        const value = [...document.querySelectorAll("#todayServers .server-pill")].map((node) => node.textContent.trim()).join(", ");
        try {
          if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
          else {
            const field = document.createElement("textarea");
            field.value = value;
            field.style.position = "fixed";
            field.style.opacity = "0";
            document.body.appendChild(field);
            field.select();
            document.execCommand("copy");
            field.remove();
          }
          button.textContent = COPY[lang][1];
          setTimeout(sync, 1500);
        } catch {
          sync();
        }
      });
    }
    language?.addEventListener("change", sync);
    sync();
  }, { once: true });
}

class VersionedCentralScripts {
  element(element) {
    const source = element.getAttribute("src") || "";
    if (source.includes("assets/app-v1.5.js")) element.setAttribute("src", `/assets/app-v1.5.js?v=${VERSION}`);
    if (source.includes("assets/gomo-v19.js")) element.setAttribute("src", `/assets/gomo-v19.js?v=${VERSION}`);
  }
}

class PlannerMascotImage {
  element(element) {
    const source = element.getAttribute("src") || "";
    if (source.includes("icons/vs-planner.png")) {
      element.setAttribute("src", `/mascots/gomo-vs-planner-mascot.webp?v=${VERSION}`);
      element.setAttribute("alt", "GoMo VS Planner");
    }
  }
}

class PlannerMascotLink {
  element(element) {
    const href = element.getAttribute("href") || "";
    if (href.includes("icons/vs-planner.png")) element.setAttribute("href", `/mascots/gomo-vs-planner-mascot.webp?v=${VERSION}`);
  }
}

class PlannerHeadStyle {
  element(element) {
    element.append(`<style id="gomo-vs-mascot-style">.brand-block img{object-fit:cover!important;object-position:center!important;border-radius:22px!important;border:1px solid rgba(242,193,78,.5)!important;box-shadow:0 10px 28px rgba(0,0,0,.32)!important}</style>`, { html: true });
  }
}

class ShinyAssetPrefix {
  constructor(attribute) { this.attribute = attribute; }
  element(element) {
    const value = element.getAttribute(this.attribute) || "";
    if (value.startsWith("/") && !value.startsWith("//")) element.setAttribute(this.attribute, `${SHINY_PREFIX}${value}`);
  }
}

class ShinyHeadBoot {
  element(element) {
    element.append(`<script>;${clientFunctionCall(shinyBootstrap)};</script>`, { html: true });
  }
}

class ShinyCopyButton {
  element(element) { element.removeAttribute("onclick"); }
}

function upgradeRankingsPatch(source) {
  const copy = {
    fr: { note: "Consultation en lecture seule.", missing: "La connexion aux classements n'est pas encore enregistrée sur cet appareil. Ouvre une fois le lien membre partagé." },
    de: { note: "Nur-Leseansicht.", missing: "Die Verbindung zu den Ranglisten ist auf diesem Gerät noch nicht gespeichert. Öffne einmal den geteilten Mitgliederlink." },
    en: { note: "Read-only view.", missing: "The rankings connection has not been saved on this device yet. Open the shared member link once." },
    ro: { note: "Vizualizare doar în citire.", missing: "Conexiunea la clasamente nu este încă salvată pe acest dispozitiv. Deschide o dată linkul de membru distribuit." },
    uk: { note: "Перегляд лише для читання.", missing: "Підключення до рейтингів ще не збережене на цьому пристрої. Один раз відкрийте спільне посилання для учасників." },
    ko: { note: "읽기 전용 보기입니다.", missing: "이 기기에 순위 연결 정보가 아직 저장되지 않았습니다. 공유된 멤버 링크를 한 번 열어 주세요." },
    hr: { note: "Pregled samo za čitanje.", missing: "Veza s poretkom još nije spremljena na ovom uređaju. Jednom otvori podijeljenu poveznicu za članove." },
    pt: { note: "Vista apenas de leitura.", missing: "A ligação às classificações ainda não está guardada neste dispositivo. Abre uma vez a ligação de membro partilhada." }
  };
  let patch = source.replaceAll('eyebrow:"GOMO ASSISTANT"', 'eyebrow:"GOMO CENTRAL"');
  for (const [language, values] of Object.entries(copy)) {
    for (const field of ["note", "missing"]) {
      const pattern = new RegExp(`(${language}:\\{[^\\n]*?${field}:)"[^"]*"`);
      patch = patch.replace(pattern, (_match, prefix) => `${prefix}${JSON.stringify(values[field])}`);
    }
    const assistantPattern = new RegExp(`(${language}:\\{[^\\n]*?assistant:)"[^"]*"`);
    patch = patch.replace(assistantPattern, '$1""');
  }
  return patch.replace(/\s*<button id="rankingsAssistant"[^>]*><\/button>/, "");
}

async function getRankingsPatch(request, env, ctx) {
  if (cachedRankingsPatch) return cachedRankingsPatch;
  const legacy = await legacyRankingsWorker.fetch(request, env, ctx);
  const source = await legacy.text();
  const anchor = 'const CONFIG = {\n    url: "gomo-central-rankings-url"';
  const anchorIndex = source.indexOf(anchor);
  const start = anchorIndex < 0 ? -1 : source.lastIndexOf("\n;(() =>", anchorIndex);
  if (start >= 0) cachedRankingsPatch = upgradeRankingsPatch(source.slice(start));
  return cachedRankingsPatch;
}

function javascriptResponse(source, response) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("content-type", "application/javascript; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-gomo-central-version", VERSION);
  return new Response(source, { status: response.status, statusText: response.statusText, headers });
}

async function serveCentralApp(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  if (!response.ok) return response;
  let source = await response.text();
  source = source
    .replace('  train: "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyTrainPlanCard",', '  train: "",')
    .replace('  rankings: "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyChampionsCard",', '  rankings: "",')
    .replace('  classements: "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyChampionsCard",', '  classements: "",')
    .replace('  shiny: "https://gomo-shiny-central.gjp86wh7p2.workers.dev/",', '  shiny: "/shiny-radar/",')
    .replace('  "shiny-radar": "https://gomo-shiny-central.gjp86wh7p2.workers.dev/",', '  "shiny-radar": "/shiny-radar/",');
  const rankings = await getRankingsPatch(request, env, ctx);
  const upgrade = `\n;${clientFunctionCall(centralUpgrade)};\n`;
  return javascriptResponse(source + rankings + upgrade, response);
}

async function servePlannerApp(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  if (!response.ok) return response;
  let source = await response.text();
  const dictionaryCall = `  ${clientFunctionCall(plannerDictionaryUpgrade)};\n\n  const LABELS = {`;
  source = source.replace("  const LABELS = {", dictionaryCall);
  source = source.replace(
    "  let state = loadState();",
    `  let state = loadState();\n  const gomoRequestedLanguage = new URLSearchParams(location.search).get("lang");\n  if (gomoRequestedLanguage && LANGS[gomoRequestedLanguage]) {\n    state.language = gomoRequestedLanguage;\n    localStorage.setItem("gomo-vs-language", gomoRequestedLanguage);\n  }`
  );
  source = source.replace(
    '    localStorage.setItem("gomo-vs-language", state.language);',
    '    localStorage.setItem("gomo-vs-language", state.language);\n    localStorage.setItem("gomo-central-language", state.language);'
  );
  return javascriptResponse(source, response);
}

async function serveCoachApp(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  if (!response.ok) return response;
  let source = await response.text();
  source = source.replace(
    '      EXTERNAL_LINKS.rankings = RANKINGS_URL;\n      EXTERNAL_LINKS.classements = RANKINGS_URL;',
    '      delete EXTERNAL_LINKS.rankings;\n      delete EXTERNAL_LINKS.classements;'
  );
  source = source.replace(
    '  let activeCategory = "all";',
    `  ${clientFunctionCall(coachDictionaryUpgrade)};\n\n  let activeCategory = "all";`
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-gomo-central-version", VERSION);
  headers.set("content-type", "application/javascript; charset=utf-8");
  return new Response(source, { status: response.status, statusText: response.statusText, headers });
}

async function serveCentralServiceWorker(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  if (!response.ok) return response;
  let source = await response.text();
  source = source.replace(
    '  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;',
    '  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/shiny-radar/")) return;'
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("content-type", "application/javascript; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-gomo-central-version", VERSION);
  return new Response(source, { status: response.status, statusText: response.statusText, headers });
}

function createShinyRequest(target, request) {
  const headers = new Headers();
  for (const name of SHINY_FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const init = {
    method: request.method,
    headers,
    redirect: "follow",
    signal: request.signal
  };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  return new Request(target, init);
}

async function proxyShiny(request, env) {
  const incoming = new URL(request.url);
  const suffix = incoming.pathname.slice(SHINY_PREFIX.length) || "/";
  const target = new URL(suffix + incoming.search, SHINY_ORIGIN);
  const upstream = await env.SHINY.fetch(createShinyRequest(target, request));
  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return upstream;

  const rewritten = new HTMLRewriter()
    .on("head", new ShinyHeadBoot())
    .on("link[href]", new ShinyAssetPrefix("href"))
    .on("script[src]", new ShinyAssetPrefix("src"))
    .on("img[src]", new ShinyAssetPrefix("src"))
    .on("#copyTodayBtn", new ShinyCopyButton())
    .transform(upstream);
  const headers = new Headers(rewritten.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("x-gomo-central-version", VERSION);
  return new Response(rewritten.body, { status: rewritten.status, statusText: rewritten.statusText, headers });
}

async function rewriteCentralHtml(response) {
  const rewritten = new HTMLRewriter()
    .on("script[src]", new VersionedCentralScripts())
    .transform(response);
  const headers = new Headers(rewritten.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("x-gomo-central-version", VERSION);
  return new Response(rewritten.body, { status: rewritten.status, statusText: rewritten.statusText, headers });
}

async function rewritePlannerHtml(response) {
  const rewritten = new HTMLRewriter()
    .on("img[src]", new PlannerMascotImage())
    .on("link[href]", new PlannerMascotLink())
    .on("head", new PlannerHeadStyle())
    .transform(response);
  const headers = new Headers(rewritten.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("x-gomo-central-version", VERSION);
  return new Response(rewritten.body, { status: rewritten.status, statusText: rewritten.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === `${SHINY_PREFIX}`) {
      url.pathname = `${SHINY_PREFIX}/`;
      return Response.redirect(url.toString(), 308);
    }
    if (url.pathname.startsWith(`${SHINY_PREFIX}/`)) return proxyShiny(request, env);
    if (url.pathname === "/api/shiny-data" || url.pathname === "/fallback.json") {
      const target = new URL(url.pathname + url.search, SHINY_ORIGIN);
      return env.SHINY.fetch(createShinyRequest(target, request));
    }
    if (url.pathname === "/assets/app-v1.5.js") return serveCentralApp(request, env, ctx);
    if (url.pathname === "/assets/gomo-v19.js") return serveCoachApp(request, env, ctx);
    if (url.pathname === "/vs-planner/app-v4.js") return servePlannerApp(request, env, ctx);
    if (url.pathname === "/sw.js") return serveCentralServiceWorker(request, env, ctx);

    const response = await baseWorker.fetch(request, env, ctx);
    if (!response.headers.get("content-type")?.includes("text/html")) return response;
    if (url.pathname.startsWith("/vs-planner/")) return rewritePlannerHtml(response);
    return rewriteCentralHtml(response);
  }
};
