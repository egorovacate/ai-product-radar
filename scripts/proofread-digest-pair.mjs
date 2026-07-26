import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const russianPath = path.resolve(process.argv[2] || "");
if (!russianPath || !fs.existsSync(russianPath)) {
  console.error("Usage: node scripts/proofread-digest-pair.mjs <russian-digest.json>");
  process.exit(2);
}

const russian = JSON.parse(fs.readFileSync(russianPath, "utf8"));
if (russian.language !== "ru") throw new Error("The input digest must have language=ru");
const englishPath = path.join(path.dirname(russianPath), `${russian.counterpart_slug}.json`);
if (!fs.existsSync(englishPath)) throw new Error(`English counterpart not found: ${englishPath}`);
const english = JSON.parse(fs.readFileSync(englishPath, "utf8"));
if (english.language !== "en-GB") throw new Error("The counterpart must have language=en-GB");
if (russian.items.length !== english.items.length) throw new Error("Digest item counts differ");

const checkpointPath = path.join("/private/tmp", `${russian.slug}-bilingual-proofread-v1.json`);
let checkpoint = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, "utf8")) : {};
const textKeys = ["category", "title", "overview", "summary", "why_it_matters", "applications", "limitations", "read_original_reason"];

function extractText(item) {
  return Object.fromEntries(textKeys.map((key) => [key, item[key]]));
}

function cleanJson(value) {
  const text = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Proofreader returned no JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

function countWords(value) {
  return JSON.stringify(value).split(/\s+/).filter(Boolean).length;
}

function proofread(key, pair) {
  if (checkpoint[key]) {
    console.log(`${key}: checkpoint`);
    return checkpoint[key];
  }
  const prompt = `Act as a meticulous bilingual copy editor. Proofread the paired Russian and British English JSON texts below.

NON-NEGOTIABLE RULES:
- Return one valid JSON object with exactly two top-level keys, "ru" and "en", and the same nested keys and value types as the input.
- Copy-edit only. Do not fact-check through memory, rewrite the argument, add information, remove qualifications, summarise, expand or alter the author's position.
- Preserve every fact, number, date, example, distinction between source claims and curator inference, Markdown marker, paragraph break, technical identifier and approximate length.
- Russian: correct grammar, punctuation, agreement, awkward calques and inconsistent terminology while retaining the established professional voice and accepted English technical terms.
- English: use polished natural British English; correct grammar, articles, punctuation, collocation and translationese. Use analyse, organisation, prioritise, behaviour, authorisation, licence (noun), programme where appropriate.
- Keep product names, model names, code, commands and technical identifiers unchanged.
- Preserve the meaning and pairing of applications, limitations and read-original guidance.
- If a sentence is already correct, leave it alone. Prefer minimal edits.

JSON:
${JSON.stringify(pair)}`;
  console.log(`${key}: proofreading`);
  const result = spawnSync("codex", [
    "exec", "-", "--ephemeral", "--skip-git-repo-check",
    "--sandbox", "read-only", "--ignore-rules", "-C", path.dirname(russianPath)
  ], {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 24 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" }
  });
  if (result.status !== 0) throw new Error(`Proofreading failed for ${key}: ${result.stderr || result.stdout}`);
  const edited = cleanJson(result.stdout);
  for (const language of ["ru", "en"]) {
    if (!edited[language]) throw new Error(`${key}: missing ${language}`);
    if (countWords(edited[language]) < countWords(pair[language]) * 0.88) {
      throw new Error(`${key}: ${language} became suspiciously short`);
    }
  }
  checkpoint[key] = edited;
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint));
  return edited;
}

const meta = proofread("meta", {
  ru: { title: russian.title, intro: russian.intro },
  en: { title: english.title, intro: english.intro }
});
russian.title = meta.ru.title;
russian.intro = meta.ru.intro;
english.title = meta.en.title;
english.intro = meta.en.intro;

for (let index = 0; index < russian.items.length; index++) {
  if (russian.items[index].id !== english.items[index].id) throw new Error(`Item ${index + 1} IDs differ`);
  const pair = proofread(`item-${index + 1}`, {
    ru: extractText(russian.items[index]),
    en: extractText(english.items[index])
  });
  Object.assign(russian.items[index], pair.ru);
  Object.assign(english.items[index], pair.en);
}

fs.writeFileSync(russianPath, `${JSON.stringify(russian, null, 2)}\n`);
fs.writeFileSync(englishPath, `${JSON.stringify(english, null, 2)}\n`);
console.log(`DONE ${russianPath}`);
console.log(`DONE ${englishPath}`);

