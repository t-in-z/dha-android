(function () {
  const app = document.getElementById("app");
  const SIZES = [5, 10, 20, 30, 40, 50];
  const LETTERS = ["A", "B", "C", "D", "E"];
  const settings = { count: 10, category: "all" };
  let state = null;

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
  function clear() { app.replaceChildren(); }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function logo() {
    const img = el("img", "logo");
    img.src = "logo.svg"; img.alt = "DHA logo";
    return img;
  }

  /* ---------- Home ---------- */
  async function showHome(msg) {
    clear();
    app.append(logo(), el("h1", null, "DHA"), el("p", "sub", "Nursing exam practice"));

    app.append(el("label", "field", "Choose test length"));
    const grid = el("div", "sizes");
    SIZES.forEach((n) => {
      const b = el("button", "size" + (n === settings.count ? " active" : ""), String(n));
      b.type = "button";
      b.append(el("small", null, "questions"));
      b.onclick = () => { settings.count = n; grid.querySelectorAll(".size").forEach((x) => x.classList.remove("active")); b.classList.add("active"); };
      grid.append(b);
    });
    app.append(grid);

    app.append(el("label", "field", "Topic"));
    const sel = el("select");
    sel.append(new Option("All topics (mixed)", "all"));
    app.append(sel);
    sel.onchange = () => { settings.category = sel.value; };

    const start = el("button", "btn", "Start test");
    start.type = "button";
    start.onclick = () => startQuiz(start);
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
    } catch (e) { showHome("Could not load questions."); }
  }

  async function startQuiz(btn) {
    btn.disabled = true; btn.textContent = "Loading…";
    try {
      const all = await loadAll();
      const pool = settings.category === "all" ? all : all.filter((q) => q.category === settings.category);
      const questions = shuffle(pool.slice()).slice(0, settings.count);
      if (!questions.length) throw new Error("No questions found");
      const data = { questions };
      state = {
        idx: 0, score: 0, missed: [], locked: false,
        items: data.questions.map(prepare),
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
    top.append(el("span", null, `Question ${state.idx + 1} of ${total}`), el("span", null, `Score: ${state.score}`));
    const bar = el("div", "bar"); const fill = el("div"); fill.style.width = (state.idx / total) * 100 + "%"; bar.append(fill);
    app.append(top, bar);
    if (item.category) app.append(el("span", "tag", item.category));
    app.append(el("p", "q", item.question));

    const buttons = [];
    item.choices.forEach((c, i) => {
      const b = el("button", "choice");
      b.type = "button";
      b.append(el("span", "l", LETTERS[i]), el("span", null, c.text));
      b.onclick = () => choose(i, buttons, item);
      buttons.push(b); app.append(b);
    });
  }

  function choose(i, buttons, item) {
    if (state.locked) return;
    state.locked = true;
    const picked = item.choices[i];
    buttons.forEach((b, k) => {
      b.disabled = true;
      if (item.choices[k].correct) b.classList.add("correct");
    });
    if (picked.correct) { state.score++; }
    else {
      buttons[i].classList.add("wrong");
      state.missed.push({ item, picked: picked.text, correct: item.choices.find((c) => c.correct).text });
    }
    if (item.explanation) app.append(el("div", "explain", item.explanation));
    const last = state.idx === state.items.length - 1;
    const next = el("button", "btn", last ? "Finish test" : "Next question");
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
    const box = el("div", "result");
    box.append(logo(), el("h2", null, "🎉 Congratulations!"));
    box.append(el("p", "score", `${state.score} / ${total}`), el("p", "pct", `${pct}% correct`));
    const note = pct >= 80 ? "Excellent work — you're exam ready!" : pct >= 60 ? "Good job! A little more practice will get you there." : "Keep practicing — every test makes you stronger.";
    box.append(el("p", null, note));

    const again = el("button", "btn", "Try another test"); again.type = "button"; again.onclick = () => startQuiz(again);
    const home = el("button", "btn secondary", "Back to home"); home.type = "button"; home.onclick = () => showHome();
    box.append(again, home);
    app.append(box);

    if (state.missed.length) {
      const rev = el("div", "review");
      rev.append(el("h3", null, `Review your mistakes (${state.missed.length})`));
      state.missed.forEach((m) => {
        const d = el("div", "rev-item");
        d.append(el("div", null, m.item.question));
        const you = el("div", "you", "Your answer: " + m.picked);
        const right = el("div", "right", "Correct answer: " + m.correct);
        d.append(you, right);
        if (m.item.explanation) d.append(el("div", null, m.item.explanation));
        rev.append(d);
      });
      app.append(rev);
    }
  }

  showHome();
})();
