/* dashboard.js — System Friction v1.1
   Vanilla JS. Sin dependencias. Consume /assets/data/*.json.
   Renderiza: IHG gauge, NTI bars, sparkline, scenarios, dims, nodes, interventions.
   Toggle NTI: recalcula IHG sin trazabilidad.
   Lab Mode: Monte Carlo client-side.
   Audit: cadena de trazabilidad docs → variables → IHG. */

(function () {
  'use strict';

  const BASE = window.SF_BASE || '';

  // ── Fetch helpers ─────────────────────────────────────────────────────
  async function load(path) {
    const r = await fetch(BASE + path);
    if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
    return r.json();
  }

  // ── Status map ────────────────────────────────────────────────────────
  const SC = {
    OK:'ok', DEGRADED:'degraded', CRITICAL:'critical',
    FRACTURE:'fracture', OPAQUE:'opaque', EMERGENCY_DECISION:'emergency'
  };
  const STATUS_COLOR = {
    OK:'var(--ok-t)', DEGRADED:'var(--wn-t)', CRITICAL:'var(--cr-t)',
    FRACTURE:'var(--fr-t)', OPAQUE:'var(--op-t)'
  };
  function sc(s){ return SC[s]||'warn'; }
  function scolor(s){ return STATUS_COLOR[s]||'var(--wn-t)'; }

  // ── IHG SVG radial gauge ──────────────────────────────────────────────
  function ihgGauge(val, label) {
    const MIN=-1.2, MAX=0.2;
    const pct = Math.max(0, Math.min(1, (val-MIN)/(MAX-MIN)));
    const r=38, cx=50, cy=56, startA=-215, range=250;
    const angle = startA + pct*range;
    function polar(a, radius) {
      const rad = (a-90)*Math.PI/180;
      return [cx+radius*Math.cos(rad), cy+radius*Math.sin(rad)];
    }
    function arc(a1, a2, radius) {
      const [x1,y1]=polar(a1,radius), [x2,y2]=polar(a2,radius);
      const large = (a2-a1+360)%360>180?1:0;
      return `M${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2}`;
    }
    // UCAP marker at -0.50 → pct = (-0.5-(-1.2))/(0.2-(-1.2)) = 0.5
    const ucapA = startA + 0.5*range;
    const [ux,uy] = polar(ucapA, r+4);
    const [ux2,uy2] = polar(ucapA, r-4);
    const color = val<-0.5?'var(--cr-t)':val<-0.3?'var(--wn-t)':'var(--ok-t)';
    return `<svg class="gauge-svg" viewBox="0 0 100 75">
      <path d="${arc(-215,35,r)}" stroke="var(--bg2)" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="${arc(-215,angle,r)}" stroke="${color}" stroke-width="7" fill="none" stroke-linecap="round" style="transition:stroke-dashoffset .6s ease"/>
      <line x1="${ux}" y1="${uy}" x2="${ux2}" y2="${uy2}" stroke="var(--cr-t)" stroke-width="1.5" opacity=".8"/>
      <text x="50" y="50" text-anchor="middle" font-family="var(--fm,'JetBrains Mono',monospace)" font-size="13" fill="${color}" font-weight="500">${val.toFixed(3)}</text>
      <text x="50" y="62" text-anchor="middle" font-family="var(--fm,'JetBrains Mono',monospace)" font-size="5.5" fill="var(--tx3)">${label||'IHG'}</text>
    </svg>`;
  }

  // ── Sparkline ─────────────────────────────────────────────────────────
  function sparkline(history) {
    if (!history||!history.length) return '';
    const vals = history.map(h=>h.ihg);
    const min=Math.min(...vals)-0.05, max=Math.max(...vals)+0.05;
    const W=200, H=52, pad=4;
    const xs = history.map((_,i)=>pad+(i/(history.length-1))*(W-pad*2));
    const ys = vals.map(v=>pad+(1-(v-min)/(max-min))*(H-pad*2));
    const pts = xs.map((x,i)=>`${x},${ys[i]}`).join(' ');
    // UCAP line at -0.5
    const ucap_y = pad+(1-(-0.5-min)/(max-min))*(H-pad*2);
    const lastX = xs[xs.length-1], lastY = ys[ys.length-1];
    // gradient path
    const pathD = xs.map((x,i)=>(i===0?`M${x},${ys[i]}`:`L${x},${ys[i]}`)).join(' ');
    const ticks = history.map((h,i)=>{
      if (i===0||i===history.length-1||i===history.length-3)
        return `<text x="${xs[i]}" y="${H}" text-anchor="middle" class="spark-axis">${h.t}</text>`;
      return '';
    }).join('');
    return `<svg class="spark-svg" viewBox="0 0 ${W} ${H+12}">
      <line x1="${pad}" y1="${ucap_y}" x2="${W-pad}" y2="${ucap_y}" stroke="var(--cr)" stroke-width=".8" stroke-dasharray="3,2" opacity=".6"/>
      <text x="${W-pad-1}" y="${ucap_y-2}" text-anchor="end" font-size="4.5" fill="var(--cr-t)" font-family="var(--fm,monospace)">UCAP</text>
      <path d="${pathD}" stroke="var(--tx3)" stroke-width="1.2" fill="none"/>
      <circle cx="${lastX}" cy="${lastY}" r="2.5" fill="var(--cr-t)"/>
      ${ticks}
    </svg>`;
  }

  // ── Render headline ───────────────────────────────────────────────────
  function renderHeadline(sys, el) {
    const ihg = sys.IHG_post, nti = sys.NTI_post;
    el.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:1.2rem;flex-wrap:wrap">
        <div class="gauge-wrap">${ihgGauge(ihg,'IHG')}</div>
        <div style="flex:1;min-width:160px">
          <div class="dash-cell__label">Sistema · Nodo AGS</div>
          <div style="display:flex;flex-wrap:wrap;gap:.4rem .9rem;margin-bottom:.5rem">
            <div><div style="font-family:var(--fm);font-size:.52rem;color:var(--tx3)">IHG pre</div><div class="c-wn mono" style="font-size:.95rem">${sys.IHG_pre.toFixed(3)}</div></div>
            <div><div style="font-family:var(--fm);font-size:.52rem;color:var(--tx3)">NTI</div><div class="c-cr mono" style="font-size:.95rem">${nti.toFixed(3)}</div></div>
            <div><div style="font-family:var(--fm);font-size:.52rem;color:var(--tx3)">IHG×NTI</div><div class="c-dim mono" style="font-size:.95rem">${sys.IHG_corr.toFixed(3)}</div></div>
            <div><div style="font-family:var(--fm);font-size:.52rem;color:var(--tx3)">P(2030)</div><div class="c-cr mono" style="font-size:.95rem">${(sys.prob_2030*100).toFixed(0)}%</div></div>
          </div>
          <span class="badge badge--emergency">${sys.protocol.replace(/_/g,' ')}</span>
          <div style="font-family:var(--fm);font-size:.52rem;color:var(--tx3);margin-top:.5rem">UCAP IHG: ${sys.ucap_ihg} · UCAP NTI: ${sys.ucap_nti}</div>
        </div>
      </div>`;
  }

  // ── Toggle NTI ────────────────────────────────────────────────────────
  let _ntiOn = true;
  function applyToggle(sys, el) {
    const ihg = _ntiOn ? sys.IHG_post : sys.IHG_corr / sys.NTI_post;
    const label = _ntiOn ? 'IHG+NTI' : 'IHG bruto';
    const note = _ntiOn
      ? `NTI activo. IHG auditado: ${sys.IHG_post.toFixed(3)}`
      : `NTI desactivado. IHG sin trazabilidad: ${(sys.IHG_corr/sys.NTI_post).toFixed(3)} (proxy crudo)`;
    const val = _ntiOn ? sys.IHG_post : (sys.IHG_corr / sys.NTI_post);
    if (el) el.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem">
        <div class="gauge-wrap">${ihgGauge(val, label)}</div>
        <div style="font-family:var(--fm);font-size:.6rem;color:var(--tx2);flex:1">${note}</div>
      </div>`;
  }

  // ── NTI bars ──────────────────────────────────────────────────────────
  function renderNTI(nti, total, el) {
    const items = [
      ['1−LDI', 1-nti.LDI_n, 'Latencia decision'],
      ['ICC',   nti.ICC_n,   'Concentracion conocimiento'],
      ['CSR',   nti.CSR,     'Cumplimiento reduccion'],
      ['IRCI',  nti.IRCI_n,  'Resiliencia capital'],
      ['IIM',   nti.IIM,     'Integridad metricas']
    ];
    const rows = items.map(([lbl,val,desc])=>{
      const pct=(val*100).toFixed(0);
      const color=val<0.25?'var(--cr-t)':val<0.55?'var(--wn-t)':'var(--ok-t)';
      return `<div class="nti-row">
        <div class="nti-row__lbl">${lbl}</div>
        <div class="nti-row__bar"><div class="nti-row__fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="nti-row__val" style="color:${color}">${val.toFixed(3)}</div>
      </div>`;
    }).join('');
    el.innerHTML = `<div style="font-family:var(--fm);font-size:.7rem;color:var(--cr-t);margin-bottom:.5rem;display:flex;align-items:center;gap:.5rem">
      NTI = ${total.toFixed(3)} <span class="badge badge--critical">BLIND MODE</span>
    </div>
    <div class="nti-bars">${rows}</div>`;
  }

  // ── Sparkline cell ────────────────────────────────────────────────────
  function renderSparkline(history, el) {
    el.innerHTML = sparkline(history);
  }

  // ── Scenarios ─────────────────────────────────────────────────────────
  function renderScenarios(scenarios, el) {
    const cells = scenarios.map(s=>{
      const color = s.p>0.35?'c-cr':s.p>0.2?'c-wn':'c-ok';
      return `<div class="sc-cell">
        <div class="sc-cell__id">${s.id} · 50k iter seed 42</div>
        <div class="sc-cell__label">${s.label}</div>
        <div class="sc-cell__prob ${color}">${(s.p*100).toFixed(0)}%</div>
        <div class="sc-cell__ihg">IHG@180d ${s.ihg180.toFixed(2)}</div>
      </div>`;
    }).join('');
    el.innerHTML = `<div class="sc-grid">${cells}</div>`;
  }

  // ── Dimensions ────────────────────────────────────────────────────────
  function renderDims(nodes, el) {
    // aggregate across nodes
    const dims = ['C','E','L','K','R','M'];
    const labels = {'C':'Capacidad','E':'Entropia','L':'Latencia','K':'Conectividad','R':'Redistribucion','M':'Coherencia'};
    const vals = {};
    dims.forEach(d=>{ vals[d] = Object.values(nodes).map(n=>n[d]); });
    const cells = dims.map(d=>{
      const vs = vals[d];
      const avg = vs.reduce((a,b)=>a+b,0)/vs.length;
      const worst = d==='E'||d==='L' ? Math.max(...vs) : Math.min(...vs);
      const color = (d==='C'||d==='R'||d==='M') 
        ? (worst<0.3?'var(--cr-t)':worst<0.5?'var(--wn-t)':'var(--ok-t)')
        : (worst>0.85?'var(--cr-t)':worst>0.65?'var(--wn-t)':'var(--ok-t)');
      const barW = (avg*100).toFixed(0);
      return `<div class="dim-cell">
        <div class="dim-cell__sym">${d}<sub>i</sub></div>
        <div class="dim-cell__val" style="color:${color}">${avg.toFixed(2)}</div>
        <div class="dim-bar" style="background:${color};opacity:.5;width:${barW}%;margin:0 auto"></div>
        <div style="font-family:var(--fm);font-size:.44rem;color:var(--tx3);margin-top:.1rem">${labels[d]}</div>
      </div>`;
    }).join('');
    el.innerHTML = cells;
  }

  // ── Nodes table ───────────────────────────────────────────────────────
  function renderNodes(nodes, patterns, el) {
    const pmap = {};
    (patterns||[]).forEach(p=>{ pmap[p.id]=p; });
    const rows = Object.entries(nodes).map(([id,n])=>{
      const bw = Math.min(100, (n.f/3)*100).toFixed(0);
      const bc = n.f>2?'var(--cr-t)':n.f>1?'var(--wn-t)':'var(--ok-t)';
      const plinks = (n.patterns||[]).map(pid=>`<a href="/docs/${pid}/" style="color:var(--ac);font-size:.58rem">${pid}</a>`).join(' ');
      return `<tr>
        <td class="mono">${id}</td>
        <td>${n.label}</td>
        <td>${n.C.toFixed(2)}</td><td>${n.E.toFixed(2)}</td>
        <td>${n.L.toFixed(2)}</td><td>${n.M.toFixed(2)}</td>
        <td><span style="color:${bc}">${n.f.toFixed(2)}</span><span class="f-bar" style="width:${bw}px;background:${bc};opacity:.5"></span></td>
        <td><span class="badge badge--${sc(n.status)}">${n.status}</span></td>
        <td style="color:${n.dIHG>0?'var(--ok-t)':'var(--cr-t)'}">${n.dIHG>0?'+':''}${n.dIHG.toFixed(3)}</td>
        <td>${plinks}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `<div class="nodes-wrap"><table class="nodes-tbl">
      <thead><tr>
        <th>Nodo</th><th>Label</th>
        <th>C<sub>i</sub></th><th>E<sub>i</sub></th><th>L<sub>i</sub></th><th>M<sub>i</sub></th>
        <th>f</th><th>Estado</th><th>ΔIHG</th><th>Patrones</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  // ── Interventions ─────────────────────────────────────────────────────
  function renderInterventions(items, el) {
    const rows = items.map(i=>`
      <div class="interv-item">
        <div class="interv-item__r">${i.rank}</div>
        <div class="interv-item__l">${i.label}</div>
        <div class="interv-item__d">+${i.dIHG.toFixed(2)}</div>
        <div class="interv-item__f">${i.feasibility}</div>
      </div>`).join('');
    el.innerHTML = `<div class="interv-list">${rows}</div>`;
  }

  // ── Docs grid ─────────────────────────────────────────────────────────
  function renderDocs(docs, el) {
    if (!el) return;
    const series = docs.series || [];
    const cores = series.filter(d=>d.type==='core');
    const docsList = series.filter(d=>d.type==='doc');
    const nodes = series.filter(d=>d.type==='node');
    const systems = series.filter(d=>d.type==='system');

    function card(d) {
      const vars = (d.mihm||[]).join(', ');
      return `<a class="doc-card doc-card--${d.fc}" href="${d.url}">
        <span class="doc-card__id">${d.id}</span>
        <div class="doc-card__title">${d.title}</div>
        ${d.sub?`<div class="doc-card__sub">${d.sub}</div>`:''}
        ${vars?`<div class="doc-card__vars">${vars}</div>`:''}
        ${d.fc&&d.fc!=='none'&&d.fc!=='system'?`<span class="doc-card__fc badge badge--${d.fc==='critical'?'critical':d.fc==='high'?'warn':''}">${d.fc}</span>`:''}
      </a>`;
    }

    el.innerHTML = `
      <div class="section-rule">nucleo</div>
      <div class="docs-grid">${cores.map(card).join('')}</div>
      <div class="section-rule">serie de patrones · 01–10</div>
      <div class="docs-grid">${docsList.map(card).join('')}</div>
      <div class="section-rule">validacion empirica</div>
      <div class="docs-grid">${nodes.concat(systems).map(d=>{
        return `<a class="doc-card doc-card--${d.type==='system'?'system':d.fc}" href="${d.url}">
          <span class="doc-card__id">${d.id}</span>
          <div class="doc-card__title">${d.title}</div>
          ${d.sub?`<div class="doc-card__sub">${d.sub}</div>`:''}
        </a>`;
      }).join('')}</div>`;
  }

  // ── Audit chain ───────────────────────────────────────────────────────
  function renderAudit(metrics, patterns, docs, el) {
    if (!el) return;
    const pmap = {};
    (patterns||[]).forEach(p=>{ pmap[p.id]=p; });
    const dmap = {};
    (docs.series||[]).forEach(d=>{ dmap[d.id]=d; });

    // Gate checks
    const nodes = metrics.nodes;
    const sys = metrics.system;
    const gates = {
      H1: Object.values(nodes).filter(n=>n.status==='FRACTURE'||n.status==='CRITICAL').length < 3,
      H2: sys.NTI_post >= sys.ucap_nti,
      H3: sys.IHG_post >= sys.ucap_ihg
    };

    const summaryItems = [
      ['IHG', sys.IHG_post.toFixed(3), sys.IHG_post>=sys.ucap_ihg?'ok':'cr'],
      ['NTI', sys.NTI_post.toFixed(3), sys.NTI_post>=sys.ucap_nti?'ok':'cr'],
      ['H1', gates.H1?'PASS':'FAIL', gates.H1?'ok':'cr'],
      ['H2', gates.H2?'PASS':'FAIL', gates.H2?'ok':'cr'],
      ['H3', gates.H3?'PASS':'FAIL', gates.H3?'ok':'cr'],
    ];
    const summary = summaryItems.map(([l,v,c])=>`
      <div class="audit-cell">
        <div class="audit-cell__label">${l}</div>
        <div class="audit-cell__value c-${c}">${v}</div>
      </div>`).join('');

    // Pattern→Variable→Node chain
    const chain = Object.entries(nodes).map(([nid,n])=>{
      const relPats = (n.patterns||[]).map(pid=>{
        const p = pmap[pid];
        const d = dmap[pid];
        return `<div class="audit-chain-row">
          <div class="audit-chain-row__id">${nid}</div>
          <div class="audit-chain-row__label">${d?d.title:pid}</div>
          <div class="audit-chain-row__var">${(p?p.mihm:[]).join(', ')}</div>
          <div class="audit-chain-row__val" style="color:${scolor(n.status)}">${n.status}</div>
          <div class="audit-chain-row__gate">
            <span class="gate-dot ${n.dIHG>0?'gate-pass':n.dIHG>-0.1?'gate-warn':'gate-fail'}"></span>
            ${n.dIHG>0?'+':''}${n.dIHG.toFixed(3)}
          </div>
        </div>`;
      }).join('');
      return relPats;
    }).join('');

    el.innerHTML = `
      <div class="audit-summary">${summary}</div>
      <div class="section-rule" style="margin-top:1.2rem">cadena de trazabilidad · patron → variable → nodo → ΔIHG</div>
      <div style="font-family:var(--fm);font-size:.52rem;color:var(--tx3);margin-bottom:.5rem;display:grid;grid-template-columns:60px 1fr 60px 80px 70px;gap:.5rem;padding:.3rem .7rem">
        <span>Nodo</span><span>Patron</span><span>Variables</span><span>Estado</span><span>ΔIHG</span>
      </div>
      <div class="audit-chain">${chain}</div>`;
  }

  // ── Lab Mode — client-side Monte Carlo ────────────────────────────────
  function initLab(baseMetrics) {
    const el = document.getElementById('sf-lab');
    if (!el) return;

    let seed = baseMetrics.seed || 42;
    let lambda = 0.10;
    let n = 5000;
    let shockMag = 0.3;
    let running = false;

    el.innerHTML = `
      <div class="lab-grid">
        <div class="lab-cell">
          <div class="lab-cell__label">Parametros Monte Carlo</div>
          <div class="lab-input">
            <label>seed <span id="lab-seed-val">${seed}</span>
              <input type="number" id="lab-seed" value="${seed}" min="1" max="9999" style="font-family:var(--fm);font-size:.6rem;background:var(--bg2);border:1px solid var(--bd);color:var(--tx);padding:.2rem .4rem;width:70px;border-radius:var(--r)">
            </label>
          </div>
          <div class="lab-input">
            <label>λ Poisson — shock exogeno <span id="lab-lam-val">${lambda}</span></label>
            <input type="range" class="lab-slider" id="lab-lam" min="0.01" max="0.5" step="0.01" value="${lambda}">
          </div>
          <div class="lab-input">
            <label>Iteraciones <span id="lab-n-val">${n}</span></label>
            <input type="range" class="lab-slider" id="lab-n" min="1000" max="50000" step="1000" value="${n}">
          </div>
          <div class="lab-input">
            <label>Magnitud shock Δ <span id="lab-shock-val">${shockMag}</span></label>
            <input type="range" class="lab-slider" id="lab-shock" min="0.05" max="0.8" step="0.05" value="${shockMag}">
          </div>
          <button class="lab-btn lab-btn--run" id="lab-run">Ejecutar</button>
          <div class="lab-progress" id="lab-progress" style="display:none;margin-top:.5rem">
            <div class="lab-progress-bar"><div class="lab-progress-fill" id="lab-prog-fill" style="width:0%"></div></div>
            <span id="lab-prog-txt">0%</span>
          </div>
        </div>
        <div class="lab-cell">
          <div class="lab-cell__label">Resultado</div>
          <div class="lab-output" id="lab-output">
            <div style="font-family:var(--fm);font-size:.6rem;color:var(--tx3)">Ejecutar para ver resultado</div>
          </div>
        </div>
      </div>`;

    function updateLabels() {
      document.getElementById('lab-seed-val').textContent = document.getElementById('lab-seed').value;
      document.getElementById('lab-lam-val').textContent = parseFloat(document.getElementById('lab-lam').value).toFixed(2);
      document.getElementById('lab-n-val').textContent = parseInt(document.getElementById('lab-n').value).toLocaleString();
      document.getElementById('lab-shock-val').textContent = parseFloat(document.getElementById('lab-shock').value).toFixed(2);
    }
    el.querySelector('#lab-seed').addEventListener('input', updateLabels);
    el.querySelector('#lab-lam').addEventListener('input', updateLabels);
    el.querySelector('#lab-n').addEventListener('input', updateLabels);
    el.querySelector('#lab-shock').addEventListener('input', updateLabels);

    el.querySelector('#lab-run').addEventListener('click', function() {
      if (running) return;
      running = true;
      seed = parseInt(document.getElementById('lab-seed').value);
      lambda = parseFloat(document.getElementById('lab-lam').value);
      n = parseInt(document.getElementById('lab-n').value);
      shockMag = parseFloat(document.getElementById('lab-shock').value);
      runMC(seed, lambda, n, shockMag, baseMetrics);
    });
  }

  function runMC(seed, lambda, n, shockMag, base) {
    const progEl = document.getElementById('lab-progress');
    const fillEl = document.getElementById('lab-prog-fill');
    const txtEl  = document.getElementById('lab-prog-txt');
    const outEl  = document.getElementById('lab-output');
    const runBtn = document.getElementById('lab-run');

    if (progEl) progEl.style.display = 'flex';
    if (runBtn) runBtn.disabled = true;

    // LCG seeded RNG
    let s = seed;
    function rng() {
      s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
      return (s >>> 0) / 0xFFFFFFFF;
    }
    function poisson(lam) {
      const L = Math.exp(-lam);
      let p = 1, k = 0;
      do { k++; p *= rng(); } while (p > L);
      return k - 1;
    }

    const IHG0 = base.system.IHG_post;
    const UCAP = base.system.ucap_ihg;
    const results = [];
    const CHUNK = 500;

    function processChunk(start) {
      for (let i = start; i < Math.min(start + CHUNK, n); i++) {
        let ihg = IHG0;
        for (let t = 0; t < 180; t++) {
          const shocks = poisson(lambda / 180);
          if (shocks > 0) ihg -= shocks * shockMag * (0.5 + rng() * 0.5);
          // natural recovery
          ihg += (rng() * 0.003);
          // NTI corrected
          const nti_t = 0.351 + rng() * 0.1 - 0.05;
          ihg = Math.max(ihg, -1.5);
        }
        results.push(ihg);
      }
      const pct = Math.min(100, ((start + CHUNK) / n * 100)).toFixed(0);
      if (fillEl) fillEl.style.width = pct + '%';
      if (txtEl)  txtEl.textContent = pct + '%';

      if (start + CHUNK < n) {
        setTimeout(() => processChunk(start + CHUNK), 0);
      } else {
        finalize(results, IHG0, UCAP, n, seed, lambda, shockMag);
        if (progEl) progEl.style.display = 'none';
        if (runBtn) { runBtn.disabled = false; }
        window._sfLabRunning = false;
      }
    }
    setTimeout(() => processChunk(0), 10);
  }

  function finalize(results, IHG0, UCAP, n, seed, lambda, shockMag) {
    const outEl = document.getElementById('lab-output');
    if (!outEl) return;
    results.sort((a,b)=>a-b);
    const mean = results.reduce((a,b)=>a+b,0)/results.length;
    const p10 = results[Math.floor(n*0.1)];
    const p25 = results[Math.floor(n*0.25)];
    const p75 = results[Math.floor(n*0.75)];
    const p90 = results[Math.floor(n*0.9)];
    const pCollapse = results.filter(v=>v<UCAP).length/results.length;
    const pFracture = results.filter(v=>v<-0.8).length/results.length;

    const cMean = mean<-0.5?'c-cr':mean<-0.3?'c-wn':'c-ok';
    const mcColor = pCollapse>0.5?'var(--cr-t)':pCollapse>0.25?'var(--wn-t)':'var(--ok-t)';

    outEl.innerHTML = `
      <div style="font-family:var(--fm);font-size:.54rem;color:var(--tx3);margin-bottom:.3rem">seed ${seed} · λ=${lambda} · n=${n.toLocaleString()} · Δ=${shockMag}</div>
      <div class="lab-output__ihg ${cMean}">${mean.toFixed(3)}</div>
      <div style="font-family:var(--fm);font-size:.56rem;color:var(--tx3);margin-bottom:.5rem">IHG medio @180d</div>
      <div class="lab-output__row"><span>P(colapso IHG<${UCAP})</span><span style="color:${mcColor}">${(pCollapse*100).toFixed(1)}%</span></div>
      <div class="lab-output__row"><span>P(fractura IHG<-0.8)</span><span class="c-fr">${(pFracture*100).toFixed(1)}%</span></div>
      <div class="lab-output__row"><span>p10 / p25</span><span class="mono">${p10.toFixed(3)} / ${p25.toFixed(3)}</span></div>
      <div class="lab-output__row"><span>p75 / p90</span><span class="mono">${p75.toFixed(3)} / ${p90.toFixed(3)}</span></div>
      <div class="lab-mc-bars" style="margin-top:.6rem">
        <div style="font-family:var(--fm);font-size:.5rem;color:var(--tx3);margin-bottom:.3rem">Distribucion percentil @180d</div>
        ${[['p10',p10],['p25',p25],['media',mean],['p75',p75],['p90',p90]].map(([l,v])=>{
          const w = Math.max(0, Math.min(100, ((v-(-1.5))/(0.5-(-1.5)))*100)).toFixed(0);
          const c = v<-0.5?'var(--cr-t)':v<-0.3?'var(--wn-t)':'var(--ok-t)';
          return `<div class="lab-mc-row">
            <div class="lab-mc-lbl">${l}</div>
            <div class="lab-mc-bar"><div class="lab-mc-fill" style="width:${w}%;background:${c}"></div></div>
            <div class="lab-mc-val" style="color:${c}">${v.toFixed(3)}</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // ── Main init ─────────────────────────────────────────────────────────
  async function init() {
    // Set loading states
    document.querySelectorAll('[data-sf]').forEach(el => {
      el.innerHTML = '<span class="sf-loading">—</span>';
    });

    let metrics, docs, patterns;
    try {
      [metrics, docs, patterns] = await Promise.all([
        load('/assets/data/ags_metrics.json'),
        load('/assets/data/docs.json'),
        load('/assets/data/patterns.json')
      ]);
    } catch(e) {
      document.querySelectorAll('[data-sf]').forEach(el => {
        el.innerHTML = `<span class="sf-error">Error cargando datos: ${e.message}</span>`;
      });
      return;
    }

    const sys  = metrics.system;
    const pats = patterns.patterns || [];

    // Nav IHG badge
    const navIHG = document.getElementById('sf-nav-ihg');
    if (navIHG) navIHG.textContent = `IHG ${sys.IHG_post.toFixed(3)}`;

    // Render each section
    const map = {
      'sf-headline':     el => renderHeadline(sys, el),
      'sf-toggle-ihg':   el => applyToggle(sys, el),
      'sf-nti':          el => renderNTI(metrics.nti, sys.NTI_post, el),
      'sf-sparkline':    el => renderSparkline(metrics.history, el),
      'sf-scenarios':    el => renderScenarios(metrics.scenarios, el),
      'sf-dims':         el => renderDims(metrics.nodes, el),
      'sf-nodes':        el => renderNodes(metrics.nodes, pats, el),
      'sf-interventions':el => renderInterventions(metrics.interventions, el),
      'sf-docs':         el => renderDocs(docs, el),
      'sf-audit':        el => renderAudit(metrics, pats, docs, el),
    };
    Object.entries(map).forEach(([id,fn]) => {
      const el = document.getElementById(id);
      if (el) fn(el);
    });

    // Toggle NTI handler
    const toggle = document.getElementById('nti-toggle');
    const toggleEl = document.getElementById('sf-toggle-ihg');
    if (toggle && toggleEl) {
      toggle.addEventListener('change', () => {
        _ntiOn = toggle.checked;
        applyToggle(sys, toggleEl);
      });
    }

    // Dims drill
    const dimsBtn = document.getElementById('sf-dims-btn');
    const dimsPanel = document.getElementById('sf-dims');
    if (dimsBtn && dimsPanel) {
      dimsBtn.addEventListener('click', () => {
        const open = dimsPanel.classList.toggle('open');
        dimsBtn.classList.toggle('open', open);
        dimsBtn.querySelector('span:last-child').textContent = open ? 'cerrar' : 'desmembrar dimensiones';
      });
    }

    // Lab
    initLab(metrics);

    // Active nav
    const path = window.location.pathname;
    document.querySelectorAll('.site-bar__nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href !== '/' && path.startsWith(href)) a.classList.add('active');
      if (href === '/' && path === '/') a.classList.add('active');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
