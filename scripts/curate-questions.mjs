#!/usr/bin/env node
// Runs AFTER scripts/regroup-questions.mjs (it needs the chapters to exist).
//   1. Adds the new questions from scripts/extra-burns-questions.json to "GCS & Burns"
//      (skips any question whose English text is already in questions.json, so it is safe to re-run).
//   2. Removes 23 questions from the "Pediatrics" chapter (main topic Pediatrics) - ONCE.
//      Near-duplicates go first, then the questions with the shortest explanations.
//      The removed questions are written to removed-questions.json; while that file exists nothing more is removed.
import fs from "node:fs/promises";

const FILE = "questions.json";
const EXTRA = "scripts/extra-burns-questions.json";
const REMOVED = "removed-questions.json";
const REPORT = "curation-report.json";
const REMOVE_N = Number(process.env.REMOVE_N || 23);
const DUP_SIMILARITY = 0.55;

const MEDSURG = { en: "Medical-Surgical Nursing", ar: "التمريض الباطني والجراحي", hi: "मेडिकल-सर्जिकल नर्सिंग" };
const BURNS = { en: "GCS & Burns", ar: "مقياس غلاسكو للغيبوبة والحروق", hi: "जीसीएस और जलन" };
const TOPIC = { en: "Burns", ar: "الحروق", hi: "जलन" };
const DIFFICULTY = { en: "Medium", ar: "متوسط", hi: "मध्यम" };

const en = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v.en ?? Object.values(v)[0] ?? "" : v ?? "");
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(["which", "what", "with", "that", "this", "from", "have", "been", "should", "would", "following", "nurse", "patient", "client", "most", "best", "likely", "appropriate", "does", "when", "about", "after", "before"]);
const tokens = (s) => new Set(norm(s).split(" ").filter((w) => w.length > 3 && !STOP.has(w)));
const jaccard = (a, b) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};
const exists = async (p) => fs.access(p).then(() => true, () => false);

function validateExtra(e, i) {
  for (const l of ["en", "ar", "hi"]) {
    if (!String(e?.question?.[l] ?? "").trim()) throw new Error("Extra question " + i + ": missing " + l + " question");
    if (!String(e?.explanation?.[l] ?? "").trim()) throw new Error("Extra question " + i + ": missing " + l + " explanation");
    if (!Array.isArray(e?.options?.[l]) || e.options[l].length < 2) throw new Error("Extra question " + i + ": bad " + l + " options");
    if (e.options[l].length !== e.options.en.length) throw new Error("Extra question " + i + ": option count differs in " + l);
  }
  if (!Number.isInteger(e.answer) || e.answer < 0 || e.answer >= e.options.en.length) throw new Error("Extra question " + i + ": bad answer");
}

async function main() {
  const rows = JSON.parse(await fs.readFile(FILE, "utf8"));
  const before = rows.length;
  const report = { before };

  // ---- 1) remove from Pediatrics chapter (once) ----
  if (await exists(REMOVED)) {
    console.log("removed-questions.json already exists -> nothing is removed again.");
    report.removed = "skipped (already done earlier)";
  } else {
    const cand = rows
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => en(q.category) === "Pediatrics" && en(q.subcategory) === "Pediatrics")
      .map(({ q, i }) => ({ i, text: String(en(q.question)), expl: String(en(q.explanation)).length, tok: tokens(en(q.question) + " " + en(q.options && q.options.en ? q.options.en.join(" ") : "")) }));

    const dupOf = new Map(); // loser index -> {of, sim}
    for (let a = 0; a < cand.length; a++) {
      for (let b = a + 1; b < cand.length; b++) {
        const sim = jaccard(cand[a].tok, cand[b].tok);
        if (sim < DUP_SIMILARITY) continue;
        const [keep, drop] = cand[a].expl >= cand[b].expl ? [cand[a], cand[b]] : [cand[b], cand[a]];
        if (!dupOf.has(drop.i) || dupOf.get(drop.i).sim < sim) dupOf.set(drop.i, { of: keep.text.slice(0, 100), sim: Number(sim.toFixed(2)) });
      }
    }
    const ranked = cand
      .slice()
      .sort((x, y) => (dupOf.has(y.i) ? 1 : 0) - (dupOf.has(x.i) ? 1 : 0) || x.expl - y.expl || y.i - x.i)
      .slice(0, Math.min(REMOVE_N, cand.length));

    const log = ranked.map((c) => ({
      question: c.text,
      reason: dupOf.has(c.i) ? "near-duplicate of: " + dupOf.get(c.i).of + " (similarity " + dupOf.get(c.i).sim + ")" : "shortest explanation in the chapter",
    }));
    const drop = new Set(ranked.map((c) => c.i));
    const kept = rows.filter((_, i) => !drop.has(i));
    rows.length = 0;
    kept.forEach((r) => rows.push(r));
    await fs.writeFile(REMOVED, JSON.stringify(log, null, 2) + "\n", "utf8");
    report.pediatricsChapterBefore = cand.length;
    report.removed = log.length;
    report.removedNearDuplicates = log.filter((l) => l.reason.startsWith("near")).length;
    console.log("Removed " + log.length + " from Pediatrics (" + report.removedNearDuplicates + " near-duplicates). Chapter now has " + (cand.length - log.length) + ".");
  }

  // ---- 2) add the burns questions ----
  const extra = JSON.parse(await fs.readFile(EXTRA, "utf8"));
  extra.forEach(validateExtra);
  const have = new Set(rows.map((q) => norm(en(q.question))));
  let added = 0;
  for (const e of extra) {
    if (have.has(norm(e.question.en))) continue;
    rows.push({ category: { ...MEDSURG }, topic: { ...TOPIC }, difficulty: { ...DIFFICULTY }, ...e, subcategory: { ...BURNS } });
    have.add(norm(e.question.en));
    added++;
  }
  report.addedToBurns = added;
  report.alreadyPresent = extra.length - added;
  report.after = rows.length;
  const burnsNow = rows.filter((q) => en(q.subcategory) === "GCS & Burns").length;
  report.burnsChapterNow = burnsNow;

  await fs.writeFile(FILE, JSON.stringify(rows, null, 2) + "\n", "utf8");
  await fs.writeFile(REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");

  const lines = ["# Curation", "", "Questions before: " + before + ", after: " + rows.length, "Added to GCS & Burns: " + added + " (chapter now has " + burnsNow + ")"];
  if (typeof report.removed === "number") {
    lines.push("Removed from Pediatrics chapter: " + report.removed + " (it had " + report.pediatricsChapterBefore + ")", "", "## Removed questions");
    JSON.parse(await fs.readFile(REMOVED, "utf8")).forEach((r, i) => lines.push((i + 1) + ". " + r.question.slice(0, 110) + " -- " + r.reason));
  } else lines.push("Removal: " + report.removed);
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, text + "\n");
}

main().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
