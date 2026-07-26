import fs from "node:fs";
import path from "node:path";
import { validateDigest } from "./validate-digest.mjs";

const root = process.cwd();
const digestDir = path.join(root, "data", "digests");
const files = fs.readdirSync(digestDir).filter((name) => name.endsWith(".json")).sort();
const errors = [];

for (const file of files) {
  const digest = JSON.parse(fs.readFileSync(path.join(digestDir, file), "utf8"));
  errors.push(...validateDigest(digest, file));
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Valid: ${files.length} digest file(s)`);

