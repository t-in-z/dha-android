/* UI polish: click sound, animated final score, and the full Tips page. */
(function () {
  let audioCtx = null;

  function soundEnabled() {
    try { return localStorage.getItem("gn_sound") !== "0"; } catch (_) { return true; }
  }

  function clickSound() {
    if (!soundEnabled()) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.055);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (_) {}
  }

  function animateScore(result) {
    if (!result || result.dataset.scoreAnimated) return;
    result.dataset.scoreAnimated = "1";
    const ring = result.querySelector(".ring-fg");
    const pctEl = result.querySelector(".ring-pct");
    if (!ring || !pctEl) return;

    const target = Math.max(0, Math.min(100, parseInt(pctEl.textContent, 10) || 0));
    const circumference = 301.59;
    const duration = 1200;
    const start = performance.now();

    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference);
    ring.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)";
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = String(circumference - (circumference * target / 100));
    });

    pctEl.textContent = "0%";
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      pctEl.textContent = Math.round(target * eased) + "%";
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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

  document.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (button && !button.disabled) clickSound();
  }, true);

  const observer = new MutationObserver(function () {
    const result = document.querySelector(".result");
    if (result) animateScore(result);
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
