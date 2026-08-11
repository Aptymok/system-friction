#!/usr/bin/env node
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { experimentManifest } from './lib/manifest.mjs';

const host = process.env.SFI_CL_HOST || '127.0.0.1';
const port = Number(process.env.SFI_CL_PORT || 4316);
const runsDir = path.resolve(process.env.SFI_CL_RUNS_DIR || '.sfi-cl/runs');
const jobs = new Map();

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body, null, 2)); };
async function latestRun() {
  try { const names = await readdir(runsDir); return names.sort().at(-1) || null; } catch { return null; }
}
async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method === 'GET' && url.pathname === '/v1/health') return json(res, 200, { ok: true, service: 'SFI_CL', jobs: [...jobs.entries()].map(([id, j]) => ({ id, status: j.status })) });
    if (req.method === 'GET' && url.pathname === '/v1/manifest') return json(res, 200, experimentManifest());
    if (req.method === 'GET' && url.pathname === '/v1/runs/latest') {
      const id = await latestRun(); if (!id) return json(res, 404, { ok: false, error: 'NO_RUNS' });
      const board = await readJson(path.join(runsDir, id, 'leaderboard.final.json')).catch(() => null);
      return json(res, 200, { ok: true, runId: id, leaderboard: board, job: jobs.get(id) || null });
    }
    if (req.method === 'POST' && url.pathname === '/v1/runs') {
      let body = ''; for await (const chunk of req) body += chunk;
      const cfg = body ? JSON.parse(body) : {};
      const id = `api-${Date.now()}`;
      const args = [path.join(import.meta.dirname, 'runner.mjs'), '--run-id', id, '--profile', cfg.profile || 'quick', '--track', cfg.track || 'A'];
      if (cfg.engines) args.push('--engines', String(cfg.engines));
      if (cfg.constitutions) args.push('--constitutions', String(cfg.constitutions));
      if (cfg.problems) args.push('--problems', String(cfg.problems));
      if (cfg.congress) args.push('--congress');
      const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
      const job = { status: 'RUNNING', pid: child.pid, startedAt: new Date().toISOString(), stdout: '', stderr: '' }; jobs.set(id, job);
      child.stdout.on('data', (d) => { job.stdout = (job.stdout + d.toString()).slice(-8000); });
      child.stderr.on('data', (d) => { job.stderr = (job.stderr + d.toString()).slice(-8000); });
      child.on('exit', (code) => { job.status = code === 0 ? 'COMPLETED' : 'FAILED'; job.exitCode = code; job.finishedAt = new Date().toISOString(); });
      return json(res, 202, { ok: true, runId: id, status: job.status });
    }
    return json(res, 404, { ok: false, error: 'NOT_FOUND' });
  } catch (error) { return json(res, 500, { ok: false, error: String(error?.message || error) }); }
});
server.listen(port, host, () => console.log(JSON.stringify({ ok: true, service: 'SFI_CL', url: `http://${host}:${port}` })));
