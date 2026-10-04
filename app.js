(function () {
  const app = document.getElementById("app");
  const SIZES = [5, 10, 20, 30, 40, 50];
  const LETTERS = ["A", "B", "C", "D", "E"];
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function logo(cls) {
    const img = el("img", cls || "logo");
    img.src = "logo.svg"; img.alt = "DHA logo";
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
    b.setAttribute("aria-label", "Toggle sound");
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
    const cancel = el("button", "btn secondary", "Cancel");
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
    confirmDialog("Exit this test?", "Your answers and progress in this test will be lost.", "Exit", leaveToHome);
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

    const inner = el("div", "w-inner");
    const mark = el("div", "w-mark");
    mark.append(el("div", "ring r1"), el("div", "ring r2"), logo("w-logo"));

    const title = el("h1", "w-title");
    "DHA".split("").forEach((ch, i) => {
      const s = el("span", null, ch);
      s.style.animationDelay = 0.45 + i * 0.1 + "s";
      title.append(s);
    });
    title.setAttribute("aria-label", "DHA");

    const sub = el("p", "w-sub", "Nursing exam practice");
    const tag = el("p", "w-tag", "Practise smarter. Walk into the exam ready.");

    const chips = el("div", "w-chips");
    const c1 = el("div", "chip"); const num = el("b", null, "0"); c1.append(num, document.createTextNode(" questions"));
    chips.append(c1, el("div", "chip", "9 topics"), el("div", "chip", "Works offline"));

    const go = el("button", "w-btn ripple-host", "Get started");
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
    brand.append(logo("brand-logo"), el("span", null, "DHA"));
    head.append(brand, soundButton());
    app.append(head);
    app.append(el("h1", "h-title", "Nursing exams"), el("p", "h-sub", "Choose a topic to start practising"));
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
      text.append(el("h3", null, t.name), el("p", null, t.desc), cnt);
      const icon = el("div", "t-icon");
      icon.innerHTML = iconSvg(t.icon);
      card.append(text, icon);
      card.onclick = () => { sfx.start(); buzz(12); showLength(t); };
      app.append(card);
    });

    try {
      const all = await loadAll();
      TOPICS.forEach((t) => { counts[t.id].textContent = poolFor(all, t).length + " questions"; });
    } catch (e) {
      TOPICS.forEach((t) => { counts[t.id].textContent = ""; });
      const err = el("p", "error", "Could not load questions.");
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
    back.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg><span>Topics</span>';
    back.onclick = leaveToHome;
    app.append(back);

    const hero = el("div", "len-hero");
    hero.style.setProperty("--tc", topic.color);
    const ht = el("div", "t-text");
    ht.append(el("h3", null, topic.name), el("p", null, topic.desc));
    const hi = el("div", "t-icon");
    hi.innerHTML = iconSvg(topic.icon);
    hero.append(ht, hi);
    app.append(hero);

    app.append(el("label", "field", "Number of questions"));
    const grid = el("div", "sizes");
    app.append(grid);

    app.append(el("label", "field", "Test mode"));
    const seg = el("div", "seg");
    const help = el("p", "mode-help");
    const MODES = [
      ["exam", "Exam", "Change your answers any time. Results and explanations come at the end."],
      ["practice", "Practice", "See the right answer and explanation straight after each question."],
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

    const start = el("button", "btn shine ripple-host", "Start test");
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
        b.append(el("small", null, SIZES.includes(n) ? "questions" : "all questions"));
        b.onclick = () => {
          settings.count = n;
          grid.querySelectorAll(".size").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
        };
        grid.append(b);
      });
      start.disabled = !sizes.length;
    } catch (e) { err.textContent = "Could not load questions."; }
  }

  async function startQuiz(btn) {
    btn.disabled = true; btn.textContent = "Loading…";
    try {
      const all = await loadAll();
      const pool = poolFor(all, settings.topic);
      const questions = shuffle(pool.slice()).slice(0, settings.count);
      if (!questions.length) throw new Error("No questions found");
      stopTimer();
      state = { idx: 0, items: questions.map(prepare), t0: Date.now(), elapsed: undefined };
      showQuiz();
    } catch (e) {
      showHome("Could not start the test: " + e.message);
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
    exit.innerHTML = EXIT + "<span>Exit</span>";
    exit.onclick = askExit;
    const right = el("div", "qbar-r");
    const timer = el("div", "timer");
    timer.innerHTML = CLOCK;
    const tText = el("span", null, "0:00");
    timer.append(tText);
    timer.setAttribute("aria-label", "Elapsed time");
    right.append(soundButton("sm"), timer);
    bar.append(exit, right);

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
      ui.chip.textContent = `Answered: ${done}/${total}`;
    } else {
      const ok = state.items.filter((i) => i.picked !== null && i.choices[i.picked].correct).length;
      ui.chip.textContent = `Score: ${ok}`;
    }
    if (bump) { ui.chip.classList.remove("bump"); void ui.chip.offsetWidth; ui.chip.classList.add("bump"); }
  }

  function renderQuestion(dir) {
    const total = state.items.length;
    const item = state.items[state.idx];
    const body = ui.body;

    ui.qnum.textContent = `Question ${state.idx + 1} of ${total}`;
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
    const prev = el("button", "btn secondary ripple-host", "Previous");
    prev.type = "button";
    prev.disabled = state.idx === 0;
    const last = state.idx === total - 1;
    const next = el("button", "btn ripple-host", last ? "Finish test" : "Next question");
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
        confirmDialog("Finish the test?", `You have ${skipped} unanswered question${skipped > 1 ? "s" : ""}. They will be counted as skipped.`, "Finish", showResult);
      } else showResult();
    };
    nav.append(prev, next);
    body.append(nav);
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
      pct >= 80 ? { cls: "great", title: "Congratulations!", note: "Excellent work — you're exam ready!", c1: "#22c55e", c2: "#0d9488" } :
      pct >= 60 ? { cls: "good",  title: "Congratulations!", note: "Good job! A little more practice will get you there.", c1: "#0ea5e9", c2: "#0d9488" } :
                  { cls: "keep",  title: "Test complete",    note: "Keep practicing — every test makes you stronger.", c1: "#f59e0b", c2: "#f97316" };

    const box = el("div", "result " + grade.cls);
    const hero = el("div", "r-hero");
    hero.append(el("h2", "r-title", grade.title), el("p", "r-note", grade.note));
    hero.append(el("p", "r-topic", settings.topic.name + (settings.mode === "exam" ? " - Exam" : " - Practice")));

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
    center.append(big, el("div", "ring-label", `${correct} of ${total} correct`));
    wrap.append(center);
    hero.append(wrap);
    box.append(hero);

    const stats = el("div", "stats");
    const tiles = [["Correct", correct, "good"], ["Incorrect", wrongCount, "bad"]];
    if (skipped) tiles.push(["Skipped", skipped, "skip"]);
    tiles.push(["Time", fmtTime(secs), "time"]);
    stats.style.setProperty("--n", tiles.length);
    tiles.forEach(([label, val, kind], n) => {
      const s = el("div", "stat " + kind);
      s.style.animationDelay = 0.9 + n * 0.1 + "s";
      s.append(el("div", "stat-val", String(val)), el("div", "stat-label", label));
      stats.append(s);
    });
    box.append(stats);

    const again = el("button", "btn ripple-host", "Try another test");
    again.type = "button"; again.setAttribute("data-silent", "");
    again.onclick = () => { sfx.start(); buzz(15); startQuiz(again); };
    const home = el("button", "btn secondary ripple-host", "Back to home");
    home.type = "button"; home.onclick = leaveToHome;
    box.append(again, home);
    app.append(box);

    const rev = el("div", "review");
    const bad = items.filter((i) => i.picked === null || !i.choices[i.picked].correct);
    if (bad.length) {
      rev.append(el("h3", null, `Review your mistakes (${bad.length})`));
      bad.forEach((m, n) => {
        const d = el("div", "rev-item");
        d.style.animationDelay = Math.min(n, 8) * 0.06 + 0.9 + "s";
        if (m.sub) d.append(el("span", "tag", m.sub));
        d.append(el("div", "rev-q", m.question));
        d.append(el("div", m.picked === null ? "skipd" : "you", m.picked === null ? "Not answered" : "Your answer: " + m.choices[m.picked].text));
        d.append(el("div", "right", "Correct answer: " + m.choices.find((c) => c.correct).text));
        if (m.explanation) d.append(el("div", "rev-exp", m.explanation));
        rev.append(d);
      });
    } else {
      rev.append(el("div", "perfect", "Perfect score — no mistakes to review."));
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
