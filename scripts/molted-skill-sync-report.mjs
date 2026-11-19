#!/usr/bin/env node
// Describes what a sync-molted-skill.mjs run changed, and checks that every
// `reference/<file>.md` mention in the handwritten SKILL.md still exists.
//
// Usage: node scripts/molted-skill-sync-report.mjs [pr-body.md]
//
// Run after scripts/sync-molted-skill.mjs, against an unstaged working tree.
// Compares reference/ with HEAD, writes a pull request body to the given path,
// and prints `changed=true|false` and `broken=<count>` (also appended to
// $GITHUB_OUTPUT when set). Broken links are printed as ::error annotations.
// Exits 0 either way: the workflow decides what fails.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SKILL_DIR = "plugins/molted/skills/molted";
const REFERENCE_DIR = `${SKILL_DIR}/reference`;
const SKILL_MD = `${SKILL_DIR}/SKILL.md`;
const GENERATED = new Set(["INDEX.md", "SOURCE.json"]);

function git(...args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
}

function gitShow(path) {
  try {
    return git("show", `HEAD:${path}`);
  } catch {
    return "";
  }
}

// INDEX.md lines look like `- [Heading](./slug.md)`, in skill.md order.
function parseIndex(text) {
  const entries = [];
  for (const m of text.matchAll(/^- \[(.*)\]\(\.\/([^)]+)\.md\)$/gm)) {
    entries.push({ heading: m[1], slug: m[2] });
  }
  return entries;
}

function words(heading) {
  return new Set(
    heading
      .toLowerCase()
      .replace(/\*/g, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
}

function similarity(a, b) {
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / new Set([...wa, ...wb]).size;
}

// A section whose heading changed gets a new slug, so it shows up as one removed
// and one added file. Pair them up when at least half of the heading words match
// ("Classify Inbound Intent" -> "Classify Inbound Email"). Content similarity
// doesn't work here: renamed sections are usually rewritten too.
function pairRenames(removed, added) {
  const candidates = [];
  for (const r of removed) {
    for (const a of added) {
      const score = similarity(r.heading, a.heading);
      if (score >= 0.5) candidates.push({ from: r, to: a, score });
    }
  }
  candidates.sort((x, y) => y.score - x.score);
  const renamed = [];
  const taken = new Set();
  for (const c of candidates) {
    if (taken.has(c.from.slug) || taken.has(`+${c.to.slug}`)) continue;
    taken.add(c.from.slug);
    taken.add(`+${c.to.slug}`);
    renamed.push(c);
  }
  return {
    renamed,
    removed: removed.filter((r) => !taken.has(r.slug)),
    added: added.filter((a) => !taken.has(`+${a.slug}`)),
  };
}

function sha(sourceJson) {
  try {
    return JSON.parse(sourceJson).sha256 ?? null;
  } catch {
    return null;
  }
}

const label = (e) => `${e.heading} (\`${e.slug}.md\`)`;

function main() {
  const bodyPath = process.argv[2];

  const status = git("status", "--porcelain", "--untracked-files=all", "--", REFERENCE_DIR)
    .split("\n")
    .filter(Boolean);
  const changed = status.length > 0;

  const before = parseIndex(gitShow(`${REFERENCE_DIR}/INDEX.md`));
  const after = parseIndex(readFileSync(join(REPO_ROOT, REFERENCE_DIR, "INDEX.md"), "utf8"));
  const beforeSlugs = new Set(before.map((e) => e.slug));
  const afterSlugs = new Set(after.map((e) => e.slug));
  const { renamed, removed, added } = pairRenames(
    before.filter((e) => !afterSlugs.has(e.slug)),
    after.filter((e) => !beforeSlugs.has(e.slug)),
  );

  const modifiedFiles = new Set(
    status
      .filter((line) => line.slice(0, 2).includes("M"))
      .map((line) => line.slice(3).split("/").pop()),
  );
  const modified = after.filter((e) => modifiedFiles.has(`${e.slug}.md`));

  // Every `reference/<name>.md` in SKILL.md, with its line number. `reference/*.md`
  // and the bare directory don't match the pattern.
  const skillLines = readFileSync(join(REPO_ROOT, SKILL_MD), "utf8").split("\n");
  const links = [];
  skillLines.forEach((line, i) => {
    for (const m of line.matchAll(/reference\/([A-Za-z0-9._-]+\.md)/g)) {
      links.push({ file: m[1], line: i + 1 });
    }
  });
  const renamedTo = new Map(renamed.map((r) => [`${r.from.slug}.md`, `${r.to.slug}.md`]));
  const broken = links.filter((l) => !existsSync(join(REPO_ROOT, REFERENCE_DIR, l.file)));

  for (const b of broken) {
    const hint = renamedTo.has(b.file) ? ` The section was renamed: link reference/${renamedTo.get(b.file)} instead.` : "";
    console.log(
      `::error file=${SKILL_MD},line=${b.line}::SKILL.md links reference/${b.file}, which doesn't exist after the sync.${hint}`,
    );
  }

  const outputs = `changed=${changed}\nbroken=${broken.length}\n`;
  process.stdout.write(outputs);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, outputs);

  if (!bodyPath) return;

  const oldSha = sha(gitShow(`${REFERENCE_DIR}/SOURCE.json`));
  const newSha = sha(readFileSync(join(REPO_ROOT, REFERENCE_DIR, "SOURCE.json"), "utf8"));
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

  const list = (items, fmt) => (items.length ? items.map((e) => `- ${fmt(e)}`).join("\n") : "- none");
  const body = [
    `Automated resync of \`${REFERENCE_DIR}/\` from https://molted.email/skill.md by \`scripts/sync-molted-skill.mjs\`${runUrl ? ` ([workflow run](${runUrl}))` : ""}.`,
    "",
    `Upstream sha256: \`${newSha?.slice(0, 12) ?? "?"}\` (was \`${oldSha?.slice(0, 12) ?? "?"}\`).`,
    "",
    "## SKILL.md links",
    "",
    broken.length
      ? [
          `**${broken.length} broken.** These \`reference/\` links in the handwritten \`${SKILL_MD}\` point at files the sync no longer writes. Fix them on this branch before merging:`,
          "",
          ...broken.map((b) => {
            const hint = renamedTo.has(b.file) ? `, renamed to \`reference/${renamedTo.get(b.file)}\`` : "";
            return `- line ${b.line}: \`reference/${b.file}\`${hint}`;
          }),
        ].join("\n")
      : `All ${links.length} \`reference/*.md\` links in \`${SKILL_MD}\` resolve.`,
    "",
    "## Sections",
    "",
    `### Added (${added.length})`,
    "",
    list(added, label),
    "",
    `### Removed (${removed.length})`,
    "",
    list(removed, label),
    "",
    `### Renamed (${renamed.length})`,
    "",
    "Paired by heading words, so check these.",
    "",
    list(renamed, (r) => `${label(r.from)} -> ${label(r.to)}`),
    "",
    `### Changed (${modified.length})`,
    "",
    modified.length
      ? ["<details><summary>Sections with edited content</summary>", "", list(modified, label), "", "</details>"].join("\n")
      : "- none",
    "",
    "---",
    "",
    "The workflow force-updates this branch on every run while the drift lasts and closes this PR once its base branch matches upstream again. A pull request opened with `GITHUB_TOKEN` doesn't trigger workflows, so no checks show here: the run linked above is the check.",
    "",
    "Bump `version` in `plugins/molted/.claude-plugin/plugin.json` on this branch if installed plugins should pick the change up.",
    "",
  ].join("\n");
  writeFileSync(bodyPath, body, "utf8");
}

main();
