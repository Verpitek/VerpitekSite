export const translations = {
  en: {
    // Navbar
    "nav.home": "Home",
    "nav.wiki": "Wiki",
    "nav.about": "About",
    "nav.services": "Services",

    // Hero
    "hero.title": "Verpitek",
    "hero.subtitle": "Software development studio specializing in web, backend systems, and creative digital experiences.",
    "hero.cta": "View Our Work",

    // Index - What we do
    "index.whatwedo.title": "What We Do",
    "index.whatwedo.p1": "We design and build software — from polished websites and web applications to backend systems and APIs. We work primarily with TypeScript and Python across the full stack.",
    "index.whatwedo.p2": "We also take on commissions for website development, small-scale backend projects, and custom tooling. If you have a project in mind, get in touch.",

    // Index - What we are
    "index.whatweare.title": "Who We Are",
    "index.whatweare.text": "We are a small team of developers based in Lithuania, focused on building well-crafted software. We value clean architecture, technical depth, and shipping things that work.",

    // Index - Tech
    "index.tech.title": "Our Stack",
    "index.tech.frontend": "Frontend: TypeScript, Astro, React",
    "index.tech.backend": "Backend: Python, Bun, Node.js",
    "index.tech.infra": "Infrastructure: Cloudflare, PostgreSQL, SQLite",
    "index.tech.gamedev": "Game Dev: Minecraft Bedrock Add-Ons, custom engines",

    // Index - Services
    "index.services.title": "Services",
    "index.services.websites": "Website Development",
    "index.services.websites.desc": "Custom websites and web applications built with modern frameworks. From landing pages to full-stack platforms.",
    "index.services.backend": "Backend Development",
    "index.services.backend.desc": "APIs, services, and data pipelines. We build reliable backend systems with Python and TypeScript.",
    "index.services.contact": "Interested? Contact us at info@verpitek.com",

    // Index - Projects
    "index.projects.title": "Our Projects",
    "index.projects.jepia": "A TypeScript framework for programmatic Minecraft Bedrock Add-On generation, enabling complex add-ons to be built through code rather than manual JSON authoring.",
    "index.projects.weboneko": "A sandboxed, creative micro-social platform where every post is a customizable HTML/CSS webpage. Features data scarcity mechanics, a nibbles economy, and three-stage content moderation.",
    "index.projects.panspark": "A tiny programming language for JavaScript environments, primarily used in our projects for microcontrollers.",

    // Index - Docs
    "index.docs.title": "Documentation & Wiki",
    "index.docs.text": "Explore detailed documentation, tutorials, and technical references for our projects in the Verpitek Wiki.",
    "index.docs.cta": "Go to Wiki",

    // Footer
    "footer.discord": "Discord Community",
    "footer.copyright": "© 2026 Verpitek, MB. All rights reserved.",
    "footer.contact": "commissions and inquiries",

    // About page
    "about.title": "About Verpitek",
    "about.intro": "Verpitek is a small software development studio based in Lithuania. We build web applications, backend systems, and creative digital projects.",
    "about.story.title": "Our Story",
    "about.story.text": "What started as a group of developers making game add-ons grew into a proper development studio. We still make game content, but now we also build websites, backend services, and custom software for clients.",
    "about.approach.title": "Our Approach",
    "about.approach.text": "We believe in shipping working software without unnecessary complexity. We write clean, maintainable code and focus on solving real problems rather than chasing trends.",
    "about.work.title": "Work With Us",
    "about.work.text": "We take on commissions for website development, backend projects, and technical consulting. Whether you need a landing page, an API, or a full-stack application — we can help.",
    "about.work.cta": "Reach us at info@verpitek.com",

    // Weboneko page
    "weboneko.title": "Weboneko",
    "weboneko.tagline": "A sandboxed, creative micro-social platform",
    "weboneko.intro": "Weboneko reimagines social media through intentional constraints and creative expression. Every post is a fully customizable HTML/CSS webpage rendered in a sandboxed iframe, combining the creative freedom of early web culture with modern safety and moderation.",
    "weboneko.core.title": "Core Concepts",
    "weboneko.core.feed.title": "One Shared Feed",
    "weboneko.core.feed.text": "No algorithms, no followers, no recommendations. Just a single reverse-chronological feed where everyone shares the same space.",
    "weboneko.core.scarcity.title": "Data Scarcity",
    "weboneko.core.scarcity.text": "Users get a 256KB data budget per day, resetting at midnight UTC. This encourages intentional, thoughtful posts rather than endless scrolling and spam.",
    "weboneko.core.creative.title": "Creative Freedom",
    "weboneko.core.creative.text": "Posts are raw HTML and CSS — no templates, no character limits. Express yourself with the full power of the web, minus JavaScript.",
    "weboneko.core.reply.title": "Reply as Post",
    "weboneko.core.reply.text": "No comments section. Responses are chained posts, giving every reply the same creative weight as the original.",
    "weboneko.nibbles.title": "Nibbles Economy",
    "weboneko.nibbles.text": "Weboneko features a simple, non-transferable currency called Nibbles. Earn them through engagement — nibbling posts, hitting milestones, and daily logins. Spend them on cosmetics like pixel art sticker slots and sticker placements on posts.",
    "weboneko.moderation.title": "Content Moderation",
    "weboneko.moderation.text": "A three-stage moderation pipeline keeps the platform safe, all running locally. First, a keyword blocklist catches obvious violations. Then, IBM Granite Guardian HAP 38M classifies text for hate, abuse, and profanity. Finally, Falconsai NSFW Image Detection checks embedded images. The system is fail-closed — if anything goes wrong, content is flagged for manual review rather than published. No data is sent to external services.",
    "weboneko.security.title": "Security Model",
    "weboneko.security.text": "All user-generated content renders inside fully sandboxed iframes with zero JavaScript execution. Posts are sanitized server-side, stripping scripts, event handlers, and other attack vectors while preserving rich HTML5 and CSS creativity. Sessions use HMAC-SHA256 signed tokens, and passwords are hashed with Argon2id.",
    "weboneko.tech.title": "Tech Stack",
    "weboneko.tech.runtime": "Runtime: Bun",
    "weboneko.tech.framework": "Framework: Astro 6 (SSR)",
    "weboneko.tech.database": "Database: PostgreSQL",
    "weboneko.tech.editor": "Editor: CodeMirror (in-browser HTML/CSS)",
    "weboneko.tech.moderation": "Moderation: Python server with Granite Guardian",
    "weboneko.tech.cdn": "CDN: Cloudflare Tunnel + Edge Caching",

    // ProjectCard link texts
    "project.viewdocs": "View Docs",
    "project.learnmore": "Learn More",
    "project.tryeditor": "Try the Editor",
  },

  lt: {
    // Navbar
    "nav.home": "Pradžia",
    "nav.wiki": "Wiki",
    "nav.about": "Apie",
    "nav.services": "Paslaugos",

    // Hero
    "hero.title": "Verpitek",
    "hero.subtitle": "Programinės įrangos kūrimo studija, specializuojanti internetinėse svetainėse, backend sistemose ir kūrybiniuose skaitmeniniuose projektuose.",
    "hero.cta": "Mūsų Darbai",

    // Index - What we do
    "index.whatwedo.title": "Ką Mes Darome",
    "index.whatwedo.p1": "Kuriame ir statome programinę įrangą — nuo tvarkingų svetainių ir internetinių aplikacijų iki backend sistemų ir API. Dirbame daugiausia su TypeScript ir Python visame technologijų steke.",
    "index.whatwedo.p2": "Taip pat priimame užsakymus svetainių kūrimui, nedideliems backend projektams ir individualiems įrankiams. Jei turite projektą — susisiekite su mumis.",

    // Index - What we are
    "index.whatweare.title": "Kas Mes Esame",
    "index.whatweare.text": "Esame nedidelė kūrėjų komanda Lietuvoje, kurianti kokybišką programinę įrangą. Vertiname švarią architektūrą, techninį gilumą ir veikiančių produktų pristatymą.",

    // Index - Tech
    "index.tech.title": "Technologijos",
    "index.tech.frontend": "Frontend: TypeScript, Astro, React",
    "index.tech.backend": "Backend: Python, Bun, Node.js",
    "index.tech.infra": "Infrastruktūra: Cloudflare, PostgreSQL, SQLite",
    "index.tech.gamedev": "Žaidimų kūrimas: Minecraft Bedrock priedai, custom varikliai",

    // Index - Services
    "index.services.title": "Paslaugos",
    "index.services.websites": "Svetainių Kūrimas",
    "index.services.websites.desc": "Individualios svetainės ir internetinės aplikacijos, sukurtos su moderniais karkasais. Nuo nukreipimo puslapių iki pilno steko platformų.",
    "index.services.backend": "Backend Kūrimas",
    "index.services.backend.desc": "API, paslaugos ir duomenų srautai. Kuriame patikimas backend sistemas su Python ir TypeScript.",
    "index.services.contact": "Susidomėjote? Susisiekite el. paštu info@verpitek.com",

    // Index - Projects
    "index.projects.title": "Mūsų Projektai",
    "index.projects.jepia": "TypeScript karkasas programiniam Minecraft Bedrock priedų generavimui, leidžiantis sudėtingus priedus kurti per kodą, o ne rankiniu JSON rašymu.",
    "index.projects.weboneko": "Izoliuota, kūrybinė mikro-socialinė platforma, kurioje kiekvienas įrašas yra individualizuojamas HTML/CSS tinklalapis. Turi duomenų trūkumo mechanikas, nibbles ekonomiką ir trijų pakopų turinio moderaciją.",
    "index.projects.panspark": "Maža programavimo kalba JavaScript aplinkoms, daugiausia naudojama mūsų projektuose mikrovaldikliams.",

    // Index - Docs
    "index.docs.title": "Dokumentacija ir Wiki",
    "index.docs.text": "Naršykite išsamią dokumentaciją, mokomuosius vadovus ir technines nuorodas mūsų projektams Verpitek Wiki.",
    "index.docs.cta": "Eiti į Wiki",

    // Footer
    "footer.discord": "Discord Bendruomenė",
    "footer.copyright": "© 2026 Verpitek, MB. Visos teisės saugomos.",
    "footer.contact": "užsakymai ir užklausos",

    // About page
    "about.title": "Apie Verpitek",
    "about.intro": "Verpitek yra nedidelė programinės įrangos kūrimo studija Lietuvoje. Kuriame internetines aplikacijas, backend sistemas ir kūrybinius skaitmeninius projektus.",
    "about.story.title": "Mūsų Istorija",
    "about.story.text": "Kas prasidėjo kaip grupė kūrėjų, kuriančių žaidimų priedus, išaugo į tikrą kūrimo studiją. Mes vis dar kuriame žaidimų turinį, bet dabar taip pat statome svetaines, backend paslaugas ir individualią programinę įrangą klientams.",
    "about.approach.title": "Mūsų Požiūris",
    "about.approach.text": "Tikime veikiančios programinės įrangos pristatymu be nereikalingo sudėtingumo. Rašome švarų, prižiūrimą kodą ir koncentruojamės į realių problemų sprendimą, o ne tendencijų vaikymąsi.",
    "about.work.title": "Dirbkite Su Mumis",
    "about.work.text": "Priimame užsakymus svetainių kūrimui, backend projektams ir techniniam konsultavimui. Nesvarbu ar jums reikia nukreipimo puslapio, API, ar pilno steko aplikacijos — mes galime padėti.",
    "about.work.cta": "Susisiekite el. paštu info@verpitek.com",

    // Weboneko page
    "weboneko.title": "Weboneko",
    "weboneko.tagline": "Izoliuota, kūrybinė mikro-socialinė platforma",
    "weboneko.intro": "Weboneko iš naujo įsivaizduoja socialinę mediją per apgalvotus apribojimus ir kūrybinę raišką. Kiekvienas įrašas yra pilnai individualizuojamas HTML/CSS tinklalapis, atvaizduojamas izoliuotame iframe, jungiančiame ankstyvosios interneto kultūros kūrybinę laisvę su moderniu saugumu ir moderacija.",
    "weboneko.core.title": "Pagrindinės Koncepcijos",
    "weboneko.core.feed.title": "Vienas Bendras Srautas",
    "weboneko.core.feed.text": "Jokių algoritmų, jokių sekėjų, jokių rekomendacijų. Tik vienas atvirkštinis chronologinis srautas, kuriame visi dalijasi ta pačia erdve.",
    "weboneko.core.scarcity.title": "Duomenų Trūkumas",
    "weboneko.core.scarcity.text": "Vartotojai gauna 256KB duomenų biudžetą per dieną, atsinaujinantį vidurnaktį UTC. Tai skatina apgalvotus įrašus, o ne begalinį slinkimą ir šlamštą.",
    "weboneko.core.creative.title": "Kūrybinė Laisvė",
    "weboneko.core.creative.text": "Įrašai yra grynas HTML ir CSS — jokių šablonų, jokių simbolių limitų. Išreikškite save visa žiniatinklio galia, be JavaScript.",
    "weboneko.core.reply.title": "Atsakymas kaip Įrašas",
    "weboneko.core.reply.text": "Jokio komentarų skyriaus. Atsakymai yra susieti įrašai, suteikiantys kiekvienam atsakymui tokį patį kūrybinį svorį kaip originalui.",
    "weboneko.nibbles.title": "Nibbles Ekonomika",
    "weboneko.nibbles.text": "Weboneko turi paprastą, neperduodamą valiutą vadinamą Nibbles. Uždirbkite ją per įsitraukimą — nibbling įrašus, pasiekiant etapus ir kasdienius prisijungimus. Išleiskite ją kosmetikai, kaip pikselių meno lipdukai.",
    "weboneko.moderation.title": "Turinio Moderacija",
    "weboneko.moderation.text": "Trijų pakopų moderacijos sistema užtikrina platformos saugumą, visa veikia lokaliai. Pirmiausia, raktinių žodžių blokavimo sąrašas pagauna akivaizdžius pažeidimus. Tada IBM Granite Guardian HAP 38M klasifikuoja tekstą dėl neapykantos, piktnaudžiavimo ir necenzūrinės kalbos. Galiausiai Falconsai NSFW Image Detection tikrina įterptus vaizdus. Sistema veikia fail-closed principu — jei kas nors sugenda, turinys pažymimas rankinei peržiūrai, o ne publikuojamas. Jokie duomenys nesiunčiami išorinėms paslaugoms.",
    "weboneko.security.title": "Saugumo Modelis",
    "weboneko.security.text": "Visas vartotojų sukurtas turinys atvaizduojamas pilnai izoliuotuose iframe be JavaScript vykdymo. Įrašai valomi serverio pusėje, pašalinant skriptus, įvykių tvarkykles ir kitus atakų vektorius, išsaugant turtingą HTML5 ir CSS kūrybą. Sesijos naudoja HMAC-SHA256 pasirašytus žetonus, o slaptažodžiai užšifruoti su Argon2id.",
    "weboneko.tech.title": "Technologijų Stekas",
    "weboneko.tech.runtime": "Vykdymo aplinka: Bun",
    "weboneko.tech.framework": "Karkasas: Astro 6 (SSR)",
    "weboneko.tech.database": "Duomenų bazė: PostgreSQL",
    "weboneko.tech.editor": "Redaktorius: CodeMirror (naršyklėje HTML/CSS)",
    "weboneko.tech.moderation": "Moderacija: Python serveris su Granite Guardian",
    "weboneko.tech.cdn": "CDN: Cloudflare Tunnel + Edge Caching",

    // ProjectCard link texts
    "project.viewdocs": "Žiūrėti Dokumentaciją",
    "project.learnmore": "Sužinoti Daugiau",
    "project.tryeditor": "Išbandyti Redaktorių",
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations["en"];

export function t(key: TranslationKey, lang: Lang): string {
  return translations[lang]?.[key] ?? translations["en"][key] ?? key;
}
