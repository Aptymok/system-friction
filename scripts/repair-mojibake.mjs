import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.css', '.sql', '.mjs']);
const IGNORED_DIRS = new Set(['.git', '.next', 'node_modules', 'out', 'dist', 'build', 'coverage', '_sfi_cleanroom', '_sfi_exports']);
const BACKUP_PATTERN = /(\.bak|backup|~$|\.orig$|\.rej$|\.tmp$)/i;

const replacementMap = {
  '\u00c3\u00a1': '\u00e1',
  '\u00c3\u00a9': '\u00e9',
  '\u00c3\u00ad': '\u00ed',
  '\u00c3\u00b3': '\u00f3',
  '\u00c3\u00ba': '\u00fa',
  '\u00c3\u00bc': '\u00fc',
  '\u00c3\u00b1': '\u00f1',
  '\u00c3\u0081': '\u00c1',
  '\u00c3\u0089': '\u00c9',
  '\u00c3\u008d': '\u00cd',
  '\u00c3\u0093': '\u00d3',
  '\u00c3\u009a': '\u00da',
  '\u00c3\u0091': '\u00d1',
  '\u00c2\u00b7': '\u00b7',
  '\u00c2\u00bf': '\u00bf',
  '\u00c2\u00a1': '\u00a1',
  '\u00c3\u201a\u00c2\u00b7': '\u00b7',
  '\u00c3\u201a\u00c2\u00bf': '\u00bf',
  '\u00c3\u201a\u00c2\u00a1': '\u00a1',
  '\u00c3\u201a\u00b7': '\u00b7',
  '\u00c3\u201a\u00bf': '\u00bf',
  '\u00c3\u201a\u00a1': '\u00a1',
  '\u00c3\u0192\u00c2\u00a1': '\u00e1',
  '\u00c3\u0192\u00c2\u00a9': '\u00e9',
  '\u00c3\u0192\u00c2\u00ad': '\u00ed',
  '\u00c3\u0192\u00c2\u00b3': '\u00f3',
  '\u00c3\u0192\u00c2\u00ba': '\u00fa',
  '\u00c3\u0192\u00c2\u00bc': '\u00fc',
  '\u00c3\u0192\u00c2\u00b1': '\u00f1',
  '\u00e2\u20ac\u201d': '\u2014',
  '\u00e2\u20ac\u201c': '\u2013',
  '\u00e2\u20ac\u0153': '\u201c',
  '\u00e2\u20ac\u009d': '\u201d',
  '\u00e2\u20ac\u02dc': '\u2018',
  '\u00e2\u20ac\u2122': '\u2019',
  '\u00e2\u20ac\u00a6': '\u2026',
  '\u00e2\u2020\u2019': '\u2192',
  '\u00e2\u2020\u00bb': '\u21bb',
  '\u00e2\u2014\u2021': '\u25c7',
  '\u00e2\u2014\u2020': '\u25c6',
  '\u00e2\u2014\u017d': '\u25ce',
  '\u00e2\u2013\u00a1': '\u25a1',
  '\u00e2\u2020\u201d': '\u2194',
};

const suspiciousPattern = /[\u00c2\u00c3][^\s"'`<>(){}[\],;:]?|[\u00e2][^\s"'`<>(){}[\],;:]{1,2}/g;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...await collectFiles(path.join(directory, entry.name)));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!TARGET_EXTENSIONS.has(path.extname(entry.name))) continue;
    if (BACKUP_PATTERN.test(entry.name)) continue;
    files.push(path.join(directory, entry.name));
  }

  return files;
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function repairText(input) {
  let output = input.startsWith('\uFEFF') ? input.slice(1) : input;
  for (const [bad, good] of Object.entries(replacementMap)) {
    output = output.split(bad).join(good);
  }
  return output;
}

const files = await collectFiles(ROOT);
const matchedFiles = [];
const changedFiles = [];
const remainingMatches = [];

for (const file of files) {
  const buffer = await readFile(file);
  if (isBinary(buffer)) continue;

  const text = buffer.toString('utf8');
  suspiciousPattern.lastIndex = 0;
  if (suspiciousPattern.test(text)) matchedFiles.push(relative(file));

  const repaired = repairText(text);
  if (repaired !== text) {
    await writeFile(file, repaired, 'utf8');
    changedFiles.push(relative(file));
  }

  suspiciousPattern.lastIndex = 0;
  const matches = [...repaired.matchAll(suspiciousPattern)].map((match) => match[0]);
  if (matches.length > 0) {
    remainingMatches.push({ file: relative(file), matches: [...new Set(matches)].slice(0, 12) });
  }
}

console.log(`Scanned files: ${files.length}`);
console.log(`Files containing mojibake: ${matchedFiles.length}`);
for (const file of matchedFiles) console.log(`- ${file}`);
console.log(`Changed files: ${changedFiles.length}`);
for (const file of changedFiles) console.log(`- ${file}`);

if (remainingMatches.length > 0) {
  console.log('Remaining suspicious matches:');
  for (const item of remainingMatches) {
    console.log(`- ${item.file}: ${item.matches.join(', ')}`);
  }
} else {
  console.log('Remaining suspicious matches: 0');
}
