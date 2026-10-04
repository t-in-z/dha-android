(function () {
  const app = document.getElementById("app");
  const SIZES = [5, 10, 20, 30, 40, 50];
  const LETTERS = ["A", "B", "C", "D", "E"];
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Language (English / Arabic / Hindi) ---------- */
  const { LANGS, STR, TOPIC_TXT, TIPS } = window.GN;
  let lang = "en";
  try { const sv = localStorage.getItem("gn-lang"); if (LANGS.some((l) => l.id === sv)) lang = sv; } catch (e) {}
  function T(key, vars) {
    let str = STR[lang] && STR[lang][key] !== undefined ? STR[lang][key] : STR.en[key];
    if (str === undefined) str = key;
    if (vars) str = str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return str;
  }
  function applyLang() {
    const L = LANGS.find((l) => l.id === lang) || LANGS[0];
    document.documentElement.lang = L.id;
    document.documentElement.dir = L.dir;
    document.title = T("docTitle");
  }
  function topicName(t) { const x = TOPIC_TXT[lang] && TOPIC_TXT[lang][t.id]; return x ? x[0] : t.name; }
  function topicDesc(t) { const x = TOPIC_TXT[lang] && TOPIC_TXT[lang][t.id]; return x ? x[1] : t.desc; }
  applyLang();

  /* ---------- Icons (inline SVG, white, drawn on a 64x64 grid) ---------- */
  const SOFT = 'fill="rgba(255,255,255,.26)"';
  const ICONS = {
    pulse: `<path d="M32 55 12 34C5 27 6 16 15 12c7-3 14 0 17 7 3-7 10-10 17-7 9 4 10 15 3 22z" ${SOFT}/><path d="M15 33h8l4-8 6 16 4-8h12"/>`,
    steth: `<path d="M16 9v17a10 10 0 0 0 20 0V9"/><path d="M13 9h6M33 9h6"/><path d="M26 36v7a11 11 0 0 0 22 0v-5"/><circle cx="48" cy="32" r="6" ${SOFT}/>`,
    baby: `<circle cx="32" cy="35" r="20" ${SOFT}/><circle cx="25" cy="34" r="2" fill="#fff" stroke="none"/><circle cx="39" cy="34" r="2" fill="#fff" stroke="none"/><path d="M26 43q6 5 12 0"/><path d="M32 15c-3-5 1-10 7-8"/>`,
    bear: `<circle cx="16" cy="17" r="8" ${SOFT}/><circle cx="48" cy="17" r="8" ${SOFT}/><circle cx="32" cy="35" r="19" ${SOFT}/><ellipse cx="32" cy="43" rx="8" ry="6"/><circle cx="32" cy="40" r="2" fill="#fff" stroke="none"/><circle cx="24" cy="31" r="2" fill="#fff" stroke="none"/><circle cx="40" cy="31" r="2" fill="#fff" stroke="none"/>`,
    house: `<path d="M13 27v27h38V27" ${SOFT}/><path d="M7 31 32 10l25 21"/><path d="M32 36v14M25 43h14"/>`,
    pill: `<g transform="rotate(-45 32 32)"><rect x="7" y="20" width="50" height="24" rx="12"/><path d="M19 20h13v24H19a12 12 0 0 1 0-24z" fill="rgba(255,255,255,.4)" stroke="none"/><path d="M32 20v24"/></g>`,
    research: `<circle cx="27" cy="27" r="17" ${SOFT}/><path d="M40 40l16 16" stroke-width="5"/><path d="M19 34v-5M27 34V21M35 34v-9"/>`,
    syringe: `<g transform="rotate(-45 30 32)"><rect x="14" y="24" width="30" height="16" rx="3" ${SOFT}/><path d="M22 24v6M28 24v6M34 24v6"/><path d="M14 32H3"/><path d="M44 32h10M54 25v14"/></g>`,
    brain: `<path d="M32 12C28 7 19 8 17 14 11 14 8 21 11 26 7 30 9 38 15 40 15 47 22 51 27 48 28 52 31 53 32 53 33 53 36 52 37 48 42 51 49 47 49 40 55 38 57 30 53 26 56 21 53 14 47 14 45 8 36 7 32 12z" ${SOFT}/><path d="M32 12v41M23 24c4 0 6 3 9 3M41 24c-4 0-6 3-9 3M22 38c4-1 6-4 10-4M42 38c-4-1-6-4-10-4"/>`,
    target: `<circle cx="32" cy="32" r="22" ${SOFT}/><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="3" fill="#fff" stroke="none"/><path d="M32 5v9M32 50v9M5 32h9M50 32h9"/>`,
    clock: `<circle cx="32" cy="32" r="23" ${SOFT}/><path d="M32 18v15l10 6"/>`,
    shuffle: `<g transform="translate(5 5) scale(2.2)" stroke-width="1.4"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></g>`,
  };
  function iconSvg(name) {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  }

  /* ---------- Topics: the 9 categories + Random ---------- */
  const TOPICS = [
    { id: "fund", name: "Fundamentals", color: "#3b9eff", icon: "pulse",
      desc: "ABG, CPR & chest tube - Infection control - Diabetes, wounds, fluids & electrolytes - Emergency & critical care - Health assessment - Patient safety & quality improvement" },
    { id: "medsurg", name: "Medical-Surgical Nursing", color: "#ff9a3c", icon: "steth",
      desc: "Cardiology - Respiratory - Neurology - Renal - Appendicitis, tonsillectomy & tracheostomy - Pyloric stenosis & vaccinations" },
    { id: "maternity", name: "Maternity & Child Nursing", color: "#7fc241", icon: "baby",
      desc: "Growth & development - Neonatal nursing" },
    { id: "peds", name: "Pediatrics", color: "#e5a50a", icon: "bear",
      desc: "Neonatal & pediatrics" },
    { id: "community", name: "Community Health Nursing", color: "#14a39a", icon: "house",
      desc: "Community and public health nursing" },
    { id: "pharm", name: "Pharmacology", color: "#8b5cf6", icon: "pill",
      desc: "Drug classes, actions and side effects" },
    { id: "research", name: "Research", color: "#5b6cf0", icon: "research",
      desc: "Delegation & supervision - Documentation & medical records - Ethics & legal aspects - Leadership & management - Research & evidence-based practice" },
    { id: "meds", name: "Medications", color: "#f0568a", icon: "syringe",
      desc: "Medication calculation & administration" },
    { id: "mental", name: "Mental Health & Psychiatric Nursing", color: "#f26a5b", icon: "brain",
      desc: "Psychiatric conditions & therapeutic communication" },
    { id: "random", name: "Random", color: "#334155", icon: "shuffle", random: true,
      desc: "A mixed test with questions from all 9 topics" },
  ];

  const settings = { count: 10, topic: null, mode: "exam" };
  let state = null;
  let screen = "home";
  let timerId = null;
  let ui = {};

  /* ---------- Helpers ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  let bank = null;
  async function loadAll() {
    if (!bank) {
      const res = await fetch("questions.json");
      bank = await res.json();
    }
    return bank;
  }
  function poolFor(all, topic) {
    return topic.random ? all : all.filter((q) => q.category === topic.name);
  }
  function clear(plain) {
    app.replaceChildren();
    app.classList.toggle("plain", !!plain);
    app.classList.remove("swap");
    void app.offsetWidth;
    app.classList.add("swap");
    window.scrollTo(0, 0);
  }
  // Uniform random integer in [0, n) - uses the device's secure RNG when available.
  function rand(n) {
    try {
      if (window.crypto && crypto.getRandomValues) {
        const buf = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n;
        let x;
        do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
        return x % n;
      }
    } catch (e) {}
    return Math.floor(Math.random() * n);
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function logo(cls) {
    const img = el("img", cls || "logo");
    img.src = "logo.svg"; img.alt = T("logoAlt");
    return img;
  }
  function countUp(node, to, ms, suffix) {
    suffix = suffix || "";
    if (reduceMotion) { node.textContent = to + suffix; return; }
    const t0 = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - t0) / ms);
      node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function fmtTime(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
  }

  /* ---------- Sound + haptics (generated live, works offline) ---------- */
  const sfx = (function () {
    let ctx = null;
    let muted = false;
    try { muted = localStorage.getItem("dha-muted") === "1"; } catch (e) {}
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(freq, at, dur, type, vol, slideTo) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const t = c.currentTime + at;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    }
    return {
      isMuted: () => muted,
      setMuted(v) { muted = v; try { localStorage.setItem("dha-muted", v ? "1" : "0"); } catch (e) {} },
      unlock: ensure,
      click()   { tone(900, 0, 0.05, "sine", 0.05, 640); },
      start()   { tone(523, 0, 0.16, "sine", 0.08); tone(784, 0.08, 0.22, "sine", 0.08); },
      correct() { tone(659, 0, 0.16, "sine", 0.10); tone(988, 0.09, 0.28, "sine", 0.10); },
      wrong()   { tone(220, 0, 0.26, "triangle", 0.10, 150); },
      finish()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.34, "sine", 0.09)); },
    };
  })();
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.classList.contains("ripple-host")) {
      const r = b.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 1.6;
      const s = el("span", "ripple");
      s.style.width = s.style.height = d + "px";
      s.style.left = (e.clientX - r.left - d / 2) + "px";
      s.style.top = (e.clientY - r.top - d / 2) + "px";
      b.append(s);
      setTimeout(() => s.remove(), 650);
    }
    if (b.hasAttribute("data-silent")) return;
    sfx.click(); buzz(8);
  }, true);

  const ICON_ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>';
  function soundButton(cls) {
    const b = el("button", "sound-btn " + (cls || ""));
    b.type = "button";
    b.setAttribute("data-silent", "");
    b.setAttribute("aria-label", T("sound"));
    const paint = () => { b.innerHTML = sfx.isMuted() ? ICON_OFF : ICON_ON; b.classList.toggle("off", sfx.isMuted()); };
    b.onclick = () => { sfx.setMuted(!sfx.isMuted()); paint(); sfx.click(); };
    paint();
    return b;
  }

  /* ---------- Confirm dialog ---------- */
  function confirmDialog(title, msg, okLabel, onOk) {
    if (document.querySelector(".modal")) return;
    const o = el("div", "modal");
    const box = el("div", "modal-box");
    box.setAttribute("role", "dialog");
    const cancel = el("button", "btn secondary", T("cancel"));
    const ok = el("button", "btn", okLabel);
    cancel.type = ok.type = "button";
    const close = () => { o.classList.add("out"); setTimeout(() => o.remove(), 180); };
    cancel.onclick = close;
    ok.onclick = () => { close(); onOk(); };
    const row = el("div", "modal-row");
    row.append(cancel, ok);
    box.append(el("h3", null, title), el("p", null, msg), row);
    o.append(box);
    o.addEventListener("pointerdown", (e) => { if (e.target === o) close(); });
    document.body.append(o);
  }

  /* ---------- Language picker + header buttons ---------- */
  const ICON_GLOBE = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>';
  const ICON_BULB = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>';
  const ICON_RESTART = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="rgba(13,148,136,.12)"/><path d="m8 12.3 2.8 2.8L16 9.5"/></svg>';
  const ICON_ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
  const ICON_QUOTE = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M7.2 6C4.9 7.2 3.5 9.4 3.5 12.3V18h6v-6H6.3c0-1.7.9-3 2.4-3.8L7.2 6zm9.5 0c-2.3 1.2-3.7 3.4-3.7 6.3V18h6v-6h-3.2c0-1.7.9-3 2.4-3.8L16.7 6z"/></svg>';

  function langButton(extra) {
    const b = el("button", "hbtn lang-btn ripple-host " + (extra || ""));
    b.type = "button";
    b.setAttribute("aria-label", T("langBtn"));
    const L = LANGS.find((l) => l.id === lang) || LANGS[0];
    b.innerHTML = ICON_GLOBE + "<span>" + L.short + "</span>";
    b.onclick = langDialog;
    return b;
  }
  function langDialog() {
    if (document.querySelector(".modal")) return;
    const o = el("div", "modal");
    const box = el("div", "modal-box");
    box.setAttribute("role", "dialog");
    const close = () => { o.classList.add("out"); setTimeout(() => o.remove(), 180); };
    box.append(el("h3", null, T("langTitle")));
    const list = el("div", "lang-list");
    LANGS.forEach((l) => {
      const b = el("button", "lang-opt ripple-host" + (l.id === lang ? " active" : ""));
      b.type = "button";
      b.setAttribute("lang", l.id);
      b.append(el("span", null, l.label), el("small", null, l.id === lang ? "✓" : l.short));
      b.onclick = () => { close(); setTimeout(() => setLang(l.id), 60); };
      list.append(b);
    });
    box.append(list);
    o.append(box);
    o.addEventListener("pointerdown", (e) => { if (e.target === o) close(); });
    document.body.append(o);
  }
  function setLang(id) {
    if (id === lang) return;
    lang = id;
    try { localStorage.setItem("gn-lang", id); } catch (e) {}
    applyLang();
    const w = document.querySelector(".welcome");
    if (w) { w.remove(); showWelcome(); }       // rebuilds home + welcome in the new language
    else if (screen === "tips") showTips();
    else showHome();
  }

  /* ---------- Confetti ---------- */
  function confetti(n) {
    if (reduceMotion) return;
    const cv = el("canvas", "confetti");
    document.body.append(cv);
    const c2 = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = (cv.width = innerWidth * dpr), H = (cv.height = innerHeight * dpr);
    const colors = ["#0ea5e9", "#0d9488", "#f59e0b", "#22c55e", "#a78bfa", "#f43f5e"];
    const ps = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: -Math.random() * H * 0.35,
      w: (6 + Math.random() * 6) * dpr, h: (9 + Math.random() * 8) * dpr,
      vx: (Math.random() - 0.5) * 3 * dpr, vy: (2 + Math.random() * 4) * dpr,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    function frame(t) {
      const age = t - t0;
      c2.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04 * dpr; p.rot += p.vr;
        c2.save(); c2.translate(p.x, p.y); c2.rotate(p.rot);
        c2.fillStyle = p.c;
        c2.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2200) / 800);
        c2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c2.restore();
      });
      if (age < 3000) requestAnimationFrame(frame); else cv.remove();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Navigation (Android back button support) ---------- */
  let hasSentinel = false, suppressPop = false;
  function enterSub() {
    screen = screen === "home" ? "length" : screen;
    if (!hasSentinel) { history.pushState({ dha: 1 }, ""); hasSentinel = true; }
  }
  function leaveToHome() {
    stopTimer();
    showHome();
    if (hasSentinel) { suppressPop = true; hasSentinel = false; history.back(); }
  }
  function askExit() {
    confirmDialog(T("exitTitle"), T("exitMsg"), T("exit"), leaveToHome);
  }
  function askRestart() {
    confirmDialog(T("restartTitle"), T("restartMsg"), T("restart"), restartQuiz);
  }
  // Restart: same set of questions, back to question 1, in a brand-new random order.
  function restartQuiz() {
    if (!state) return;
    stopTimer();
    const raw = shuffle(state.raw.slice());
    state = { idx: 0, raw, items: raw.map(prepare), t0: Date.now(), elapsed: undefined };
    sfx.start(); buzz(15);
    showQuiz();
  }
  window.addEventListener("popstate", () => {
    if (suppressPop) { suppressPop = false; return; }
    if (!hasSentinel) return;
    hasSentinel = false; // the system consumed it
    if (screen === "quiz") { enterSub(); askExit(); }
    else { stopTimer(); showHome(); }
  });

  /* ---------- Timer ---------- */
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (state && state.t0 && state.elapsed === undefined) state.elapsed = Math.floor((Date.now() - state.t0) / 1000);
  }

  /* ---------- Welcome ---------- */
  function showWelcome() {
    showHome();
    const w = el("div", "welcome");
    w.append(el("div", "blob b1"), el("div", "blob b2"), el("div", "blob b3"));
    w.append(soundButton("on-welcome"));
    w.append(langButton("on-welcome"));

    const inner = el("div", "w-inner");
    const mark = el("div", "w-mark");
    mark.append(el("div", "ring r1"), el("div", "ring r2"), logo("w-logo"));

    const title = el("h1", "w-title");
    T("brand").split("").forEach((ch, i) => {
      const s = el("span", null, ch === " " ? "\u00A0" : ch);
      s.style.animationDelay = 0.45 + i * 0.1 + "s";
      title.append(s);
    });
    title.setAttribute("aria-label", T("brand"));

    const sub = el("p", "w-sub", T("wSub"));
    const tag = el("p", "w-tag", T("wTag"));

    const chips = el("div", "w-chips");
    const c1 = el("div", "chip"); const num = el("b", null, "0"); c1.append(num, document.createTextNode(T("wQuestions")));
    chips.append(c1, el("div", "chip", T("w9")), el("div", "chip", T("wOffline")));

    const go = el("button", "w-btn ripple-host", T("wGo"));
    go.type = "button";
    go.setAttribute("data-silent", "");
    go.onclick = () => {
      sfx.unlock(); sfx.start(); buzz(15);
      w.classList.add("leaving");
      setTimeout(() => w.remove(), 600);
    };

    inner.append(mark, title, sub, tag, chips, go);
    w.append(inner);
    document.body.append(w);
    loadAll().then((all) => countUp(num, all.length, 1400)).catch(() => { num.textContent = "1,500+"; });
  }

  /* ---------- Home: topic cards ---------- */
  async function showHome(msg) {
    screen = "home";
    clear(true);

    const head = el("div", "home-head");
    const brand = el("div", "brand");
    brand.append(logo("brand-logo"), el("span", null, T("brand")));
    const actions = el("div", "head-actions");
    const tips = el("button", "hbtn tips-btn ripple-host");
    tips.type = "button";
    tips.setAttribute("aria-label", T("tipsTitle"));
    tips.innerHTML = ICON_BULB + "<span>" + T("tipsBtn") + "</span>";
    tips.onclick = showTips;
    actions.append(tips, langButton(), soundButton());
    head.append(brand, actions);
    app.append(head);
    app.append(el("h1", "h-title", T("homeTitle")), el("p", "h-sub", T("homeSub")));
    if (msg) app.append(el("p", "error", msg));

    const counts = {};
    TOPICS.forEach((t, i) => {
      const card = el("button", "topic ripple-host");
      card.type = "button";
      card.setAttribute("data-silent", "");
      card.style.setProperty("--tc", t.color);
      card.style.setProperty("--i", i);

      const text = el("div", "t-text");
      const cnt = el("span", "t-count", "…");
      counts[t.id] = cnt;
      text.append(el("h3", null, topicName(t)), el("p", null, topicDesc(t)), cnt);
      const icon = el("div", "t-icon");
      icon.innerHTML = iconSvg(t.icon);
      card.append(text, icon);
      card.onclick = () => { sfx.start(); buzz(12); showLength(t); };
      app.append(card);
    });

    try {
      const all = await loadAll();
      TOPICS.forEach((t) => { counts[t.id].textContent = T("nQuestions", { n: poolFor(all, t).length }); });
    } catch (e) {
      TOPICS.forEach((t) => { counts[t.id].textContent = ""; });
      const err = el("p", "error", T("loadErr"));
      app.prepend(err);
    }
  }

  /* ---------- Length + mode screen (topic already chosen) ---------- */
  async function showLength(topic) {
    settings.topic = topic;
    enterSub();
    screen = "length";
    clear(false);

    const back = el("button", "back-btn ripple-host");
    back.type = "button";
    back.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg><span>' + T("topics") + '</span>';
    back.onclick = leaveToHome;
    app.append(back);

    const hero = el("div", "len-hero");
    hero.style.setProperty("--tc", topic.color);
    const ht = el("div", "t-text");
    ht.append(el("h3", null, topicName(topic)), el("p", null, topicDesc(topic)));
    const hi = el("div", "t-icon");
    hi.innerHTML = iconSvg(topic.icon);
    hero.append(ht, hi);
    app.append(hero);

    app.append(el("label", "field", T("numQ")));
    const grid = el("div", "sizes");
    app.append(grid);

    app.append(el("label", "field", T("testMode")));
    const seg = el("div", "seg");
    const help = el("p", "mode-help");
    const MODES = [
      ["exam", T("exam"), T("examHelp")],
      ["practice", T("practice"), T("practiceHelp")],
    ];
    function paintMode() {
      seg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.m === settings.mode));
      help.textContent = MODES.find((m) => m[0] === settings.mode)[2];
    }
    MODES.forEach(([id, label]) => {
      const b = el("button", "seg-btn ripple-host", label);
      b.type = "button"; b.dataset.m = id;
      b.onclick = () => { settings.mode = id; paintMode(); };
      seg.append(b);
    });
    app.append(seg, help);
    paintMode();

    const start = el("button", "btn shine ripple-host", T("start"));
    start.type = "button";
    start.setAttribute("data-silent", "");
    start.disabled = true;
    start.onclick = () => { sfx.start(); buzz(15); startQuiz(start); };
    app.append(start);
    const err = el("p", "error", "");
    app.append(err);

    try {
      const all = await loadAll();
      const pool = poolFor(all, topic).length;
      const sizes = SIZES.filter((n) => n <= pool);
      if (pool > 0 && !sizes.includes(pool) && pool < SIZES[SIZES.length - 1]) sizes.push(pool);
      if (!sizes.includes(settings.count)) settings.count = sizes.includes(10) ? 10 : sizes[sizes.length - 1];
      sizes.forEach((n) => {
        const b = el("button", "size ripple-host" + (n === settings.count ? " active" : ""), String(n));
        b.type = "button";
        b.append(el("small", null, SIZES.includes(n) ? T("questionsLbl") : T("allQ")));
        b.onclick = () => {
          settings.count = n;
          grid.querySelectorAll(".size").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
        };
        grid.append(b);
      });
      start.disabled = !sizes.length;
    } catch (e) { err.textContent = T("loadErr"); }
  }

  async function startQuiz(btn) {
    btn.disabled = true; btn.textContent = T("loading");
    try {
      const all = await loadAll();
      const pool = poolFor(all, settings.topic);
      // fresh random draw + order every single time a test starts (including "Try another test")
      const questions = shuffle(pool.slice()).slice(0, settings.count);
      if (!questions.length) throw new Error("No questions found");
      stopTimer();
      state = { idx: 0, raw: questions, items: questions.map(prepare), t0: Date.now(), elapsed: undefined };
      showQuiz();
    } catch (e) {
      showHome(T("startErr") + e.message);
    }
  }

  function prepare(q) {
    let choices = q.options.map((text, i) => ({ text, correct: i === q.answer }));
    if (!q.fixedOrder) shuffle(choices);
    return { question: q.question, category: q.category, sub: q.subcategory, explanation: q.explanation, choices, picked: null };
  }

  /* ---------- Quiz ---------- */
  const CLOCK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>';
  const EXIT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function showQuiz() {
    enterSub();
    screen = "quiz";
    clear(false);

    const bar = el("div", "qbar");
    const exit = el("button", "exit-btn ripple-host");
    exit.type = "button";
    exit.innerHTML = EXIT + "<span>" + T("exit") + "</span>";
    exit.onclick = askExit;
    const restart = el("button", "restart-btn ripple-host");
    restart.type = "button";
    restart.setAttribute("aria-label", T("restart"));
    restart.innerHTML = ICON_RESTART + '<span class="lbl">' + T("restart") + "</span>";
    restart.onclick = askRestart;
    const left = el("div", "qbar-l");
    left.append(restart, exit);
    const right = el("div", "qbar-r");
    const timer = el("div", "timer");
    timer.innerHTML = CLOCK;
    const tText = el("span", null, "0:00");
    timer.append(tText);
    timer.setAttribute("aria-label", "Elapsed time");
    right.append(soundButton("sm"), timer);
    bar.append(left, right);

    const meta = el("div", "qmeta");
    const qnum = el("span", null, "");
    const chip = el("span", "score-chip", "");
    meta.append(qnum, chip);
    const pbar = el("div", "bar");
    const fill = el("div");
    fill.style.width = "0%";
    pbar.append(fill);
    const body = el("div", "qbody");
    app.append(bar, meta, pbar, body);
    ui = { qnum, chip, fill, body };

    const tick = () => { tText.textContent = fmtTime(Math.floor((Date.now() - state.t0) / 1000)); };
    tick();
    timerId = setInterval(tick, 1000);
    renderQuestion(1);
  }

  function updateMeta(bump) {
    const total = state.items.length;
    if (settings.mode === "exam") {
      const done = state.items.filter((i) => i.picked !== null).length;
      ui.chip.textContent = T("answered", { d: done, n: total });
    } else {
      const ok = state.items.filter((i) => i.picked !== null && i.choices[i.picked].correct).length;
      ui.chip.textContent = T("score", { n: ok });
    }
    if (bump) { ui.chip.classList.remove("bump"); void ui.chip.offsetWidth; ui.chip.classList.add("bump"); }
  }

  function renderQuestion(dir) {
    const total = state.items.length;
    const item = state.items[state.idx];
    const body = ui.body;

    ui.qnum.textContent = T("qOf", { i: state.idx + 1, n: total });
    ui.fill.style.width = ((state.idx + 1) / total) * 100 + "%";
    updateMeta();

    body.replaceChildren();
    body.className = "qbody";
    void body.offsetWidth;
    body.classList.add(dir < 0 ? "from-left" : "from-right");
    window.scrollTo(0, 0);

    if (item.sub) body.append(el("span", "tag", item.sub));
    body.append(el("p", "q", item.question));

    const practice = settings.mode === "practice";
    const buttons = [];
    const expl = el("div");
    const nav = el("div", "navrow");
    const prev = el("button", "btn secondary ripple-host", T("prev"));
    prev.type = "button";
    prev.disabled = state.idx === 0;
    const last = state.idx === total - 1;
    const next = el("button", "btn ripple-host", last ? T("finish") : T("next"));
    next.type = "button";

    function reveal(animate) {
      buttons.forEach((b, k) => {
        b.disabled = true;
        b.removeAttribute("data-silent");
        const letter = b.querySelector(".l");
        if (item.choices[k].correct) { b.classList.add("correct"); letter.textContent = "✓"; }
        else if (k === item.picked) { b.classList.add("wrong"); letter.textContent = "✕"; }
      });
      if (animate && item.choices[item.picked].correct) buttons[item.picked].classList.add("hit");
      if (item.explanation) { expl.className = "explain"; expl.textContent = item.explanation; }
      next.disabled = false;
    }

    function pick(i) {
      if (practice) {
        if (item.picked !== null) return;
        item.picked = i;
        const ok = item.choices[i].correct;
        reveal(true);
        updateMeta(ok);
        if (ok) { sfx.correct(); buzz(18); } else { sfx.wrong(); buzz([30, 40, 30]); }
        next.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        if (item.picked === i) return;
        item.picked = i;
        buttons.forEach((b, k) => {
          b.classList.toggle("selected", k === i);
          if (k === i) { b.classList.remove("chosen"); void b.offsetWidth; b.classList.add("chosen"); }
        });
        updateMeta(true);
      }
    }

    item.choices.forEach((c, i) => {
      const b = el("button", "choice ripple-host");
      b.type = "button";
      b.append(el("span", "l", LETTERS[i]), el("span", null, c.text));
      if (practice && item.picked === null) b.setAttribute("data-silent", "");
      b.onclick = () => pick(i);
      if (!practice && item.picked === i) b.classList.add("selected");
      buttons.push(b); body.append(b);
    });
    body.append(expl);

    if (practice && item.picked !== null) reveal(false);
    else if (practice) next.disabled = true;

    prev.onclick = () => { state.idx--; renderQuestion(-1); };
    next.onclick = () => {
      if (!last) { state.idx++; renderQuestion(1); return; }
      const skipped = state.items.filter((x) => x.picked === null).length;
      if (skipped) {
        confirmDialog(T("finishTitle"), T(skipped > 1 ? "finishMany" : "finishOne", { n: skipped }), T("finishOk"), showResult);
      } else showResult();
    };
    nav.append(prev, next);
    body.append(nav);
  }

  /* ---------- Exam Preparation Tips ---------- */
  function tipHead(icon, color, title) {
    const h = el("div", "tip-head");
    h.style.setProperty("--tc", color);
    const ic = el("div", "tip-ic");
    ic.innerHTML = iconSvg(icon);
    h.append(ic, el("h2", null, title));
    return h;
  }
  function showTips() {
    enterSub();
    screen = "tips";
    clear(true);
    const tp = TIPS[lang] || TIPS.en;

    const top = el("div", "tips-top");
    const back = el("button", "back-btn ripple-host");
    back.type = "button";
    back.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg><span>' + T("topics") + "</span>";
    back.onclick = leaveToHome;
    top.append(back, langButton());
    app.append(top);

    const hero = el("div", "tips-hero");
    const hi = el("div", "tips-hero-ic");
    hi.innerHTML = iconSvg("target");
    const ht = el("div", "t-text");
    ht.append(el("h1", null, T("tipsTitle")), el("p", null, T("tipsSub")));
    hero.append(hi, ht);
    app.append(hero);

    // 1. Numbered preparation tips
    const s1 = el("section", "tip-sec");
    s1.append(tipHead("target", "#0ea5e9", tp.s1));
    const ol = el("ol", "tip-list");
    tp.items.forEach((it, n) => {
      const li = el("li", "tip-item");
      li.style.animationDelay = Math.min(n, 10) * 40 + "ms";
      const num = el("span", "tip-num", String(n + 1));
      const tx = el("div", "tip-tx");
      tx.append(el("b", null, it[0]), el("span", null, it[1]));
      li.append(num, tx);
      ol.append(li);
    });
    s1.append(ol);
    app.append(s1);

    // 2. While answering questions
    const s2 = el("section", "tip-sec");
    s2.append(tipHead("brain", "#8b5cf6", tp.s2));
    s2.append(el("p", "tip-lead", tp.ask));
    const ul = el("ul", "tip-bul");
    tp.asks.forEach((a) => {
      const li = el("li");
      const ic = el("span", "tip-chk"); ic.innerHTML = ICON_CHECK;
      li.append(ic, el("span", null, a));
      ul.append(li);
    });
    s2.append(ul);
    s2.append(el("p", "tip-lead", tp.prio));
    const chain = el("div", "tip-chain");
    tp.chain.forEach((c, n) => {
      if (n) { const ar = el("span", "tip-arrow"); ar.innerHTML = ICON_ARROW; chain.append(ar); }
      const chip = el("div", "tip-step");
      chip.append(el("em", null, String(n + 1)), el("span", null, c));
      chain.append(chip);
    });
    s2.append(chain);
    s2.append(el("p", "tip-note", tp.caution));
    app.append(s2);

    // 3. Exam day
    const s3 = el("section", "tip-sec");
    s3.append(tipHead("clock", "#f59e0b", tp.s3));
    const ul3 = el("ul", "tip-bul");
    tp.day.forEach((a) => {
      const li = el("li");
      const ic = el("span", "tip-chk"); ic.innerHTML = ICON_CHECK;
      li.append(ic, el("span", null, a));
      ul3.append(li);
    });
    s3.append(ul3);
    app.append(s3);

    // Quotes
    [tp.q1, tp.q2].forEach((q) => {
      const bq = el("blockquote", "tip-quote");
      const ic = el("span", "tip-q-ic"); ic.innerHTML = ICON_QUOTE;
      bq.append(ic, el("p", null, q));
      app.append(bq);
    });

    const done = el("button", "btn ripple-host", T("home"));
    done.type = "button";
    done.onclick = leaveToHome;
    app.append(done);
  }

  /* ---------- Result ---------- */
  function showResult() {
    stopTimer();
    screen = "result";
    clear(false);
    const items = state.items;
    const total = items.length;
    const correct = items.filter((i) => i.picked !== null && i.choices[i.picked].correct).length;
    const skipped = items.filter((i) => i.picked === null).length;
    const wrongCount = total - correct - skipped;
    const pct = Math.round((correct / total) * 100);
    const secs = Math.max(1, state.elapsed || 1);

    const grade =
      pct >= 80 ? { cls: "great", title: T("congrats"), note: T("noteGreat"), c1: "#22c55e", c2: "#0d9488" } :
      pct >= 60 ? { cls: "good",  title: T("congrats"), note: T("noteGood"), c1: "#0ea5e9", c2: "#0d9488" } :
                  { cls: "keep",  title: T("complete"), note: T("noteKeep"), c1: "#f59e0b", c2: "#f97316" };

    const box = el("div", "result " + grade.cls);
    const hero = el("div", "r-hero");
    hero.append(el("h2", "r-title", grade.title), el("p", "r-note", grade.note));
    hero.append(el("p", "r-topic", topicName(settings.topic) + " - " + (settings.mode === "exam" ? T("exam") : T("practice"))));

    const R = 54, C = 2 * Math.PI * R;
    const wrap = el("div", "ring-wrap");
    wrap.innerHTML =
      '<svg class="score-ring" viewBox="0 0 140 140" aria-hidden="true">' +
      '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + grade.c1 + '"/><stop offset="1" stop-color="' + grade.c2 + '"/></linearGradient></defs>' +
      '<circle class="ring-bg" cx="70" cy="70" r="' + R + '"/>' +
      '<circle class="ring-fg" cx="70" cy="70" r="' + R + '" stroke="url(#rg)" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/>' +
      "</svg>";
    const center = el("div", "ring-center");
    const big = el("div", "ring-pct", "0%");
    center.append(big, el("div", "ring-label", T("correctOf", { c: correct, t: total })));
    wrap.append(center);
    hero.append(wrap);
    box.append(hero);

    const stats = el("div", "stats");
    const tiles = [[T("sCorrect"), correct, "good"], [T("sIncorrect"), wrongCount, "bad"]];
    if (skipped) tiles.push([T("sSkipped"), skipped, "skip"]);
    tiles.push([T("sTime"), fmtTime(secs), "time"]);
    stats.style.setProperty("--n", tiles.length);
    tiles.forEach(([label, val, kind], n) => {
      const s = el("div", "stat " + kind);
      s.style.animationDelay = 0.9 + n * 0.1 + "s";
      s.append(el("div", "stat-val", String(val)), el("div", "stat-label", label));
      stats.append(s);
    });
    box.append(stats);

    const again = el("button", "btn ripple-host", T("again"));
    again.type = "button"; again.setAttribute("data-silent", "");
    again.onclick = () => { sfx.start(); buzz(15); startQuiz(again); };
    const home = el("button", "btn secondary ripple-host", T("home"));
    home.type = "button"; home.onclick = leaveToHome;
    box.append(again, home);
    app.append(box);

    const rev = el("div", "review");
    const bad = items.filter((i) => i.picked === null || !i.choices[i.picked].correct);
    if (bad.length) {
      rev.append(el("h3", null, T("review", { n: bad.length })));
      bad.forEach((m, n) => {
        const d = el("div", "rev-item");
        d.style.animationDelay = Math.min(n, 8) * 0.06 + 0.9 + "s";
        if (m.sub) d.append(el("span", "tag", m.sub));
        d.append(el("div", "rev-q", m.question));
        d.append(el("div", m.picked === null ? "skipd" : "you", m.picked === null ? T("notAnswered") : T("yourAns") + m.choices[m.picked].text));
        d.append(el("div", "right", T("correctAns") + m.choices.find((c) => c.correct).text));
        if (m.explanation) d.append(el("div", "rev-exp", m.explanation));
        rev.append(d);
      });
    } else {
      rev.append(el("div", "perfect", T("perfect")));
    }
    app.append(rev);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      wrap.querySelector(".ring-fg").style.strokeDashoffset = C * (1 - pct / 100);
    }));
    countUp(big, pct, 1500, "%");
    if (pct >= 60) { sfx.finish(); buzz([40, 60, 40]); confetti(pct >= 80 ? 140 : 80); }
    else { sfx.start(); }
  }

  showWelcome();
})();
