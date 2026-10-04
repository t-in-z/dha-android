/* UI polish: restore click feedback sound + animated final score. */
(function () {
  let audioCtx = null;

  function soundEnabled() {
    return localStorage.getItem("gn_sound") !== "0";
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
