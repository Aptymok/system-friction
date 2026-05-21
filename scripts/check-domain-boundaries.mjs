#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['apps', 'services', 'packages', 'experimental'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ignoredDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
  'venv',
  '.venv',
  '__pycache__',
  'site-packages',
]);

const importPattern =
  /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function* walk(directory) {
  if (!fs.existsSync(directory)) return;
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

function includesAny(specifier, fragments) {
  return fragments.some((fragment) => specifier === fragment || specifier.includes(fragment));
}

function packageRelativeForbidden(specifier, names) {
  return names.some((name) => (
    specifier.includes(`packages/${name}`)
    || specifier.includes(`@sfi/${name}`)
    || specifier.includes(`../${name}`)
    || specifier.includes(`../../${name}`)
  ));
}

const rules = [
  {
    name: 'apps/* cannot import data/core/security/services directly',
    applies: (file) => file.startsWith('apps/'),
    violates: (specifier) => (
      packageRelativeForbidden(specifier, ['db', 'mihm-core', 'campo-ob', 'security'])
      || specifier.includes('services/')
      || specifier.startsWith('../services')
      || specifier.startsWith('../../services')
    ),
  },
  {
    name: 'packages/mihm-core must remain pure domain math/types',
    applies: (file) => file.startsWith('packages/mihm-core/'),
    violates: (specifier) => (
      specifier === 'react'
      || specifier.startsWith('react/')
      || specifier === 'next'
      || specifier.startsWith('next/')
      || specifier.includes('@supabase')
      || specifier.includes('supabase')
      || packageRelativeForbidden(specifier, ['db', 'ui'])
      || specifier.includes('services/')
      || specifier.includes('apps/')
      || specifier.startsWith('../services')
      || specifier.startsWith('../../services')
      || specifier.startsWith('../apps')
      || specifier.startsWith('../../apps')
    ),
  },
  {
    name: 'packages/api-contracts cannot import UI, DB, Supabase, Next, or React',
    applies: (file) => file.startsWith('packages/api-contracts/'),
    violates: (specifier) => (
      specifier === 'react'
      || specifier.startsWith('react/')
      || specifier === 'next'
      || specifier.startsWith('next/')
      || specifier.includes('@supabase')
      || specifier.includes('supabase')
      || packageRelativeForbidden(specifier, ['ui', 'db'])
    ),
  },
  {
    name: 'services/agent cannot import packages/db directly',
    applies: (file) => file.startsWith('services/agent/'),
    violates: (specifier) => packageRelativeForbidden(specifier, ['db']),
  },
  {
    name: 'experimental/* cannot import packages/db',
    applies: (file) => file.startsWith('experimental/'),
    violates: (specifier) => packageRelativeForbidden(specifier, ['db']),
  },
  {
    name: 'packages/ui cannot import field truth, DB, or security packages',
    applies: (file) => file.startsWith('packages/ui/'),
    violates: (specifier) => packageRelativeForbidden(specifier, ['mihm-core', 'campo-ob', 'db', 'security']),
  },
];

const violations = [];

for (const scanRoot of scanRoots) {
  if (!fileExists(scanRoot)) continue;
  for (const filePath of walk(path.join(root, scanRoot))) {
    const relativeFile = normalizePath(path.relative(root, filePath));
    const source = fs.readFileSync(filePath, 'utf8');
    const activeRules = rules.filter((rule) => rule.applies(relativeFile));
    if (!activeRules.length) continue;

    importPattern.lastIndex = 0;
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1] || match[2] || match[3];
      if (!specifier) continue;
      for (const rule of activeRules) {
        if (rule.violates(specifier)) {
          violations.push({ file: relativeFile, specifier, rule: rule.name });
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Domain boundary violations detected:\n');
  for (const violation of violations) {
    console.error(`File: ${violation.file}`);
    console.error(`Import: ${violation.specifier}`);
    console.error(`Rule: ${violation.rule}`);
    console.error('');
  }
  process.exit(1);
}

console.log('Domain boundary check passed.');
