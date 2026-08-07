
"use strict";

const languages = {
  fr:{flag:"🇫🇷",label:"Français",short:"FR"},
  de:{flag:"🇩🇪",label:"Deutsch",short:"DE"},
  en:{flag:"🇬🇧",label:"English",short:"EN"},
  ro:{flag:"🇷🇴",label:"Română",short:"RO"},
  uk:{flag:"🇺🇦",label:"Українська",short:"UA"},
  ko:{flag:"🇰🇷",label:"한국어",short:"KO"},
  hr:{flag:"🇭🇷",label:"Hrvatski",short:"HR"},
  pt:{flag:"🇵🇹",label:"Português",short:"PT"}
};

const LIVE_TRANSLATIONS = {
  fr: {
    "nav.communication":"Traducteur",
    "ask.demoTitle":"Assistant GoMo actif",
    "ask.demoText":"Les réponses utilisent les informations GoMo et Last War déjà vérifiées.",
    "ask.demoReply":"Je n’ai pas pu répondre pour le moment.",
    "ask.loading":"GoMo prépare la réponse…",
    "ask.error":"La réponse est momentanément indisponible.",
    "capture.choose":"Choisis d’abord une capture.",
    "capture.running":"Analyse en cours…",
    "capture.done":"Analyse terminée",
    "capture.error":"Analyse indisponible",
    "capture.validation":"La capture est envoyée à l’IA pour analyse, puis n’est pas enregistrée par GoMo Central. Vérifie toujours le résultat.",
    "communication.eyebrow":"TRADUCTION",
    "communication.title":"Traducteur GoMo",
    "communication.new":"Nouveau texte",
    "communication.nameLabel":"Nom (facultatif)",
    "communication.namePlaceholder":"Nom ou joueur",
    "communication.messageLabel":"Texte",
    "actions.publish":"Ajouter",
    "communication.emptyTitle":"Ajoute un texte à traduire",
    "communication.emptyText":"Le texte est enregistré sur cet appareil. Il est envoyé à l’IA seulement lorsque tu demandes une traduction.",
    "communication.nextTitle":"Mode privé",
    "communication.nextText":"Rien n’est publié ni partagé avec les autres membres.",
    "communication.demoNotice":"Le texte est conservé localement et transmis à l’IA uniquement pour l’action demandée.",
    "communication.translating":"Traduction…",
    "communication.explaining":"Explication…",
    "communication.failed":"Action momentanément indisponible.",
    "news.demoTitle":"GoMo Central est prêt",
    "news.demoText":"Train, classements, VS Planner, Shiny Radar, analyse IA, traduction et guides sont accessibles depuis un seul endroit.",
    "news.emptyTitle":"GoMo un jour, GoMo pour toujours",
    "news.emptyText":"Les informations importantes de l’alliance seront ajoutées ici après validation.",
    "tools.rankings":"Podiums VS, donations et Tempête du désert.",
    "tools.rankingsTitle":"Classements",
    "tools.analysis":"Analyse des captures Last War avec des résultats vérifiables.",
    "tools.translate":"Traduction simple dans les langues de l’alliance.",
    "tools.news":"Annonces et informations importantes de l’alliance.",
    "tools.open":"Ouvrir"
  },
  de: {
    "nav.communication":"Übersetzer",
    "ask.demoTitle":"GoMo-Assistent aktiv",
    "ask.demoText":"Die Antworten verwenden bereits geprüfte GoMo- und Last-War-Informationen.",
    "ask.demoReply":"Im Moment konnte ich nicht antworten.",
    "ask.loading":"GoMo bereitet die Antwort vor…",
    "ask.error":"Die Antwort ist vorübergehend nicht verfügbar.",
    "capture.choose":"Wähle zuerst einen Screenshot.",
    "capture.running":"Analyse läuft…",
    "capture.done":"Analyse abgeschlossen",
    "capture.error":"Analyse nicht verfügbar",
    "capture.validation":"Der Screenshot wird zur Analyse an die KI gesendet und danach von GoMo Central nicht gespeichert. Prüfe das Ergebnis immer.",
    "communication.eyebrow":"ÜBERSETZUNG",
    "communication.title":"GoMo-Übersetzer",
    "communication.new":"Neuer Text",
    "communication.nameLabel":"Name (optional)",
    "communication.namePlaceholder":"Name oder Spieler",
    "communication.messageLabel":"Text",
    "actions.publish":"Hinzufügen",
    "communication.emptyTitle":"Füge einen Text zum Übersetzen hinzu",
    "communication.emptyText":"Der Text wird auf diesem Gerät gespeichert. Er wird nur an die KI gesendet, wenn du eine Übersetzung anforderst.",
    "communication.nextTitle":"Privater Modus",
    "communication.nextText":"Nichts wird veröffentlicht oder mit anderen Mitgliedern geteilt.",
    "communication.demoNotice":"Der Text bleibt lokal gespeichert und wird nur für die angeforderte Aktion an die KI übertragen.",
    "communication.translating":"Übersetzung…",
    "communication.explaining":"Erklärung…",
    "communication.failed":"Aktion vorübergehend nicht verfügbar.",
    "news.demoTitle":"GoMo Central ist bereit",
    "news.demoText":"Zug, Ranglisten, VS Planner, Shiny Radar, KI-Analyse, Übersetzung und Anleitungen sind an einem Ort verfügbar.",
    "news.emptyTitle":"Einmal GoMo, immer GoMo",
    "news.emptyText":"Wichtige Allianz-Informationen werden hier nach der Bestätigung ergänzt.",
    "tools.rankings":"VS-, Spenden- und Wüstensturm-Podien.",
    "tools.rankingsTitle":"Ranglisten",
    "tools.analysis":"Last-War-Screenshots mit überprüfbaren Ergebnissen analysieren.",
    "tools.translate":"Einfache Übersetzung in die Sprachen der Allianz.",
    "tools.news":"Ankündigungen und wichtige Allianz-Informationen.",
    "tools.open":"Öffnen"
  },
  en: {
    "nav.communication":"Translator",
    "ask.demoTitle":"GoMo Assistant active",
    "ask.demoText":"Answers use verified GoMo and Last War information.",
    "ask.demoReply":"I could not answer right now.",
    "ask.loading":"GoMo is preparing the answer…",
    "ask.error":"The answer is temporarily unavailable.",
    "capture.choose":"Choose a screenshot first.",
    "capture.running":"Analysis in progress…",
    "capture.done":"Analysis complete",
    "capture.error":"Analysis unavailable",
    "capture.validation":"The screenshot is sent to AI for analysis and is not stored by GoMo Central afterwards. Always verify the result.",
    "communication.eyebrow":"TRANSLATION",
    "communication.title":"GoMo Translator",
    "communication.new":"New text",
    "communication.nameLabel":"Name (optional)",
    "communication.namePlaceholder":"Name or player",
    "communication.messageLabel":"Text",
    "actions.publish":"Add",
    "communication.emptyTitle":"Add text to translate",
    "communication.emptyText":"The text is stored on this device. It is sent to AI only when you request a translation.",
    "communication.nextTitle":"Private mode",
    "communication.nextText":"Nothing is published or shared with other members.",
    "communication.demoNotice":"The text is kept locally and sent to AI only for the action you request.",
    "communication.translating":"Translating…",
    "communication.explaining":"Explaining…",
    "communication.failed":"Action temporarily unavailable.",
    "news.demoTitle":"GoMo Central is ready",
    "news.demoText":"Train, rankings, VS Planner, Shiny Radar, AI analysis, translation and guides are available in one place.",
    "news.emptyTitle":"GoMo once, GoMo forever",
    "news.emptyText":"Important alliance information will be added here after confirmation.",
    "tools.rankings":"VS, donations and Desert Storm podiums.",
    "tools.rankingsTitle":"Rankings",
    "tools.analysis":"Analyze Last War screenshots with verifiable results.",
    "tools.translate":"Simple translation into the alliance languages.",
    "tools.news":"Alliance announcements and important information.",
    "tools.open":"Open"
  },
  ro: {
    "nav.communication":"Traducător",
    "ask.demoTitle":"Asistentul GoMo este activ",
    "ask.demoText":"Răspunsurile folosesc informații GoMo și Last War deja verificate.",
    "ask.demoReply":"Nu am putut răspunde acum.",
    "ask.loading":"GoMo pregătește răspunsul…",
    "ask.error":"Răspunsul este momentan indisponibil.",
    "capture.choose":"Alege mai întâi o captură.",
    "capture.running":"Analiză în curs…",
    "capture.done":"Analiză terminată",
    "capture.error":"Analiză indisponibilă",
    "capture.validation":"Captura este trimisă către IA pentru analiză, apoi nu este stocată de GoMo Central. Verifică întotdeauna rezultatul.",
    "communication.eyebrow":"TRADUCERE",
    "communication.title":"Traducător GoMo",
    "communication.new":"Text nou",
    "communication.nameLabel":"Nume (opțional)",
    "communication.namePlaceholder":"Nume sau jucător",
    "communication.messageLabel":"Text",
    "actions.publish":"Adaugă",
    "communication.emptyTitle":"Adaugă un text de tradus",
    "communication.emptyText":"Textul este salvat pe acest dispozitiv. Este trimis către IA doar când ceri o traducere.",
    "communication.nextTitle":"Mod privat",
    "communication.nextText":"Nimic nu este publicat sau distribuit altor membri.",
    "communication.demoNotice":"Textul este păstrat local și trimis către IA doar pentru acțiunea cerută.",
    "communication.translating":"Se traduce…",
    "communication.explaining":"Se explică…",
    "communication.failed":"Acțiunea este momentan indisponibilă.",
    "news.demoTitle":"GoMo Central este gata",
    "news.demoText":"Trenul, clasamentele, VS Planner, Shiny Radar, analiza IA, traducerea și ghidurile sunt într-un singur loc.",
    "news.emptyTitle":"GoMo o dată, GoMo pentru totdeauna",
    "news.emptyText":"Informațiile importante ale alianței vor fi adăugate aici după confirmare.",
    "tools.rankings":"Podiumuri VS, donații și Furtuna din deșert.",
    "tools.rankingsTitle":"Clasamente",
    "tools.analysis":"Analizează capturi Last War cu rezultate verificabile.",
    "tools.translate":"Traducere simplă în limbile alianței.",
    "tools.news":"Anunțuri și informații importante ale alianței.",
    "tools.open":"Deschide"
  },
  uk: {
    "nav.communication":"Перекладач",
    "ask.demoTitle":"Помічник GoMo активний",
    "ask.demoText":"Відповіді використовують уже перевірену інформацію GoMo та Last War.",
    "ask.demoReply":"Зараз не вдалося відповісти.",
    "ask.loading":"GoMo готує відповідь…",
    "ask.error":"Відповідь тимчасово недоступна.",
    "capture.choose":"Спочатку виберіть знімок.",
    "capture.running":"Триває аналіз…",
    "capture.done":"Аналіз завершено",
    "capture.error":"Аналіз недоступний",
    "capture.validation":"Знімок надсилається ШІ для аналізу, після чого GoMo Central його не зберігає. Завжди перевіряйте результат.",
    "communication.eyebrow":"ПЕРЕКЛАД",
    "communication.title":"Перекладач GoMo",
    "communication.new":"Новий текст",
    "communication.nameLabel":"Ім’я (необов’язково)",
    "communication.namePlaceholder":"Ім’я або гравець",
    "communication.messageLabel":"Текст",
    "actions.publish":"Додати",
    "communication.emptyTitle":"Додайте текст для перекладу",
    "communication.emptyText":"Текст зберігається на цьому пристрої. Він надсилається ШІ лише тоді, коли ви просите переклад.",
    "communication.nextTitle":"Приватний режим",
    "communication.nextText":"Нічого не публікується й не передається іншим учасникам.",
    "communication.demoNotice":"Текст зберігається локально й надсилається ШІ лише для запитаної дії.",
    "communication.translating":"Переклад…",
    "communication.explaining":"Пояснення…",
    "communication.failed":"Дія тимчасово недоступна.",
    "news.demoTitle":"GoMo Central готовий",
    "news.demoText":"Потяг, рейтинги, VS Planner, Shiny Radar, аналіз ШІ, переклад і посібники доступні в одному місці.",
    "news.emptyTitle":"GoMo раз — GoMo назавжди",
    "news.emptyText":"Важливу інформацію альянсу буде додано сюди після підтвердження.",
    "tools.rankings":"Подіуми VS, пожертв і Бурі в пустелі.",
    "tools.rankingsTitle":"Рейтинги",
    "tools.analysis":"Аналіз знімків Last War із перевірюваними результатами.",
    "tools.translate":"Простий переклад мовами альянсу.",
    "tools.news":"Оголошення та важлива інформація альянсу.",
    "tools.open":"Відкрити"
  },
  ko: {
    "nav.communication":"번역기",
    "ask.demoTitle":"GoMo 도우미 활성화",
    "ask.demoText":"답변은 확인된 GoMo 및 Last War 정보를 사용합니다.",
    "ask.demoReply":"지금은 답변할 수 없습니다.",
    "ask.loading":"GoMo가 답변을 준비 중입니다…",
    "ask.error":"답변을 일시적으로 사용할 수 없습니다.",
    "capture.choose":"먼저 스크린샷을 선택하세요.",
    "capture.running":"분석 중…",
    "capture.done":"분석 완료",
    "capture.error":"분석 사용 불가",
    "capture.validation":"스크린샷은 분석을 위해 AI로 전송되며, 이후 GoMo Central에 저장되지 않습니다. 항상 결과를 확인하세요.",
    "communication.eyebrow":"번역",
    "communication.title":"GoMo 번역기",
    "communication.new":"새 텍스트",
    "communication.nameLabel":"이름 (선택)",
    "communication.namePlaceholder":"이름 또는 플레이어",
    "communication.messageLabel":"텍스트",
    "actions.publish":"추가",
    "communication.emptyTitle":"번역할 텍스트를 추가하세요",
    "communication.emptyText":"텍스트는 이 기기에 저장됩니다. 번역을 요청할 때만 AI로 전송됩니다.",
    "communication.nextTitle":"비공개 모드",
    "communication.nextText":"다른 멤버에게 게시되거나 공유되지 않습니다.",
    "communication.demoNotice":"텍스트는 로컬에 보관되며 요청한 작업을 위해서만 AI로 전송됩니다.",
    "communication.translating":"번역 중…",
    "communication.explaining":"설명 중…",
    "communication.failed":"작업을 일시적으로 사용할 수 없습니다.",
    "news.demoTitle":"GoMo Central 준비 완료",
    "news.demoText":"열차, 순위, VS Planner, Shiny Radar, AI 분석, 번역 및 가이드를 한곳에서 이용할 수 있습니다.",
    "news.emptyTitle":"한번 GoMo는 영원한 GoMo",
    "news.emptyText":"중요한 동맹 정보는 확인 후 여기에 추가됩니다.",
    "tools.rankings":"VS, 기부 및 사막 폭풍 순위.",
    "tools.rankingsTitle":"순위",
    "tools.analysis":"검증 가능한 결과로 Last War 스크린샷을 분석합니다.",
    "tools.translate":"동맹 언어로 간단히 번역합니다.",
    "tools.news":"동맹 공지 및 중요 정보.",
    "tools.open":"열기"
  },
  hr: {
    "nav.communication":"Prevoditelj",
    "ask.demoTitle":"GoMo pomoćnik je aktivan",
    "ask.demoText":"Odgovori koriste već provjerene GoMo i Last War informacije.",
    "ask.demoReply":"Trenutačno nisam mogao odgovoriti.",
    "ask.loading":"GoMo priprema odgovor…",
    "ask.error":"Odgovor trenutačno nije dostupan.",
    "capture.choose":"Najprije odaberi snimku.",
    "capture.running":"Analiza je u tijeku…",
    "capture.done":"Analiza završena",
    "capture.error":"Analiza nije dostupna",
    "capture.validation":"Snimka se šalje AI-ju na analizu, a GoMo Central je nakon toga ne sprema. Uvijek provjeri rezultat.",
    "communication.eyebrow":"PRIJEVOD",
    "communication.title":"GoMo prevoditelj",
    "communication.new":"Novi tekst",
    "communication.nameLabel":"Ime (nije obavezno)",
    "communication.namePlaceholder":"Ime ili igrač",
    "communication.messageLabel":"Tekst",
    "actions.publish":"Dodaj",
    "communication.emptyTitle":"Dodaj tekst za prijevod",
    "communication.emptyText":"Tekst se sprema na ovom uređaju. AI-ju se šalje samo kada zatražiš prijevod.",
    "communication.nextTitle":"Privatni način",
    "communication.nextText":"Ništa se ne objavljuje niti dijeli s drugim članovima.",
    "communication.demoNotice":"Tekst se čuva lokalno i šalje AI-ju samo za zatraženu radnju.",
    "communication.translating":"Prevođenje…",
    "communication.explaining":"Objašnjavanje…",
    "communication.failed":"Radnja trenutačno nije dostupna.",
    "news.demoTitle":"GoMo Central je spreman",
    "news.demoText":"Vlak, poredak, VS Planner, Shiny Radar, AI analiza, prijevod i vodiči dostupni su na jednom mjestu.",
    "news.emptyTitle":"Jednom GoMo, zauvijek GoMo",
    "news.emptyText":"Važne informacije saveza bit će dodane ovdje nakon potvrde.",
    "tools.rankings":"VS, donacije i Pustinjska oluja — pobjednička postolja.",
    "tools.rankingsTitle":"Poredak",
    "tools.analysis":"Analiziraj Last War snimke s provjerljivim rezultatima.",
    "tools.translate":"Jednostavan prijevod na jezike saveza.",
    "tools.news":"Obavijesti i važne informacije saveza.",
    "tools.open":"Otvori"
  }
};

const GUIDE_DETAILS = {
  fr: {
    vs:["Utilise VS Planner avant de dépenser : l’objectif est 7,2 M, pas le maximum.","Active « semaine d’économie » pour garder les ressources des jours suivants.","Vérifie le jour VS et désactive toute ressource que tu ne veux pas utiliser."],
    heroes:["Améliore d’abord l’équipe réellement utilisée.","Avant une dépense rare, vérifie le héros, le niveau, la puissance et l’objet visibles.","Si la capture ne suffit pas, le résultat doit rester « À confirmer »."],
    shiny:["Les jours Shiny du serveur 1591 sont mardi et samedi.","Le serveur 1591 n’apparaît jamais dans la liste des serveurs extérieurs.","Utilise Shiny Radar pour les confirmations du Bot et l’historique."],
    train:["Le planning de la semaine va du dimanche au samedi.","Rotation prévue : 4 conducteurs R4/R5 et 3 conducteurs R3, plus les VIP R3.","Un R3 déjà premier attend son prochain tour avant de reprendre le train."],
    desert:["Deux créneaux sont suivis : environ 13 h 30 et 22 h 30.","Une saisie oubliée peut être ajoutée le lendemain.","Les résultats comptent dans le classement hebdomadaire."],
    events:["Épreuve du général : choisir au maximum 4★ si l’équipe n’est pas certaine.","Prédateur céleste : quota limité, meilleure équipe et aucune attaque gaspillée.","Avant de dormir le vendredi : activer le bouclier pour protéger les troupes."]
  },
  de: {
    vs:["Nutze den VS Planner vor dem Ausgeben: Das Ziel sind 7,2 Mio., nicht das Maximum.","Aktiviere die Sparwoche, um Ressourcen für die nächsten Tage zu behalten.","Prüfe den VS-Tag und deaktiviere jede Ressource, die du nicht einsetzen willst."],
    heroes:["Verbessere zuerst das Team, das du wirklich benutzt.","Prüfe vor seltenen Ausgaben den sichtbaren Helden, das Level, die Stärke und den Gegenstand.","Reicht der Screenshot nicht aus, bleibt das Ergebnis „Zu bestätigen“."],
    shiny:["Shiny-Tage auf Server 1591 sind Dienstag und Samstag.","Server 1591 erscheint nie in der Liste externer Server.","Nutze Shiny Radar für Bot-Bestätigungen und den Verlauf."],
    train:["Die Wochenplanung läuft von Sonntag bis Samstag.","Geplante Rotation: 4 R4/R5-Fahrer und 3 R3-Fahrer sowie R3-VIP.","Ein R3 auf Platz eins wartet bis zu seiner nächsten Rotation."],
    desert:["Zwei Zeiten werden verfolgt: ungefähr 13:30 und 22:30 Uhr.","Ein vergessener Eintrag kann am Folgetag ergänzt werden.","Die Ergebnisse zählen für die Wochenrangliste."],
    events:["Generalprüfung: höchstens 4★ wählen, wenn das Team nicht sicher ist.","Himmlischer Jäger: begrenztes Kontingent, bestes Team, keine Angriffe verschwenden.","Vor dem Schlafen am Freitag den Schild aktivieren, um die Truppen zu schützen."]
  },
  en: {
    vs:["Use VS Planner before spending: the target is 7.2M, not the maximum.","Enable Economy Week to save resources for the following days.","Check the VS day and disable any resource you do not want to use."],
    heroes:["Upgrade the team you actually use first.","Before spending rare items, check the visible hero, level, power and item.","If the screenshot is insufficient, the result must remain ‘To confirm’."],
    shiny:["Server 1591 Shiny days are Tuesday and Saturday.","Server 1591 never appears in the outside-server list.","Use Shiny Radar for Bot confirmations and history."],
    train:["The weekly plan runs from Sunday to Saturday.","Planned rotation: 4 R4/R5 drivers and 3 R3 drivers, plus R3 VIPs.","An R3 already in first place waits for their next turn before driving again."],
    desert:["Two time slots are tracked: around 13:30 and 22:30.","A missed entry can be added the next day.","Results count toward the weekly ranking."],
    events:["General Trial: choose no more than 4★ when the team is uncertain.","Celestial Predator: limited quota, strongest team and no wasted attacks.","Before sleeping on Friday, activate the shield to protect troops."]
  },
  ro: {
    vs:["Folosește VS Planner înainte de a cheltui: ținta este 7,2 M, nu maximul.","Activează Săptămâna de economie pentru a păstra resursele zilelor următoare.","Verifică ziua VS și dezactivează resursele pe care nu vrei să le folosești."],
    heroes:["Îmbunătățește mai întâi echipa pe care o folosești cu adevărat.","Înainte de o cheltuială rară, verifică eroul, nivelul, puterea și obiectul vizibile.","Dacă captura nu este suficientă, rezultatul rămâne „De confirmat”."],
    shiny:["Zilele Shiny ale serverului 1591 sunt marți și sâmbătă.","Serverul 1591 nu apare niciodată în lista serverelor exterioare.","Folosește Shiny Radar pentru confirmările Botului și istoric."],
    train:["Planificarea săptămânii este de duminică până sâmbătă.","Rotație: 4 conductori R4/R5 și 3 conductori R3, plus VIP R3.","Un R3 deja pe primul loc așteaptă următoarea rotație."],
    desert:["Sunt urmărite două intervale: aproximativ 13:30 și 22:30.","O înregistrare uitată poate fi adăugată a doua zi.","Rezultatele intră în clasamentul săptămânal."],
    events:["Proba generalului: alege cel mult 4★ dacă echipa nu este sigură.","Prădător celest: cotă limitată, cea mai bună echipă, fără atacuri irosite.","Vineri, înainte de somn, activează scutul pentru a proteja trupele."]
  },
  uk: {
    vs:["Перед витратами використовуйте VS Planner: мета — 7,2 млн, а не максимум.","Увімкніть Тиждень економії, щоб зберегти ресурси на наступні дні.","Перевірте день VS і вимкніть ресурси, які не хочете використовувати."],
    heroes:["Спочатку покращуйте команду, якою справді користуєтеся.","Перед витратою рідкісних предметів перевірте видимі героя, рівень, силу й предмет.","Якщо знімка недостатньо, результат має залишатися «Потрібне підтвердження»."],
    shiny:["Дні Shiny сервера 1591 — вівторок і субота.","Сервер 1591 ніколи не входить до списку зовнішніх серверів.","Використовуйте Shiny Radar для підтверджень бота та історії."],
    train:["Тижневий план триває з неділі до суботи.","Ротація: 4 водії R4/R5 і 3 водії R3, а також VIP R3.","R3, який уже був першим, чекає наступної ротації."],
    desert:["Відстежуються два часи: приблизно 13:30 та 22:30.","Пропущений запис можна додати наступного дня.","Результати входять до тижневого рейтингу."],
    events:["Випробування генерала: обирайте не більше 4★, якщо команда не впевнена.","Небесний хижак: ліміт атак, найсильніша команда, без марних атак.","У п’ятницю перед сном активуйте щит для захисту військ."]
  },
  ko: {
    vs:["소비 전에 VS Planner를 사용하세요. 목표는 최대치가 아니라 7.2M입니다.","절약 주간을 켜 다음 날의 자원을 보존하세요.","VS 요일을 확인하고 사용하지 않을 자원은 비활성화하세요."],
    heroes:["실제로 사용하는 팀부터 강화하세요.","희귀 자원을 쓰기 전에 화면에 보이는 영웅, 레벨, 전투력과 아이템을 확인하세요.","스크린샷이 충분하지 않으면 결과는 ‘확인 필요’로 남겨야 합니다."],
    shiny:["1591 서버의 Shiny 요일은 화요일과 토요일입니다.","1591 서버는 외부 서버 목록에 포함되지 않습니다.","Bot 확인과 기록은 Shiny Radar에서 확인하세요."],
    train:["주간 계획은 일요일부터 토요일까지입니다.","예정 로테이션: R4/R5 운전수 4명, R3 운전수 3명과 R3 VIP.","이미 1위를 한 R3는 다음 순서까지 기다립니다."],
    desert:["약 13:30과 22:30의 두 시간대를 기록합니다.","누락된 입력은 다음 날 추가할 수 있습니다.","결과는 주간 순위에 반영됩니다."],
    events:["장군의 시험: 팀이 확실하지 않으면 최대 4★를 선택하세요.","천상의 포식자: 제한된 횟수, 최강 팀 사용, 공격 낭비 금지.","금요일 잠들기 전에 병력 보호를 위해 보호막을 켜세요."]
  },
  hr: {
    vs:["Prije trošenja koristi VS Planner: cilj je 7,2 M, a ne maksimum.","Uključi Tjedan štednje kako bi sačuvao resurse za sljedeće dane.","Provjeri VS dan i isključi svaki resurs koji ne želiš koristiti."],
    heroes:["Najprije poboljšaj tim koji stvarno koristiš.","Prije rijetkog troška provjeri vidljivog heroja, razinu, snagu i predmet.","Ako snimka nije dovoljna, rezultat ostaje „Za potvrdu“."],
    shiny:["Shiny dani servera 1591 su utorak i subota.","Server 1591 nikad se ne pojavljuje na popisu vanjskih servera.","Koristi Shiny Radar za potvrde Bota i povijest."],
    train:["Tjedni plan traje od nedjelje do subote.","Planirana rotacija: 4 R4/R5 vozača i 3 R3 vozača, plus R3 VIP.","R3 koji je već bio prvi čeka svoj sljedeći red."],
    desert:["Prate se dva termina: oko 13:30 i 22:30.","Propušteni unos može se dodati sljedeći dan.","Rezultati ulaze u tjedni poredak."],
    events:["Generalova kušnja: odaberi najviše 4★ ako tim nije siguran.","Nebeski predator: ograničena kvota, najjači tim i bez uzaludnih napada.","Prije spavanja u petak uključi štit kako bi zaštitio trupe."]
  }
};

const EXTERNAL_LINKS = {
  train: "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyTrainPlanCard",
  rankings: "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyChampionsCard",
  classements: "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyChampionsCard",
  shiny: "https://gomo-shiny-central.gjp86wh7p2.workers.dev/",
  "shiny-radar": "https://gomo-shiny-central.gjp86wh7p2.workers.dev/",
  "vs-planner": "/vs-planner/",
  "gomo-assistant": "https://chic-sopapillas-82fbc8.netlify.app/"
};

const fr = {
  "equal.title":"Tous ensemble",
  "equal.text":"Même accès et même place pour chaque membre.",
  "nav.home":"Accueil",
  "nav.ask":"Demander à GoMo",
  "nav.capture":"Analyser une capture",
  "nav.communication":"Communication",
  "nav.news":"Actualités",
  "nav.tools":"Outils GoMo",
  "nav.guides":"Conseils Last War",
  "free.title":"Mode gratuit",
  "free.text":"Aucune facturation automatique",
  "actions.install":"Installer sur l’appareil",
  "actions.send":"Envoyer",
  "actions.cancel":"Annuler",
  "actions.publish":"Publier",
  "actions.original":"Voir le texte original",
  "actions.delete":"Supprimer",
  "home.title":"Tout GoMo. Simplement.",
  "home.subtitle":"Un seul espace pour comprendre, communiquer, analyser les captures et accéder à tous les outils GoMo.",
  "home.ask":"Demander à GoMo",
  "home.capture":"Envoyer une capture",
  "home.quick":"ACCÈS RAPIDE",
  "home.choose":"Que veux-tu faire ?",
  "status.base":"Base centrale active",
  "status.detail":"7 langues • iPhone • Android • ordinateur",
  "cards.askTitle":"Je n’ai pas compris",
  "cards.askText":"Demande une explication simple dans ta langue.",
  "cards.captureTitle":"Analyser une capture",
  "cards.captureText":"Envoie une image de Last War et vérifie le résultat.",
  "cards.communicationTitle":"Parler avec GoMo",
  "cards.communicationText":"Pose une question ou aide un autre membre.",
  "cards.toolsTitle":"Tous les outils",
  "cards.toolsText":"Assistant, VS Planner, Shiny Radar et Coach.",
  "cards.newsTitle":"Actualités GoMo",
  "cards.newsText":"Informations et événements importants.",
  "cards.guidesTitle":"Conseils Last War",
  "cards.guidesText":"Héros, armes, VS, événements et ressources.",
  "ask.eyebrow":"ASSISTANT GOMO",
  "ask.title":"Demander à GoMo",
  "ask.welcome":"Explique-moi ce que tu ne comprends pas. Je pourrai reformuler, traduire ou chercher la bonne information GoMo.",
  "ask.placeholder":"Écris ta question…",
  "ask.examples":"Exemples",
  "ask.example1":"Explique-moi le VS du jour",
  "ask.example2":"Que dois-je améliorer ?",
  "ask.example3":"Traduis une consigne",
  "ask.demoTitle":"Base de démonstration",
  "ask.demoText":"L’interface est prête. La véritable IA gratuite sera branchée à l’étape suivante.",
  "ask.demoReply":"J’ai bien reçu ta question. La connexion à l’IA gratuite sera ajoutée à l’étape suivante.",
  "capture.eyebrow":"CAPTURES LAST WAR",
  "capture.title":"Analyser une capture",
  "capture.dropTitle":"Choisis une capture",
  "capture.dropText":"Classement, ressources, Shiny, VS, héros ou événement.",
  "capture.select":"Sélectionner une image",
  "capture.result":"Résultat proposé",
  "capture.waiting":"En attente",
  "capture.ready":"Image prête",
  "capture.empty":"Le résultat apparaîtra ici après l’envoi d’une capture.",
  "capture.type":"Type détecté",
  "capture.unknown":"À confirmer",
  "capture.language":"Langue détectée",
  "capture.auto":"Automatique",
  "capture.confidence":"Confiance",
  "capture.validation":"Aucune donnée ne sera enregistrée sans validation humaine.",
  "capture.analyze":"Analyser avec l’IA",
  "communication.eyebrow":"ENTRAIDE",
  "communication.title":"Communication GoMo",
  "communication.new":"Nouveau message",
  "communication.emptyTitle":"Commence la discussion",
  "communication.emptyText":"Dans cette base, les messages sont sauvegardés sur l’appareil pour les tests.",
  "communication.nextTitle":"Prochaine étape",
  "communication.nextText":"Les comptes et messages partagés entre tous les membres seront reliés ensuite à une base gratuite.",
  "communication.nameLabel":"Nom affiché",
  "communication.namePlaceholder":"Ton nom dans Last War",
  "communication.messageLabel":"Message",
  "communication.placeholder":"Écris ton message…",
  "communication.demoNotice":"Pour cette première base, les messages restent seulement sur cet appareil.",
  "communication.translate":"Traduire",
  "communication.explain":"Expliquer avec GoMo",
  "communication.local":"Sauvegardé sur cet appareil",
  "news.eyebrow":"GOMO FOREVER",
  "news.title":"Actualités GoMo",
  "news.pinned":"Information épinglée",
  "news.demoTitle":"Bienvenue sur la nouvelle base GoMo Central",
  "news.demoText":"Le site est organisé autour de quelques fonctions simples : comprendre, communiquer, analyser et accéder aux outils.",
  "news.emptyTitle":"Les prochaines informations apparaîtront ici",
  "news.emptyText":"Elles pourront être traduites automatiquement dans la langue de chaque lecteur.",
  "tools.eyebrow":"GOMO CENTRAL",
  "tools.title":"Tous les outils GoMo",
  "tools.assistant":"Classements, train, VIP et organisation de l’alliance.",
  "tools.planner":"Préparer les ressources et atteindre l’objectif de 7,2 M.",
  "tools.radar":"Serveurs confirmés, prévisions et historique des missions.",
  "tools.coach":"Héros, armes, équipes, événements et priorités.",
  "tools.link":"Lien à connecter",
  "tools.open":"Ouvrir",
  "tools.analysis":"Analyse des captures Last War et recommandations.",
  "tools.translate":"Traduction simple pour les langues de l’alliance.",
  "tools.news":"Annonces, événements et informations importantes.",
  "guides.title":"Conseils et méthodes",
  "guides.placeholder":"Rechercher un héros, une arme ou un événement…",
  "guides.vsTitle":"Atteindre 7,2 M au VS",
  "guides.vsText":"Planifier les ressources sans gaspiller celles des jours suivants.",
  "guides.heroesTitle":"Héros et armes",
  "guides.heroesText":"Choisir les améliorations prioritaires selon l’équipe utilisée.",
  "guides.shinyTitle":"Missions Shiny",
  "guides.shinyText":"Reconnaître une mission Shiny et consulter les serveurs confirmés.",
  "guides.trainTitle":"Train et VIP",
  "guides.trainText":"Comprendre la rotation et les récompenses de la semaine.",
  "guides.desertTitle":"Tempête du désert",
  "guides.desertText":"Préparer les équipes, horaires et inscriptions.",
  "guides.eventsTitle":"Événements",
  "guides.eventsText":"Consignes simples pour les événements importants.",
  "guides.noneTitle":"Aucun conseil trouvé",
  "guides.noneText":"Essaie un autre mot ou demande directement à GoMo.",
  "language.title":"Choisir la langue"
};

const translations = {
  fr,
  de:{
    ...fr,
    "equal.title":"Alle zusammen",
    "equal.text":"Gleicher Zugang und gleicher Platz für jedes Mitglied.",
    "nav.home":"Startseite",
    "nav.ask":"GoMo fragen",
    "nav.capture":"Screenshot analysieren",
    "nav.communication":"Kommunikation",
    "nav.news":"Neuigkeiten",
    "nav.tools":"GoMo-Werkzeuge",
    "nav.guides":"Last-War-Tipps",
    "free.title":"Kostenloser Modus",
    "free.text":"Keine automatische Abrechnung",
    "actions.install":"Auf dem Gerät installieren",
    "actions.send":"Senden",
    "actions.cancel":"Abbrechen",
    "actions.publish":"Veröffentlichen",
    "actions.original":"Originaltext anzeigen",
    "actions.delete":"Löschen",
    "home.title":"Alles GoMo. Ganz einfach.",
    "home.subtitle":"Ein Ort zum Verstehen, Kommunizieren, Analysieren von Screenshots und Öffnen aller GoMo-Werkzeuge.",
    "home.ask":"GoMo fragen",
    "home.capture":"Screenshot senden",
    "home.quick":"SCHNELLZUGRIFF",
    "home.choose":"Was möchtest du tun?",
    "status.base":"Zentrale Basis aktiv",
    "status.detail":"7 Sprachen • iPhone • Android • Computer",
    "cards.askTitle":"Ich habe es nicht verstanden",
    "cards.askText":"Bitte um eine einfache Erklärung in deiner Sprache.",
    "cards.captureTitle":"Screenshot analysieren",
    "cards.captureText":"Sende ein Last-War-Bild und prüfe das Ergebnis.",
    "cards.communicationTitle":"Mit GoMo sprechen",
    "cards.communicationText":"Stelle eine Frage oder hilf einem anderen Mitglied.",
    "cards.toolsTitle":"Alle Werkzeuge",
    "cards.toolsText":"Assistant, VS Planner, Shiny Radar und Coach.",
    "cards.newsTitle":"GoMo-Neuigkeiten",
    "cards.newsText":"Wichtige Informationen und Ereignisse.",
    "cards.guidesTitle":"Last-War-Tipps",
    "cards.guidesText":"Helden, Waffen, VS, Ereignisse und Ressourcen.",
    "ask.eyebrow":"GOMO-ASSISTENT",
    "ask.title":"GoMo fragen",
    "ask.welcome":"Erkläre mir, was du nicht verstehst. Ich kann es vereinfachen, übersetzen oder die richtige GoMo-Information suchen.",
    "ask.placeholder":"Schreibe deine Frage…",
    "ask.examples":"Beispiele",
    "ask.example1":"Erkläre mir das heutige VS",
    "ask.example2":"Was soll ich verbessern?",
    "ask.example3":"Eine Anweisung übersetzen",
    "ask.demoTitle":"Demo-Basis",
    "ask.demoText":"Die Oberfläche ist bereit. Die echte kostenlose KI wird im nächsten Schritt verbunden.",
    "ask.demoReply":"Deine Frage wurde empfangen. Die kostenlose KI-Verbindung wird im nächsten Schritt hinzugefügt.",
    "capture.eyebrow":"LAST-WAR-SCREENSHOTS",
    "capture.title":"Screenshot analysieren",
    "capture.dropTitle":"Wähle einen Screenshot",
    "capture.dropText":"Rangliste, Ressourcen, Shiny, VS, Helden oder Ereignis.",
    "capture.select":"Bild auswählen",
    "capture.result":"Vorgeschlagenes Ergebnis",
    "capture.waiting":"Warten",
    "capture.ready":"Bild bereit",
    "capture.empty":"Das Ergebnis erscheint hier nach dem Hochladen eines Screenshots.",
    "capture.type":"Erkannter Typ",
    "capture.unknown":"Zu bestätigen",
    "capture.language":"Erkannte Sprache",
    "capture.auto":"Automatisch",
    "capture.confidence":"Vertrauen",
    "capture.validation":"Keine Daten werden ohne menschliche Bestätigung gespeichert.",
    "capture.analyze":"Mit KI analysieren",
    "communication.eyebrow":"HILFE",
    "communication.title":"GoMo-Kommunikation",
    "communication.new":"Neue Nachricht",
    "communication.emptyTitle":"Beginne die Diskussion",
    "communication.emptyText":"In dieser Basis werden Nachrichten zum Testen auf dem Gerät gespeichert.",
    "communication.nextTitle":"Nächster Schritt",
    "communication.nextText":"Konten und gemeinsame Echtzeitnachrichten werden anschließend mit einer kostenlosen Datenbank verbunden.",
    "communication.nameLabel":"Angezeigter Name",
    "communication.namePlaceholder":"Dein Name in Last War",
    "communication.messageLabel":"Nachricht",
    "communication.placeholder":"Schreibe deine Nachricht…",
    "communication.demoNotice":"In dieser ersten Basis bleiben Nachrichten nur auf diesem Gerät.",
    "communication.translate":"Übersetzen",
    "communication.explain":"Mit GoMo erklären",
    "communication.local":"Auf diesem Gerät gespeichert",
    "news.title":"GoMo-Neuigkeiten",
    "news.pinned":"Angeheftete Information",
    "news.demoTitle":"Willkommen auf der neuen GoMo-Central-Basis",
    "news.demoText":"Die Website konzentriert sich auf einfache Funktionen: verstehen, kommunizieren, analysieren und Werkzeuge öffnen.",
    "news.emptyTitle":"Die nächsten Informationen erscheinen hier",
    "news.emptyText":"Sie können automatisch in die Sprache jedes Lesers übersetzt werden.",
    "tools.title":"Alle GoMo-Werkzeuge",
    "tools.assistant":"Ranglisten, Zug, VIP und Allianzorganisation.",
    "tools.planner":"Ressourcen vorbereiten und das Ziel von 7,2 M erreichen.",
    "tools.radar":"Bestätigte Server, Prognosen und Missionsverlauf.",
    "tools.coach":"Helden, Waffen, Teams, Ereignisse und Prioritäten.",
    "tools.link":"Link verbinden",
    "guides.title":"Tipps und Methoden",
    "guides.placeholder":"Held, Waffe oder Ereignis suchen…",
    "guides.noneTitle":"Kein Tipp gefunden",
    "guides.noneText":"Versuche ein anderes Wort oder frage GoMo direkt.",
    "language.title":"Sprache wählen"
  },
  en:{
    ...fr,
    "equal.title":"All together",
    "equal.text":"The same access and the same place for every member.",
    "nav.home":"Home",
    "nav.ask":"Ask GoMo",
    "nav.capture":"Analyze a screenshot",
    "nav.communication":"Communication",
    "nav.news":"News",
    "nav.tools":"GoMo Tools",
    "nav.guides":"Last War Advice",
    "free.title":"Free mode",
    "free.text":"No automatic billing",
    "actions.install":"Install on device",
    "actions.send":"Send",
    "actions.cancel":"Cancel",
    "actions.publish":"Publish",
    "actions.original":"View original text",
    "actions.delete":"Delete",
    "home.title":"Everything GoMo. Simply.",
    "home.subtitle":"One place to understand, communicate, analyze screenshots and access every GoMo tool.",
    "home.ask":"Ask GoMo",
    "home.capture":"Send a screenshot",
    "home.quick":"QUICK ACCESS",
    "home.choose":"What would you like to do?",
    "status.base":"Central base active",
    "status.detail":"7 languages • iPhone • Android • computer",
    "cards.askTitle":"I did not understand",
    "cards.askText":"Ask for a simple explanation in your language.",
    "cards.captureTitle":"Analyze a screenshot",
    "cards.captureText":"Send a Last War image and verify the result.",
    "cards.communicationTitle":"Talk with GoMo",
    "cards.communicationText":"Ask a question or help another member.",
    "cards.toolsTitle":"All tools",
    "cards.toolsText":"Assistant, VS Planner, Shiny Radar and Coach.",
    "cards.newsTitle":"GoMo News",
    "cards.newsText":"Important information and events.",
    "cards.guidesTitle":"Last War Advice",
    "cards.guidesText":"Heroes, weapons, VS, events and resources.",
    "ask.eyebrow":"GOMO ASSISTANT",
    "ask.title":"Ask GoMo",
    "ask.welcome":"Explain what you do not understand. I can simplify, translate or search for the right GoMo information.",
    "ask.placeholder":"Write your question…",
    "ask.examples":"Examples",
    "ask.example1":"Explain today’s VS",
    "ask.example2":"What should I improve?",
    "ask.example3":"Translate an instruction",
    "ask.demoTitle":"Demonstration base",
    "ask.demoText":"The interface is ready. The real free AI will be connected in the next step.",
    "ask.demoReply":"Your question has been received. The free AI connection will be added in the next step.",
    "capture.eyebrow":"LAST WAR SCREENSHOTS",
    "capture.title":"Analyze a screenshot",
    "capture.dropTitle":"Choose a screenshot",
    "capture.dropText":"Ranking, resources, Shiny, VS, heroes or event.",
    "capture.select":"Select an image",
    "capture.result":"Suggested result",
    "capture.waiting":"Waiting",
    "capture.ready":"Image ready",
    "capture.empty":"The result will appear here after a screenshot is uploaded.",
    "capture.type":"Detected type",
    "capture.unknown":"To confirm",
    "capture.language":"Detected language",
    "capture.auto":"Automatic",
    "capture.confidence":"Confidence",
    "capture.validation":"No data will be saved without human validation.",
    "capture.analyze":"Analyze with AI",
    "communication.eyebrow":"SUPPORT",
    "communication.title":"GoMo Communication",
    "communication.new":"New message",
    "communication.emptyTitle":"Start the discussion",
    "communication.emptyText":"In this base, messages are saved on the device for testing.",
    "communication.nextTitle":"Next step",
    "communication.nextText":"Shared accounts and real-time messages will then be connected to a free database.",
    "communication.nameLabel":"Displayed name",
    "communication.namePlaceholder":"Your Last War name",
    "communication.messageLabel":"Message",
    "communication.placeholder":"Write your message…",
    "communication.demoNotice":"In this first base, messages remain only on this device.",
    "communication.translate":"Translate",
    "communication.explain":"Explain with GoMo",
    "communication.local":"Saved on this device",
    "news.title":"GoMo News",
    "news.pinned":"Pinned information",
    "news.demoTitle":"Welcome to the new GoMo Central base",
    "news.demoText":"The site is organized around a few simple functions: understand, communicate, analyze and access tools.",
    "news.emptyTitle":"The next updates will appear here",
    "news.emptyText":"They can be translated automatically into each reader’s language.",
    "tools.title":"All GoMo Tools",
    "tools.assistant":"Rankings, train, VIP and alliance organization.",
    "tools.planner":"Prepare resources and reach the 7.2M target.",
    "tools.radar":"Confirmed servers, forecasts and mission history.",
    "tools.coach":"Heroes, weapons, teams, events and priorities.",
    "tools.link":"Connect link",
    "guides.title":"Advice and methods",
    "guides.placeholder":"Search for a hero, weapon or event…",
    "guides.noneTitle":"No advice found",
    "guides.noneText":"Try another word or ask GoMo directly.",
    "language.title":"Choose a language"
  },
  ro:{
    ...fr,
    "equal.title":"Toți împreună",
    "equal.text":"Același acces și același loc pentru fiecare membru.",
    "nav.home":"Acasă",
    "nav.ask":"Întreabă GoMo",
    "nav.capture":"Analizează o captură",
    "nav.communication":"Comunicare",
    "nav.news":"Noutăți",
    "nav.tools":"Instrumente GoMo",
    "nav.guides":"Sfaturi Last War",
    "free.title":"Mod gratuit",
    "free.text":"Fără facturare automată",
    "actions.install":"Instalează pe dispozitiv",
    "actions.send":"Trimite",
    "actions.cancel":"Anulează",
    "actions.publish":"Publică",
    "actions.original":"Vezi textul original",
    "actions.delete":"Șterge",
    "home.title":"Tot GoMo. Simplu.",
    "home.subtitle":"Un singur loc pentru a înțelege, comunica, analiza capturi și accesa toate instrumentele GoMo.",
    "home.ask":"Întreabă GoMo",
    "home.capture":"Trimite o captură",
    "home.quick":"ACCES RAPID",
    "home.choose":"Ce dorești să faci?",
    "status.base":"Baza centrală este activă",
    "status.detail":"7 limbi • iPhone • Android • computer",
    "cards.askTitle":"Nu am înțeles",
    "cards.askText":"Cere o explicație simplă în limba ta.",
    "cards.captureTitle":"Analizează o captură",
    "cards.captureText":"Trimite o imagine Last War și verifică rezultatul.",
    "cards.communicationTitle":"Vorbește cu GoMo",
    "cards.communicationText":"Pune o întrebare sau ajută un alt membru.",
    "cards.toolsTitle":"Toate instrumentele",
    "cards.toolsText":"Assistant, VS Planner, Shiny Radar și Coach.",
    "cards.newsTitle":"Noutăți GoMo",
    "cards.newsText":"Informații și evenimente importante.",
    "cards.guidesTitle":"Sfaturi Last War",
    "cards.guidesText":"Eroi, arme, VS, evenimente și resurse.",
    "ask.eyebrow":"ASISTENT GOMO",
    "ask.title":"Întreabă GoMo",
    "ask.welcome":"Explică ce nu înțelegi. Pot simplifica, traduce sau căuta informația GoMo potrivită.",
    "ask.placeholder":"Scrie întrebarea ta…",
    "ask.examples":"Exemple",
    "ask.example1":"Explică VS-ul de astăzi",
    "ask.example2":"Ce ar trebui să îmbunătățesc?",
    "ask.example3":"Tradu o instrucțiune",
    "ask.demoTitle":"Bază demonstrativă",
    "ask.demoText":"Interfața este pregătită. IA gratuită reală va fi conectată în etapa următoare.",
    "ask.demoReply":"Întrebarea a fost primită. Conexiunea la IA gratuită va fi adăugată în etapa următoare.",
    "capture.eyebrow":"CAPTURI LAST WAR",
    "capture.title":"Analizează o captură",
    "capture.dropTitle":"Alege o captură",
    "capture.dropText":"Clasament, resurse, Shiny, VS, eroi sau eveniment.",
    "capture.select":"Selectează o imagine",
    "capture.result":"Rezultat propus",
    "capture.waiting":"În așteptare",
    "capture.ready":"Imagine pregătită",
    "capture.empty":"Rezultatul va apărea aici după trimiterea unei capturi.",
    "capture.type":"Tip detectat",
    "capture.unknown":"De confirmat",
    "capture.language":"Limbă detectată",
    "capture.auto":"Automat",
    "capture.confidence":"Încredere",
    "capture.validation":"Nicio informație nu va fi salvată fără validare umană.",
    "capture.analyze":"Analizează cu IA",
    "communication.eyebrow":"AJUTOR",
    "communication.title":"Comunicare GoMo",
    "communication.new":"Mesaj nou",
    "communication.emptyTitle":"Începe discuția",
    "communication.emptyText":"În această bază, mesajele sunt salvate pe dispozitiv pentru testare.",
    "communication.nextTitle":"Etapa următoare",
    "communication.nextText":"Conturile și mesajele comune în timp real vor fi apoi conectate la o bază de date gratuită.",
    "communication.nameLabel":"Nume afișat",
    "communication.namePlaceholder":"Numele tău din Last War",
    "communication.messageLabel":"Mesaj",
    "communication.placeholder":"Scrie mesajul tău…",
    "communication.demoNotice":"În această primă bază, mesajele rămân doar pe acest dispozitiv.",
    "communication.translate":"Tradu",
    "communication.explain":"Explică prin GoMo",
    "communication.local":"Salvat pe acest dispozitiv",
    "news.title":"Noutăți GoMo",
    "news.pinned":"Informație fixată",
    "news.demoTitle":"Bun venit pe noua bază GoMo Central",
    "news.demoText":"Site-ul este organizat în jurul câtorva funcții simple: înțelegere, comunicare, analiză și acces la instrumente.",
    "news.emptyTitle":"Următoarele informații vor apărea aici",
    "news.emptyText":"Ele vor putea fi traduse automat în limba fiecărui cititor.",
    "tools.title":"Toate instrumentele GoMo",
    "tools.assistant":"Clasamente, tren, VIP și organizarea alianței.",
    "tools.planner":"Pregătește resursele și atinge obiectivul de 7,2 M.",
    "tools.radar":"Servere confirmate, previziuni și istoricul misiunilor.",
    "tools.coach":"Eroi, arme, echipe, evenimente și priorități.",
    "tools.link":"Conectează linkul",
    "guides.title":"Sfaturi și metode",
    "guides.placeholder":"Caută un erou, o armă sau un eveniment…",
    "guides.noneTitle":"Niciun sfat găsit",
    "guides.noneText":"Încearcă alt cuvânt sau întreabă direct GoMo.",
    "language.title":"Alege limba"
  },
  uk:{
    ...fr,
    "equal.title":"Усі разом",
    "equal.text":"Однаковий доступ і однакове місце для кожного учасника.",
    "nav.home":"Головна",
    "nav.ask":"Запитати GoMo",
    "nav.capture":"Аналіз знімка",
    "nav.communication":"Спілкування",
    "nav.news":"Новини",
    "nav.tools":"Інструменти GoMo",
    "nav.guides":"Поради Last War",
    "free.title":"Безкоштовний режим",
    "free.text":"Без автоматичних платежів",
    "actions.install":"Встановити на пристрій",
    "actions.send":"Надіслати",
    "actions.cancel":"Скасувати",
    "actions.publish":"Опублікувати",
    "actions.original":"Показати оригінал",
    "actions.delete":"Видалити",
    "home.title":"Усе GoMo. Просто.",
    "home.subtitle":"Одне місце, щоб зрозуміти, спілкуватися, аналізувати знімки та відкривати всі інструменти GoMo.",
    "home.ask":"Запитати GoMo",
    "home.capture":"Надіслати знімок",
    "home.quick":"ШВИДКИЙ ДОСТУП",
    "home.choose":"Що ти хочеш зробити?",
    "status.base":"Центральна база активна",
    "status.detail":"7 мов • iPhone • Android • комп’ютер",
    "cards.askTitle":"Я не зрозумів",
    "cards.askText":"Попроси просте пояснення своєю мовою.",
    "cards.captureTitle":"Аналіз знімка",
    "cards.captureText":"Надішли зображення Last War і перевір результат.",
    "cards.communicationTitle":"Спілкування з GoMo",
    "cards.communicationText":"Постав запитання або допоможи іншому учаснику.",
    "cards.toolsTitle":"Усі інструменти",
    "cards.toolsText":"Assistant, VS Planner, Shiny Radar і Coach.",
    "cards.newsTitle":"Новини GoMo",
    "cards.newsText":"Важлива інформація та події.",
    "cards.guidesTitle":"Поради Last War",
    "cards.guidesText":"Герої, зброя, VS, події та ресурси.",
    "ask.eyebrow":"АСИСТЕНТ GOMO",
    "ask.title":"Запитати GoMo",
    "ask.welcome":"Поясни, що ти не розумієш. Я зможу спростити, перекласти або знайти потрібну інформацію GoMo.",
    "ask.placeholder":"Напиши своє запитання…",
    "ask.examples":"Приклади",
    "ask.example1":"Поясни сьогоднішній VS",
    "ask.example2":"Що мені покращити?",
    "ask.example3":"Переклади інструкцію",
    "ask.demoTitle":"Демонстраційна база",
    "ask.demoText":"Інтерфейс готовий. Справжній безкоштовний ШІ буде підключено на наступному етапі.",
    "ask.demoReply":"Запитання отримано. Безкоштовний ШІ буде підключено на наступному етапі.",
    "capture.eyebrow":"ЗНІМКИ LAST WAR",
    "capture.title":"Аналіз знімка",
    "capture.dropTitle":"Обери знімок",
    "capture.dropText":"Рейтинг, ресурси, Shiny, VS, герої або подія.",
    "capture.select":"Обрати зображення",
    "capture.result":"Запропонований результат",
    "capture.waiting":"Очікування",
    "capture.ready":"Зображення готове",
    "capture.empty":"Результат з’явиться тут після завантаження знімка.",
    "capture.type":"Виявлений тип",
    "capture.unknown":"Потрібне підтвердження",
    "capture.language":"Виявлена мова",
    "capture.auto":"Автоматично",
    "capture.confidence":"Впевненість",
    "capture.validation":"Жодні дані не будуть збережені без підтвердження людини.",
    "capture.analyze":"Аналізувати за допомогою ШІ",
    "communication.eyebrow":"ДОПОМОГА",
    "communication.title":"Спілкування GoMo",
    "communication.new":"Нове повідомлення",
    "communication.emptyTitle":"Почни обговорення",
    "communication.emptyText":"У цій базі повідомлення зберігаються на пристрої для тестування.",
    "communication.nextTitle":"Наступний етап",
    "communication.nextText":"Спільні облікові записи та повідомлення в реальному часі потім буде підключено до безкоштовної бази даних.",
    "communication.nameLabel":"Показане ім’я",
    "communication.namePlaceholder":"Твоє ім’я в Last War",
    "communication.messageLabel":"Повідомлення",
    "communication.placeholder":"Напиши повідомлення…",
    "communication.demoNotice":"У цій першій базі повідомлення залишаються лише на цьому пристрої.",
    "communication.translate":"Перекласти",
    "communication.explain":"Пояснити через GoMo",
    "communication.local":"Збережено на цьому пристрої",
    "news.title":"Новини GoMo",
    "news.pinned":"Закріплена інформація",
    "news.demoTitle":"Ласкаво просимо до нової бази GoMo Central",
    "news.demoText":"Сайт організовано навколо кількох простих функцій: зрозуміти, спілкуватися, аналізувати та відкривати інструменти.",
    "news.emptyTitle":"Наступна інформація з’явиться тут",
    "news.emptyText":"Її можна буде автоматично перекладати мовою кожного читача.",
    "tools.title":"Усі інструменти GoMo",
    "tools.assistant":"Рейтинги, потяг, VIP та організація альянсу.",
    "tools.planner":"Підготувати ресурси та досягти цілі 7,2 млн.",
    "tools.radar":"Підтверджені сервери, прогнози та історія місій.",
    "tools.coach":"Герої, зброя, команди, події та пріоритети.",
    "tools.link":"Підключити посилання",
    "guides.title":"Поради та методи",
    "guides.placeholder":"Пошук героя, зброї або події…",
    "guides.noneTitle":"Порад не знайдено",
    "guides.noneText":"Спробуй інше слово або запитай GoMo.",
    "language.title":"Оберіть мову"
  },
  ko:{
    ...fr,
    "equal.title":"모두 함께",
    "equal.text":"모든 구성원에게 같은 접근 권한과 같은 자리를 제공합니다.",
    "nav.home":"홈",
    "nav.ask":"GoMo에게 질문",
    "nav.capture":"캡처 분석",
    "nav.communication":"소통",
    "nav.news":"소식",
    "nav.tools":"GoMo 도구",
    "nav.guides":"Last War 조언",
    "free.title":"무료 모드",
    "free.text":"자동 결제 없음",
    "actions.install":"기기에 설치",
    "actions.send":"보내기",
    "actions.cancel":"취소",
    "actions.publish":"게시",
    "actions.original":"원문 보기",
    "actions.delete":"삭제",
    "home.title":"모든 GoMo 기능을 간단하게.",
    "home.subtitle":"이해, 소통, 캡처 분석과 모든 GoMo 도구를 한곳에서 사용할 수 있습니다.",
    "home.ask":"GoMo에게 질문",
    "home.capture":"캡처 보내기",
    "home.quick":"빠른 접근",
    "home.choose":"무엇을 하시겠습니까?",
    "status.base":"중앙 기본 버전 활성화",
    "status.detail":"7개 언어 • iPhone • Android • 컴퓨터",
    "cards.askTitle":"이해하지 못했어요",
    "cards.askText":"자신의 언어로 쉬운 설명을 요청하세요.",
    "cards.captureTitle":"캡처 분석",
    "cards.captureText":"Last War 이미지를 보내고 결과를 확인하세요.",
    "cards.communicationTitle":"GoMo와 소통",
    "cards.communicationText":"질문하거나 다른 구성원을 도와주세요.",
    "cards.toolsTitle":"모든 도구",
    "cards.toolsText":"Assistant, VS Planner, Shiny Radar, Coach.",
    "cards.newsTitle":"GoMo 소식",
    "cards.newsText":"중요한 정보와 이벤트.",
    "cards.guidesTitle":"Last War 조언",
    "cards.guidesText":"영웅, 무기, VS, 이벤트와 자원.",
    "ask.eyebrow":"GOMO 도우미",
    "ask.title":"GoMo에게 질문",
    "ask.welcome":"이해하지 못한 내용을 설명해 주세요. 쉽게 바꾸거나 번역하고 올바른 GoMo 정보를 찾을 수 있습니다.",
    "ask.placeholder":"질문을 작성하세요…",
    "ask.examples":"예시",
    "ask.example1":"오늘의 VS를 설명해 주세요",
    "ask.example2":"무엇을 개선해야 하나요?",
    "ask.example3":"지침을 번역해 주세요",
    "ask.demoTitle":"데모 기본 버전",
    "ask.demoText":"화면은 준비되었습니다. 실제 무료 AI는 다음 단계에서 연결됩니다.",
    "ask.demoReply":"질문을 받았습니다. 무료 AI 연결은 다음 단계에서 추가됩니다.",
    "capture.eyebrow":"LAST WAR 캡처",
    "capture.title":"캡처 분석",
    "capture.dropTitle":"캡처 선택",
    "capture.dropText":"랭킹, 자원, Shiny, VS, 영웅 또는 이벤트.",
    "capture.select":"이미지 선택",
    "capture.result":"제안된 결과",
    "capture.waiting":"대기 중",
    "capture.ready":"이미지 준비됨",
    "capture.empty":"캡처를 올리면 여기에 결과가 표시됩니다.",
    "capture.type":"감지된 유형",
    "capture.unknown":"확인 필요",
    "capture.language":"감지된 언어",
    "capture.auto":"자동",
    "capture.confidence":"신뢰도",
    "capture.validation":"사람의 확인 없이 데이터가 저장되지 않습니다.",
    "capture.analyze":"AI로 분석",
    "communication.eyebrow":"도움",
    "communication.title":"GoMo 소통",
    "communication.new":"새 메시지",
    "communication.emptyTitle":"대화를 시작하세요",
    "communication.emptyText":"이 기본 버전에서는 테스트를 위해 메시지가 기기에 저장됩니다.",
    "communication.nextTitle":"다음 단계",
    "communication.nextText":"공유 계정과 실시간 메시지는 다음에 무료 데이터베이스에 연결됩니다.",
    "communication.nameLabel":"표시 이름",
    "communication.namePlaceholder":"Last War 이름",
    "communication.messageLabel":"메시지",
    "communication.placeholder":"메시지를 작성하세요…",
    "communication.demoNotice":"이 첫 버전에서는 메시지가 이 기기에만 남습니다.",
    "communication.translate":"번역",
    "communication.explain":"GoMo로 설명",
    "communication.local":"이 기기에 저장됨",
    "news.title":"GoMo 소식",
    "news.pinned":"고정된 정보",
    "news.demoTitle":"새 GoMo Central 기본 버전에 오신 것을 환영합니다",
    "news.demoText":"사이트는 이해, 소통, 분석, 도구 접근이라는 간단한 기능을 중심으로 구성되었습니다.",
    "news.emptyTitle":"다음 정보가 여기에 표시됩니다",
    "news.emptyText":"각 독자의 언어로 자동 번역할 수 있습니다.",
    "tools.title":"모든 GoMo 도구",
    "tools.assistant":"랭킹, 열차, VIP와 동맹 조직.",
    "tools.planner":"자원을 준비하고 720만 목표 달성.",
    "tools.radar":"확인된 서버, 예측과 임무 기록.",
    "tools.coach":"영웅, 무기, 팀, 이벤트와 우선순위.",
    "tools.link":"링크 연결",
    "guides.title":"조언과 방법",
    "guides.placeholder":"영웅, 무기 또는 이벤트 검색…",
    "guides.noneTitle":"조언을 찾지 못했습니다",
    "guides.noneText":"다른 단어를 사용하거나 GoMo에게 직접 질문하세요.",
    "language.title":"언어 선택"
  },
  hr:{
    ...fr,
    "equal.title":"Svi zajedno",
    "equal.text":"Isti pristup i isto mjesto za svakog člana.",
    "nav.home":"Početna",
    "nav.ask":"Pitaj GoMo",
    "nav.capture":"Analiziraj snimku",
    "nav.communication":"Komunikacija",
    "nav.news":"Novosti",
    "nav.tools":"GoMo alati",
    "nav.guides":"Last War savjeti",
    "free.title":"Besplatni način",
    "free.text":"Bez automatske naplate",
    "actions.install":"Instaliraj na uređaj",
    "actions.send":"Pošalji",
    "actions.cancel":"Odustani",
    "actions.publish":"Objavi",
    "actions.original":"Prikaži izvorni tekst",
    "actions.delete":"Izbriši",
    "home.title":"Sve GoMo. Jednostavno.",
    "home.subtitle":"Jedno mjesto za razumijevanje, komunikaciju, analizu snimki i pristup svim GoMo alatima.",
    "home.ask":"Pitaj GoMo",
    "home.capture":"Pošalji snimku",
    "home.quick":"BRZI PRISTUP",
    "home.choose":"Što želiš učiniti?",
    "status.base":"Središnja baza aktivna",
    "status.detail":"7 jezika • iPhone • Android • računalo",
    "cards.askTitle":"Nisam razumio",
    "cards.askText":"Zatraži jednostavno objašnjenje na svom jeziku.",
    "cards.captureTitle":"Analiziraj snimku",
    "cards.captureText":"Pošalji Last War sliku i provjeri rezultat.",
    "cards.communicationTitle":"Razgovaraj s GoMo",
    "cards.communicationText":"Postavi pitanje ili pomozi drugom članu.",
    "cards.toolsTitle":"Svi alati",
    "cards.toolsText":"Assistant, VS Planner, Shiny Radar i Coach.",
    "cards.newsTitle":"GoMo novosti",
    "cards.newsText":"Važne informacije i događaji.",
    "cards.guidesTitle":"Last War savjeti",
    "cards.guidesText":"Heroji, oružje, VS, događaji i resursi.",
    "ask.eyebrow":"GOMO POMOĆNIK",
    "ask.title":"Pitaj GoMo",
    "ask.welcome":"Objasni što ne razumiješ. Mogu pojednostaviti, prevesti ili pronaći pravu GoMo informaciju.",
    "ask.placeholder":"Napiši pitanje…",
    "ask.examples":"Primjeri",
    "ask.example1":"Objasni današnji VS",
    "ask.example2":"Što trebam poboljšati?",
    "ask.example3":"Prevedi uputu",
    "ask.demoTitle":"Demonstracijska baza",
    "ask.demoText":"Sučelje je spremno. Pravi besplatni AI bit će povezan u sljedećem koraku.",
    "ask.demoReply":"Pitanje je primljeno. Besplatna AI veza bit će dodana u sljedećem koraku.",
    "capture.eyebrow":"LAST WAR SNIMKE",
    "capture.title":"Analiziraj snimku",
    "capture.dropTitle":"Odaberi snimku",
    "capture.dropText":"Poredak, resursi, Shiny, VS, heroji ili događaj.",
    "capture.select":"Odaberi sliku",
    "capture.result":"Predloženi rezultat",
    "capture.waiting":"Čekanje",
    "capture.ready":"Slika spremna",
    "capture.empty":"Rezultat će se pojaviti nakon slanja snimke.",
    "capture.type":"Otkrivena vrsta",
    "capture.unknown":"Treba potvrditi",
    "capture.language":"Otkriveni jezik",
    "capture.auto":"Automatski",
    "capture.confidence":"Pouzdanost",
    "capture.validation":"Podaci se neće spremiti bez ljudske potvrde.",
    "capture.analyze":"Analiziraj pomoću AI-a",
    "communication.eyebrow":"POMOĆ",
    "communication.title":"GoMo komunikacija",
    "communication.new":"Nova poruka",
    "communication.emptyTitle":"Započni razgovor",
    "communication.emptyText":"U ovoj bazi poruke se spremaju na uređaj radi testiranja.",
    "communication.nextTitle":"Sljedeći korak",
    "communication.nextText":"Zajednički računi i poruke u stvarnom vremenu zatim će biti povezani s besplatnom bazom podataka.",
    "communication.nameLabel":"Prikazano ime",
    "communication.namePlaceholder":"Tvoje Last War ime",
    "communication.messageLabel":"Poruka",
    "communication.placeholder":"Napiši poruku…",
    "communication.demoNotice":"U ovoj prvoj bazi poruke ostaju samo na ovom uređaju.",
    "communication.translate":"Prevedi",
    "communication.explain":"Objasni s GoMo",
    "communication.local":"Spremljeno na ovom uređaju",
    "news.title":"GoMo novosti",
    "news.pinned":"Prikvačena informacija",
    "news.demoTitle":"Dobrodošli u novu bazu GoMo Central",
    "news.demoText":"Stranica je organizirana oko nekoliko jednostavnih funkcija: razumjeti, komunicirati, analizirati i otvoriti alate.",
    "news.emptyTitle":"Sljedeće informacije pojavit će se ovdje",
    "news.emptyText":"Mogu se automatski prevesti na jezik svakog čitatelja.",
    "tools.title":"Svi GoMo alati",
    "tools.assistant":"Poredak, vlak, VIP i organizacija saveza.",
    "tools.planner":"Pripremi resurse i dosegni cilj od 7,2 M.",
    "tools.radar":"Potvrđeni serveri, prognoze i povijest misija.",
    "tools.coach":"Heroji, oružje, timovi, događaji i prioriteti.",
    "tools.link":"Poveži poveznicu",
    "guides.title":"Savjeti i metode",
    "guides.placeholder":"Pretraži heroja, oružje ili događaj…",
    "guides.noneTitle":"Savjet nije pronađen",
    "guides.noneText":"Pokušaj drugu riječ ili pitaj GoMo.",
    "language.title":"Odaberi jezik"
  }
};

Object.entries(LIVE_TRANSLATIONS).forEach(([code, values]) => {
  if (translations[code]) Object.assign(translations[code], values);
});

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let currentLanguage = localStorage.getItem("gomo-central-language") || "fr";
if (!languages[currentLanguage]) currentLanguage = "fr";
let deferredPrompt = null;

function text(key) {
  return translations[currentLanguage]?.[key] || fr[key] || key;
}

function renderGuideDetails() {
  const details = GUIDE_DETAILS[currentLanguage] || GUIDE_DETAILS.fr;

  $$('[data-guide-details]').forEach((container) => {
    const rows = details[container.dataset.guideDetails] || [];
    const list = document.createElement("ul");
    rows.forEach((row) => {
      const item = document.createElement("li");
      item.textContent = row;
      list.appendChild(item);
    });
    container.replaceChildren(list);
  });
}

async function requestGoMo(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, locale: currentLanguage })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || text("communication.failed"));
  return data;
}

function translatePage() {
  document.documentElement.lang = currentLanguage;

  $$("[data-i18n]").forEach((element) => {
    element.textContent = text(element.dataset.i18n);
  });

  $$("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = text(element.dataset.i18nPlaceholder);
  });

  const language = languages[currentLanguage];
  $("#languageButton").textContent = `${language.flag} ${language.short}`;
  localStorage.setItem("gomo-central-language", currentLanguage);

  renderMessages();
  renderGuideDetails();
}

function openPage(pageId, { updateHash = true } = {}) {
  const externalUrl = EXTERNAL_LINKS[pageId];
  if (externalUrl) {
    document.getElementById("gomo-r5fapper-panel")?.classList.remove("open");
    window.location.assign(externalUrl);
    return;
  }

  const target = document.getElementById(pageId);
  if (!target || !target.classList.contains("page")) return;

  $$(".page").forEach((page) => page.classList.toggle("active", page.id === pageId));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === pageId));
  document.body.classList.remove("menu-open");
  document.getElementById("gomo-r5fapper-panel")?.classList.remove("open");

  if (updateHash && window.location.hash !== `#${pageId}`) {
    history.replaceState(null, "", `#${pageId}`);
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderLanguageList() {
  const list = $("#languageList");
  list.replaceChildren();

  Object.entries(languages).forEach(([code, language]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `language-option${code === currentLanguage ? " active" : ""}`;
    button.textContent = `${language.flag} ${language.label}`;

    button.addEventListener("click", () => {
      currentLanguage = code;
      translatePage();
      renderLanguageList();
      $("#languageDialog").close();
    });

    list.appendChild(button);
  });
}

function addAssistantMessage(message, className) {
  const article = document.createElement("article");
  article.className = `message ${className}`;

  if (className === "message--user") {
    const wrapper = document.createElement("div");
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    wrapper.appendChild(paragraph);
    article.appendChild(wrapper);
  } else {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.textContent = "G";

    const wrapper = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = "GoMo";
    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    wrapper.append(strong, paragraph);
    article.append(avatar, wrapper);
  }

  $("#chatMessages").appendChild(article);
  article.scrollIntoView({ behavior: "smooth", block: "end" });
}

function getStoredMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem("gomo-central-messages") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredMessages(messages) {
  localStorage.setItem("gomo-central-messages", JSON.stringify(messages));
}

function updateStoredMessage(id, values) {
  const messages = getStoredMessages().map((message) =>
    message.id === id ? { ...message, ...values } : message
  );
  saveStoredMessages(messages);
  renderMessages();
}

function renderMessages() {
  const list = $("#messageList");
  const empty = $("#communicationEmpty");
  if (!list || !empty) return;

  const messages = getStoredMessages();
  list.replaceChildren();
  empty.classList.toggle("hidden", messages.length > 0);

  messages.slice().reverse().forEach((message) => {
    const card = document.createElement("article");
    card.className = "communication-card";

    const head = document.createElement("div");
    head.className = "communication-head";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = (message.author || "G").trim().charAt(0).toUpperCase() || "G";

    const identity = document.createElement("div");
    const author = document.createElement("strong");
    author.textContent = message.author || "GoMo";
    const date = document.createElement("small");
    date.textContent = `${new Date(message.createdAt).toLocaleString(currentLanguage)} • ${text("communication.local")}`;
    identity.append(author, date);
    head.append(avatar, identity);

    const paragraph = document.createElement("p");
    paragraph.textContent = message.text;

    const result = document.createElement("div");
    result.className = "communication-result";
    result.hidden = !message.translation && !message.explanation;
    if (message.translation) {
      const translation = document.createElement("p");
      translation.textContent = message.translation;
      result.appendChild(translation);
    }
    if (message.explanation) {
      const explanation = document.createElement("p");
      explanation.textContent = message.explanation;
      result.appendChild(explanation);
    }

    const actions = document.createElement("div");
    actions.className = "communication-actions";

    const translateButton = document.createElement("button");
    translateButton.type = "button";
    translateButton.textContent = text("communication.translate");
    translateButton.addEventListener("click", async () => {
      translateButton.disabled = true;
      translateButton.textContent = text("communication.translating");
      try {
        const data = await requestGoMo("/api/translate", { text: message.text });
        updateStoredMessage(message.id, { translation: data.translation });
      } catch (error) {
        window.alert(error.message || text("communication.failed"));
        translateButton.disabled = false;
        translateButton.textContent = text("communication.translate");
      }
    });

    const explainButton = document.createElement("button");
    explainButton.type = "button";
    explainButton.textContent = text("communication.explain");
    explainButton.addEventListener("click", async () => {
      explainButton.disabled = true;
      explainButton.textContent = text("communication.explaining");
      try {
        const data = await requestGoMo("/api/ask", {
          question: `Explique simplement ce texte sans inventer d'information : ${message.text}`
        });
        updateStoredMessage(message.id, { explanation: data.answer });
      } catch (error) {
        window.alert(error.message || text("communication.failed"));
        explainButton.disabled = false;
        explainButton.textContent = text("communication.explain");
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-message";
    deleteButton.textContent = text("actions.delete");
    deleteButton.addEventListener("click", () => {
      const filtered = getStoredMessages().filter((item) => item.id !== message.id);
      saveStoredMessages(filtered);
      renderMessages();
    });

    actions.append(translateButton, explainButton, deleteButton);
    card.append(head, paragraph, result, actions);
    list.appendChild(card);
  });
}

function publishMessage() {
  const authorInput = $("#messageAuthor");
  const textInput = $("#messageText");

  const author = authorInput.value.trim() || "GoMo";
  const messageText = textInput.value.trim();

  if (!messageText) {
    textInput.focus();
    return;
  }

  const messages = getStoredMessages();
  messages.push({
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
    author,
    text: messageText,
    createdAt: new Date().toISOString()
  });

  saveStoredMessages(messages);
  localStorage.setItem("gomo-central-author", author);
  textInput.value = "";
  $("#messageDialog").close();
  renderMessages();
}

function previewCapture(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = () => {
    $("#capturePreview").src = reader.result;
    $("#capturePreview").classList.remove("hidden");
    $("#dropEmpty").classList.add("hidden");
    $("#analysisEmpty").classList.add("hidden");
    $("#analysisDemo").classList.remove("hidden");
    $("#analysisStatus").textContent = text("capture.ready");
    $("#analysisStatus").classList.add("status-pill--ready");
    $("#analyzeButton").disabled = false;
    $("#analysisText")?.remove();
  };
  reader.readAsDataURL(file);
}

$("#menuButton").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

$("#overlay").addEventListener("click", () => {
  document.body.classList.remove("menu-open");
});

// Navigation déléguée : plus robuste sur Safari/iPhone et pour les futurs boutons ajoutés.
document.addEventListener("click", (event) => {
  const shinyButton = event.target.closest("[data-gomo-shiny-open]");
  if (!shinyButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  document.getElementById("gomo-r5fapper-panel")?.classList.remove("open");
  window.location.assign(EXTERNAL_LINKS.shiny);
}, true);

document.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-page]");
  if (navButton) {
    event.preventDefault();
    openPage(navButton.dataset.page);
    return;
  }

  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    event.preventDefault();
    openPage(goButton.dataset.go);
  }
});

window.addEventListener("hashchange", () => {
  const pageId = window.location.hash.slice(1);
  if (pageId) openPage(pageId, { updateHash: false });
});

$("#languageButton").addEventListener("click", () => {
  renderLanguageList();
  $("#languageDialog").showModal();
});

$("#askForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#askInput");
  const submit = event.submitter || $("#askForm button[type='submit']");
  const question = input.value.trim();
  if (!question) {
    input.focus();
    return;
  }

  addAssistantMessage(question, "message--user");
  input.value = "";
  submit.disabled = true;
  const waiting = text("ask.loading");
  addAssistantMessage(waiting, "message--demo");
  const pending = $("#chatMessages .message--demo:last-child p");

  try {
    const data = await requestGoMo("/api/ask", { question });
    if (pending) pending.textContent = data.answer;
  } catch (error) {
    if (pending) pending.textContent = error.message || text("ask.error");
  } finally {
    submit.disabled = false;
  }
});

$$(".example-question").forEach((button) => {
  button.addEventListener("click", () => {
    $("#askInput").value = button.dataset.questionFr || button.textContent.trim();
    $("#askInput").focus();
  });
});

$("#captureInput").addEventListener("change", (event) => {
  previewCapture(event.target.files?.[0]);
});
$("#analyzeButton").addEventListener("click", async () => {
  const button = $("#analyzeButton");
  const image = $("#capturePreview").src;

  if (!image || !image.startsWith("data:image/")) {
    alert(text("capture.choose"));
    return;
  }

  const oldText = button.textContent;

  button.disabled = true;
  button.textContent = text("capture.running");
  $("#analysisStatus").textContent = text("capture.running");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ image, locale: currentLanguage })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Erreur IA");
    }

    let box = $("#analysisText");

    if (!box) {
      box = document.createElement("div");
      box.id = "analysisText";
      box.className = "validation-note";
      box.style.whiteSpace = "pre-wrap";
      box.style.marginTop = "14px";

      $("#analysisDemo").insertBefore(box, button);
    }

    box.textContent = data.analysis;
    const rows = $$("#analysisDemo .result-row");
    if (rows[0]) $("strong", rows[0]).textContent = data.type || text("capture.unknown");
    if (rows[1]) $("strong", rows[1]).textContent = data.language || text("capture.auto");
    if (rows[2]) $("strong", rows[2]).textContent = Number.isFinite(Number(data.confidence))
      ? `${Math.round(Number(data.confidence))}%`
      : "—";
    $("#analysisStatus").textContent = text("capture.done");
  } catch (error) {
    $("#analysisStatus").textContent = text("capture.error");
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = oldText;
  }
});
["dragenter", "dragover"].forEach((eventName) => {
  $("#dropZone").addEventListener(eventName, (event) => {
    event.preventDefault();
    $("#dropZone").style.borderColor = "var(--gold)";
  });
});

["dragleave", "drop"].forEach((eventName) => {
  $("#dropZone").addEventListener(eventName, (event) => {
    event.preventDefault();
    $("#dropZone").style.borderColor = "";
  });
});

$("#dropZone").addEventListener("drop", (event) => {
  previewCapture(event.dataTransfer.files?.[0]);
});

$("#newMessageButton").addEventListener("click", () => {
  $("#messageAuthor").value = localStorage.getItem("gomo-central-author") || "";
  $("#messageDialog").showModal();
  window.setTimeout(() => {
    if ($("#messageAuthor").value) $("#messageText").focus();
    else $("#messageAuthor").focus();
  }, 50);
});

$("#publishMessageButton").addEventListener("click", publishMessage);

$("#guideSearch").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLocaleLowerCase(currentLanguage);
  let visible = 0;

  $$(".guide-card").forEach((card) => {
    const searchable = `${card.dataset.search || ""} ${card.textContent}`.toLocaleLowerCase(currentLanguage);
    const matches = !query || searchable.includes(query);
    card.classList.toggle("hidden", !matches);
    if (matches) visible += 1;
  });

  $("#guideEmpty").classList.toggle("hidden", visible > 0);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  $("#installButton").classList.remove("hidden");
});

$("#installButton").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("#installButton").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

renderLanguageList();
translatePage();
renderMessages();

const initialPage = window.location.hash.slice(1);
if (initialPage) openPage(initialPage, { updateHash: false });
