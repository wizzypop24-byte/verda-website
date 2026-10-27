/**
 * Runs every requirement test suite and writes an auditable proof.
 *
 * Usage: node scripts/run-all-tests.mjs   (or: npm test)
 *
 * Output:
 *   reports/raw/<timestamp>--<suite>.txt     raw runner output per suite
 *   reports/proofs/test-run-<timestamp>.md   consolidated proof
 *   reports/LATEST.md                        copy of the newest proof
 *
 * History is never deleted. Exit code mirrors the test result.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile, copyFile } from "node:fs/promises";
import { join, resolve, basename } from "node:path";

const root = resolve(process.cwd());
const testsDir = join(root, "tests");
const reportsDir = join(root, "reports");
const proofsDir = join(reportsDir, "proofs");
const rawDir = join(reportsDir, "raw");

/** Requirement labels, in the order they appear in the PRD. */
const SUITE_META = {
  "kpi.test.mjs": { id: "1", name: "Goals & KPIs" },
  "persona.test.mjs": { id: "2", name: "Audience" },
  "tone.test.mjs": { id: "3", name: "Brand & Tone" },
  "structure.test.mjs": { id: "4", name: "Page Structure" },
  "functional.test.mjs": { id: "5", name: "Functional" },
  "content.test.mjs": { id: "6", name: "Content" },
  "design.test.mjs": { id: "7", name: "Design & Responsive" },
  "performance.test.mjs": { id: "8", name: "Performance Budget" },
  "seo.test.mjs": { id: "9", name: "SEO" },
  "a11y.test.mjs": { id: "10", name: "Accessibility" },
  "compliance.test.mjs": { id: "11", name: "Compliance & Claims" },
  "analytics.test.mjs": { id: "12", name: "Analytics & Tracking" },
  "integrations.test.mjs": { id: "13", name: "Integrations" },
  "acceptance.test.mjs": { id: "14", name: "Acceptance Criteria" },
  "auth.test.mjs": { id: "17", name: "Authentication" },
  "checkout.test.mjs": { id: "18", name: "Checkout Page" },
};

const INTEGRITY_FILES = [
  "lib/kpi.mjs",
  "lib/persona.mjs",
  "lib/tone.mjs",
  "tests/kpi.test.mjs",
  "tests/persona.test.mjs",
  "tests/tone.test.mjs",
  "tests/auth.test.mjs",
  "tests/checkout.test.mjs",
  "homepage-requirements.md",
];

function stamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + "_" + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("-");
}

function parseCounts(output) {
  const read = (key) => {
    const match = output.match(new RegExp(`^ℹ\\s+${key}\\s+(\\d+)\\s*$`, "m"));
    return match ? Number(match[1]) : 0;
  };
  return {
    tests: read("tests"),
    pass: read("pass"),
    fail: read("fail"),
    skipped: read("skipped"),
    duration: read("duration_ms"),
  };
}

function parseFailures(output) {
  return [...new Set(output.split(/\r?\n/).filter((line) => /^✖/.test(line)).map((line) => line.replace(/^✖\s*/, "").replace(/\s*\(\d+(\.\d+)?ms\)$/, "")))];
}

async function sha256(path) {
  try {
    return createHash("sha256").update(await readFile(join(root, path))).digest("hex");
  } catch {
    return "n/a";
  }
}

async function main() {
  await mkdir(proofsDir, { recursive: true });
  await mkdir(rawDir, { recursive: true });

  const entries = (await readdir(testsDir)).filter((file) => file.endsWith(".test.mjs"));
  entries.sort((a, b) => {
    const order = (file) => Number(SUITE_META[file]?.id ?? 999);
    return order(a) - order(b) || a.localeCompare(b);
  });

  if (!entries.length) {
    console.error("No test files found in tests/");
    process.exit(1);
  }

  const when = new Date();
  const id = stamp(when);
  const results = [];

  for (const file of entries) {
    const started = Date.now();
    const run = spawnSync(process.execPath, ["--test", join("tests", file)], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      maxBuffer: 20 * 1024 * 1024,
    });

    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    const counts = parseCounts(output);
    const failures = parseFailures(output);
    const meta = SUITE_META[file] ?? { id: "—", name: basename(file, ".test.mjs") };

    const rawPath = join(rawDir, `${id}--${file.replace(".test.mjs", "")}.txt`);
    await writeFile(rawPath, output, "utf8");

    results.push({
      file,
      requirement: meta,
      counts,
      failures,
      exitCode: run.status ?? 1,
      elapsedMs: Date.now() - started,
      rawPath,
      output,
    });

    const badge = run.status === 0 ? "PASS" : "FAIL";
    console.log(`${badge}  ${meta.id}. ${meta.name}: ${counts.pass}/${counts.tests} passed${counts.skipped ? `, ${counts.skipped} skipped` : ""}`);
  }

  const totals = results.reduce(
    (acc, result) => ({
      tests: acc.tests + result.counts.tests,
      pass: acc.pass + result.counts.pass,
      fail: acc.fail + result.counts.fail,
      skipped: acc.skipped + result.counts.skipped,
    }),
    { tests: 0, pass: 0, fail: 0, skipped: 0 },
  );

  const allPassed = totals.fail === 0 && results.every((result) => result.exitCode === 0);
  const hashLines = await Promise.all(INTEGRITY_FILES.map(async (file) => `${file}|${await sha256(file)}`));

  const lines = [];
  lines.push("# Test Proof — Home Page Requirements");
  lines.push("");
  lines.push(`**Run ID:** \`${id}\`  `);
  lines.push(`**Date:** ${when.toISOString()}  `);
  lines.push(`**Node:** ${process.version}  `);
  lines.push(`**Result:** **${totals.pass} passed · ${totals.fail} failed · ${totals.skipped} skipped** (of ${totals.tests} tests)`);
  lines.push(`**Status:** ${allPassed ? "✅ ALL SUITES PASSING" : "❌ FAILURES PRESENT"}`);
  lines.push("");
  lines.push("## 1. Summary by requirement");
  lines.push("");
  lines.push("| Req | Requirement | Suite | Tests | Pass | Fail | Skip | Status |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const result of results) {
    const status = result.exitCode === 0 && result.counts.fail === 0 ? "✅ PASS" : "❌ FAIL";
    lines.push(
      `| ${result.requirement.id} | ${result.requirement.name} | \`${result.file}\` | ${result.counts.tests} | ${result.counts.pass} | ${result.counts.fail} | ${result.counts.skipped} | ${status} |`,
    );
  }
  lines.push(
    `| — | **Total** | — | **${totals.tests}** | **${totals.pass}** | **${totals.fail}** | **${totals.skipped}** | ${allPassed ? "✅" : "❌"} |`,
  );
  lines.push("");

  const failures = results.flatMap((result) => result.failures);
  lines.push("## 2. Failed tests");
  lines.push("");
  lines.push(failures.length ? failures.map((name) => `- ${name}`).join("\n") : "None.");
  lines.push("");

  lines.push("## 3. Raw output");
  lines.push("");
  for (const result of results) {
    lines.push(`- \`${result.rawPath.replace(root + "\\", "").replace(root + "/", "")}\``);
  }
  lines.push("");

  lines.push("## 4. Integrity (SHA-256)");
  lines.push("");
  lines.push("| File | SHA-256 |");
  lines.push("|---|---|");
  for (const line of hashLines) {
    const [file, hash] = line.split("|");
    lines.push(`| \`${file}\` | \`${hash}\` |`);
  }
  lines.push("");
  lines.push(`> Proof generated automatically by \`scripts/run-all-tests.mjs\`. Reproduce with \`npm test\`.`);

  const proof = lines.join("\n");
  const proofPath = join(proofsDir, `test-run-${id}.md`);
  await writeFile(proofPath, proof, "utf8");
  await copyFile(proofPath, join(reportsDir, "LATEST.md"));

  console.log("");
  console.log(`Proof: reports/proofs/test-run-${id}.md`);
  console.log(`Latest: reports/LATEST.md`);
  console.log(`Total: ${totals.pass}/${totals.tests} passed, ${totals.fail} failed, ${totals.skipped} skipped`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
