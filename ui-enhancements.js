/* UI polish: sound effects (with mute), animated final score, and the full Tips page. */
(function () {
  /* ------------------------------------------------------------------ *
   *  SOUND ENGINE — everything is synthesized with Web Audio, so there  *
   *  are no audio files and it works fully offline. The speaker button  *
   *  (soundOn in app.js / "gn_sound" in localStorage) mutes all of it.  *
   * ------------------------------------------------------------------ */
  let ctx = null, master = null, noiseBuf = null;

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
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // One synthesized note: {f, to?, dur, vol, type, at, lp?}
  function tone(o) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (o.at || 0), vol = o.vol || 0.25;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    if (o.lp) {
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp;
      osc.connect(f); f.connect(g);
    } else osc.connect(g);
    g.connect(master);
    osc.start(t0); osc.stop(t0 + o.dur + 0.03);
  }

  // Soft "swish" (filtered noise) used for next / previous.
  function swish(vol, dur) {
    const c = ensure(); if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(500, t0);
    bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.03);
  }

  const sfx = {
    tap()    { tone({ f: 520, to: 820, dur: 0.07, vol: 0.3 }); tone({ f: 1040, to: 1240, dur: 0.045, vol: 0.08, type: "triangle" }); },
    select() { tone({ f: 700, to: 920, dur: 0.07, vol: 0.28, type: "triangle" }); },
    next()   { swish(0.14, 0.17); },
    prev()   { swish(0.12, 0.14); },
    start()  { [[523.25, 0], [659.25, 0.08], [783.99, 0.16], [1046.5, 0.24]].forEach(([f, at]) => tone({ f, at, dur: 0.24, vol: 0.22, type: "triangle" })); },
    on()     { tone({ f: 660, to: 990, dur: 0.1, vol: 0.28 }); },
    correct(){ [[659.25, 0], [880, 0.09], [1318.5, 0.18]].forEach(([f, at]) => { tone({ f, at, dur: 0.3, vol: 0.26 }); tone({ f: f * 2, at, dur: 0.18, vol: 0.05 }); }); },
    wrong()  { tone({ f: 190, to: 120, dur: 0.28, vol: 0.3, type: "sawtooth", lp: 700 }); tone({ f: 150, to: 95, dur: 0.28, vol: 0.18, type: "square", lp: 500 }); },
    loading(){ tone({ f: 300, to: 520, dur: 0.9, vol: 0.07, type: "sine" }); },
    count(p) { tone({ f: 700 + p * 700, dur: 0.035, vol: 0.12 }); },
    finishGreat() {
      [[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.32]].forEach(([f, at]) => tone({ f, at, dur: 0.32, vol: 0.25, type: "triangle" }));
      [523.25, 659.25, 783.99, 1046.5].forEach(f => tone({ f, at: 0.46, dur: 0.8, vol: 0.12 }));
    },
    finishGood() { tone({ f: 783.99, dur: 0.26, vol: 0.24, type: "triangle" }); tone({ f: 1046.5, at: 0.13, dur: 0.45, vol: 0.24, type: "triangle" }); },
    finishKeep() { tone({ f: 440, dur: 0.3, vol: 0.2, type: "triangle" }); tone({ f: 587.33, at: 0.14, dur: 0.45, vol: 0.2, type: "triangle" }); }
  };

  function play(name, arg) {
    if (!enabled()) return;
    try { sfx[name](arg); } catch (_) {}
  }

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
   *  FINAL SCORE: loading ring -> ring fills from 0 while the number    *
   *  counts up (with soft ticks) -> stats count up -> finish sound.     *
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
