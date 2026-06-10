import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(path.join(ROOT, 'src'));
const pages = files.filter(f => /src[\\/]+app[\\/].*page\.(tsx|ts)$/.test(f));
const routes = files.filter(f => /src[\\/]+app[\\/]+api[\\/].*route\.(ts|tsx)$/.test(f));
const components = files.filter(f => /src[\\/].*\.(tsx)$/.test(f));
const libs = files.filter(f => /src[\\/]+lib[\\/].*\.(ts|tsx)$/.test(f));

const report = [
  '# Route Audit',
  '',
  '## Pages',
  ...pages.map(f => `- ${path.relative(ROOT, f)}`),
  '',
  '## API Routes',
  ...routes.map(f => `- ${path.relative(ROOT, f)}`),
  '',
  '## Components',
  ...components.map(f => `- ${path.relative(ROOT, f)}`),
  '',
  '## Libs',
  ...libs.map(f => `- ${path.relative(ROOT, f)}`),
  '',
].join('\n');

fs.mkdirSync(path.join(ROOT, 'docs/audit'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audit/ROUTE_AUDIT.md'), report);
console.log('audit written to docs/audit/ROUTE_AUDIT.md');
