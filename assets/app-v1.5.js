
"use strict";

const languages = {
  fr:{flag:"🇫🇷",label:"Français",short:"FR"},
  de:{flag:"🇩🇪",label:"Deutsch",short:"DE"},
  en:{flag:"🇬🇧",label:"English",short:"EN"},
  ro:{flag:"🇷🇴",label:"Română",short:"RO"},
  uk:{flag:"🇺🇦",label:"Українська",short:"UA"},
  ko:{flag:"🇰🇷",label:"한국어",short:"KO"},
  hr:{flag:"🇭🇷",label:"Hrvatski",short:"HR"}
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

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let currentLanguage = localStorage.getItem("gomo-central-language") || "fr";
let deferredPrompt = null;

function text(key) {
  return translations[currentLanguage]?.[key] || fr[key] || key;
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
}

function openPage(pageId, { updateHash = true } = {}) {
  const target = document.getElementById(pageId);
  if (!target || !target.classList.contains("page")) return;

  $$(".page").forEach((page) => page.classList.toggle("active", page.id === pageId));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === pageId));
  document.body.classList.remove("menu-open");
  syncR5FapperVisibility(pageId);

  if (updateHash && window.location.hash !== `#${pageId}`) {
    history.replaceState(null, "", `#${pageId}`);
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function syncR5FapperVisibility(pageId) {
  const isHome = pageId === "home";
  const launcher = $("#gomo-r5fapper-launcher");
  const panel = $("#gomo-r5fapper-panel");

  launcher?.classList.toggle("hidden", !isHome);
  panel?.classList.toggle("hidden", !isHome);
  if (!isHome) panel?.classList.remove("open");
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

    const actions = document.createElement("div");
    actions.className = "communication-actions";

    const translateButton = document.createElement("button");
    translateButton.type = "button";
    translateButton.textContent = text("communication.translate");
    translateButton.disabled = true;

    const explainButton = document.createElement("button");
    explainButton.type = "button";
    explainButton.textContent = text("communication.explain");
    explainButton.disabled = true;

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
    card.append(head, paragraph, actions);
    list.appendChild(card);
  });
}

function publishMessage() {
  const authorInput = $("#messageAuthor");
  const textInput = $("#messageText");

  const author = authorInput.value.trim();
  const messageText = textInput.value.trim();

  if (!author || !messageText) {
    if (!author) authorInput.focus();
    else textInput.focus();
    return;
  }

  const messages = getStoredMessages();
  messages.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
  const rankingLink = event.target.closest('.royal-nav-button[aria-label="Classement"]');
  if (rankingLink) {
    syncR5FapperVisibility("ranking");
    return;
  }

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

window.addEventListener("pageshow", () => {
  const activePage = $(".page.active")?.id || "home";
  syncR5FapperVisibility(activePage);
});

$("#languageButton").addEventListener("click", () => {
  renderLanguageList();
  $("#languageDialog").showModal();
});

$("#askForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#askInput");
  const question = input.value.trim();
  if (!question) {
    input.focus();
    return;
  }

  addAssistantMessage(question, "message--user");
  input.value = "";

  window.setTimeout(() => {
    addAssistantMessage(text("ask.demoReply"), "message--demo");
  }, 450);
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
    alert("Choisis d’abord une capture.");
    return;
  }

  const oldText = button.textContent;

  button.disabled = true;
  button.textContent = "Analyse en cours…";
  $("#analysisStatus").textContent = "Analyse en cours…";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ image })
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
    $("#analysisStatus").textContent = "Analyse terminée";
  } catch (error) {
    $("#analysisStatus").textContent = "Erreur";
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
openPage(initialPage || "home", { updateHash: false });
