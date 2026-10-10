/* UI polish: sound effects (with mute), animated final score, and the full Tips page. */
(function () {
  /* ------------------------------------------------------------------ *
   *  SOUND ENGINE — everything is synthesized with Web Audio, so there  *
   *  are no audio files and it works fully offline. The speaker button  *
   *  (soundOn in app.js / "gn_sound" in localStorage) mutes all of it.  *
   *                                                                    *
   *  Sound design: soft, short, pure sine tones through a low-pass      *
   *  filter (warm, never harsh). Correct / finish sounds use a gentle   *
   *  "bell" (fundamental + quiet overtones). No buzzers, no sweeps.     *
   * ------------------------------------------------------------------ */
  let ctx = null, master = null;

  function enabled() {
    try { if (typeof soundOn === "boolean") return soundOn; } catch (_) {}
    try { return localStorage.getItem("gn_sound") !== "0"; } catch (_) { return true; }
  }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // One synthesized note: {f, to?, dur, vol, type, at, lp?}. Always low-passed so it sounds warm.
  function tone(o) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (o.at || 0), vol = o.vol || 0.1;
    const osc = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    f.type = "lowpass"; f.frequency.value = o.lp || 5000;
    osc.connect(f); f.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + o.dur + 0.03);
  }

  // Soft bell: fundamental plus two quiet, shorter overtones.
  function bell(f, at, dur, vol) {
    tone({ f: f, at: at, dur: dur, vol: vol });
    tone({ f: f * 2, at: at, dur: dur * 0.5, vol: vol * 0.2 });
    tone({ f: f * 3, at: at, dur: dur * 0.3, vol: vol * 0.06 });
  }

  const sfx = {
    tap()    { tone({ f: 1100, to: 800, dur: 0.045, vol: 0.08 }); },
    select() { tone({ f: 740, dur: 0.08, vol: 0.1 }); tone({ f: 1110, at: 0.035, dur: 0.08, vol: 0.05 }); },
    next()   { tone({ f: 600, to: 520, dur: 0.06, vol: 0.07 }); },
    prev()   { tone({ f: 480, to: 420, dur: 0.06, vol: 0.06 }); },
    start()  { bell(523.25, 0, 0.5, 0.12); bell(783.99, 0.11, 0.75, 0.12); },
    on()     { tone({ f: 784, dur: 0.1, vol: 0.1 }); },
    correct(){ bell(783.99, 0, 0.45, 0.12); bell(1174.66, 0.1, 0.7, 0.12); },
    wrong()  { tone({ f: 311.13, dur: 0.2, vol: 0.12, lp: 900 }); tone({ f: 246.94, at: 0.13, dur: 0.32, vol: 0.12, lp: 900 }); },
    notice() { bell(880, 0, 0.5, 0.09); bell(659.25, 0.16, 0.75, 0.09); },   // mock-exam time warnings
    loading(){},   // intentionally silent
    count()  {},   // intentionally silent
    finishGreat() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.11, 0.85, 0.11));
      [523.25, 659.25, 783.99].forEach(f => tone({ f: f, at: 0.5, dur: 1.2, vol: 0.045 }));
    },
    finishGood() { bell(659.25, 0, 0.5, 0.11); bell(880, 0.13, 0.85, 0.11); },
    finishKeep() { bell(440, 0, 0.5, 0.1); bell(587.33, 0.14, 0.85, 0.1); }
  };

  function play(name, arg) {
    if (!enabled()) return;
    try { sfx[name](arg); } catch (_) {}
  }

  // No robotic text-to-speech voice: the chimes above already tell the user right / wrong.
  window.say = function () {};

  // Mock-exam time warnings use the same soft bell instead of a plain beep.
  window.playSoftNotice = function () { play("notice"); };

  // Wake the audio engine on the first touch so the first sound has no delay (Android WebView needs a gesture).
  document.addEventListener("pointerdown", function () { if (enabled()) ensure(); }, { capture: true, passive: true });

  // Pick the right sound for each kind of button.
  document.addEventListener("click", function (event) {
    const b = event.target.closest("button");
    if (!b || b.disabled) return;
    if (b.classList.contains("sound-btn")) { setTimeout(function () { play("on"); }, 0); return; } // plays only if sound is ON after the toggle
    if (b.classList.contains("choice")) return;                                                   // answer sounds come from pickAnswer below
    if (b.classList.contains("w-btn")) return play("start");
    if (b.closest(".navrow")) return play(b.classList.contains("secondary") ? "prev" : "next");
    if (b.classList.contains("size") || b.classList.contains("seg-btn") || b.classList.contains("lang-opt")) return play("select");
    play("tap");
  }, true);

  // Answer sounds: practice mode -> correct / wrong chime; exam mode -> neutral tick (never reveals the answer).
  const origPick = window.pickAnswer;
  if (typeof origPick === "function") {
    window.pickAnswer = function () {
      let q = null, before = null;
      try { q = quiz.items[quiz.index]; before = q.picked; } catch (_) {}
      const r = origPick.apply(this, arguments);
      try {
        if (q && q.picked != null && q.picked !== before) {
          if (quiz.mode === "practice") play(q.choices[q.picked].correct ? "correct" : "wrong");
          else play("select");
        }
      } catch (_) {}
      return r;
    };
  }

  /* ------------------------------------------------------------------ *
   *  ICONS missing from app.js. The home "Take a Real Mock Test" card   *
   *  asks for icon("clipboard-check"), which did not exist, so the icon *
   *  tile was empty. It is provided here.                               *
   * ------------------------------------------------------------------ */
  const EXTRA_ICONS = {
    "clipboard-check": '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>'
  };
  const origIcon = window.icon;
  if (typeof origIcon === "function") {
    window.icon = function (name) { return EXTRA_ICONS[name] || origIcon(name); };
  }

  /* ------------------------------------------------------------------ *
   *  FINAL SCORE: loading ring -> ring fills from 0 while the number    *
   *  counts up -> stats count up -> finish sound.                       *
   *  The existing entrance animations (title, ring pop-in, stats, etc.) *
   *  are untouched.                                                     *
   * ------------------------------------------------------------------ */
  function animateScore(result) {
    if (!result || result.dataset.scoreAnimated) return;
    result.dataset.scoreAnimated = "1";
    const ring = result.querySelector(".ring-fg");
    const pctEl = result.querySelector(".ring-pct");
    if (!ring || !pctEl) return;

    const chip = result.querySelector(".r-pct");
    const total = Math.max(1, parseInt(pctEl.dataset.total, 10) || 1);
    const correctN = parseInt(pctEl.dataset.correct, 10) || 0;
    const target = Math.max(0, Math.min(100, chip ? (parseInt(chip.dataset.pct, 10) || 0) : Math.round(correctN / total * 100)));
    const C = 301.59, LOAD_MS = 1000, COUNT_MS = 1700;
    const stats = Array.prototype.map.call(result.querySelectorAll(".stat-val"), function (el) {
      return { el: el, to: parseInt(el.textContent, 10) || 0 };
    });
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { result.classList.add("done"); return; }          // show final values straight away

    const live = function () { return result.isConnected; };       // stop if the user already left this page

    // Phase 1: loading (ring is empty, spinner arc turns, number sits at 0)
    ring.style.transition = "none";
    ring.style.strokeDashoffset = String(C);
    if (target === 0) ring.style.display = "none";
    pctEl.textContent = "0/" + total;
    if (chip) chip.textContent = "0%";
    stats.forEach(function (s) { s.el.textContent = "0"; });
    result.classList.add("is-loading");
    play("loading");

    // Phase 2: count from 0 to the real score while the ring fills
    setTimeout(function () {
      if (!live()) return;
      result.classList.remove("is-loading");
      void ring.getBoundingClientRect();                           // make the transition start from the empty ring
      ring.style.transition = "stroke-dashoffset " + COUNT_MS + "ms cubic-bezier(.22,1,.36,1)";
      ring.style.strokeDashoffset = String(C - (C * target / 100));

      const t0 = performance.now();
      let lastStep = -1;
      function tick(now) {
        if (!live()) return;
        const p = Math.min(1, (now - t0) / COUNT_MS);
        const e = 1 - Math.pow(1 - p, 3);
        const v = Math.round(target * e);
        pctEl.textContent = Math.round(correctN * e) + "/" + total;
        if (chip) chip.textContent = v + "%";
        stats.forEach(function (s) { s.el.textContent = String(Math.round(s.to * e)); });
        const step = Math.floor(v / 4);
        if (p < 1 && step !== lastStep) { lastStep = step; play("count", e); }
        if (p < 1) requestAnimationFrame(tick);
        else {
          pctEl.textContent = correctN + "/" + total;
          if (chip) chip.textContent = target + "%";
          stats.forEach(function (s) { s.el.textContent = String(s.to); });
          result.classList.add("done");
          play(target >= 80 ? "finishGreat" : target >= 50 ? "finishGood" : "finishKeep");
        }
      }
      requestAnimationFrame(tick);
    }, LOAD_MS);
  }

  /* Full Tips page: all three sections + closing quotes (the content already exists in i18n.js). */
  const SVG = (p, s) => '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const CHECK = SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 18);
  const DOWN = SVG('<path d="M12 5v14M6 13l6 6 6-6"/>', 16);
  const QUOTE = SVG('<path d="M7 7h4v5c0 3-2 5-4 5M15 7h4v5c0 3-2 5-4 5"/>', 22);

  window.renderTips = function () {
    currentView = "tips";
    const T = (window.GN && window.GN.TIPS && (window.GN.TIPS[lang] || window.GN.TIPS.en)) || {};
    const e = escapeHtml;
    const head = (color, title) => '<div class="tip-head"><div class="tip-ic" style="--tc:' + color + '">' + icon("light") + '</div><h2>' + e(title) + '</h2></div>';
    const bullets = (arr) => '<ul class="tip-bul">' + (arr || []).map(t => '<li><span class="tip-chk">' + CHECK + '</span><span dir="auto">' + e(t) + '</span></li>').join("") + '</ul>';

    const items = (T.items || []).map((x, i) =>
      '<li class="tip-item"><span class="tip-num">' + (i + 1) + '</span><div class="tip-tx"><b>' + e(x[0]) + '</b><span>' + e(x[1]) + '</span></div></li>').join("");

    const chain = (T.chain || []).map((c, i) =>
      (i ? '<div class="tip-arrow">' + DOWN + '</div>' : '') + '<div class="tip-step"><em>' + (i + 1) + '</em><span>' + e(c) + '</span></div>').join("");

    const quote = (t) => t ? '<div class="tip-quote"><span class="tip-q-ic">' + QUOTE + '</span><p>' + e(t) + '</p></div>' : "";

    shell(
      '<div class="tips-top"><button class="back-btn ripple-host" onclick="renderHome()">' + icon("back") + e(tr("home")) + '</button>' +
      '<button class="hbtn lang-btn" onclick="openLanguage()">' + icon("globe") + '<span>' + e(tr("langBtn")) + '</span></button></div>' +
      '<div class="tips-hero"><div class="tips-hero-ic">' + icon("light") + '</div><div><h1>' + e(tr("tipsTitle")) + '</h1><p>' + e(tr("tipsSub")) + '</p></div></div>' +
      (T.items ? '<section class="tip-sec">' + head("#0ea5e9", T.s1) + '<ul class="tip-list">' + items + '</ul></section>' : "") +
      (T.asks ? '<section class="tip-sec">' + head("#8b5cf6", T.s2) + '<p class="tip-lead">' + e(T.ask) + '</p>' + bullets(T.asks) +
        '<p class="tip-lead">' + e(T.prio) + '</p><div class="tip-chain">' + chain + '</div><p class="tip-note">' + e(T.caution) + '</p></section>' : "") +
      (T.day ? '<section class="tip-sec">' + head("#f97316", T.s3) + bullets(T.day) + '</section>' : "") +
      quote(T.q1) + quote(T.q2),
      true
    );
  };

  /* ------------------------------------------------------------------ *
   *  OPEN EVERY NEW SCREEN AT THE TOP. Without this, the scroll        *
   *  position of the previous screen was carried over, so a new page   *
   *  could open already scrolled down. Re-rendering the same screen    *
   *  (e.g. changing the question count) keeps the scroll position.     *
   * ------------------------------------------------------------------ */
  let lastScreenKey = null;
  function screenKey() {
    let v = "", qi = "end";
    try { v = currentView; } catch (_) {}
    try { if (quiz) qi = String(quiz.index); } catch (_) {}
    return v + ":" + qi;
  }
  function scrollToTopIfNewScreen() {
    const key = screenKey();
    if (key === lastScreenKey) return;
    lastScreenKey = key;
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  }

  const observer = new MutationObserver(function () {
    const result = document.querySelector(".result");
    if (result) animateScore(result);
    scrollToTopIfNewScreen();
  });

  function start() {
    const app = document.querySelector("#app");
    if (app) observer.observe(app, { childList: true, subtree: true });
    const result = document.querySelector(".result");
    if (result) animateScore(result);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
