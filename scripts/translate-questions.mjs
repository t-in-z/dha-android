#!/usr/bin/env node
// Adds Arabic (ar) and Hindi (hi) to every question in questions.json.
// - Safe to re-run: questions that are already translated are skipped.
// - Saves progress after every batch, so a failed run loses nothing.
// - English text and the numeric "answer" index are never taken from the model.
import fs from "node:fs/promises";

const FILE = "questions.json";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API_BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta/models/";
const API = API_BASE + MODEL + ":generateContent";
const BATCH_SIZE = Number(process.env.TRANSLATION_BATCH_SIZE || 15);
const GLOSSARY_BATCH = 60;
const CONCURRENCY = Math.max(1, Number(process.env.TRANSLATION_CONCURRENCY || 2));
const MAX_RETRIES = 6;
const META = ["category", "topic", "difficulty", "subcategory"];

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is required.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const str = (v) => (typeof v === "string" ? v.trim() : "");

// Works for old plain-string questions and for already-translated {en, ar, hi} ones.
function en(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return v.en ?? Object.values(v)[0] ?? "";
  return v ?? "";
}
function enOptions(v) {
  const arr = v && typeof v === "object" && !Array.isArray(v) ? v.en ?? Object.values(v)[0] : v;
  return Array.isArray(arr) ? arr.map((x) => String(x ?? "")) : [];
}
function source(q) {
  return {
    category: String(en(q.category)),
    topic: String(en(q.topic)),
    difficulty: String(en(q.difficulty)),
    question: String(en(q.question)),
    options: enOptions(q.options),
    answer: Number(q.answer),
    explanation: String(en(q.explanation)),
    fixedOrder: Boolean(q.fixedOrder),
    subcategory: String(en(q.subcategory)),
  };
}

function parseJson(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

async function gemini(prompt, validate) {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  };
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      if (!res.ok) throw new Error("HTTP " + res.status + ": " + raw.slice(0, 500));
      const data = JSON.parse(raw);
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      if (!text) throw new Error("Gemini returned no text.");
      const out = parseJson(text);
      validate(out); // a bad answer is retried, it does not kill the run
      return out;
    } catch (e) {
      if (attempt >= MAX_RETRIES) throw e;
      const wait = Math.min(60000, 2000 * 2 ** attempt);
      console.warn("Retry " + (attempt + 1) + " in " + wait + " ms: " + e.message);
      await sleep(wait);
    }
  }
}

const RULES = [
  "You are a professional medical and nursing translator.",
  "Translate from English into Modern Standard Arabic (ar) and natural, professional Hindi (hi, Devanagari).",
  "Return ONLY valid JSON, no commentary.",
  "Keep medical abbreviations and units as they are (ECG, MI, CPR, ABCs, GCS, CT, MRI, INR, IV, BP, TB, mg, mL ...).",
  "Keep drug names, scores and numbers accurate. Keep emojis. Never reorder items.",
  "An empty string must stay an empty string.",
];

// ---- 1) glossary: category / topic / difficulty / subcategory, translated once and reused ----
async function buildGlossary(items) {
  const uniq = [...new Set(items.flatMap((s) => META.map((f) => s[f])).filter((v) => v !== ""))];
  const map = new Map();
  for (let i = 0; i < uniq.length; i += GLOSSARY_BATCH) {
    const chunk = uniq.slice(i, i + GLOSSARY_BATCH);
    console.log("Glossary " + Math.min(i + GLOSSARY_BATCH, uniq.length) + "/" + uniq.length);
    const prompt = [
      ...RULES,
      'Input is a JSON array of short labels. Output a JSON array of the same length, each item {"ar":"...","hi":"..."}.',
      JSON.stringify(chunk),
    ].join("\n");
    const out = await gemini(prompt, (o) => {
      if (!Array.isArray(o) || o.length !== chunk.length) throw new Error("Glossary length mismatch.");
      o.forEach((x, k) => {
        if (!str(x?.ar) || !str(x?.hi)) throw new Error("Glossary item missing: " + chunk[k]);
      });
    });
    chunk.forEach((c, k) => map.set(c, { ar: out[k].ar.trim(), hi: out[k].hi.trim() }));
  }
  return map;
}

// ---- 2) question text, options, explanation ----
function validateBatch(src, out) {
  if (!Array.isArray(out) || out.length !== src.length) throw new Error("Batch length mismatch.");
  out.forEach((x, i) => {
    const s = src[i];
    for (const l of ["ar", "hi"]) {
      if (!str(x?.question?.[l])) throw new Error("Missing " + l + " question at item " + i);
      if (!Array.isArray(x?.options?.[l]) || x.options[l].length !== s.options.length)
        throw new Error("Option count mismatch (" + l + ") at item " + i);
      if (x.options[l].some((o) => !str(o))) throw new Error("Empty " + l + " option at item " + i);
      if (s.explanation !== "" && !str(x?.explanation?.[l])) throw new Error("Missing " + l + " explanation at item " + i);
    }
  });
}
async function translateBatch(src) {
  const input = src.map((s) => ({ question: s.question, options: s.options, explanation: s.explanation }));
  const prompt = [
    ...RULES,
    "Input is a JSON array of nursing exam questions. Output a JSON array with exactly one object per input, same order.",
    "Keep the options in exactly the same order and the same number.",
    'Schema of each output item: {"question":{"ar":"","hi":""},"options":{"ar":["",""],"hi":["",""]},"explanation":{"ar":"","hi":""}}',
    JSON.stringify(input),
  ].join("\n");
  return gemini(prompt, (o) => validateBatch(src, o));
}

function isDone(q, s) {
  const ok = (v) => v && typeof v === "object" && str(v.ar) && str(v.hi);
  const opt = (l) => Array.isArray(q.options?.[l]) && q.options[l].length === s.options.length && q.options[l].every((o) => str(o));
  if (!ok(q.question) || !opt("ar") || !opt("hi")) return false;
  if (s.explanation !== "" && !ok(q.explanation)) return false;
  return META.every((f) => s[f] === "" || ok(q[f]));
}

function assemble(s, tr, glossary) {
  const g = (f) => (s[f] === "" ? { en: "", ar: "", hi: "" } : { en: s[f], ...glossary.get(s[f]) });
  return {
    category: g("category"),
    topic: g("topic"),
    difficulty: g("difficulty"),
    question: { en: s.question, ar: tr.question.ar.trim(), hi: tr.question.hi.trim() },
    options: { en: s.options, ar: tr.options.ar.map((x) => x.trim()), hi: tr.options.hi.map((x) => x.trim()) },
    answer: s.answer, // same index in every language
    explanation: s.explanation === "" ? { en: "", ar: "", hi: "" } : { en: s.explanation, ar: tr.explanation.ar.trim(), hi: tr.explanation.hi.trim() },
    fixedOrder: s.fixedOrder,
    subcategory: g("subcategory"),
  };
}

let saving = Promise.resolve();
function save(rows) {
  // one write at a time, so two workers can never interleave bytes in the file
  const text = JSON.stringify(rows, null, 2) + "\n"; // real newline, valid JSON
  saving = saving.then(() => fs.writeFile(FILE, text, "utf8"));
  return saving;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(FILE, "utf8"));
  if (!Array.isArray(raw)) throw new Error(FILE + " must be an array.");
  const src = raw.map(source);
  src.forEach((s, i) => {
    if (!s.question || s.options.length < 2 || !Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.options.length)
      throw new Error("Invalid source question at index " + i);
  });

  const rows = raw.slice();
  const todo = src.map((s, i) => i).filter((i) => !isDone(raw[i], src[i]));
  console.log(src.length - todo.length + " already translated, " + todo.length + " to do.");
  if (!todo.length) return;

  const glossary = await buildGlossary(todo.map((i) => src[i]));
  let next = 0;
  let finished = 0;
  async function worker(id) {
    while (true) {
      const from = next;
      next += BATCH_SIZE;
      if (from >= todo.length) return;
      const idx = todo.slice(from, from + BATCH_SIZE);
      const batch = idx.map((i) => src[i]);
      const out = await translateBatch(batch);
      idx.forEach((qi, k) => (rows[qi] = assemble(src[qi], out[k], glossary)));
      finished += idx.length;
      await save(rows); // checkpoint
      console.log("Worker " + id + ": " + finished + "/" + todo.length + " done");
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  console.log("Completed. " + todo.length + " questions translated.");
}

main().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
