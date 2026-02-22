function cfg() {
  const s = document.currentScript;
  return {
    docsUrl: s?.dataset?.docs || "../meta/docs.json",
    patternsUrl: s?.dataset?.patterns || "../meta/patterns.json",
    ecosystemUrl: s?.dataset?.ecosystem || "../meta/ecosystem.json",
    scope: s?.dataset?.scope || "same-node",
    limit: Number(s?.dataset?.limit || 4),
  };
}

function toSet(arr) {
  if (!arr) return new Set();
  if (Array.isArray(arr)) return new Set(arr.map(x => String(x).trim()).filter(Boolean));
  return new Set(String(arr).split(",").map(x => x.trim()).filter(Boolean));
}

function detectCurrentDocId() {
  const a = document.querySelector("article[data-doc-id]");
  if (a?.dataset?.docId) return a.dataset.docId;

  // fallback: nombre del archivo sin extensión
  const file = (location.pathname.split("/").pop() || "").replace(".html", "");
  return file;
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`No se pudo cargar ${url}`);
  return r.json();
}

/**
 * Normaliza tu docs.json:
 * { "documents": [ { "doc-id": "...", "pattern-type":[...], "node":"main", ... } ] }
 */
function normalizeDocs(docsJson) {
  const arr = docsJson?.documents || [];
  return arr.map(d => ({
    id: d["doc-id"],
    title: d.title || "",
    node: d.node || "main",
    patterns: Array.isArray(d["pattern-type"]) ? d["pattern-type"] : [],
    version: d.version || "",
    published: d["first-published"] || "",
    scopeLimit: d["scope-limit"] || "",
    misuseRisk: d["misuse-risk"] || "",
  }));
}

/**
 * Crea mapa de patrones y expansión por related-patterns:
 * patterns.json: { patterns: [ { id, related-patterns: [...] } ] }
 */
function buildPatternGraph(patternsJson) {
  const map = new Map();
  const arr = patternsJson?.patterns || [];
  for (const p of arr) {
    const id = p.id;
    const rel = Array.isArray(p["related-patterns"]) ? p["related-patterns"] : [];
    map.set(id, new Set(rel));
  }
  return map;
}

/**
 * Expande patrones 1 salto:
 * - incluye los propios
 * - incluye related-patterns (si existen)
 */
function expandPatterns(patternSet, graph) {
  const expanded = new Set([...patternSet]);
  for (const p of patternSet) {
    const rel = graph.get(p);
    if (rel) for (const r of rel) expanded.add(r);
  }
  return expanded;
}

/**
 * Resolver ruta a HTML (porque tu docs.json no incluye path/href).
 * Aquí aplicamos un mapa mínimo (puedes ampliarlo).
 */
function hrefFor(doc) {
  // MAIN docs: viven en /docs/
  const mainMap = {
    "doc-01": "01-decisiones-que-nadie-tomo.html",
    "doc-02": "02-costo-real-adoptable.html",
    "doc-03": "03-compliance-como-narrativa.html",
    "doc-04": "04-dinero-estructura-temporal.html",
    "doc-05": "05-escritura-sin-intencion.html",
    "doc-06": "06-sistemas-alerta.html",
    "doc-07": "07-contexto-perdido.html",
    "doc-08": "08-personas-alta-incertidumbre.html",
    "doc-09": "09-deuda-decision.html",
    "doc-10": "10-incentivos-que-fallan.html",
  };

  // Nodo AGS: viven en /nodo-ags/ (desde /docs/ se sube un nivel)
  const agsMap = {
    "ags-01": "../nodo-ags/la-distancia-que-no-se-mide.html",
    "ags-02": "../nodo-ags/el-costo-de-la-latencia.html",
    "ags-03": "../nodo-ags/el-agua-que-no-se-ve.html",
    "ags-04": "../nodo-ags/la-ficcion-institucional.html",
    "ags-05": "../nodo-ags/el-pacto-no-escrito.html",
  };

  if (doc.node === "nodo-ags") return agsMap[doc.id] || "../nodo-ags/index.html";
  return mainMap[doc.id] || "#";
}

function score(current, candidate, graph) {
  if (current.id === candidate.id) return -999;

  const cur = toSet(current.patterns);
  const cand = toSet(candidate.patterns);

  const curEx = expandPatterns(cur, graph);
  const candEx = expandPatterns(cand, graph);

  // overlap directo
  let direct = 0;
  for (const p of cur) if (cand.has(p)) direct++;

  // overlap expandido (resonancia indirecta)
  let indirect = 0;
  for (const p of curEx) if (!cur.has(p) && candEx.has(p)) indirect++;

  // ponderación: directo pesa más que indirecto
  return direct * 12 + indirect * 4;
}

function pick(current, docs, graph, scope, limit) {
  const pool = docs.filter(d => {
    if (scope === "cross-node") return true;
    return d.node === current.node;
  });

  return pool
    .map(d => ({ d, s: score(current, d, graph) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.d);
}

function render(items) {
  const box = document.getElementById("related-list");
  if (!box) return;

  if (!items.length) {
    box.innerHTML = `
      <div class="limit-box">
        No hay rutas sugeridas suficientes con los patrones actuales.
        (Amplía patterns compartidos o related-patterns)
      </div>`;
    return;
  }

  box.innerHTML = items.map(d => {
    const label = d.id;
    const title = d.title;
    const sub = d.scopeLimit ? `Límite: ${d.scopeLimit}` : "";
    const href = hrefFor(d);

    return `
      <a class="related-item" href="${href}">
        <div class="related-num">${label}</div>
        <div class="related-title">${title}</div>
        <div class="related-sub">${sub}</div>
      </a>
    `;
  }).join("");
}

(async function main() {
  try {
    const { docsUrl, patternsUrl, ecosystemUrl, scope, limit } = cfg();

    // Cargamos todo (ecosystem puede servir luego para enriquecer, hoy no es crítico)
    const [docsJson, patternsJson] = await Promise.all([
      fetchJson(docsUrl),
      fetchJson(patternsUrl),
      fetchJson(ecosystemUrl).catch(() => ({})),
    ]);

    const docs = normalizeDocs(docsJson);
    const graph = buildPatternGraph(patternsJson);

    const currentId = detectCurrentDocId();

    // match exacto por doc-id
    const current = docs.find(d => d.id === currentId) || null;

    // Si no encontramos doc-id, no destruimos la página
    if (!current) {
      render([]);
      return;
    }

    const items = pick(current, docs, graph, scope, limit);
    render(items);

  } catch (e) {
    render([]);
  }
})();
``
