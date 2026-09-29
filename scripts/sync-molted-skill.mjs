#!/usr/bin/env node
// Regenerates plugins/molted/skills/molted/reference/ from the live Molted skill.md.
//
// Usage: node scripts/sync-molted-skill.mjs
//
// Splits the fetched skill.md on its `## ` headings into one file per section
// under reference/<slug>.md, plus reference/INDEX.md and reference/SOURCE.json.
// Deterministic: reruns against the same upstream content produce byte-identical
// output (no timestamps are written anywhere).

import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://molted.email/skill.md";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const REFERENCE_DIR = join(
  REPO_ROOT,
  "plugins/molted/skills/molted/reference",
);

function slugify(heading, used) {
  let slug = heading
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) slug = "section";
  let candidate = slug;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

function generatedHeader(sourceUrl) {
  return [
    "<!--",
    "GENERATED FILE. Do not hand-edit.",
    `Source: ${sourceUrl}`,
    "Regenerate with: node scripts/sync-molted-skill.mjs",
    "-->",
    "",
    "",
  ].join("\n");
}

function splitSections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    const isH2 = /^## (?!#)/.test(line);
    if (isH2) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^## /, "").trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
    // Content before the first "## " heading (title/intro) is intentionally
    // dropped from reference/ - the plugin SKILL.md covers integration speed
    // itself and links out to these per-section references.
  }
  if (current) sections.push(current);
  return sections;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const sha256 = createHash("sha256").update(text).digest("hex");

  const sections = splitSections(text);
  if (sections.length === 0) {
    throw new Error("No '## ' sections found in fetched skill.md - refusing to overwrite reference/");
  }

  await rm(REFERENCE_DIR, { recursive: true, force: true });
  await mkdir(REFERENCE_DIR, { recursive: true });

  const used = new Set();
  const indexEntries = [];

  for (const section of sections) {
    const slug = slugify(section.heading, used);
    const body = section.lines.join("\n").replace(/\s+$/, "") + "\n";
    const content = generatedHeader(SOURCE_URL) + body;
    await writeFile(join(REFERENCE_DIR, `${slug}.md`), content, "utf8");
    indexEntries.push({ slug, heading: section.heading });
  }

  const indexBody = indexEntries
    .map((e) => `- [${e.heading}](./${e.slug}.md)`)
    .join("\n");
  const indexContent =
    generatedHeader(SOURCE_URL) +
    "# Molted skill.md reference index\n\n" +
    "Each file below is one `## ` section of the live Molted skill.md, split verbatim.\n\n" +
    indexBody +
    "\n";
  await writeFile(join(REFERENCE_DIR, "INDEX.md"), indexContent, "utf8");

  const sourceJson = {
    sourceUrl: SOURCE_URL,
    sha256,
  };
  await writeFile(
    join(REFERENCE_DIR, "SOURCE.json"),
    JSON.stringify(sourceJson, null, 2) + "\n",
    "utf8",
  );

  const files = await readdir(REFERENCE_DIR);
  console.log(
    `Wrote ${files.length} files to ${REFERENCE_DIR} (${sections.length} sections, sha256=${sha256.slice(0, 12)}...)`,
  );
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
