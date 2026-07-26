import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const russianPath = path.resolve(process.argv[2] || "");
if (!russianPath || !fs.existsSync(russianPath)) {
  console.error("Usage: node scripts/verify-digest-pair.mjs <russian-digest.json>");
  process.exit(2);
}

const russian = JSON.parse(fs.readFileSync(russianPath, "utf8"));
const englishPath = path.join(path.dirname(russianPath), `${russian.counterpart_slug}.json`);
const english = JSON.parse(fs.readFileSync(englishPath, "utf8"));
const errors = [];
const immutableKeys = ["id", "score", "published_at", "event_at", "read_original", "sources"];
const textKeys = ["category", "title", "overview", "summary", "why_it_matters", "applications", "limitations", "read_original_reason"];
const wordCount = (value) => JSON.stringify(value).split(/\s+/).filter(Boolean).length;

if (russian.language !== "ru") errors.push("Russian digest language must be ru");
if (english.language !== "en-GB") errors.push("English digest language must be en-GB");
if (russian.counterpart_slug !== english.slug || english.counterpart_slug !== russian.slug) errors.push("Counterpart slugs do not match");
if (russian.items.length !== english.items.length) errors.push("Item counts differ");

for (let index = 0; index < Math.min(russian.items.length, english.items.length); index++) {
  const ru = russian.items[index];
  const en = english.items[index];
  for (const key of immutableKeys) {
    if (JSON.stringify(ru[key]) !== JSON.stringify(en[key])) errors.push(`Item ${index + 1}: ${key} differs between languages`);
  }
  const englishText = JSON.stringify(Object.fromEntries(textKeys.map((key) => [key, en[key]])));
  if (/[А-Яа-яЁё]/.test(englishText)) errors.push(`Item ${index + 1}: Cyrillic remains in English editorial text`);
  const americanForms = englishText.match(/\b(?:organization|organizations|organize|organized|organizing|prioritize|prioritized|behavior|behaviors|authorization|analyze|analyzed|analyzing)\b/gi);
  if (americanForms) errors.push(`Item ${index + 1}: possible US spelling: ${[...new Set(americanForms)].join(", ")}`);
  const ruWords = wordCount(Object.fromEntries(textKeys.map((key) => [key, ru[key]])));
  const enWords = wordCount(Object.fromEntries(textKeys.map((key) => [key, en[key]])));
  if (ruWords < 80 || enWords < 80) errors.push(`Item ${index + 1}: editorial text is suspiciously short`);
}

function readHead(relativePath) {
  try {
    return JSON.parse(execFileSync("git", ["show", `HEAD:${relativePath}`], { encoding: "utf8" }));
  } catch {
    return null;
  }
}

for (const [current, filePath] of [[russian, russianPath], [english, englishPath]]) {
  const relativePath = path.relative(process.cwd(), filePath);
  const previous = readHead(relativePath);
  if (!previous) continue;
  if (current.items.length !== previous.items.length) errors.push(`${relativePath}: item count changed from HEAD`);
  for (let index = 0; index < Math.min(current.items.length, previous.items.length); index++) {
    for (const key of immutableKeys) {
      if (JSON.stringify(current.items[index][key]) !== JSON.stringify(previous.items[index][key])) {
        errors.push(`${relativePath} item ${index + 1}: proofreading changed ${key}`);
      }
    }
  }
  if (wordCount(current) < wordCount(previous) * 0.88) errors.push(`${relativePath}: proofreading shortened the digest by more than 12%`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Verified bilingual pair: ${russian.items.length} items`);
console.log(`Words: RU ${wordCount(russian)}, EN ${wordCount(english)}`);

