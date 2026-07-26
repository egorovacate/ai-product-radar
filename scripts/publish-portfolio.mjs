import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const target = path.resolve(
  process.argv[2] || path.join(root, "..", "lovable", "ekaterina-egorova", "public", "radar"),
);

const build = spawnSync(process.execPath, [path.join(scriptDir, "build-site.mjs")], {
  cwd: root,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(path.join(root, "public", "index.html"), path.join(target, "index.html"));
fs.cpSync(path.join(root, "public", "digests"), path.join(target, "digests"), {
  recursive: true,
  force: true,
});

console.log(`Published Radar static files to ${target}`);
