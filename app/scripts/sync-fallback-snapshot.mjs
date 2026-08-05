/**
 * Refreshes src/lib/fallback-tree.json from the LOCAL repo checkout (../).
 * Run: npm run sync:snapshot
 * The snapshot lets the site build & render even when GitHub is unreachable.
 */
import { readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";

const CONTENT_RE =
  /^(backend|frontend|mobile|devops|database)\/[^/]+\/(tutorials|cheatsheets|guides|syllabi)\/.+\.md$/;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function walk(dir, prefix, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, `${prefix}/${entry.name}`, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const rel = `${prefix}/${entry.name}`;
      if (CONTENT_RE.test(rel)) out.push(rel);
    }
  }
}

async function main() {
  const out = [];
  for (const dir of ["backend", "frontend", "mobile", "devops", "database"]) {
    await walk(join(ROOT, dir), dir, out);
  }
  out.sort();

  const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/fallback-tree.json");
  await writeFile(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote ${out.length} paths to ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
