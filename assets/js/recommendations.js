/**
 * System Friction · recommendations.js
 * Loads docs.json + patterns.json and renders related documents.
 * Reads config from <script> data attributes.
 */
(function () {
  const script = document.currentScript ||
    document.querySelector("script[data-docs]");
  if (!script) return;

  const docsUrl      = script.getAttribute("data-docs");
  const patternsUrl  = script.getAttribute("data-patterns");
  const ecosystemUrl = script.getAttribute("data-ecosystem");
  const currentId    = script.getAttribute("data-current");
  const scope        = script.getAttribute("data-scope") || "same-node";
  const limit        = parseInt(script.getAttribute("data-limit") || "4", 10);
  const container    = document.getElementById("related-list");

  if (!container || !docsUrl || !currentId) return;

  // Derive base from script src
  function canonicalHref(doc) {
    const base = docsUrl.split("/meta/")[0] || "";
    if (doc.node === "nodo-ags") return `${base}/nodo-ags/${doc.id}/`;
    return `${base}/docs/${doc.id}/`;
  }

  function score(doc, current, patterns) {
    if (doc.id === current.id) return -1;
    // cross-node: prefer different node
    if (scope === "cross-node" && doc.node === current.node) return 0;
    let s = 0;
    const cp = current.patterns || [];
    const dp = doc.patterns || [];
    cp.forEach(p => { if (dp.includes(p)) s += 2; });
    if (doc.node !== current.node) s += 1;
    return s;
  }

  Promise.all([
    fetch(docsUrl).then(r => r.json()),
    fetch(patternsUrl).then(r => r.json()).catch(() => ({}))
  ]).then(([docs, patterns]) => {
    const current = docs.find(d => d.id === currentId);
    if (!current) return;

    const scored = docs
      .map(d => ({ doc: d, score: score(d, current, patterns) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (scored.length === 0) {
      container.innerHTML = "<p class='related-empty'>Sin conexiones registradas aún.</p>";
      return;
    }

    scored.forEach(({ doc }) => {
      const a = document.createElement("a");
      a.className = "related-item";
      a.href = canonicalHref(doc);
      a.innerHTML = `
        <div class="r-num">${doc.id}</div>
        <div class="r-title">${doc.title}</div>
        ${doc.summary ? `<div class="r-sub">${doc.summary}</div>` : ""}
      `;
      container.appendChild(a);
    });
  }).catch(err => {
    console.warn("System Friction · recommendations.js error:", err);
  });
})();
