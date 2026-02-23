/**
 * System Friction · recommendations.js
 * Loads docs.json + patterns.json and renders related documents.
 * Uses CSS classes: .related-item, .related-num, .related-title, .related-sub
 */
(function () {
  const script = document.currentScript ||
    document.querySelector("script[data-docs]");
  if (!script) return;

  const docsUrl     = script.getAttribute("data-docs");
  const patternsUrl = script.getAttribute("data-patterns");
  const currentId   = script.getAttribute("data-current");
  const scope       = script.getAttribute("data-scope") || "same-node";
  const limit       = parseInt(script.getAttribute("data-limit") || "4", 10);
  const container   = document.getElementById("related-list");

  if (!container || !docsUrl || !currentId) return;

  function canonicalHref(doc) {
    const base = docsUrl.split("/meta/")[0] || "";
    if (doc.node === "nodo-ags") return base + "/nodo-ags/" + doc.id + "/";
    return base + "/docs/" + doc.id + "/";
  }

  function score(doc, current) {
    if (doc.id === current.id) return -1;
    if (scope === "cross-node" && doc.node === current.node) return 0;
    var s = 0;
    var cp = current.patterns || [];
    var dp = doc.patterns || [];
    cp.forEach(function(p) { if (dp.indexOf(p) > -1) s += 2; });
    if (doc.node !== current.node) s += 1;
    return s;
  }

  Promise.all([
    fetch(docsUrl).then(function(r) { return r.json(); }),
    fetch(patternsUrl).then(function(r) { return r.json(); }).catch(function() { return {}; })
  ]).then(function(results) {
    var docs = results[0];
    var current = docs.find(function(d) { return d.id === currentId; });
    if (!current) return;

    var scored = docs
      .map(function(d) { return { doc: d, score: score(d, current) }; })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, limit);

    if (scored.length === 0) {
      container.innerHTML = "<p class='related-note'>Sin conexiones registradas aún.</p>";
      return;
    }

    scored.forEach(function(x) {
      var doc = x.doc;
      var a = document.createElement("a");
      a.className = "related-item";
      a.href = canonicalHref(doc);
      a.innerHTML =
        '<div class="related-num">' + doc.id + '</div>' +
        '<div class="related-title">' + doc.title + '</div>' +
        (doc.summary ? '<div class="related-sub">' + doc.summary + '</div>' : '');
      container.appendChild(a);
    });
  }).catch(function(err) {
    console.warn("System Friction · recommendations error:", err);
  });
})();
