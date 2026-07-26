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
:root{--bg:#f5f3ee;--paper:#fffdf8;--ink:#181817;--muted:#68665f;--line:#dedbd2;--accent:#6457d7;--soft:#ece9ff;--green:#236b4b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65}
a{color:var(--accent)}.shell{max-width:1120px;margin:auto;padding:48px 24px 96px}.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:48px}
.brand{font-size:.82rem;text-transform:uppercase;letter-spacing:.16em;color:var(--accent);font-weight:800}.title{font-family:Georgia,serif;font-size:clamp(2.3rem,6vw,5.4rem);line-height:.98;margin:.3rem 0 1rem;max-width:900px}
.subtitle{font-size:1.1rem;color:var(--muted);max-width:760px}.meta{color:var(--muted);font-size:.9rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
.card,.article{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:26px;box-shadow:0 10px 30px rgba(30,25,15,.04)}
.card h2,.article h2{font-family:Georgia,serif;line-height:1.15}.card h2{font-size:1.55rem;margin:.5rem 0}.card a{text-decoration:none}.tag{display:inline-flex;background:var(--soft);color:var(--accent);padding:5px 9px;border-radius:999px;font-size:.76rem;font-weight:700}
.score{font-weight:800;color:var(--green)}.article{margin:22px 0;padding:clamp(24px,5vw,54px)}.article h2{font-size:clamp(1.8rem,4vw,3rem);margin:.6rem 0}
.lede{font-size:1.15rem;border-left:4px solid var(--accent);padding-left:18px}.section{margin-top:32px}.section h3{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.sources{padding-left:20px}.verdict{background:#f0f7f3;border-radius:12px;padding:16px 18px;color:var(--green)}.back{display:inline-block;margin-bottom:28px}.empty{padding:54px;text-align:center;border:1px dashed var(--line);border-radius:18px;color:var(--muted)}
@media(max-width:640px){.shell{padding:28px 16px 64px}.top{display:block}.article{border-radius:14px}}
`;

function layout(title, body) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${styles}</style></head><body><main class="shell">${body}</main></body></html>`;
}

function renderDigest(digest) {
  const items = digest.items.map((item, index) => {
    const sources = item.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a>${source.kind ? ` · ${escapeHtml(source.kind)}` : ""}</li>`).join("");
    const applications = item.applications.length ? `<ul>${item.applications.map((entry) => `<li>${inlineMarkdown(entry)}</li>`).join("")}</ul>` : "<p>Нет отдельного действия.</p>";
    const limitations = item.limitations.length ? `<ul>${item.limitations.map((entry) => `<li>${inlineMarkdown(entry)}</li>`).join("")}</ul>` : "<p>Существенные ограничения не указаны.</p>";
    return `<article class="article">
      <div><span class="tag">${escapeHtml(item.category)}</span> · <span class="score">${item.score}/100</span> · ${escapeHtml(item.published_at)}</div>
      <h2>${index + 1}. ${escapeHtml(item.title)}</h2>
      <div class="lede">${markdown(item.overview)}</div>
      <section class="section"><h3>Подробный разбор</h3>${markdown(item.summary)}</section>
      <section class="section"><h3>Почему это важно вам</h3>${markdown(item.why_it_matters)}</section>
      <section class="section"><h3>Что можно применить</h3>${applications}</section>
      <section class="section"><h3>Ограничения и неопределённость</h3>${limitations}</section>
      <section class="section verdict"><strong>${item.read_original ? "Оригинал стоит открыть." : "Саммари заменяет чтение оригинала."}</strong> ${inlineMarkdown(item.read_original_reason)}</section>
      <section class="section"><h3>Источники</h3><ol class="sources">${sources}</ol></section>
    </article>`;
  }).join("");
  return layout(digest.title, `<a class="back" href="../index.html">← Все выпуски</a>
    <header class="top"><div><div class="brand">AI Product Radar</div><h1 class="title">${escapeHtml(digest.title)}</h1><p class="subtitle">${escapeHtml(digest.intro)}</p><p class="meta">${escapeHtml(digest.period.from)} — ${escapeHtml(digest.period.to)} · ${digest.items.length} материалов</p></div></header>${items}`);
}

const files = fs.readdirSync(digestDir).filter((name) => name.endsWith(".json")).sort().reverse();
const digests = files.map((file) => {
  const digest = JSON.parse(fs.readFileSync(path.join(digestDir, file), "utf8"));
  const errors = validateDigest(digest, file);
  if (errors.length) throw new Error(errors.join("\n"));
  fs.writeFileSync(path.join(outputDir, `${digest.slug}.html`), renderDigest(digest));
  return digest;
});

const cards = digests.length
  ? digests.map((digest) => `<article class="card"><span class="tag">${escapeHtml(digest.period.from)} — ${escapeHtml(digest.period.to)}</span><h2><a href="digests/${escapeHtml(digest.slug)}.html">${escapeHtml(digest.title)}</a></h2><p>${escapeHtml(digest.intro)}</p><p class="meta">${digest.items.length} материалов</p></article>`).join("")
  : `<div class="empty">Здесь появится первый дайджест. Попросите Codex: «Используй $ai-product-radar и собери новости за последние три дня».</div>`;

const index = layout("AI Product Radar", `<header class="top"><div><div class="brand">Персональный аналитический архив</div><h1 class="title">AI Product Radar</h1><p class="subtitle">Подробные разборы AI, продуктовой разработки, business analysis и внутренних платформ — отобранные под ваш опыт и текущие продукты.</p></div><div class="meta">${digests.length} выпусков</div></header><section class="grid">${cards}</section>`);
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

