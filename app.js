/* Gulf Nurse app runtime — restored startup/render logic. */
// Translation data is stored directly in questions.json (English + Arabic + Hindi).
let lang = localStorage.getItem("gn_lang") || "en";
let questions = [];
let currentView = "home";
let selectedTopic = null;
let selectedChapter = null; // null = all chapters of the topic
let selectedCount = null;
let selectedMode = "exam";
let quiz = null;
let soundOn = localStorage.getItem("gn_sound") !== "0";

const $ = (s) => document.querySelector(s);
const app = () => $("#app");
const tr = (key, vars = {}) => {
  const dict = window.GN?.STR?.[lang] || window.GN?.STR?.en || {};
  let value = dict[key] ?? window.GN?.STR?.en?.[key] ?? key;
  Object.keys(vars).forEach(k => value = String(value).replaceAll("{" + k + "}", vars[k]));
  return value;
};
// Extra texts for the folder-style home (10th topic "Nutrition", chapter screens). Added here so i18n.js stays as it is.
function extendGN() {
  const G = window.GN;
  if (!G || G.__ext) return;
  G.__ext = true;
  const S = {
    en: { back: "Back", allChapters: "All chapters", chooseChapter: "Choose a chapter to practise", w9: "10 topics" },
    ar: { back: "رجوع", allChapters: "جميع الفصول", chooseChapter: "اختر فصلًا للتدرّب", w9: "10 مواضيع" },
    hi: { back: "वापस", allChapters: "सभी अध्याय", chooseChapter: "अभ्यास के लिए अध्याय चुनें", w9: "10 विषय" }
  };
  Object.keys(S).forEach(l => { if (G.STR[l]) Object.assign(G.STR[l], S[l]); });
  const N = {
    en: ["Nutrition", "Diets, vitamins, minerals and nutritional care"],
    ar: ["التغذية", "الحميات والفيتامينات والمعادن والرعاية الغذائية"],
    hi: ["पोषण", "आहार, विटामिन, खनिज और पोषण संबंधी देखभाल"]
  };
  const R = {
    en: "Mixed test with questions from all 10 topics",
    ar: "اختبار مختلط بأسئلة من المواضيع العشرة",
    hi: "सभी 10 विषयों के प्रश्नों वाला मिश्रित टेस्ट"
  };
  Object.keys(N).forEach(l => {
    if (!G.TOPIC_TXT[l]) return;
    G.TOPIC_TXT[l].nutrition = N[l];
    if (G.TOPIC_TXT[l].random) G.TOPIC_TXT[l].random[1] = R[l];
  });
  if (G.TOPIC_TXT.en.maternity) G.TOPIC_TXT.en.maternity[0] = "Maternity & Child Health Nursing";
}
// Order of the chapters inside each main topic (English names, same as the regroup script). Unknown ones go last.
const CHAPTER_ORDER = {
  "Medical-Surgical Nursing": ["Cardiac System", "Respiratory System", "Neurology System", "Renal System", "Appendicitis, Tonsillectomy & Tracheostomy", "Pyloric Stenosis & Vaccinations", "GCS & Burns", "General Medical-Surgical Nursing"],
  "Fundamentals": ["ABG, CPR & Chest Tube", "Infection Control", "Diabetes & Wounds", "Pressure Injury & Electrolytes", "Emergency & Critical Nursing", "Health Assessment", "Patient Safety & Quality Improvement", "General Fundamentals"],
  "Maternity & Child Nursing": ["Child Health", "Growth & Development", "Maternity", "LMP Calculation", "General Maternity & Child Health Nursing"],
  "Pediatrics": ["Neonatal Nursing", "Neonatal & Pediatrics", "Pediatrics"],
  "Community Health Nursing": ["General Community Nursing"],
  "Pharmacology": ["General Pharmacology"],
  "Research": ["Leadership & Management", "Delegation & Supervision", "Research & Evidence-Based Practice", "Ethics & Legal Aspects of Nursing", "Documentation & Medical Records", "Research, Leadership & Delegation"],
  "Medications": ["Medication Dose & Calculations", "Medication - General"],
  "Mental Health & Psychiatric Nursing": ["Communication & Therapeutic", "General Mental Health & Psychiatric Nursing"],
  "Nutrition": ["General Nutrition"]
};
// Questions can be plain English strings/arrays OR {en, ar, hi} objects.
// If a translation is missing or incomplete we silently fall back to English, so the app never breaks.
function enOf(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value.en ?? Object.values(value)[0];
  return value;
}
function getLangValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value[lang];
    if (typeof v === "string" && v.trim()) return v;
    return value.en ?? Object.values(value)[0] ?? "";
  }
  return value ?? "";
}
function getLangArray(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const base = Array.isArray(value.en) ? value.en : (Object.values(value).find(Array.isArray) || []);
    const v = value[lang];
    // only use the translated options if every option is there, so the answer index stays correct
    if (Array.isArray(v) && v.length === base.length && v.every(x => String(x ?? "").trim())) return v;
    return base;
  }
  return Array.isArray(value) ? value : [];
}
function isValidQuestion(q) {
  const text = enOf(q?.question), opts = enOf(q?.options), a = Number(q?.answer);
  return typeof text === "string" && text.trim() !== "" && Array.isArray(opts) && opts.length >= 2 && Number.isInteger(a) && a >= 0 && a < opts.length;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function localize(item) {
  const q = item.src, options = getLangArray(q.options);
  item.question = getLangValue(q.question);
  item.category = getLangValue(q.category);
  item.sub = getLangValue(q.subcategory);
  item.explanation = getLangValue(q.explanation);
  item.choices.forEach(c => { c.text = options[c.idx]; });
}
function prepare(q) {
  const choices = getLangArray(q.options).map((text, i) => ({ text, idx: i, correct: i === Number(q.answer) }));
  if (!q.fixedOrder) shuffle(choices);
  const item = { src: q, choices, picked: null };
  localize(item);
  return item;
}
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function icon(name) {
  const p = {
    arrow:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
    back:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    rotate:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 11a8 8 0 1 0 1 4"/><path d="M20 4v7h-7"/></svg>',
    x:'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    globe:'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.5 6 3.5 9S14.5 18.3 12 21c-2.5-2.7-3.5-6-3.5-9S9.5 5.7 12 3z"/></svg>',
    volume:'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mute:'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
    clock:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/></svg>',
    home:'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/></svg>',
    light:'<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-2 2-2 4h-4c0-2-1-3-2-4z"/></svg>'
  };
  return p[name] || "";
}
const TOPIC_ICONS = {
  "fund": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"m9 14 2 2 4-4\"/>",
  "medsurg": "<path d=\"M11 2v2\"/><path d=\"M5 2v2\"/><path d=\"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1\"/><path d=\"M8 15a6 6 0 0 0 12 0v-3\"/><circle cx=\"20\" cy=\"10\" r=\"2\"/>",
  "maternity": "<path d=\"M9 12h.01\"/><path d=\"M15 12h.01\"/><path d=\"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5\"/><path d=\"M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1\"/>",
  "peds": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 14.2s1.3 2 3.5 2 3.5-2 3.5-2\"/><path d=\"M9 9.5h.01\"/><path d=\"M15 9.5h.01\"/><path d=\"M12 3c-1.2 1.2-1 2.6.3 3\"/>",
  "community": "<path d=\"M3 10.5 12 3l9 7.5\"/><path d=\"M5 9v12h14V9\"/><path d=\"M12 12v5\"/><path d=\"M9.5 14.5h5\"/>",
  "pharm": "<path d=\"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z\"/><path d=\"m8.5 8.5 7 7\"/>",
  "research": "<path d=\"M6 18h8\"/><path d=\"M3 22h18\"/><path d=\"M14 22a7 7 0 1 0 0-14h-1\"/><path d=\"M9 14h2\"/><path d=\"M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z\"/><path d=\"M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3\"/>",
  "meds": "<path d=\"m18 2 4 4\"/><path d=\"m17 7 3-3\"/><path d=\"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5\"/><path d=\"m9 11 4 4\"/><path d=\"m5 19-3 3\"/><path d=\"m14 4 6 6\"/>",
  "mental": "<path d=\"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z\"/><path d=\"M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z\"/><path d=\"M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4\"/><path d=\"M17.599 6.5a3 3 0 0 0 .399-1.375\"/><path d=\"M6.003 5.125A3 3 0 0 0 6.401 6.5\"/><path d=\"M3.477 10.896a4 4 0 0 1 .585-.396\"/><path d=\"M19.938 10.5a4 4 0 0 1 .585.396\"/><path d=\"M6 18a4 4 0 0 1-1.967-.516\"/><path d=\"M19.967 17.484A4 4 0 0 1 18 18\"/>",
  "nutrition": "<path d=\"M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z\"/><path d=\"M10 2c1 .5 2 2 2 5\"/>",
  "random": "<path d=\"M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22\"/><path d=\"m18 2 4 4-4 4\"/><path d=\"M2 6h1.9c1.5 0 2.9.9 3.6 2.2\"/><path d=\"M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8\"/><path d=\"m18 14 4 4-4 4\"/>"
};
TOPIC_ICONS.default = '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>';
// One relevant, professional icon per topic (falls back to an open-book icon for any new topic).
function topicIcon(name) {
  const body = TOPIC_ICONS[topicKey(name)] || TOPIC_ICONS.default;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}
function applyLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = (window.GN?.LANGS?.find(x => x.id === lang)?.dir) || "ltr";
  document.title = tr("docTitle");
}
function savePrefs() { localStorage.setItem("gn_lang", lang); localStorage.setItem("gn_sound", soundOn ? "1" : "0"); }
function say(text) {
  if (!soundOn || !("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = lang === "ar" ? "ar-SA" : lang === "hi" ? "hi-IN" : "en-US";
  window.speechSynthesis.speak(u);
}
function bindRipples() {
  document.querySelectorAll(".ripple-host").forEach(el => {
    if (el.dataset.rippleBound) return;
    el.dataset.rippleBound = "1";
    el.addEventListener("click", e => {
      const r = document.createElement("span"), rect = el.getBoundingClientRect(), size = Math.max(rect.width, rect.height);
      r.className="ripple"; r.style.width=r.style.height=size+"px";
      r.style.left=(e.clientX-rect.left-size/2)+"px"; r.style.top=(e.clientY-rect.top-size/2)+"px";
      el.appendChild(r); setTimeout(()=>r.remove(),650);
    });
  });
}
function shell(html, plain=false) {
  app().className="card"+(plain?" plain":"");
  app().innerHTML=html; bindRipples();
}
function topicKey(name) {
  const m={"Fundamentals":"fund","Medical-Surgical Nursing":"medsurg","Maternity & Child Nursing":"maternity","Pediatrics":"peds","Community Health Nursing":"community","Pharmacology":"pharm","Research":"research","Medications":"meds","Mental Health & Psychiatric Nursing":"mental","Nutrition":"nutrition","Random":"random"};
  return m[name]||name;
}
function getCategoryKey(q) {
  if (q?.category && typeof q.category === "object" && !Array.isArray(q.category)) return q.category.en ?? Object.values(q.category)[0] ?? "";
  return String(q?.category ?? "");
}
function getSubcategoryKey(q) {
  if (q?.subcategory && typeof q.subcategory === "object" && !Array.isArray(q.subcategory)) return q.subcategory.en ?? Object.values(q.subcategory)[0] ?? "";
  return String(q?.subcategory ?? "");
}
function getCategoryLabel(q) { return getLangValue(q?.category); }
function getSubcategoryLabel(q) { return getLangValue(q?.subcategory); }
function topicText(name,count) {
  const key=topicKey(name), t=window.GN?.TOPIC_TXT?.[lang]?.[key], e=window.GN?.TOPIC_TXT?.en?.[key];
  return {title:t?.[0]||e?.[0]||name,desc:t?.[1]||e?.[1]||"",count:tr("nQuestions",{n:count})};
}
function getAllTopicCounts() {
  const map={};
  questions.forEach(q=>{const c=getCategoryKey(q); if(c) map[c]=(map[c]||0)+1;});
  return map;
}
// Questions of a topic (or all questions for "Random"), optionally only one chapter.
function topicPool(topic, chapter) {
  const base = topic === "Random" ? questions.slice() : questions.filter(q => getCategoryKey(q) === topic);
  return chapter ? base.filter(q => getSubcategoryKey(q) === chapter) : base;
}
// Chapters of a topic with their question counts, in the order of CHAPTER_ORDER.
function getChapterCounts(topic) {
  const map = new Map();
  questions.forEach(q => {
    if (getCategoryKey(q) !== topic) return;
    const k = getSubcategoryKey(q);
    if (!k) return;
    const e = map.get(k) || { key: k, count: 0, sample: q };
    e.count++;
    map.set(k, e);
  });
  const order = CHAPTER_ORDER[topic] || [];
  const rank = (k) => { const i = order.indexOf(k); return i < 0 ? 999 : i; };
  return Array.from(map.values()).sort((a, b) => rank(a.key) - rank(b.key) || b.count - a.count);
}
function chapterLabel(topic, key) {
  const e = getChapterCounts(topic).find(c => c.key === key);
  return e ? getSubcategoryLabel(e.sample) || key : key;
}
function renderWelcome() {
  shell('<section class="welcome" id="welcome"><button class="hbtn lang-btn on-welcome" onclick="openLanguage()">'+icon("globe")+'<span>'+escapeHtml(tr("langBtn"))+'</span></button><button class="sound-btn on-welcome '+(soundOn?"":"off")+'" onclick="toggleSound()" title="'+escapeHtml(tr("sound"))+'">'+icon(soundOn?"volume":"mute")+'</button><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="w-inner"><div class="w-mark"><div class="ring"></div><div class="ring r2"></div><img class="w-logo" src="logo.svg" alt="'+escapeHtml(tr("logoAlt"))+'"></div><h1 class="w-title"><span>G</span><span>U</span><span>L</span><span>F</span> <span>N</span><span>U</span><span>R</span><span>S</span><span>E</span></h1><p class="w-sub">'+escapeHtml(tr("wSub"))+'</p><p class="w-tag">'+escapeHtml(tr("wTag"))+'</p><div class="w-chips"><span class="chip"><b>'+questions.length+'</b>'+escapeHtml(tr("wQuestions"))+'</span><span class="chip">'+escapeHtml(tr("w9"))+'</span><span class="chip">'+escapeHtml(tr("wOffline"))+'</span></div><button class="w-btn ripple-host" onclick="enterApp()">'+escapeHtml(tr("wGo"))+' '+icon("arrow")+'</button></div></section>');
}
function enterApp(){const el=$("#welcome");if(el){el.classList.add("leaving");setTimeout(()=>renderHome(true),420);}else renderHome(true);}
const TOPIC_COLORS=["#0ea5e9","#0d9488","#6366f1","#8b5cf6","#f97316","#ef4444","#14b8a6","#0891b2","#a855f7","#22c55e","#e11d48"];
function renderHome(animate=false){
  currentView="home";applyLanguage();
  const counts=getAllTopicCounts();
  const preferred=["Fundamentals","Medical-Surgical Nursing","Maternity & Child Nursing","Pediatrics","Community Health Nursing","Pharmacology","Research","Medications","Mental Health & Psychiatric Nursing","Nutrition"];
  const names=preferred.filter(name=>counts[name]>0).concat(Object.keys(counts).filter(name=>name!=="Random"&&!preferred.includes(name)));
  const ordered=names.concat("Random");
  const cards=ordered.map((name,i)=>{
    const t=topicText(name,name==="Random"?questions.length:counts[name]);
    const tc=TOPIC_COLORS[i%TOPIC_COLORS.length];
    return '<button class="topic ripple-host" style="--tc:'+tc+';--i:'+i+'" onclick=\'chooseTopic('+JSON.stringify(name)+')\'><div class="t-text"><h3>'+escapeHtml(t.title)+'</h3><p>'+escapeHtml(t.desc)+'</p><span class="t-count">'+escapeHtml(t.count)+'</span></div><div class="t-icon">'+topicIcon(name)+'</div></button>';
  }).join("");
  shell('<div class="home-head"><div class="brand"><img class="brand-logo" src="logo.svg" alt="">'+escapeHtml(tr("brand"))+'</div><div class="head-actions"><button class="hbtn tips-btn ripple-host" onclick="renderTips()">'+icon("light")+'<span>'+escapeHtml(tr("tipsBtn"))+'</span></button><button class="hbtn lang-btn ripple-host" onclick="openLanguage()">'+icon("globe")+'<span>'+escapeHtml(tr("langBtn"))+'</span></button></div></div><div class="search-wrap"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg><input id="topicSearch" class="topic-search" type="search" autocomplete="off" placeholder="'+escapeHtml(tr("homeTitle"))+'"></div><h1 class="h-title">'+escapeHtml(tr("homeTitle"))+'</h1><p class="h-sub">'+escapeHtml(tr("homeSub"))+'</p><div id="topicList">'+cards+'</div>');
  if(animate)requestAnimationFrame(()=>app().classList.add("swap"));
  const input=$("#topicSearch"), list=$("#topicList");
  if(input&&list) input.addEventListener("input",()=>{
    const needle=input.value.trim().toLocaleLowerCase();
    list.querySelectorAll(".topic").forEach(card=>{card.hidden=needle && !card.textContent.toLocaleLowerCase().includes(needle);});
  });
}
// A main topic opens like a folder: its chapters are shown first. "Random" goes straight to the test setup.
function chooseTopic(name){
  selectedTopic=name;selectedChapter=null;selectedCount=null;
  if(name==="Random")renderLength();else renderChapters(name);
}
function renderChapters(topic){
  selectedTopic=topic;selectedChapter=null;
  const list=getChapterCounts(topic);
  if(!list.length){selectedCount=null;renderLength();return;} // topic without chapters: behave as before
  currentView="chapters";
  const total=topicPool(topic).length,t=topicText(topic,total);
  const items=(list.length>1?[{key:null,title:tr("allChapters"),count:total}]:[]).concat(list.map(c=>({key:c.key,title:chapterLabel(topic,c.key),count:c.count})));
  const cards=items.map((c,i)=>'<button class="topic ripple-host" style="--tc:'+TOPIC_COLORS[i%TOPIC_COLORS.length]+';--i:'+i+'" onclick=\'chooseChapter('+JSON.stringify(c.key)+')\'><div class="t-text"><h3>'+escapeHtml(c.title)+'</h3><p>'+escapeHtml(t.title)+'</p><span class="t-count">'+escapeHtml(tr("nQuestions",{n:c.count}))+'</span></div><div class="t-icon">'+topicIcon(topic)+'</div></button>').join("");
  shell('<button class="back-btn ripple-host" onclick="renderHome()">'+icon("back")+escapeHtml(tr("home"))+'</button><h1 class="h-title">'+escapeHtml(t.title)+'</h1><p class="h-sub">'+escapeHtml(tr("chooseChapter"))+'</p><div id="topicList">'+cards+'</div>');
}
function chooseChapter(key){selectedChapter=key||null;selectedCount=null;renderLength();}
function backFromLength(){
  if(selectedTopic==="Random")renderHome();
  else if(getChapterCounts(selectedTopic).length)renderChapters(selectedTopic);
  else renderHome();
}
function renderLength(){
  currentView="length";
  const cnt=topicPool(selectedTopic,selectedChapter).length,t=topicText(selectedTopic,cnt),max=Math.max(1,cnt);
  const chapterName=selectedChapter?chapterLabel(selectedTopic,selectedChapter):"";
  const heroTitle=chapterName||t.title,heroDesc=chapterName?t.title:t.desc;
  const backLabel=(selectedTopic==="Random"||!getChapterCounts(selectedTopic).length)?tr("home"):tr("back");
  const opts=[5,10,20,30,40,50].filter(n=>n<=max);selectedCount=Math.min(max,selectedCount||opts[0]||max);
  shell('<button class="back-btn ripple-host" onclick="backFromLength()">'+icon("back")+escapeHtml(backLabel)+'</button><div class="len-hero" style="--tc:#0d9488"><div class="t-icon">'+topicIcon(selectedTopic)+'</div><div><h2 style="margin:0">'+escapeHtml(heroTitle)+'</h2><div style="opacity:.9">'+escapeHtml(heroDesc)+'</div></div></div><label class="field">'+escapeHtml(tr("numQ"))+'</label><div class="sizes">'+opts.map(n=>'<button class="size '+(n===selectedCount?"active":"")+' ripple-host" onclick="setCount('+n+')">'+n+'<small>'+(n===max?escapeHtml(tr("allQ")):escapeHtml(tr("questionsLbl")))+'</small></button>').join("")+'</div><label class="field">'+escapeHtml(tr("testMode"))+'</label><div class="seg"><button class="seg-btn '+(selectedMode==="exam"?"active":"")+'" onclick="setMode(\'exam\')">'+escapeHtml(tr("exam"))+'</button><button class="seg-btn '+(selectedMode==="practice"?"active":"")+'" onclick="setMode(\'practice\')">'+escapeHtml(tr("practice"))+'</button></div><p class="mode-help">'+escapeHtml(selectedMode==="exam"?tr("examHelp"):tr("practiceHelp"))+'</p><button class="btn ripple-host shine" onclick="startTest()">'+escapeHtml(tr("start"))+'</button>');
}
function setCount(n){selectedCount=n;renderLength();}
function setMode(m){selectedMode=m;renderLength();}
function startTest(){
  try{
    let pool=topicPool(selectedTopic,selectedChapter);
    if(!pool.length)throw new Error("No questions found for selected topic.");
    shuffle(pool);const count=Math.min(Number(selectedCount)||pool.length,pool.length);
    quiz={items:pool.slice(0,count).map(prepare),index:0,started:Date.now(),elapsed:0,timer:null,mode:selectedMode,selectedTopic};
    currentView="quiz";renderQuiz();startTimer();
  }catch(e){shell('<p class="error">'+escapeHtml(tr("startErr")+e.message)+'</p><button class="btn" onclick="renderHome()">'+escapeHtml(tr("home"))+'</button>');}
}
function startTimer(){clearInterval(quiz?.timer);quiz.timer=setInterval(()=>{if(!quiz)return;quiz.elapsed=Math.floor((Date.now()-quiz.started)/1000);const el=$("#timer");if(el)el.textContent=formatTime(quiz.elapsed);},1000);}
function formatTime(s){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}
function renderQuiz(dir="right"){
  const q=quiz.items[quiz.index],n=quiz.items.length,answered=quiz.items.filter(x=>x.picked!=null).length;
  const choices=q.choices.map((c,i)=>{let cls="";if(q.picked===i)cls+=" selected";if(quiz.mode==="practice"&&q.picked!=null)cls+=c.correct?" correct":(q.picked===i?" wrong":"");return '<button class="choice ripple-host'+cls+'" '+(quiz.mode==="practice"&&q.picked!=null?"disabled":"")+' onclick="pickAnswer('+i+')"><span class="l">'+String.fromCharCode(65+i)+'</span><span dir="auto">'+escapeHtml(c.text)+'</span></button>';}).join("");
  const explain=(quiz.mode==="practice"&&q.picked!=null)?'<div class="explain" dir="auto"><b>'+escapeHtml(q.choices[q.picked]?.correct?tr("sCorrect"):tr("sIncorrect"))+'</b><br>'+escapeHtml(q.explanation)+'</div>':"";
  shell('<div class="qbar"><div class="qbar-l"><button class="exit-btn ripple-host" onclick="confirmExit()">'+icon("x")+'<span>'+escapeHtml(tr("exit"))+'</span></button><button class="restart-btn ripple-host" onclick="confirmRestart()">'+icon("rotate")+'<span class="lbl">'+escapeHtml(tr("restart"))+'</span></button></div><div class="qbar-r"><div class="timer" id="timer">'+formatTime(quiz.elapsed)+'</div><button class="lang-mini ripple-host" onclick="openLanguage()" title="'+escapeHtml(tr("langBtn"))+'" aria-label="'+escapeHtml(tr("langBtn"))+'">'+icon("globe")+'</button><button class="sound-btn sm '+(soundOn?"":"off")+'" onclick="toggleSound()" title="'+escapeHtml(tr("sound"))+'">'+icon(soundOn?"volume":"mute")+'</button></div></div><div class="qmeta"><span>'+escapeHtml(tr("qOf",{i:quiz.index+1,n}))+'</span><span class="score-chip">'+escapeHtml(tr("answered",{d:answered,n}))+'</span></div><div class="bar"><div style="width:'+((quiz.index+1)/n*100).toFixed(1)+'%"></div></div><div class="qbody from-'+dir+'">'+(q.category?'<span class="tag">'+escapeHtml(q.category)+'</span>':"")+'<p class="q" dir="auto">'+escapeHtml(q.question)+'</p>'+choices+explain+'<div class="navrow"><button class="btn secondary" onclick="prevQuestion()" '+(quiz.index===0?"disabled":"")+'>'+escapeHtml(tr("prev"))+'</button><button class="btn" onclick="'+(quiz.index===n-1?"finishTest()":"nextQuestion()")+'">'+escapeHtml(quiz.index===n-1?tr("finish"):tr("next"))+'</button></div></div>');
}
function pickAnswer(i){const q=quiz.items[quiz.index];if(q.picked!=null&&(quiz.mode==="practice"||q.picked===i))return;q.picked=i;updateQuizAnswerUI(q,i);if(quiz.mode==="practice")say(q.choices[i].correct?tr("sCorrect"):tr("sIncorrect"));}
function updateQuizAnswerUI(q,picked){
  document.querySelectorAll(".choice").forEach((el,index)=>{
    const isPicked=index===picked;
    el.classList.toggle("selected",isPicked);
    if(quiz.mode==="practice"){
      el.classList.toggle("correct",q.choices[index].correct);
      el.classList.toggle("wrong",isPicked&&!q.choices[index].correct);
      el.disabled=true;
    }
    el.classList.toggle("chosen",isPicked);
  });
  const answered=quiz.items.filter(x=>x.picked!=null).length;
  const chip=document.querySelector(".score-chip");
  if(chip) chip.textContent=tr("answered",{d:answered,n:quiz.items.length});
  if(quiz.mode==="practice"&&!document.querySelector(".explain")){
    const qbody=document.querySelector(".qbody");
    if(qbody) qbody.insertAdjacentHTML("beforeend",'<div class="explain" dir="auto"><b>'+escapeHtml(q.choices[picked]?.correct?tr("sCorrect"):tr("sIncorrect"))+'</b><br>'+escapeHtml(q.explanation)+'</div>');
  }
}
function nextQuestion(){if(quiz.index<quiz.items.length-1){quiz.index++;renderQuiz("right");}else finishTest();}
function prevQuestion(){if(quiz.index>0){quiz.index--;renderQuiz("left");}}
function confirmExit(){modal(tr("exitTitle"),tr("exitMsg"),tr("exit"),()=>{clearInterval(quiz?.timer);quiz=null;renderHome();});}
function confirmRestart(){modal(tr("restartTitle"),tr("restartMsg"),tr("restart"),()=>restartTest());}
function restartTest(){if(!quiz)return;clearInterval(quiz.timer);let pool=topicPool(selectedTopic,selectedChapter);shuffle(pool);quiz.items=pool.slice(0,Math.min(selectedCount||pool.length,pool.length)).map(prepare);quiz.index=0;quiz.started=Date.now();quiz.elapsed=0;startTimer();renderQuiz("left");}
function finishTest(){const unanswered=quiz.items.length-quiz.items.filter(q=>q.picked!=null).length;if(unanswered)modal(tr("finishTitle"),tr(unanswered===1?"finishOne":"finishMany",{n:unanswered}),tr("finishOk"),showResult);else showResult();}
function showResult(){
  clearInterval(quiz.timer);const items=quiz.items,correct=items.reduce((a,q)=>a+(q.picked!=null&&q.choices[q.picked]?.correct?1:0),0),answered=items.filter(q=>q.picked!=null).length,skipped=items.length-answered,pct=Math.round(correct/items.length*100);
  const wrongCount=items.filter(q=>q.picked!=null&&!q.choices[q.picked]?.correct).length,bad=items.filter(q=>q.picked==null||!q.choices[q.picked]?.correct),cls=pct>=80?"great":pct>=50?"":"keep";
  shell('<div class="result '+cls+'"><div class="r-hero"><h2 class="r-title">'+escapeHtml(pct>=80?tr("congrats"):tr("complete"))+'</h2><p class="r-note">'+escapeHtml(pct>=80?tr("noteGreat"):pct>=50?tr("noteGood"):tr("noteKeep"))+'</p><p class="r-topic">'+escapeHtml(items[0]?.category||"")+'</p><div class="r-pct" data-pct="'+pct+'">'+pct+'%</div><div class="ring-wrap"><svg class="score-ring" viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="48"></circle><circle class="ring-fg" cx="60" cy="60" r="48" stroke="currentColor" stroke-dasharray="301.59" stroke-dashoffset="'+(301.59-(301.59*pct/100))+'"></circle><circle class="ring-spin" cx="60" cy="60" r="48"></circle></svg><div class="ring-center"><div class="ring-pct'+(String(correct+"/"+items.length).length>=8?" xs":String(correct+"/"+items.length).length>=6?" sm":"")+'" data-correct="'+correct+'" data-total="'+items.length+'">'+correct+'/'+items.length+'</div><div class="ring-label">'+escapeHtml(tr("sCorrect"))+'</div></div></div></div><div class="stats" style="--n:3"><div class="stat good"><div class="stat-val">'+correct+'</div><div class="stat-label">'+escapeHtml(tr("sCorrect"))+'</div></div><div class="stat bad"><div class="stat-val">'+wrongCount+'</div><div class="stat-label">'+escapeHtml(tr("sIncorrect"))+'</div></div><div class="stat skip"><div class="stat-val">'+skipped+'</div><div class="stat-label">'+escapeHtml(tr("sSkipped"))+'</div></div></div><div class="time-card"><span class="time-ic">'+icon("clock")+'</span><span class="time-lbl">'+escapeHtml(tr("sTime"))+'</span><span class="time-val">'+formatTime(quiz.elapsed)+'</span></div><div class="r-actions"><button class="btn ripple-host" onclick="renderHome()">'+icon("home")+'<span>'+escapeHtml(tr("home"))+'</span></button><button class="btn secondary ripple-host" onclick="startTest()">'+icon("rotate")+'<span>'+escapeHtml(tr("again"))+'</span></button></div>'+(bad.length?'<div class="review"><h3>'+escapeHtml(tr("review",{n:bad.length}))+'</h3>'+bad.map(q=>'<div class="rev-item"><div class="rev-q" dir="auto">'+escapeHtml(q.question)+'</div><div class="'+(q.picked==null?"skipd":"you")+'">'+escapeHtml(q.picked==null?tr("notAnswered"):tr("yourAns")+q.choices[q.picked].text)+'</div><div class="right">'+escapeHtml(tr("correctAns")+q.choices.find(c=>c.correct)?.text)+'</div><div class="rev-exp" dir="auto">'+escapeHtml(q.explanation)+'</div></div>').join("")+'</div>':'<div class="perfect">'+escapeHtml(tr("perfect"))+'</div>')+'</div>');
  quiz=null;
}
function modal(title,msg,ok,action){
  const el=document.createElement("div");el.className="modal";el.innerHTML='<div class="modal-box"><h3>'+escapeHtml(title)+'</h3><p>'+escapeHtml(msg)+'</p><div class="modal-row"><button class="btn secondary" id="mCancel">'+escapeHtml(tr("cancel"))+'</button><button class="btn" id="mOk">'+escapeHtml(ok)+'</button></div></div>';
  document.body.appendChild(el);el.querySelector("#mCancel").onclick=()=>el.remove();el.querySelector("#mOk").onclick=()=>{el.remove();action();};
}
function openLanguage(){
  const langs=window.GN?.LANGS||[],el=document.createElement("div");el.className="modal";
  el.innerHTML='<div class="modal-box"><h3>'+escapeHtml(tr("langTitle"))+'</h3><div class="lang-list">'+langs.map(l=>'<button class="lang-opt '+(l.id===lang?"active":"")+'" onclick="setLang(\''+l.id+'\')"><span>'+escapeHtml(l.label)+'</span><small>'+l.short+'</small></button>').join("")+'</div></div>';
  document.body.appendChild(el);el.addEventListener("click",e=>{if(e.target===el)el.remove();});
}
function setLang(l){lang=l;savePrefs();applyLanguage();if(quiz)quiz.items.forEach(localize);document.querySelector(".modal")?.remove();if(currentView==="home")renderHome();else if(currentView==="chapters"){const keep=selectedChapter;renderChapters(selectedTopic);selectedChapter=keep;}else if(currentView==="length")renderLength();else if(currentView==="quiz"&&quiz){renderQuiz();document.querySelector(".qbody")?.classList.remove("from-right");}else if(currentView==="tips")renderTips();}
function toggleSound(){
  soundOn=!soundOn;savePrefs();
  if(!soundOn&&("speechSynthesis" in window))window.speechSynthesis.cancel();
  document.querySelectorAll(".sound-btn").forEach(b=>{b.classList.toggle("off",!soundOn);b.innerHTML=icon(soundOn?"volume":"mute");});
}
function renderTips(){currentView="tips";const T=window.GN?.TIPS?.[lang]||window.GN?.TIPS?.en;const items=(T?.items||[]).map((x,i)=>'<li class="tip-item"><span class="tip-num">'+(i+1)+'</span><div class="tip-tx"><b>'+escapeHtml(x[0])+'</b><span>'+escapeHtml(x[1])+'</span></div></li>').join("");shell('<div class="tips-top"><button class="back-btn ripple-host" onclick="renderHome()">'+icon("back")+escapeHtml(tr("home"))+'</button><button class="hbtn lang-btn" onclick="openLanguage()">'+icon("globe")+'<span>'+escapeHtml(tr("langBtn"))+'</span></button></div><div class="tips-hero"><div class="tips-hero-ic">'+icon("light")+'</div><div><h1>'+escapeHtml(tr("tipsTitle"))+'</h1><p>'+escapeHtml(tr("tipsSub"))+'</p></div></div><section class="tip-sec"><div class="tip-head"><div class="tip-ic" style="--tc:#0ea5e9">'+icon("light")+'</div><h2>'+escapeHtml(T.s1)+'</h2></div><ul class="tip-list">'+items+'</ul></section>',true);}
async function loadQuestions(){
  try{
    extendGN();
    const res=await fetch("questions.json",{cache:"no-store"});if(!res.ok)throw new Error("HTTP "+res.status);
    const data=await res.json();
    const list=Array.isArray(data)?data:(Array.isArray(data.questions)?data.questions:(data && data.question ? [data] : []));
    questions=list.filter(isValidQuestion);
    if(questions.length!==list.length)console.warn("Skipped "+(list.length-questions.length)+" invalid question(s) in questions.json");
    if(!questions.length)throw new Error("questions.json contains no valid questions.");
    applyLanguage();renderWelcome();
  }catch(e){shell('<div class="error"><h2>'+escapeHtml(tr("loadErr"))+'</h2><p>'+escapeHtml(e.message)+'</p><button class="btn" onclick="location.reload()">Retry</button></div>');}
}
Object.assign(window,{openLanguage,setLang,toggleSound,renderHome,renderTips,enterApp,chooseTopic,chooseChapter,renderChapters,backFromLength,setCount,setMode,startTest,pickAnswer,nextQuestion,prevQuestion,confirmExit,confirmRestart,finishTest,restartTest});
document.addEventListener("DOMContentLoaded",loadQuestions);
