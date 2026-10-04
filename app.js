(function () {
  const app = document.getElementById("app");
  const SIZES = [5, 10, 20, 30, 40, 50];
  const LETTERS = ["A", "B", "C", "D", "E"];
  const settings = { count: 10, category: "all" };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let state = null;
  let ui = {}; // live references to the question screen (progress bar, score)

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
  function clear() {
    app.replaceChildren();
    app.classList.remove("swap");
    void app.offsetWidth; // restart the screen transition
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
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(to * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  /* ---------- Sound + haptics (no audio files: generated live, works offline) ---------- */
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
    // One soft note with a quick attack and smooth fade
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
      setMuted(v) {
        muted = v;
        try { localStorage.setItem("dha-muted", v ? "1" : "0"); } catch (e) {}
      },
      unlock: ensure,
      click()   { tone(900, 0, 0.05, "sine", 0.05, 640); },                       // light tick
      start()   { tone(523, 0, 0.16, "sine", 0.08); tone(784, 0.08, 0.22, "sine", 0.08); },
      correct() { tone(659, 0, 0.16, "sine", 0.10); tone(988, 0.09, 0.28, "sine", 0.10); },
      wrong()   { tone(220, 0, 0.26, "triangle", 0.10, 150); },                  // soft low thud
      finish()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.34, "sine", 0.09)); },
    };
  })();
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  // Every button press: light tick + tiny vibration + ripple.
  // Buttons with data-silent play their own sound instead.
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

  // Mute button (top right, always visible)
  const ICON_ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>';
  const soundBtn = el("button", "sound-btn");
  soundBtn.type = "button";
  soundBtn.setAttribute("data-silent", "");
  soundBtn.setAttribute("aria-label", "Toggle sound");
  function paintSound() { soundBtn.innerHTML = sfx.isMuted() ? ICON_OFF : ICON_ON; soundBtn.classList.toggle("off", sfx.isMuted()); }
  soundBtn.onclick = () => { sfx.setMuted(!sfx.isMuted()); paintSound(); sfx.click(); };
  paintSound();
  document.body.append(soundBtn);

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

  /* ---------- Welcome ---------- */
  function showWelcome() {
    showHome(); // the home screen is ready underneath
    const w = el("div", "welcome");
    w.append(el("div", "blob b1"), el("div", "blob b2"), el("div", "blob b3"));

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
    chips.append(c1, el("div", "chip", "Works offline"), el("div", "chip", "Instant explanations"));

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

  /* ---------- Home ---------- */
  async function showHome(msg) {
    clear();
    app.append(logo(), el("h1", null, "DHA"), el("p", "sub", "Nursing exam practice"));

    app.append(el("label", "field", "Choose test length"));
    const grid = el("div", "sizes");
    SIZES.forEach((n) => {
      const b = el("button", "size ripple-host" + (n === settings.count ? " active" : ""), String(n));
      b.type = "button";
      b.append(el("small", null, "questions"));
      b.onclick = () => {
        settings.count = n;
        grid.querySelectorAll(".size").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      };
      grid.append(b);
    });
    app.append(grid);

    app.append(el("label", "field", "Topic"));
    const sel = el("select");
    sel.append(new Option("All topics (mixed)", "all"));
    app.append(sel);
    sel.onchange = () => { settings.category = sel.value; sfx.click(); };

    const start = el("button", "btn shine ripple-host", "Start test");
    start.type = "button";
    start.setAttribute("data-silent", "");
    start.onclick = () => { sfx.start(); buzz(15); startQuiz(start); };
    app.append(start);
    const err = el("p", "error", msg || "");
    app.append(err);

    try {
      const all = await loadAll();
      const m = {};
      all.forEach((q) => (m[q.category] = (m[q.category] || 0) + 1));
      Object.keys(m).sort().forEach((name) => sel.append(new Option(`${name} (${m[name]})`, name)));
      sel.value = settings.category;
      if (sel.value !== settings.category) { settings.category = "all"; sel.value = "all"; }
    } catch (e) {
      err.textContent = "Could not load questions."; // no retry loop
    }
  }

  async function startQuiz(btn) {
    btn.disabled = true; btn.textContent = "Loading…";
    try {
      const all = await loadAll();
      const pool = settings.category === "all" ? all : all.filter((q) => q.category === settings.category);
      const questions = shuffle(pool.slice()).slice(0, settings.count);
      if (!questions.length) throw new Error("No questions found");
      state = {
        idx: 0, score: 0, missed: [], locked: false, t0: Date.now(),
        items: questions.map(prepare),
      };
      showQuestion();
    } catch (e) {
      showHome("Could not start the test: " + e.message);
    }
  }

  // Build shuffled choices (unless the question depends on option order)
  function prepare(q) {
    let choices = q.options.map((text, i) => ({ text, correct: i === q.answer }));
    if (!q.fixedOrder) shuffle(choices);
    return { question: q.question, category: q.category, explanation: q.explanation, choices };
  }

  /* ---------- Question ---------- */
  function showQuestion() {
    clear();
    const item = state.items[state.idx];
    const total = state.items.length;
    state.locked = false;

    const top = el("div", "top");
    const scoreEl = el("span", "score-chip", `Score: ${state.score}`);
    top.append(el("span", null, `Question ${state.idx + 1} of ${total}`), scoreEl);
    const bar = el("div", "bar"); const fill = el("div");
    fill.style.width = (state.idx / total) * 100 + "%";
    bar.append(fill);
    ui = { fill, scoreEl };
    app.append(top, bar);
    if (item.category) app.append(el("span", "tag", item.category));
    app.append(el("p", "q", item.question));

    const buttons = [];
    item.choices.forEach((c, i) => {
      const b = el("button", "choice ripple-host");
      b.type = "button";
      b.setAttribute("data-silent", ""); // plays a right/wrong sound instead of the tick
      b.append(el("span", "l", LETTERS[i]), el("span", null, c.text));
      b.onclick = () => choose(i, buttons, item);
      buttons.push(b); app.append(b);
    });
  }

  function choose(i, buttons, item) {
    if (state.locked) return;
    state.locked = true;
    const picked = item.choices[i];
    const total = state.items.length;

    buttons.forEach((b, k) => {
      b.disabled = true;
      if (item.choices[k].correct) {
        b.classList.add("correct");
        b.querySelector(".l").textContent = "✓";
      }
    });

    if (picked.correct) {
      state.score++;
      buttons[i].classList.add("hit");
      ui.scoreEl.textContent = `Score: ${state.score}`;
      ui.scoreEl.classList.remove("bump"); void ui.scoreEl.offsetWidth; ui.scoreEl.classList.add("bump");
      sfx.correct(); buzz(18);
    } else {
      buttons[i].classList.add("wrong");
      buttons[i].querySelector(".l").textContent = "✕";
      state.missed.push({ item, picked: picked.text, correct: item.choices.find((c) => c.correct).text });
      sfx.wrong(); buzz([30, 40, 30]);
    }
    ui.fill.style.width = ((state.idx + 1) / total) * 100 + "%";

    if (item.explanation) app.append(el("div", "explain", item.explanation));
    const last = state.idx === total - 1;
    const next = el("button", "btn next ripple-host", last ? "Finish test" : "Next question");
    next.type = "button";
    next.onclick = () => { if (last) showResult(); else { state.idx++; showQuestion(); } };
    app.append(next);
    next.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- Result ---------- */
  function showResult() {
    clear();
    const total = state.items.length;
    const pct = Math.round((state.score / total) * 100);
    const wrongCount = total - state.score;
    const secs = Math.max(1, Math.round((Date.now() - state.t0) / 1000));

    const grade =
      pct >= 80 ? { cls: "great", title: "Congratulations!", note: "Excellent work — you're exam ready!", c1: "#22c55e", c2: "#0d9488" } :
      pct >= 60 ? { cls: "good",  title: "Congratulations!", note: "Good job! A little more practice will get you there.", c1: "#0ea5e9", c2: "#0d9488" } :
                  { cls: "keep",  title: "Test complete",    note: "Keep practicing — every test makes you stronger.", c1: "#f59e0b", c2: "#f97316" };

    const box = el("div", "result " + grade.cls);

    // Hero
    const hero = el("div", "r-hero");
    hero.append(el("h2", "r-title", grade.title), el("p", "r-note", grade.note));

    // Animated score ring
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
    center.append(big, el("div", "ring-label", `${state.score} of ${total} correct`));
    wrap.append(center);
    hero.append(wrap);
    box.append(hero);

    // Stats
    const stats = el("div", "stats");
    [["Correct", state.score, "good"], ["Incorrect", wrongCount, "bad"], ["Time", fmtTime(secs), "time"]].forEach(([label, val, kind]) => {
      const s = el("div", "stat " + kind);
      s.append(el("div", "stat-val", String(val)), el("div", "stat-label", label));
      stats.append(s);
    });
    box.append(stats);

    // Actions
    const again = el("button", "btn ripple-host", "Try another test");
    again.type = "button"; again.setAttribute("data-silent", "");
    again.onclick = () => { sfx.start(); buzz(15); startQuiz(again); };
    const home = el("button", "btn secondary ripple-host", "Back to home");
    home.type = "button"; home.onclick = () => showHome();
    box.append(again, home);
    app.append(box);

    // Review
    const rev = el("div", "review");
    if (state.missed.length) {
      rev.append(el("h3", null, `Review your mistakes (${state.missed.length})`));
      state.missed.forEach((m, n) => {
        const d = el("div", "rev-item");
        d.style.animationDelay = Math.min(n, 8) * 0.06 + 0.9 + "s";
        if (m.item.category) d.append(el("span", "tag", m.item.category));
        d.append(el("div", "rev-q", m.item.question));
        d.append(el("div", "you", "Your answer: " + m.picked));
        d.append(el("div", "right", "Correct answer: " + m.correct));
        if (m.item.explanation) d.append(el("div", "rev-exp", m.item.explanation));
        rev.append(d);
      });
    } else {
      const p = el("div", "perfect", "Perfect score — no mistakes to review.");
      rev.append(p);
    }
    app.append(rev);

    // The one big moment: ring fills, number counts up, chime (+ confetti for a good score)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      wrap.querySelector(".ring-fg").style.strokeDashoffset = C * (1 - pct / 100);
    }));
    countUp(big, pct, 1500, "%");
    if (pct >= 60) { sfx.finish(); buzz([40, 60, 40]); confetti(pct >= 80 ? 140 : 80); }
    else { sfx.start(); }
  }

  showWelcome();
})();
