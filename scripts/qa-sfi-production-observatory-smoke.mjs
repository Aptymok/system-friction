import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ORIGIN = 'https://www.systemfriction.org';
const TARGET = (process.env.SFI_PRODUCTION_SMOKE_TARGET || ORIGIN).replace(/\/$/, '');
const OUT = '.sfi-assurance/production-observatory-smoke.json';
const API = ['/api/observatory/world', '/api/observatory/state', '/api/observatory/timeline'];
const VALID = new Set(['LOADING', 'AVAILABLE', 'DEGRADED', 'UNAVAILABLE', 'ERROR']);
const HTTP_MS = 12000;
const WINDOW_MS = 28000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = () => new Date().toISOString();
const rec = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
const numeric = (value) => /^-?(?:\d+|\d*\.\d+)$/.test(String(value || '').trim());
const strip = (value) => String(value || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

function gate(status, details = {}) { return { status, ...details }; }
function warnings(payload) {
  return [
    ...(Array.isArray(payload?.warnings) ? payload.warnings : []),
    ...(Array.isArray(rec(payload?.data)?.warnings) ? rec(payload.data).warnings : []),
  ].filter(Boolean);
}

function classify(domain, observation) {
  if (observation.error) return 'ERROR';
  if ([204, 404, 410].includes(observation.status)) return 'UNAVAILABLE';
  if (!(observation.status >= 200 && observation.status < 300)) return observation.status >= 500 ? 'DEGRADED' : 'ERROR';
  const payload = rec(observation.json);
  if (!payload) return 'UNAVAILABLE';
  if (payload.ok === false || warnings(payload).length || payload.ok !== true) return 'DEGRADED';
  if (domain === 'WORLD') {
    return Array.isArray(payload.nodes) && Array.isArray(payload.hypotheses) && Array.isArray(payload.sourceSummary)
      && Array.isArray(payload.warnings) && rec(payload.filters) && rec(payload.graph) ? 'AVAILABLE' : 'DEGRADED';
  }
  if (domain === 'STATE') return rec(payload.data) ? 'AVAILABLE' : 'DEGRADED';
  return Array.isArray(payload.frames) ? 'AVAILABLE' : 'DEGRADED';
}

async function get(url, json = false) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_MS);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'user-agent': 'SFI-08-production-assurance/1.0',
        accept: json ? 'application/json' : 'text/html',
      },
    });
    const text = await response.text();
    let data = null;
    let jsonError = null;
    if (json) {
      try { data = JSON.parse(text); } catch (error) { jsonError = String(error); }
    }
    return {
      url,
      finalUrl: response.url,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - started,
      bytes: Buffer.byteLength(text),
      text,
      json: data,
      jsonError,
      error: null,
    };
  } catch (error) {
    return {
      url,
      finalUrl: null,
      status: 0,
      ok: false,
      durationMs: Date.now() - started,
      bytes: 0,
      text: '',
      json: null,
      jsonError: null,
      error: String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function ssr(html) {
  const attr = (name) => html.match(new RegExp(`${name}="([^"]+)"`))?.[1] || null;
  const metrics = [...html.matchAll(/<dd[^>]*data-availability="([^"]+)"[^>]*>([\s\S]*?)<\/dd>/g)]
    .slice(0, 4)
    .map((match) => ({ availability: match[1], text: strip(match[2]) }));
  const availability = {
    world: attr('data-world-availability'),
    state: attr('data-state-availability'),
    timeline: attr('data-timeline-availability'),
  };
  return {
    main: /<main[^>]*class="[^"]*obsShell/.test(html),
    availability,
    metrics,
    complete: metrics.length === 4 && Object.values(availability).every((value) => VALID.has(value)),
    falseZero: metrics.filter((metric) => metric.availability !== 'AVAILABLE' && numeric(metric.text)),
  };
}

function expected(world) {
  const payload = rec(world);
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.hypotheses)) return null;
  const cutoff = Date.now() - 168 * 3600000;
  const nodes = payload.nodes.filter((node) => {
    const observed = Date.parse(String(node?.fetchedAt || node?.observedAt || ''));
    return Number.isFinite(observed) && observed >= cutoff;
  });
  const hypotheses = payload.hypotheses.filter((hypothesis) => rec(hypothesis));
  return [
    nodes.length,
    new Set(nodes.map((node) => String(node.sourceId || 'unknown'))).size,
    hypotheses.length,
    hypotheses.filter((hypothesis) => ['OPEN', 'AWAITING_OUTCOME'].includes(String(hypothesis.status))).length,
  ];
}

function summary(domain, payload) {
  const value = rec(payload);
  if (!value) return { object: false };
  if (domain === 'WORLD') {
    return {
      ok: value.ok === true,
      nodes: Array.isArray(value.nodes) ? value.nodes.length : null,
      hypotheses: Array.isArray(value.hypotheses) ? value.hypotheses.length : null,
      sources: Array.isArray(value.sourceSummary) ? value.sourceSummary.length : null,
      warnings: Array.isArray(value.warnings) ? value.warnings.length : null,
    };
  }
  if (domain === 'STATE') return { ok: value.ok === true, hasData: !!rec(value.data), warnings: warnings(value).length };
  return { ok: value.ok === true, frames: Array.isArray(value.frames) ? value.frames.length : null, warnings: warnings(value).length };
}

function chrome() {
  for (const candidate of [process.env.CHROME_PATH, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const probe = spawnSync('bash', ['-lc', `command -v ${JSON.stringify(candidate)}`], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.trim()) return probe.stdout.trim();
  }
  return null;
}

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 1;
    this.pending = new Map();
    this.events = [];
  }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('cdp_connect_timeout')), 5000);
      this.ws.onopen = () => { clearTimeout(timer); resolve(); };
      this.ws.onerror = () => { clearTimeout(timer); reject(Error('cdp_connect_error')); };
    });
    this.ws.onmessage = (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result || {});
      } else if (message.method) {
        this.events.push(message);
      }
    };
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(Error(`cdp_timeout:${method}`));
      }, 8000);
    });
  }
  close() { try { this.ws?.close(); } catch {} }
}

async function browserTarget(port, devToolsActiveLines) {
  let browserWs = null;
  const browserPath = devToolsActiveLines[1]?.trim();
  if (browserPath) browserWs = `ws://127.0.0.1:${port}${browserPath}`;
  if (!browserWs) {
    try {
      const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      browserWs = version.webSocketDebuggerUrl || null;
    } catch {}
  }
  if (!browserWs) return { ws: null, reason: 'browser_websocket_unavailable' };

  const browser = new CDP(browserWs);
  try {
    await browser.open();
    const targets = await browser.send('Target.getTargets');
    let targetId = targets.targetInfos?.find((target) => target.type === 'page')?.targetId || null;
    if (!targetId) {
      const created = await browser.send('Target.createTarget', { url: 'about:blank' });
      targetId = created.targetId || null;
    }
    if (!targetId) return { ws: null, reason: 'page_target_id_unavailable' };

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find((target) => target.id === targetId && target.type === 'page')
          || list.find((target) => target.type === 'page');
        if (page?.webSocketDebuggerUrl) return { ws: page.webSocketDebuggerUrl, targetId };
      } catch {}
      await sleep(100);
    }
    return { ws: null, reason: 'page_target_websocket_unavailable', targetId };
  } finally {
    browser.close();
  }
}

async function browserSmoke(url) {
  const binary = chrome();
  if (!binary) return { status: 'NOT_OBSERVED', reason: 'chrome_not_available' };

  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfi-smoke-'));
  const proc = spawn(binary, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--remote-debugging-port=0',
    `--user-data-dir=${dir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  proc.stderr.on('data', (data) => { stderr = (stderr + String(data)).slice(-4000); });

  try {
    let port = null;
    let activeLines = [];
    for (let attempt = 0; attempt < 40 && !port; attempt += 1) {
      await sleep(200);
      try {
        activeLines = (await readFile(path.join(dir, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/).filter(Boolean);
        port = Number(activeLines[0]) || null;
      } catch {}
    }
    if (!port) return { status: 'NOT_OBSERVED', reason: 'devtools_port_unavailable', stderr };

    const target = await browserTarget(port, activeLines);
    if (!target.ws) return { status: 'NOT_OBSERVED', reason: target.reason || 'cdp_target_unavailable', stderr };

    const cdp = new CDP(target.ws);
    await cdp.open();
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url });

    const samples = [];
    const snap = async (label) => {
      const result = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(()=>{const m=document.querySelector('main.obsShell'),i=document.querySelector('.obsInterpretiveFlow'),q=[...document.querySelectorAll('dd[data-availability]')].slice(0,4).map(e=>({availability:e.getAttribute('data-availability'),text:(e.textContent||'').trim()})),h=document.querySelector('.obsInterpretiveHero h3');return{url:location.href,world:m?.getAttribute('data-world-availability')||null,state:m?.getAttribute('data-state-availability')||null,timeline:m?.getAttribute('data-timeline-availability')||null,metrics:q,interpretive:i?.getAttribute('data-world-availability')||null,hero:(h?.textContent||'').trim()}})()`,
      });
      samples.push({ label, at: iso(), ...result.result?.value });
    };

    for (const [label, delay] of [['250ms', 250], ['1s', 750], ['2.5s', 1500], ['5s', 2500], ['10s', 5000], ['20s', 10000], ['27s', 7000]]) {
      await sleep(delay);
      await snap(label);
    }

    const zeroFilter = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(()=>{const input=[...document.querySelectorAll('input')].find(e=>/buscar señal|search signal/i.test(e.getAttribute('placeholder')||''));if(!input)return{applied:false,reason:'search_filter_not_found'};const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;if(!setter)return{applied:false,reason:'native_value_setter_unavailable'};setter.call(input,'__SFI_ASSURANCE_ZERO_FILTER__');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return{applied:true}})()`,
    });
    await sleep(350);
    await snap('zero-filter');

    const requestMap = new Map();
    const requests = [];
    for (const event of cdp.events) {
      if (event.method === 'Network.requestWillBeSent' && API.some((route) => event.params.request.url.includes(route))) {
        requestMap.set(event.params.requestId, {
          id: event.params.requestId,
          url: event.params.request.url,
          started: event.params.timestamp,
          status: null,
          durationMs: null,
          failed: false,
        });
      }
      if (event.method === 'Network.responseReceived' && requestMap.has(event.params.requestId)) {
        requestMap.get(event.params.requestId).status = event.params.response.status;
      }
      if (event.method === 'Network.loadingFinished' && requestMap.has(event.params.requestId)) {
        const request = requestMap.get(event.params.requestId);
        request.durationMs = Math.round((event.params.timestamp - request.started) * 1000);
        requests.push(request);
        requestMap.delete(event.params.requestId);
      }
      if (event.method === 'Network.loadingFailed' && requestMap.has(event.params.requestId)) {
        const request = requestMap.get(event.params.requestId);
        request.failed = true;
        request.errorText = event.params.errorText;
        requests.push(request);
        requestMap.delete(event.params.requestId);
      }
    }

    cdp.close();
    return { status: 'PASS', samples, requests, zeroFilter: zeroFilter.result?.value || null, stderr };
  } catch (error) {
    return { status: 'NOT_OBSERVED', reason: String(error), stderr };
  } finally {
    proc.kill('SIGTERM');
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function analyze(browser, expectedMetrics) {
  if (browser.status !== 'PASS') return gate('NOT_OBSERVED', { reason: browser.reason });

  const all = browser.samples.filter((sample) => sample.url?.startsWith(`${TARGET}/observatory`));
  const mounted = all.filter((sample) => [sample.world, sample.state, sample.timeline, sample.interpretive].every((value) => VALID.has(value)));
  if (!mounted.length) return gate('NOT_OBSERVED', { reason: 'mounted_dom_not_observed', preMountSamples: all });

  for (const sample of mounted) {
    const bad = sample.metrics.filter((metric) => metric.availability !== 'AVAILABLE' && numeric(metric.text));
    if (bad.length) return gate('FAIL', { reason: 'hydrated_false_zero', sample, bad });
    if (/There is not yet a governed hypothesis for this field\.|Todavía no existe una hipótesis gobernada para este campo\./.test(sample.hero) && sample.world !== 'AVAILABLE') {
      return gate('FAIL', { reason: 'absence_claim_outside_available', sample });
    }
  }

  const counts = Object.fromEntries(API.map((route) => [route, browser.requests.filter((request) => request.url.includes(route)).length]));
  if (Object.values(counts).some((count) => count < 1 || count > 2)) return gate('FAIL', { reason: 'request_count_out_of_bounds', counts, requests: browser.requests });

  const unexpected = browser.requests.filter((request) => !API.some((route) => request.url.includes(route)));
  if (unexpected.length) return gate('FAIL', { reason: 'unexpected_observatory_read', unexpected });

  for (const route of API) {
    const requests = browser.requests.filter((request) => request.url.includes(route)).sort((left, right) => left.started - right.started);
    if (requests.length > 1 && ((requests[1].started - requests[0].started) * 1000) < 18000) {
      return gate('FAIL', { reason: 'retry_or_duplicate_amplification', path: route, requests });
    }
  }

  const badNetwork = browser.requests.filter((request) => request.failed || (Number(request.status) || 0) >= 500);
  if (badNetwork.length) return gate('FAIL', { reason: '5xx_or_network_failure', badNetwork });
  const slow = browser.requests.filter((request) => request.durationMs > 16000);
  if (slow.length) return gate('FAIL', { reason: 'unbounded_request', slow });

  const naturalSamples = mounted.filter((sample) => sample.label !== 'zero-filter');
  const last = naturalSamples.at(-1);
  if (!last) return gate('NOT_OBSERVED', { reason: 'natural_hydrated_sample_not_observed' });

  let metricComparison = null;
  if (last.world === 'AVAILABLE' && expectedMetrics) {
    const actual = last.metrics.map((metric) => metric.text);
    const expected = expectedMetrics.map(String);
    metricComparison = { expected, actual };
    if (actual.length !== 4 || actual.some((value, index) => value !== expected[index])) {
      return gate('FAIL', { reason: 'available_metric_mismatch', metricComparison, last });
    }
  }

  const zeroSample = mounted.find((sample) => sample.label === 'zero-filter') || null;
  const actualZero = Boolean(
    browser.zeroFilter?.applied
    && zeroSample
    && zeroSample.world === 'AVAILABLE'
    && zeroSample.metrics.length === 4
    && zeroSample.metrics.every((metric) => metric.availability === 'AVAILABLE' && metric.text === '0')
  );

  return gate('PASS', {
    finalAvailability: { world: last.world, state: last.state, timeline: last.timeline },
    samples: mounted,
    requestCounts: counts,
    requests: browser.requests,
    metricComparison,
    actualZero,
    zeroFilter: browser.zeroFilter || null,
    zeroFilterSample: zeroSample,
    absenceClaim: /governed hypothesis for this field|hipótesis gobernada para este campo/.test(last.hero),
  });
}

async function main() {
  await mkdir('.sfi-assurance', { recursive: true });
  const report = {
    contract: 'SFI-PRODUCTION-OBSERVATORY-SMOKE-1.0',
    startedAt: iso(),
    completedAt: null,
    target: TARGET,
    relatedDeployment: {
      runId: process.env.SFI_RELATED_DEPLOYMENT_RUN || 'UNKNOWN',
      headSha: process.env.SFI_RELATED_DEPLOYMENT_SHA || 'UNKNOWN',
      runUrl: process.env.SFI_RELATED_DEPLOYMENT_URL || 'UNKNOWN',
    },
    bounds: { httpTimeoutMs: HTTP_MS, browserWindowMs: WINDOW_MS, retriesByHarness: 0, expectedProductPollMs: 20000 },
    surfaces: {},
    gates: {},
    productionReturn: 'NOT_OBSERVED',
  };

  report.gates.canonicalTarget = TARGET === ORIGIN ? gate('PASS') : gate('FAIL', { reason: 'noncanonical_target' });

  const root = await get(`${TARGET}/`);
  report.surfaces.root = { url: root.url, finalUrl: root.finalUrl, status: root.status, durationMs: root.durationMs, bytes: root.bytes, error: root.error };
  report.gates.domain = root.error
    ? gate('NOT_OBSERVED', { reason: root.error })
    : root.status < 400 && root.finalUrl?.startsWith(TARGET)
      ? gate('PASS')
      : gate('FAIL', { status: root.status, finalUrl: root.finalUrl });

  const page = await get(`${TARGET}/observatory`);
  const initial = ssr(page.text);
  report.surfaces.observatory = { url: page.url, finalUrl: page.finalUrl, status: page.status, durationMs: page.durationMs, bytes: page.bytes, error: page.error, ssr: initial };
  report.gates.ssr = page.error
    ? gate('NOT_OBSERVED', { reason: page.error })
    : page.status !== 200
      ? gate('FAIL', { status: page.status })
      : !initial.main
        ? gate('NOT_OBSERVED', { reason: 'ssr_marker_absent' })
        : !initial.complete
          ? gate('FAIL', { reason: 'ssr_contract_incomplete', initial })
          : initial.falseZero.length
            ? gate('FAIL', { reason: 'ssr_false_zero', offenders: initial.falseZero })
            : Object.values(initial.availability).some((value) => value !== 'LOADING')
              ? gate('FAIL', { reason: 'ssr_not_loading', availability: initial.availability })
              : gate('PASS', { availability: initial.availability, metrics: initial.metrics });

  const observations = await Promise.all(API.map((route) => get(`${TARGET}${route}`, true)));
  const domains = ['WORLD', 'STATE', 'TIMELINE'];
  report.surfaces.apis = {};
  let blocked = false;
  let hardFailure = false;
  observations.forEach((observation, index) => {
    const availability = classify(domains[index], observation);
    report.surfaces.apis[API[index]] = {
      url: observation.url,
      finalUrl: observation.finalUrl,
      status: observation.status,
      durationMs: observation.durationMs,
      bytes: observation.bytes,
      jsonError: observation.jsonError,
      error: observation.error,
      availability,
      shape: summary(domains[index], observation.json),
    };
    blocked ||= !!observation.error;
    hardFailure ||= !!observation.jsonError || observation.status >= 500;
  });
  report.gates.apis = blocked
    ? gate('NOT_OBSERVED', { reason: 'one_or_more_api_reads_unobservable' })
    : hardFailure
      ? gate('FAIL', { reason: 'malformed_or_5xx_authoritative_read', states: Object.fromEntries(API.map((route) => [route, report.surfaces.apis[route].availability])) })
      : gate('PASS', {
          states: Object.fromEntries(API.map((route) => [route, report.surfaces.apis[route].availability])),
          naturalNegativeStates: API.filter((route) => report.surfaces.apis[route].availability !== 'AVAILABLE'),
        });

  const expectedMetrics = report.surfaces.apis[API[0]].availability === 'AVAILABLE' ? expected(observations[0].json) : null;
  const browser = await browserSmoke(`${TARGET}/observatory`);
  const browserGate = analyze(browser, expectedMetrics);
  report.surfaces.browser = { status: browser.status, reason: browser.reason || null, chromeStderrTail: (browser.stderr || '').slice(-1000) };
  report.gates.browser = browserGate;
  report.gates.falseZero = report.gates.ssr.status === 'PASS' && browserGate.status === 'PASS'
    ? gate('PASS')
    : gate(report.gates.ssr.status !== 'PASS' ? report.gates.ssr.status : browserGate.status, { reason: 'dependency_gate' });
  report.gates.actualZero = browserGate.status === 'PASS'
    ? browserGate.actualZero
      ? gate('PASS', { mode: 'authoritative_empty_filter', sample: browserGate.zeroFilterSample })
      : gate('NOT_OBSERVED', { reason: 'authoritative_empty_filter_zero_not_observed', filter: browserGate.zeroFilter })
    : gate(browserGate.status, { reason: 'browser_gate' });
  report.gates.hypothesisAbsence = browserGate.status === 'PASS'
    ? gate('PASS', { absenceClaim: !!browserGate.absenceClaim, world: browserGate.finalAvailability.world })
    : gate(browserGate.status);
  report.gates.readPlane = browserGate.status === 'PASS'
    ? gate('PASS', { requestCounts: browserGate.requestCounts, finiteTimeout: true, retriesByHarness: 0 })
    : gate(browserGate.status);

  const required = ['canonicalTarget', 'domain', 'ssr', 'apis', 'browser', 'falseZero', 'actualZero', 'hypothesisAbsence', 'readPlane'].map((key) => report.gates[key]);
  report.productionReturn = required.some((item) => item.status === 'FAIL')
    ? 'FAIL'
    : required.some((item) => item.status === 'NOT_OBSERVED')
      ? 'NOT_OBSERVED'
      : 'PASS';

  report.completedAt = iso();
  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    contract: report.contract,
    target: report.target,
    relatedDeployment: report.relatedDeployment,
    productionReturn: report.productionReturn,
    gates: Object.fromEntries(Object.entries(report.gates).map(([key, value]) => [key, value.status])),
    artifact: OUT,
  }, null, 2));
  process.exit(report.productionReturn === 'PASS' ? 0 : report.productionReturn === 'NOT_OBSERVED' ? 2 : 1);
}

main().catch(async (error) => {
  await mkdir('.sfi-assurance', { recursive: true });
  const report = { contract: 'SFI-PRODUCTION-OBSERVATORY-SMOKE-1.0', completedAt: iso(), target: TARGET, productionReturn: 'NOT_OBSERVED', fatal: String(error) };
  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`).catch(() => {});
  console.error(error);
  process.exit(2);
});
