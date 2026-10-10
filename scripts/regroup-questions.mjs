#!/usr/bin/env node
// Regroups every question in questions.json into MAIN TOPICS and CHAPTERS (sub-topics).
//
//   category    -> main topic   {en, ar, hi}   (keeps the existing English topic keys, adds "Nutrition")
//   subcategory -> chapter      {en, ar, hi}
//
// How a question is placed (in this order):
//   1. Its current subcategory already equals one of the chapters below  -> kept.
//   2. Keyword scoring on the question, options and explanation (+ bonus for its current topic).
//   3. Nothing matches clearly -> the "General" chapter of its current topic.
//
// Nothing is translated by a model: chapter names are written below in English, Arabic and Hindi.
// Environment: DRY_RUN=1 -> only writes regroup-report.json, questions.json is NOT touched.
import fs from "node:fs/promises";

const FILE = "questions.json";
const REPORT = "regroup-report.json";
const DRY = process.env.DRY_RUN === "1";
const MIN_SCORE = 3; // minimum keyword score for a chapter to win

// ---------- helpers ----------
const norm = (s) =>
  String(s ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const norm2 = (s) => norm(s).replace(/\band\b/g, " ").replace(/\s+/g, " ").trim(); // "and" ignored when comparing names
const en = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v.en ?? Object.values(v)[0] ?? "" : v ?? "");
const enOptions = (v) => {
  const a = v && typeof v === "object" && !Array.isArray(v) ? v.en ?? Object.values(v).find(Array.isArray) : v;
  return Array.isArray(a) ? a.map((x) => String(x ?? "")) : [];
};
const count = (re, s) => (s.match(re) || []).length;

// ch(en, ar, hi, regex|null, extra) -> chapter definition
const ch = (e, ar, hi, re = null, extra = {}) => ({ en: e, ar, hi, re, ...extra });

// ---------- the structure (your list) ----------
const TOPICS = [
  {
    key: "Medical-Surgical Nursing", ar: "التمريض الباطني والجراحي", hi: "मेडिकल-सर्जिकल नर्सिंग",
    prior: ["medical surgical", "med surg"],
    chapters: [
      ch("Cardiac System", "الجهاز القلبي", "हृदय प्रणाली",
        /\b(cardiac|cardio\w*|heart|myocard\w*|angina|arrhythmia\w*|dysrhythmia\w*|atrial|ventricular|ecg|ekg|hypertension|coronary|pacemaker|digoxin|aortic|mitral|endocarditis|pericarditis|cardiomyopathy|troponin|stemi)\b/g, { alias: ["cardiac", "cardio", "heart"] }),
      ch("Respiratory System", "الجهاز التنفسي", "श्वसन प्रणाली",
        /\b(respiratory|asthma|copd|pneumonia|oxygen|lungs?|bronch\w*|pulmonary|dyspnea|pleural|tuberculosis|inhaler|pneumothorax|cough|sputum|ventilator|intubat\w*|emphysema|spirometry|hypoxia|wheez\w*)\b/g, { alias: ["respiratory", "pulmonary", "lung"] }),
      ch("Neurology System", "الجهاز العصبي", "तंत्रिका तंत्र",
        /\b(stroke|cva|seizures?|epilep\w*|neuro\w*|cerebral|intracranial|icp|meningitis|parkinson\w*|multiple sclerosis|spinal cord|myasthenia|guillain|aneurysm|encephal\w*|paralysis|hemiplegia|cranial nerves?)\b/g, { alias: ["neuro"] }),
      ch("Renal System", "الجهاز الكلوي", "गुर्दा प्रणाली",
        /\b(renal|kidneys?|dialysis|nephr\w*|urinary|urine|bladder|cystitis|uremi\w*|glomerul\w*|creatinine|bun|calculi|urolithiasis|catheter\w*|incontinence|hemodialysis|peritoneal)\b/g, { alias: ["renal", "kidney", "urinary"] }),
      ch("Appendicitis, Tonsillectomy & Tracheostomy", "التهاب الزائدة الدودية واستئصال اللوزتين وفغر القصبة الهوائية", "एपेंडिसाइटिस, टॉन्सिलेक्टॉमी और ट्रेकियोस्टॉमी",
        /\b(appendicitis|appendectomy|tonsillectomy|tonsil\w*|tracheostomy|tracheotomy|trach)\b/g, { alias: ["appendicitis", "tonsil", "trach"] }),
      ch("Pyloric Stenosis & Vaccinations", "تضيّق البواب واللقاحات", "पाइलोरिक स्टेनोसिस और टीकाकरण",
        /\b(pyloric|vaccin\w*|immuni[sz]\w*|toxoid|mmr|dtap|bcg|rotavirus)\b/g, { alias: ["pyloric", "vaccin", "immuniz"] }),
      ch("GCS & Burns", "مقياس غلاسكو للغيبوبة والحروق", "जीसीएस और जलन",
        /\b(gcs|glasgow|burns?|burned|rule of nines|parkland|escharotomy|silver sulfadiazine|mafenide)\b/g, { alias: ["gcs", "glasgow", "burn"] }),
      ch("General Medical-Surgical Nursing", "التمريض الباطني والجراحي العام", "सामान्य मेडिकल-सर्जिकल नर्सिंग", null, { fallback: true }),
    ],
  },
  {
    key: "Fundamentals", ar: "الأساسيات", hi: "बुनियादी सिद्धांत",
    prior: ["fundamental"],
    chapters: [
      ch("ABG, CPR & Chest Tube", "غازات الدم الشرياني والإنعاش القلبي الرئوي وأنبوب الصدر", "ABG, CPR और चेस्ट ट्यूब",
        /\b(abgs?|arterial blood gas\w*|cpr|compressions?|defibrillat\w*|aed|chest tubes?|water seal|resuscitat\w*|acidosis|alkalosis|ph|pao2|paco2|hco3|bicarbonate|bag valve|ambu)\b/g, { alias: ["abg", "cpr", "chest tube"] }),
      ch("Infection Control", "مكافحة العدوى", "संक्रमण नियंत्रण",
        /\b(infections?|infectious|isolation|hand hygiene|hand washing|ppe|personal protective|precautions?|sterile|aseptic|asepsis|contaminat\w*|airborne|droplet|mrsa|vre|disinfect\w*|sterili[sz]\w*|nosocomial|c diff|clostridi\w*|cauti|clabsi|pathogens?)\b/g, { alias: ["infection"] }),
      ch("Diabetes & Wounds", "السكري والجروح", "मधुमेह और घाव",
        /\b(diabet\w*|insulin|glucose|hypoglyc\w*|hyperglyc\w*|dka|hhs|wounds?|dressings?|sutures?|healing|debridement|granulation|dehiscence|evisceration|a1c|hba1c|metformin|ketoacidosis)\b/g, { alias: ["diabet", "wound"] }),
      ch("Pressure Injury & Electrolytes", "إصابات الضغط والشوارد", "दबाव घाव और इलेक्ट्रोलाइट",
        /\b(pressure (injur\w*|ulcers?|sores?)|braden|bedsores?|decubitus|electrolytes?|potassium|sodium|calcium|magnesium|hyperkal\w*|hypokal\w*|hypernatr\w*|hyponatr\w*|hypercalc\w*|hypocalc\w*|hypermagnes\w*|hypomagnes\w*|phosph\w*|chvostek|trousseau)\b/g, { alias: ["pressure", "electrolyte"] }),
      ch("Emergency & Critical Nursing", "التمريض الطارئ والحرج", "आपातकालीन और क्रिटिकल नर्सिंग",
        /\b(emergenc\w*|triage|critical\w*|shock|trauma\w*|icu|disasters?|poison\w*|overdose|anaphyla\w*|code blue|sepsis|septic|hemorrhag\w*|mass casualty|tourniquet|heimlich|cardiac arrest)\b/g, { alias: ["emergency", "critical"] }),
      ch("Health Assessment", "التقييم الصحي", "स्वास्थ्य मूल्यांकन",
        /\b(assessment|auscultat\w*|palpat\w*|percuss\w*|inspection|vital signs?|head to toe|lymph\w*|heart sounds?|bowel sounds?|breath sounds?|pulse|temperature|blood pressure|skin turgor|pupils?|reflex\w*|physical examination|health history)\b/g, { alias: ["assessment"] }),
      ch("Patient Safety & Quality Improvement", "سلامة المرضى وتحسين الجودة", "रोगी सुरक्षा और गुणवत्ता सुधार",
        /\b(safety|quality improvement|falls?|restraints?|incident reports?|medication errors?|root cause|pdsa|sentinel events?|patient identif\w*|time out|joint commission|never events?|near miss|bed alarm|fall risk)\b/g, { alias: ["safety", "quality"] }),
      ch("General Fundamentals", "الأساسيات العامة", "सामान्य बुनियादी सिद्धांत", null, { fallback: true }),
    ],
  },
  {
    key: "Maternity & Child Nursing", ar: "تمريض الأمومة والطفولة", hi: "मातृत्व एवं शिशु नर्सिंग",
    prior: ["maternity", "obstetric"],
    chapters: [
      ch("LMP Calculation", "حساب موعد الولادة (LMP)", "LMP गणना",
        /\b(lmp|last menstrual period|naegele\w*|edd|estimated date of delivery|estimated due date|due date|expected date of delivery|edc)\b/g, { boost: 3, alias: ["lmp", "naegele"] }),
      ch("Child Health", "صحة الطفل", "बाल स्वास्थ्य",
        /\b(well child|well baby|child health|childhood|child abuse|play therapy|toilet training|car seats?|child safety|hospitali[sz]ed child|school health)\b/g, { alias: ["child health"] }),
      ch("Growth & Development", "النمو والتطور", "वृद्धि और विकास",
        /\b(milestones?|growth|development\w*|developmental|erikson|piaget|freud|toddlers?|infants?|preschool\w*|adolescen\w*|school age|fontanel\w*|denver|head circumference|tripod|pincer|object permanence|parallel play|stranger anxiety)\b/g, { alias: ["growth", "development"] }),
      ch("Maternity", "الأمومة", "मातृत्व",
        /\b(pregnan\w*|antenatal|prenatal|labou?r|delivery|postpartum|puerper\w*|fetal|fetus|gestation\w*|preeclampsia|eclampsia|placenta\w*|cesarean|caesarean|breastfe\w*|lactat\w*|contracepti\w*|episiotomy|uterus|uterine|fundal|fundus|lochia|trimester\w*|gravida|primigravida|multipara|abortion|miscarriage|ectopic|oxytocin|rhogam|amniotic|leopold\w*|menstrua\w*|ovulat\w*)\b/g, { alias: ["maternity", "pregnan", "obstetric"] }),
      ch("General Maternity & Child Health Nursing", "تمريض الأمومة والطفولة العام", "सामान्य मातृत्व एवं शिशु स्वास्थ्य नर्सिंग", null, { fallback: true }),
    ],
  },
  {
    key: "Pediatrics", ar: "طب الأطفال", hi: "बाल रोग (पीडियाट्रिक्स)",
    prior: ["pediatric", "paediatric"],
    chapters: [
      ch("Neonatal Nursing", "تمريض حديثي الولادة", "नवजात नर्सिंग",
        /\b(neonat\w*|newborns?|umbilical cord|kangaroo|phototherapy|preterm|premature|cord care|vitamin k|ophthalmia|bilirubin|physiologic jaundice|surfactant|necrotizing enterocolitis|apgar)\b/g, { alias: ["neonatal nursing"], exact: ["neonatal nursing"] }),
      ch("Neonatal & Pediatrics", "حديثو الولادة والأطفال", "नवजात और बाल चिकित्सा", null, { exact: ["neonatal pediatrics", "neonatal paediatrics"] }),
      ch("Pediatrics", "طب الأطفال", "बाल रोग",
        /\b(pediatric\w*|paediatric\w*|child|children|croup|epiglottitis|kawasaki|intussusception|cystic fibrosis|otitis|rsv|bronchiolitis|febrile seizures?|kids|congenital|down syndrome|celiac|hirschsprung|wilms|nephrotic syndrome)\b/g, { fallback: true, alias: ["pediatric", "paediatric"] }),
    ],
  },
  {
    key: "Community Health Nursing", ar: "تمريض صحة المجتمع", hi: "सामुदायिक स्वास्थ्य नर्सिंग",
    prior: ["community"],
    chapters: [
      ch("General Community Nursing", "تمريض المجتمع العام", "सामान्य सामुदायिक नर्सिंग",
        /\b(community|public health|epidemiolog\w*|screening|primary health care|home visits?|school nurse|occupational|health education|outbreaks?|primary prevention|secondary prevention|tertiary prevention|incidence|prevalence|vital statistics|environmental health|family planning|health promotion)\b/g, { fallback: true, alias: ["community"] }),
    ],
  },
  {
    key: "Pharmacology", ar: "علم الأدوية", hi: "फार्माकोलॉजी",
    prior: ["pharmacolog"],
    chapters: [
      ch("General Pharmacology", "علم الأدوية العام", "सामान्य फार्माकोलॉजी",
        /\b(pharmacolog\w*|mechanism of action|drug class\w*|pharmacokinetic\w*|pharmacodynamic\w*|half life|therapeutic index|antidotes?|contraindicat\w*|beta blockers?|ace inhibitors?|statins?|antibiotics?|anticoagulants?|warfarin|heparin|diuretics?|opioids?|nsaids?|antihypertensives?)\b/g, { fallback: true, alias: ["pharmacolog"] }),
    ],
  },
  {
    key: "Research", ar: "البحث العلمي", hi: "अनुसंधान",
    prior: ["research", "leadership"],
    chapters: [
      ch("Leadership & Management", "القيادة والإدارة", "नेतृत्व और प्रबंधन",
        /\b(leadership|leaders?|nurse manager|management style|staffing|budget|conflict resolution|conflict|motivation|change theory|autocratic|democratic|laissez faire|transformational|transactional|negotiat\w*|time management|chain of command|accountab\w*|mentor\w*)\b/g, { alias: ["leadership", "management"] }),
      ch("Delegation & Supervision", "التفويض والإشراف", "प्रत्यायोजन और पर्यवेक्षण",
        /\b(delegat\w*|supervis\w*|assign\w*|unlicensed|uap|lpn|lvn|rn|nursing assistants?|scope of practice|aides?|cna)\b/g, { alias: ["delegation", "supervision"] }),
      ch("Research & Evidence-Based Practice", "البحث والممارسة المبنية على الأدلة", "अनुसंधान और साक्ष्य-आधारित अभ्यास",
        /\b(research\w*|evidence based|evidence|hypothes\w*|sampling|sample size|variables?|qualitative|quantitative|p value|literature review|study design|randomi[sz]\w*|bias|validity|reliability|cohort|case control|systematic review|meta analysis|ebp)\b/g, { alias: ["research", "evidence"] }),
      ch("Ethics & Legal Aspects of Nursing", "الأخلاقيات والجوانب القانونية للتمريض", "नर्सिंग की नैतिकता और कानूनी पहलू",
        /\b(ethic\w*|legal\w*|consent|confidential\w*|autonomy|beneficence|malpractice|negligence|hipaa|advance directives?|privacy|whistle ?blow\w*|nonmaleficence|justice|fidelity|veracity|tort|liability|laws?|false imprisonment|battery|assault|good samaritan|dnr|do not resuscitate|patient rights?)\b/g, { alias: ["ethic", "legal"] }),
      ch("Documentation & Medical Records", "التوثيق والسجلات الطبية", "दस्तावेज़ीकरण और मेडिकल रिकॉर्ड",
        /\b(documentation|document\w*|charting|chart|medical records?|health records?|soap|sbar|hand off|handoff|handover|shift report|late entry|electronic health record|ehr|emr|narrative notes?)\b/g, { alias: ["documentation", "record"] }),
      ch("Research, Leadership & Delegation", "البحث والقيادة والتفويض", "अनुसंधान, नेतृत्व और प्रत्यायोजन", null, { fallback: true, exact: ["research leadership delegation", "research leadership and delegation"] }),
    ],
  },
  {
    key: "Medications", ar: "الأدوية", hi: "दवाएँ",
    prior: ["medication"],
    chapters: [
      ch("Medication Dose & Calculations", "جرعات الأدوية والحسابات", "दवा की खुराक और गणनाएँ",
        /\b(calculat\w*|dosage|dose|doses|mg kg|ml hr|ml h|gtt|drops? per minute|flow rate|infusion rate|how many (ml|mg|tablets?|drops?|mcg)|convert\w*|conversion|mcg|reconstitut\w*|dilut\w*|titrat\w*)\b/g, { alias: ["dose", "dosage", "calculation"] }),
      ch("Medication - General", "الأدوية - عام", "दवाएँ - सामान्य",
        /\b(medication administration|five rights|six rights|rights of medication|route of administration|prn|sublingual|parenteral|intramuscular|subcutaneous|intradermal|eye drops|ear drops|z track|enteral medication\w*)\b/g, { fallback: true }),
    ],
  },
  {
    key: "Mental Health & Psychiatric Nursing", ar: "الصحة النفسية وتمريض الأمراض النفسية", hi: "मानसिक स्वास्थ्य एवं मनोरोग नर्सिंग",
    prior: ["mental", "psychiatric"],
    chapters: [
      ch("Communication & Therapeutic", "التواصل والتواصل العلاجي", "संवाद और चिकित्सीय संचार",
        /\b(communicat\w*|therapeutic|active listening|open ended|empath\w*|rapport|reflect\w*|clarif\w*|silence|nonverbal|interview\w*|restating|paraphras\w*|focusing|nurse client relationship|nurse patient relationship)\b/g, { alias: ["communication", "therapeutic"] }),
      ch("General Mental Health & Psychiatric Nursing", "الصحة النفسية وتمريض الأمراض النفسية العام", "सामान्य मानसिक स्वास्थ्य एवं मनोरोग नर्सिंग",
        /\b(psychiatr\w*|schizophren\w*|depress\w*|bipolar|anxiety|suicid\w*|mania|manic|psychosis|psychotic|delusions?|hallucinat\w*|lithium|antipsychotics?|personality disorders?|substance abuse|alcohol withdrawal|defense mechanisms?|mental health|ocd|ptsd|eating disorders?|anorexia|bulimia)\b/g, { fallback: true }),
    ],
  },
  {
    key: "Nutrition", ar: "التغذية", hi: "पोषण",
    prior: ["nutrition"],
    chapters: [
      ch("General Nutrition", "التغذية العامة", "सामान्य पोषण",
        /\b(nutrition\w*|diets?|dietary|vitamins?|calori\w*|proteins?|carbohydrates?|minerals?|fiber|fibre|enteral|tpn|parenteral nutrition|tube feeding|bmi|obes\w*|malnutrition|iron rich|foods?|folic acid|fats?|lipids?|kwashiorkor|marasmus|scurvy|rickets|beriberi|pellagra)\b/g, { fallback: true, alias: ["nutrition"] }),
    ],
  },
];

const chapterByEn = (name) => TOPICS.flatMap((t) => t.chapters.map((c) => ({ t, c }))).find((x) => x.c.en === name);

// ---------- classification ----------
function classify(q) {
  const cat = norm(en(q.category));
  const sub = norm2(en(q.subcategory));
  const stem = norm(en(q.question));
  const rest = norm(enOptions(q.options).join(" ") + " " + en(q.explanation));
  const prior = TOPICS.find((t) => t.prior.some((p) => cat.includes(p)));

  // 1) the current chapter name already matches one of ours
  if (sub) {
    for (const t of TOPICS) {
      if (prior && prior !== t) continue;
      for (const c of t.chapters) {
        if (sub === norm2(c.en) || (c.exact || []).includes(sub)) return { t, c, how: "existing", raw: 99 };
      }
    }
  }

  // 2) keyword scoring
  const scores = {};
  let best = null;
  for (const t of TOPICS) {
    for (const c of t.chapters) {
      if (!c.re) continue;
      let raw = Math.min(2, count(c.re, stem)) * 3 + Math.min(3, count(c.re, rest));
      if (c.boost && raw > 0) raw += c.boost;
      if (sub && (c.alias || []).some((a) => sub.includes(a))) raw += 6;
      scores[c.en] = raw;
      const total = raw + (prior === t ? 4 : 0);
      if (raw >= MIN_SCORE && (!best || total > best.total)) best = { t, c, raw, total };
    }
  }
  if (best) {
    // newborn + child content together -> the mixed chapter
    if (best.t.key === "Pediatrics" && best.c.en !== "Neonatal & Pediatrics") {
      const other = best.c.en === "Neonatal Nursing" ? "Pediatrics" : "Neonatal Nursing";
      if ((scores[other] || 0) >= MIN_SCORE) best = { ...best, ...chapterByEn("Neonatal & Pediatrics") };
    }
    return { t: best.t, c: best.c, how: "keywords", raw: best.raw };
  }

  // 3) fallback: General chapter of the current topic
  const t = prior || TOPICS.find((x) => x.key === "Fundamentals");
  return { t, c: t.chapters.find((c) => c.fallback), how: prior ? "fallback" : "unknown-category", raw: 0 };
}

// ---------- main ----------
async function main() {
  const rows = JSON.parse(await fs.readFile(FILE, "utf8"));
  if (!Array.isArray(rows)) throw new Error(FILE + " must be an array.");

  const originalPairs = {};
  const byTopic = {};
  const how = { existing: 0, keywords: 0, fallback: 0, "unknown-category": 0 };
  const lowConfidence = [];
  let movedTopic = 0;

  const out = rows.map((q, i) => {
    const oldCat = String(en(q.category));
    const oldSub = String(en(q.subcategory));
    const key = oldCat + " | " + oldSub;
    originalPairs[key] = (originalPairs[key] || 0) + 1;

    const r = classify(q);
    how[r.how]++;
    if (norm(oldCat) !== norm(r.t.key)) movedTopic++;
    const topicStats = (byTopic[r.t.key] ||= { total: 0, chapters: {} });
    topicStats.total++;
    topicStats.chapters[r.c.en] = (topicStats.chapters[r.c.en] || 0) + 1;
    if (r.how === "fallback" || r.how === "unknown-category") {
      lowConfidence.push({ index: i, topic: r.t.key, chapter: r.c.en, question: String(en(q.question)).slice(0, 140) });
    }
    return {
      ...q,
      category: { en: r.t.key, ar: r.t.ar, hi: r.t.hi },
      subcategory: { en: r.c.en, ar: r.c.ar, hi: r.c.hi },
    };
  });

  // verify before saving
  const chapterNames = new Set(TOPICS.flatMap((t) => t.chapters.map((c) => t.key + "|" + c.en)));
  out.forEach((q, i) => {
    if (!chapterNames.has(q.category.en + "|" + q.subcategory.en)) throw new Error("Bad grouping at index " + i);
  });
  const total = Object.values(byTopic).reduce((a, t) => a + t.total, 0);
  if (total !== rows.length) throw new Error("Question count changed: " + rows.length + " -> " + total);

  const report = {
    dryRun: DRY,
    totalQuestions: rows.length,
    movedToAnotherMainTopic: movedTopic,
    howPlaced: how,
    byTopic,
    originalCategorySubcategoryPairs: Object.fromEntries(Object.entries(originalPairs).sort((a, b) => b[1] - a[1])),
    placedInGeneralChapter: { count: lowConfidence.length, first200: lowConfidence.slice(0, 200) },
  };
  await fs.writeFile(REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");

  const lines = ["# Question regroup " + (DRY ? "(dry run - nothing changed)" : "(applied)"), "", "Total questions: " + rows.length, ""];
  for (const t of TOPICS) {
    const s = byTopic[t.key] || { total: 0, chapters: {} };
    lines.push("## " + t.key + " - " + s.total);
    t.chapters.forEach((c) => lines.push("- " + c.en + ": " + (s.chapters[c.en] || 0)));
    lines.push("");
  }
  lines.push("Placed by: existing chapter " + how.existing + ", keywords " + how.keywords + ", General fallback " + (how.fallback + how["unknown-category"]));
  lines.push("Moved to a different main topic: " + movedTopic);
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, text + "\n");

  if (DRY) {
    console.log("\nDRY RUN: questions.json was not changed.");
    return;
  }
  await fs.writeFile(FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("\nquestions.json updated.");
}

main().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
