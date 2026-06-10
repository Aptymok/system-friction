import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const scanRoots = [
  path.join(srcRoot, 'components'),
  path.join(srcRoot, 'scorefriction', 'components'),
  path.join(srcRoot, 'observatory', 'components'),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

function allSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return allSourceFiles(full);
    return entry.isFile() && /\.(ts|tsx|js|jsx|mdx)$/.test(entry.name) ? [full] : [];
  });
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

const componentFiles = scanRoots.flatMap(walk);
const sourceFiles = allSourceFiles(srcRoot);
const sourceText = new Map(sourceFiles.map((file) => [file, fs.readFileSync(file, 'utf8')]));

function aliasesFor(file) {
  const relative = rel(file);
  const withoutExt = relative.replace(/\.tsx$/, '');
  const fromSrc = withoutExt.replace(/^src\//, '@/');
  const basename = path.basename(file, '.tsx');
  return [relative, withoutExt, fromSrc, basename];
}

function importersFor(file) {
  const aliases = aliasesFor(file);
  return sourceFiles.filter((candidate) => {
    if (candidate === file) return false;
    const text = sourceText.get(candidate) ?? '';
    return aliases.some((alias) => text.includes(alias));
  });
}

const rows = componentFiles.map((file) => {
  const importers = importersFor(file);
  return {
    file: rel(file),
    importers: importers.map(rel),
    status: importers.length ? 'REFERENCED' : 'UNREFERENCED',
  };
}).sort((a, b) => a.file.localeCompare(b.file));

const reportLines = [
  '# Dead Surfaces Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'This report is advisory. It does not delete files automatically.',
  '',
  '| Status | Component | Importers |',
  '|---|---|---|',
  ...rows.map((row) => `| ${row.status} | \`${row.file}\` | ${row.importers.length ? row.importers.map((item) => `\`${item}\``).join('<br>') : 'none'} |`),
  '',
];

const reportPath = path.join(root, 'docs', 'audit', 'DEAD_SURFACES_REPORT.md');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, reportLines.join('\n'));

const unreferenced = rows.filter((row) => row.status === 'UNREFERENCED').length;
console.log(`Wrote ${rel(reportPath)} with ${rows.length} components; ${unreferenced} unreferenced.`);
