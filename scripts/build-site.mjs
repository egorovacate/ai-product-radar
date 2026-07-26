import fs from "node:fs";
import path from "node:path";
import { validateDigest } from "./validate-digest.mjs";

const root = process.cwd();
const digestDir = path.join(root, "data", "digests");
const publicDir = path.join(root, "public");
const outputDir = path.join(publicDir, "digests");
const statePath = path.join(root, "state", "seen.json");
fs.mkdirSync(outputDir, { recursive: true });

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

const inlineMarkdown = (value) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

function markdown(value = "") {
  return String(value)
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      if (/^#{1,3}\s+/.test(lines[0])) {
        const level = Math.min(3, lines[0].match(/^#+/)[0].length + 1);
        return `<h${level}>${inlineMarkdown(lines[0].replace(/^#{1,3}\s+/, ""))}</h${level}>${lines.slice(1).map((line) => `<p>${inlineMarkdown(line)}</p>`).join("")}`;
      }
      return `<p>${lines.map(inlineMarkdown).join("<br>")}</p>`;
    })
    .join("");
}

const styles = `
@font-face{font-family:"Golos Text";src:url("/fonts/golos-text-400-cyrillic.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Golos Text";src:url("/fonts/golos-text-700-cyrillic.woff2") format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"PT Serif";src:url("/fonts/pt-serif-400-cyrillic.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url("/fonts/jetbrains-mono-400-cyrillic.woff2") format("woff2");font-weight:400;font-display:swap}
:root{--bg:#f0f2f5;--paper:#fbfcfd;--ink:#1f2937;--muted:#6b7280;--line:#d7dce2;--accent:#5b8b78;--accent-dark:#3f6c5b;--soft:#e8ecf0;--amber:#c8732b;--positive:#2f6f52;--grid:#d7dce2}
html.dark{--bg:#111a2d;--paper:#17213a;--ink:#edf0f7;--muted:#9ba7c1;--line:#2c3a58;--accent:#ef892c;--accent-dark:#f1a35f;--soft:#1a2642;--amber:#ef892c;--positive:#8ec9ad;--grid:#2c3a58}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background-color:var(--bg);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:44px 44px;color:var(--ink);font:16px/1.68 "PT Serif",Georgia,serif}
a{color:var(--accent-dark);text-underline-offset:3px}a:focus-visible,button:focus-visible{outline:3px solid var(--amber);outline-offset:3px}
.skip{position:fixed;top:-80px;left:12px;z-index:100;padding:10px 14px;color:white;background:var(--ink)}.skip:focus{top:12px}
.sitebar{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(12px)}
.sitebar-inner{max-width:1120px;min-height:64px;margin:auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.site-name{color:var(--ink);font:700 1.15rem/1.2 "PT Serif",Georgia,serif;text-decoration:none}.site-actions{display:flex;align-items:center;gap:8px}
.site-link,.theme,.language{padding:8px 10px;border:0;border-radius:4px;color:var(--muted);background:transparent;font:600 .84rem/1.2 "Golos Text",sans-serif;text-decoration:none;cursor:pointer}.site-link:hover,.theme:hover,.language:hover{color:var(--ink);background:var(--soft)}.language{border:1px solid var(--line);color:var(--accent-dark)}
.progress{position:fixed;top:64px;left:0;z-index:30;width:0;height:3px;background:var(--amber)}
.shell{max-width:1120px;margin:auto;padding:68px 24px 96px}.top{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(220px,.65fr);gap:42px;align-items:end;margin-bottom:48px}
.brand{font:600 .76rem/1.4 "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.12em;color:var(--accent-dark)}
.title{font:700 clamp(2.5rem,6vw,5.2rem)/.98 "Golos Text",sans-serif;letter-spacing:-.05em;margin:.6rem 0 1.2rem;max-width:900px}
.subtitle{font-size:1.12rem;color:var(--muted);max-width:800px}.meta{color:var(--muted);font:400 .82rem/1.5 "JetBrains Mono",monospace}
.factbox{padding:24px;border:1px solid var(--line);border-top:4px solid var(--accent);border-radius:4px;background:var(--paper)}
.factbox strong{display:block;font:700 2.8rem/1 "JetBrains Mono",monospace}.factbox span{display:block;margin-top:9px;color:var(--muted);font-family:"Golos Text",sans-serif}
.intro,.method,.toc,.card,.article{border:1px solid var(--line);border-radius:4px;background:var(--paper);box-shadow:0 1px 2px rgba(31,41,55,.05)}
.intro,.method,.toc{padding:26px;margin:18px 0}.method{border-left:4px solid var(--amber)}
.intro h2,.method h2,.toc h2,.card h2,.article h2,.section h3{font-family:"Golos Text",sans-serif}
.intro h2,.method h2,.toc h2{margin:0 0 10px}.method p:last-child,.intro p:last-child{margin-bottom:0}
.toc ol{columns:2;column-gap:36px;margin:14px 0 0;padding-left:24px}.toc li{break-inside:avoid;margin:0 0 9px;padding-right:12px}.toc a{text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px}.card{padding:26px;border-top:4px solid var(--accent)}
.card h2{font-size:1.55rem;line-height:1.15;margin:.7rem 0}.card h2 a{text-decoration:none}.card-link{display:inline-block;margin-top:8px;font-family:"Golos Text",sans-serif;font-weight:700}
.tag{display:inline-flex;padding:4px 7px;border:1px solid var(--line);border-radius:3px;background:var(--soft);color:var(--accent-dark);font:600 .72rem/1.3 "JetBrains Mono",monospace}
.score{font:700 .8rem/1.3 "JetBrains Mono",monospace;color:var(--positive)}
.article{margin:22px 0;padding:clamp(24px,5vw,52px);scroll-margin-top:82px}.article h2{font-size:clamp(1.75rem,4vw,2.8rem);line-height:1.1;letter-spacing:-.03em;margin:.7rem 0 1.2rem}
.lede{font-size:1.12rem;border-left:4px solid var(--accent);padding-left:18px}.section{margin-top:32px}.section h3{font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.sources{padding-left:20px}.verdict{border:1px solid color-mix(in srgb,var(--positive) 35%,var(--line));border-radius:4px;background:color-mix(in srgb,var(--positive) 9%,var(--paper));padding:16px 18px;color:var(--positive)}
.back-top{display:inline-block;margin-top:18px;font:600 .82rem/1.4 "Golos Text",sans-serif}.empty{padding:54px;text-align:center;border:1px dashed var(--line);border-radius:4px;color:var(--muted)}
.archive-head{display:flex;justify-content:space-between;gap:24px;align-items:end;margin:42px 0 20px}.archive-head h2{margin:0;font:700 2rem/1.1 "Golos Text",sans-serif}
.footer{margin-top:54px;padding-top:28px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}
@media(max-width:760px){.shell{padding:44px 16px 68px}.sitebar-inner{padding:0 16px}.top{grid-template-columns:1fr}.factbox{max-width:320px}.toc ol{columns:1}.article{padding:22px 18px}.archive-head{display:block}.site-link:first-child{display:none}}
@media print{.sitebar,.progress,.skip,.back-top{display:none}.shell{padding:0}.article,.card,.toc,.method,.intro,.factbox{box-shadow:none;break-inside:avoid}body{background:white;color:#111}}
`;

function layout(title, description, canonicalPath, body, article = false, language = "ru") {
  const en = language === "en-GB";
  const schema = {
    "@context": "https://schema.org",
    "@type": article ? "Article" : "CollectionPage",
    name: title,
    headline: title,
    description,
    inLanguage: language,
    author: { "@type": "Person", name: "Ekaterina Egorova", url: "https://ekaterinaegorova.com" },
    publisher: { "@type": "Person", name: "Ekaterina Egorova" },
    url: `https://ekaterinaegorova.com${canonicalPath}`,
  };
  const skip = en ? "Skip to content" : "Перейти к содержанию";
  const publications = en ? "Articles" : "Публикации";
  const website = en ? "Website" : "На сайт";
  const nav = en ? "Navigation" : "Навигация";
  const theme = en ? "Switch theme" : "Переключить тему";
  const footer = en
    ? `<p><strong>AI Product Radar</strong> — Ekaterina Egorova's analysis of AI products, coding agents, business analysis and enterprise systems.</p><p>Source facts are separated from the author's conclusions. © 2026 Ekaterina Egorova. All rights reserved.</p>`
    : `<p><strong>AI Product Radar</strong> — авторская аналитика Екатерины Егоровой об AI-продуктах, coding agents, business analysis и enterprise-системах.</p><p>Факты источников отделены от выводов автора. © 2026 Екатерина Егорова. Все права защищены.</p>`;
  return `<!doctype html><html lang="${en ? "en-GB" : "ru"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="author" content="Ekaterina Egorova"><link rel="canonical" href="https://ekaterinaegorova.com${canonicalPath}"><script>try{if(localStorage.getItem("theme")==="dark"||(!localStorage.getItem("theme")&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(_){}</script><style>${styles}</style><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script></head><body><a class="skip" href="#content">${skip}</a><header class="sitebar"><div class="sitebar-inner"><a class="site-name" href="${article ? "../index.html" : "./index.html"}">AI Product Radar</a><nav class="site-actions" aria-label="${nav}"><a class="site-link" href="https://ekaterinaegorova.com/articles">${publications}</a><a class="site-link" href="https://ekaterinaegorova.com">${website}</a><button class="theme" type="button" aria-label="${theme}">◐</button></nav></div></header>${article ? '<div class="progress" aria-hidden="true"></div>' : ""}<main class="shell" id="content">${body}<footer class="footer">${footer}</footer></main><script>document.querySelector(".theme").addEventListener("click",()=>{document.documentElement.classList.toggle("dark");try{localStorage.setItem("theme",document.documentElement.classList.contains("dark")?"dark":"light")}catch(_){}});const bar=document.querySelector(".progress");if(bar)addEventListener("scroll",()=>{const h=document.documentElement.scrollHeight-innerHeight;bar.style.width=(h?scrollY/h*100:0)+"%"},{passive:true});</script></body></html>`;
}

function renderDigest(digest) {
  const en = digest.language === "en-GB";
  const t = en ? {
    details: "Detailed analysis", why: "Why this matters to you", apply: "What you can apply",
    limits: "Limitations and uncertainty", sources: "Sources", contents: "Contents",
    back: "← All AI Radar editions", top: "↑ Back to contents",
    noAction: "No separate action.", noLimits: "No material limitations stated.",
    open: "The original is worth opening.", replace: "This summary replaces reading the original.",
    themed: "thematic edition", half: "six-month review", materials: "items",
    sourceNote: "primary sources and research", analysed: "items analysed",
    howTitle: "How to read this edition",
    howText: "A concise conclusion opens each item. It is followed by detailed analysis, practical implications, possible applications, limitations and source links. The score reflects editorial relevance, not the quality of the company or product."
  } : {
    details: "Подробный разбор", why: "Почему это важно", apply: "Что можно применить",
    limits: "Ограничения и неопределённость", sources: "Источники", contents: "Содержание",
    back: "← Все выпуски AI Radar", top: "↑ К содержанию",
    noAction: "Нет отдельного действия.", noLimits: "Существенные ограничения не указаны.",
    open: "Оригинал стоит открыть.", replace: "Саммари заменяет чтение оригинала.",
    themed: "тематический выпуск", half: "полугодовой обзор", materials: "материала",
    sourceNote: "первичные источники и исследования", analysed: "разобранных материалов",
    howTitle: "Как читать выпуск",
    howText: "Краткий вывод открывает каждый материал. Затем идут подробный разбор, практический смысл, возможные применения, ограничения и ссылки на источники. Оценка отражает редакционную релевантность, а не качество компании или продукта."
  };
  const halfYear = (new Date(digest.period.to) - new Date(digest.period.from)) / 86400000 > 120;
  const items = digest.items.map((item, index) => {
    const sources = item.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a>${source.kind ? ` · ${escapeHtml(source.kind)}` : ""}</li>`).join("");
    const applications = item.applications.length ? `<ul>${item.applications.map((entry) => `<li>${inlineMarkdown(entry)}</li>`).join("")}</ul>` : `<p>${t.noAction}</p>`;
    const limitations = item.limitations.length ? `<ul>${item.limitations.map((entry) => `<li>${inlineMarkdown(entry)}</li>`).join("")}</ul>` : `<p>${t.noLimits}</p>`;
    return `<article class="article" id="${escapeHtml(item.id)}">
      <div><span class="tag">${escapeHtml(item.category)}</span> · <span class="score">${item.score}/100</span> · ${escapeHtml(item.published_at)}</div>
      <h2>${index + 1}. ${escapeHtml(item.title)}</h2>
      <div class="lede">${markdown(item.overview)}</div>
      <section class="section"><h3>${t.details}</h3>${markdown(item.summary)}</section>
      <section class="section"><h3>${t.why}</h3>${markdown(item.why_it_matters)}</section>
      <section class="section"><h3>${t.apply}</h3>${applications}</section>
      <section class="section"><h3>${t.limits}</h3>${limitations}</section>
      <section class="section verdict"><strong>${item.read_original ? t.open : t.replace}</strong> ${inlineMarkdown(item.read_original_reason)}</section>
      <section class="section"><h3>${t.sources}</h3><ol class="sources">${sources}</ol></section>
      <a class="back-top" href="#contents">${t.top}</a>
    </article>`;
  }).join("");
  const contents = digest.items.map((item, index) => `<li><a href="#${escapeHtml(item.id)}">${index + 1}. ${escapeHtml(item.title)}</a></li>`).join("");
  const description = `${halfYear ? t.half : t.themed} AI Product Radar: ${digest.intro}`;
  const periodLabel = en ? (halfYear ? "the first half of 2026 and July" : "the selected period") : (halfYear ? "первое полугодие и июль 2026" : "выбранный период");
  const counterpartExists = digest.counterpart_slug && fs.existsSync(path.join(digestDir, `${digest.counterpart_slug}.json`));
  const languageLink = counterpartExists ? ` <a class="language" href="${escapeHtml(digest.counterpart_slug)}.html">${en ? "Русский" : "English"}</a>` : "";
  return layout(digest.title, description, `/radar/digests/${digest.slug}.html`, `<a class="back-top" href="../index.html">${t.back}</a>${languageLink}
    <header class="top"><div><div class="brand">AI Product Radar · ${halfYear ? t.half : t.themed}</div><h1 class="title">${escapeHtml(digest.title)}</h1><p class="subtitle">${escapeHtml(digest.intro)}</p><p class="meta">${escapeHtml(digest.period.from)} — ${escapeHtml(digest.period.to)} · ${digest.items.length} ${t.materials} · ${t.sourceNote}</p></div><aside class="factbox"><strong>${digest.items.length}</strong><span>${t.analysed} · ${periodLabel}</span></aside></header>
    <section class="intro"><h2>${t.howTitle}</h2><p>${t.howText}</p></section>
    <nav class="toc" id="contents" aria-label="${t.contents}"><h2>${t.contents}</h2><ol>${contents}</ol></nav>${items}`, true, digest.language);
}

const files = fs.readdirSync(digestDir).filter((name) => name.endsWith(".json")).sort().reverse();
const digests = files.map((file) => {
  const digest = JSON.parse(fs.readFileSync(path.join(digestDir, file), "utf8"));
  const errors = validateDigest(digest, file);
  if (errors.length) throw new Error(errors.join("\n"));
  fs.writeFileSync(path.join(outputDir, `${digest.slug}.html`), renderDigest(digest));
  return digest;
});

const russianDigests = digests.filter((digest) => digest.language === "ru");
const cards = russianDigests.length
  ? russianDigests.map((digest) => {
      const halfYear = (new Date(digest.period.to) - new Date(digest.period.from)) / 86400000 > 120;
      const counterpartExists = digest.counterpart_slug && digests.some((entry) => entry.slug === digest.counterpart_slug);
      const languageMeta = counterpartExists ? "русский / English" : "на русском языке";
      const englishLink = counterpartExists ? ` · <a class="card-link" href="digests/${escapeHtml(digest.counterpart_slug)}.html">English →</a>` : "";
      return `<article class="card"><span class="tag">${halfYear ? "Полугодовой обзор" : "Тематический выпуск"} · ${escapeHtml(digest.period.from)} — ${escapeHtml(digest.period.to)}</span><h2><a href="digests/${escapeHtml(digest.slug)}.html">${escapeHtml(digest.title)}</a></h2><p>${escapeHtml(digest.intro)}</p><p class="meta">${digest.items.length} материала · ${languageMeta}</p><a class="card-link" href="digests/${escapeHtml(digest.slug)}.html">Читать выпуск →</a>${englishLink}</article>`;
    }).join("")
  : `<div class="empty">Здесь появится первый дайджест. Попросите Codex: «Используй $ai-product-radar и собери новости за последние три дня».</div>`;

const indexDescription = "Авторские аналитические обзоры AI-продуктов, coding agents, business analysis и enterprise-систем от Екатерины Егоровой.";
const index = layout("AI Product Radar — авторская аналитика об AI-продуктах", indexDescription, "/radar/index.html", `<header class="top"><div><div class="brand">Авторская аналитика · Technology scouting</div><h1 class="title">AI Product Radar</h1><p class="subtitle">Подробные доказательные разборы AI-продуктов, coding agents, business analysis и внутренних платформ.</p></div><aside class="factbox"><strong>${russianDigests.length}</strong><span>${russianDigests.length === 1 ? "опубликованный выпуск" : "опубликованных выпусков"}</span></aside></header><section class="method"><h2>Редакционный принцип</h2><p>Radar опирается преимущественно на первичные источники, документацию и исследования. Заявления поставщиков обозначаются как заявления, ограничения не скрываются, а факты отделяются от авторских выводов.</p></section><div class="archive-head"><h2>Выпуски</h2><span class="meta">Новые тематические обзоры по мере накопления значимых изменений</span></div><section class="grid">${cards}</section>`);
fs.writeFileSync(path.join(publicDir, "index.html"), index);

const seen = { updated_at: new Date().toISOString(), urls: {}, events: {} };
for (const digest of [...digests].reverse()) {
  for (const item of digest.items) {
    seen.events[item.id] = { digest: digest.slug, title: item.title, published_at: item.published_at };
    for (const source of item.sources) {
      const canonical = new URL(source.url);
      canonical.hash = "";
      for (const key of [...canonical.searchParams.keys()]) {
        if (/^(utm_|ref$|source$|campaign$)/i.test(key)) canonical.searchParams.delete(key);
      }
      seen.urls[canonical.toString()] = { digest: digest.slug, item_id: item.id };
    }
  }
}
fs.writeFileSync(statePath, `${JSON.stringify(seen, null, 2)}\n`);
console.log(`Built ${digests.length} digest(s) into public/`);
