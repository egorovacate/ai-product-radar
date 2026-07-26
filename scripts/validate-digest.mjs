import fs from "node:fs";
import path from "node:path";

export function validateDigest(digest, file = "digest") {
  const errors = [];
  const requiredString = (obj, key, at) => {
    if (typeof obj?.[key] !== "string" || !obj[key].trim()) errors.push(`${at}.${key} must be a non-empty string`);
  };

  requiredString(digest, "slug", file);
  requiredString(digest, "title", file);
  requiredString(digest, "date", file);
  requiredString(digest, "intro", file);
  requiredString(digest?.period, "from", `${file}.period`);
  requiredString(digest?.period, "to", `${file}.period`);
  if (!Array.isArray(digest?.items)) errors.push(`${file}.items must be an array`);

  const ids = new Set();
  for (const [index, item] of (digest.items || []).entries()) {
    const at = `${file}.items[${index}]`;
    for (const key of ["id", "title", "category", "published_at", "overview", "summary", "why_it_matters", "read_original_reason"]) {
      requiredString(item, key, at);
    }
    if (ids.has(item.id)) errors.push(`${at}.id duplicates ${item.id}`);
    ids.add(item.id);
    if (!Number.isFinite(item.score) || item.score < 0 || item.score > 100) errors.push(`${at}.score must be 0–100`);
    if (!Array.isArray(item.applications)) errors.push(`${at}.applications must be an array`);
    if (!Array.isArray(item.limitations)) errors.push(`${at}.limitations must be an array`);
    if (typeof item.read_original !== "boolean") errors.push(`${at}.read_original must be boolean`);
    if (!Array.isArray(item.sources) || item.sources.length === 0) {
      errors.push(`${at}.sources must contain at least one source`);
    } else {
      for (const [sourceIndex, source] of item.sources.entries()) {
        requiredString(source, "title", `${at}.sources[${sourceIndex}]`);
        requiredString(source, "url", `${at}.sources[${sourceIndex}]`);
        try {
          const parsed = new URL(source.url);
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
        } catch {
          errors.push(`${at}.sources[${sourceIndex}].url must be an HTTP(S) URL`);
        }
      }
    }
  }
  return errors;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/validate-digest.mjs <digest.json>");
    process.exit(2);
  }
  const fullPath = path.resolve(target);
  const digest = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const errors = validateDigest(digest, target);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Valid: ${target} (${digest.items.length} items)`);
}

