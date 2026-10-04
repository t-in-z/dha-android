function getLangValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[lang] ?? value.en ?? "";
  }
  return value ?? "";
}

function getLangArray(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[lang] ?? value.en ?? [];
  }
  return Array.isArray(value) ? value : [];
}

function prepare(q) {
  const question = getLangValue(q.question);
  const options = getLangArray(q.options);
  const category = getLangValue(q.category);
  const sub = getLangValue(q.subcategory);
  const explanation = getLangValue(q.explanation);

  let choices = options.map((text, i) => ({
    text,
    correct: i === q.answer
  }));

  if (!q.fixedOrder) shuffle(choices);

  return {
    question,
    category,
    sub,
    explanation,
    choices,
    picked: null
  };
}
