import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sourcePath = path.resolve(process.argv[2] || "");
if (!sourcePath || !fs.existsSync(sourcePath)) {
  console.error("Usage: node scripts/translate-digest.mjs <russian-digest.json>");
  process.exit(2);
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (source.language !== "ru") throw new Error("Source digest must have language=ru");
const targetSlug = source.counterpart_slug || `${source.slug}-en`;
const targetPath = path.join(path.dirname(sourcePath), `${targetSlug}.json`);
const checkpointPath = path.join("/private/tmp", `${targetSlug}-translation-checkpoint.json`);
let checkpoint = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, "utf8")) : {};

function cleanJson(value) {
  const text = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Translation returned no JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

function translateObject(key, value) {
  if (checkpoint[key]) {
    console.log(`${key}: checkpoint`);
    return checkpoint[key];
  }
  const prompt = `Translate the JSON object's human-readable Russian text into polished, natural British English.

NON-NEGOTIABLE RULES:
- Return one complete valid JSON object only, without Markdown or commentary.
- Do not abridge, summarise, simplify, omit, expand or invent anything.
- Preserve the depth, paragraph structure, Markdown, examples, qualifications and approximate word count.
- Preserve all JSON keys, IDs, dates, scores, booleans, URLs, source titles, product names, model names, code, commands and technical identifiers exactly.
- Translate category, title, overview, summary, why_it_matters, applications, limitations and read_original_reason.
- Use British spelling and usage: analyse, organisation, prioritise, behaviour, licence (noun), programme where appropriate.
- Use consistent terms: coding agent, agent harness, business analyst, product manager, product owner, production, sign-in, authorisation.
- Keep the distinction between source claims and curator inference.

JSON:
${JSON.stringify(value)}`;
  console.log(`${key}: translating`);
  const result = spawnSync("codex", [
    "exec", "-", "--ephemeral", "--skip-git-repo-check",
    "--sandbox", "read-only", "--ignore-rules", "-C", path.dirname(sourcePath)
  ], {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" }
  });
  if (result.status !== 0) throw new Error(`Translation failed for ${key}: ${result.stderr || result.stdout}`);
  const translated = cleanJson(result.stdout);
  checkpoint[key] = translated;
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint));
  return translated;
}

const meta = translateObject("meta", { title: source.title, intro: source.intro });
const items = source.items.map((item, index) => {
  const translatable = {
    category: item.category,
    title: item.title,
    overview: item.overview,
    summary: item.summary,
    why_it_matters: item.why_it_matters,
    applications: item.applications,
    limitations: item.limitations,
    read_original_reason: item.read_original_reason
  };
  const translated = translateObject(`item-${index + 1}`, translatable);
  return { ...item, ...translated };
});

const target = {
  ...source,
  slug: targetSlug,
  language: "en-GB",
  counterpart_slug: source.slug,
  title: meta.title,
  intro: meta.intro,
  items
};

const sourceWords = JSON.stringify(source).split(/\s+/).length;
const targetWords = JSON.stringify(target).split(/\s+/).length;
if (target.items.length !== source.items.length) throw new Error("Item count changed");
if (targetWords < sourceWords * 0.72) throw new Error(`Translation is too short: ${targetWords}/${sourceWords} words`);
for (let i = 0; i < source.items.length; i++) {
  if (target.items[i].id !== source.items[i].id) throw new Error(`Item ${i + 1} ID changed`);
  if (JSON.stringify(target.items[i].sources) !== JSON.stringify(source.items[i].sources)) throw new Error(`Item ${i + 1} sources changed`);
}

fs.writeFileSync(targetPath, `${JSON.stringify(target, null, 2)}\n`);
console.log(`DONE ${targetPath}`);
console.log(`WORDS ${sourceWords} -> ${targetWords}`);

