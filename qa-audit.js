// qa-audit.js
const fs = require('fs');
const path = require('path');

// Configuración
const SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_FILE = path.join(__dirname, 'QA_REPORT.txt');

// Extensiones a escanear
const EXTENSIONS = ['.ts', '.tsx'];

// Palabras clave para detectar "incompleto"
const INCOMPLETE_PATTERNS = [
  /\/\/\s*TODO/i,
  /\/\/\s*FIXME/i,
  /\/\/\s*XXX/i,
  /throw\s+new\s+Error\s*\(\s*['"`][^'"`]*not\s+implemented/i,
  /throw\s+new\s+Error\s*\(\s*['"`][^'"`]*stub/i,
  /return\s*\{\s*\}/,
  /return\s+null\s*;?\s*\/\/\s*todo/i,
];

// Patrones de pipelines
const PIPELINE_PATTERNS = [
  /(export\s+)?(async\s+)?function\s+(\w*[Pp]ipeline\w*)\s*\(/,
  /(export\s+)?(const|let|var)\s+(\w*[Pp]ipeline\w*)\s*=\s*(async\s+)?function\s*\(/,
  /(export\s+)?(const|let|var)\s+(\w*[Pp]ipeline\w*)\s*=\s*\(/,
  /(export\s+)?class\s+(\w*[Pp]ipeline\w*)\s*/,
  /run\w*[Pp]ipeline/,
];

// ──────────────────────────────────────────────
// 1. RECORRIDO RECURSIVO DE ARCHIVOS
// ──────────────────────────────────────────────
function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// ──────────────────────────────────────────────
// 2. LECTURA Y ANÁLISIS DE ARCHIVOS
// ──────────────────────────────────────────────
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(SRC_DIR, filePath);

  const result = {
    path: relPath,
    lines: lines.length,
    exports: [],
    imports: [],
    hasPipeline: false,
    pipelineNames: [],
    incompleteLines: [],
    hasCatch: false,
    isApiRoute: relPath.includes('app/api/') && filePath.endsWith('route.ts'),
    httpMethods: [],
  };

  // Extraer imports (para dependencias)
  const importMatches = content.match(/^import\s+.*?from\s+['"`][^'"`]+['"`]/gm) || [];
  result.imports = importMatches.map(m => m.trim());

  // Extraer exports
  const exportMatches = content.match(/^export\s+(default\s+)?(const|let|var|function|class|interface|type|async\s+function)/gm) || [];
  result.exports = exportMatches.map(m => m.trim());

  // Buscar pipelines
  for (const pattern of PIPELINE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      result.hasPipeline = true;
      // Capturar nombre de la pipeline
      const nameMatch = match[3] || match[2] || 'unnamed';
      if (nameMatch && nameMatch !== 'unnamed') {
        result.pipelineNames.push(nameMatch);
      }
    }
  }

  // Buscar líneas incompletas (TODO, FIXME, stubs)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of INCOMPLETE_PATTERNS) {
      if (pattern.test(line)) {
        result.incompleteLines.push({ line: i + 1, text: line.trim() });
        break;
      }
    }
  }

  // Detectar catch (manejo de errores)
  result.hasCatch = /catch\s*\(/.test(content);

  // Detectar métodos HTTP en rutas API
  if (result.isApiRoute) {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    for (const method of methods) {
      if (new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\s*\\(`).test(content)) {
        result.httpMethods.push(method);
      }
    }
  }

  return result;
}

// ──────────────────────────────────────────────
// 3. ANÁLISIS GLOBAL
// ──────────────────────────────────────────────
function runAudit() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ No se encuentra el directorio: ${SRC_DIR}`);
    console.error('Ejecuta este script desde la raíz del proyecto.');
    process.exit(1);
  }

  console.log('🔍 Escaneando archivos...');
  const files = getAllFiles(SRC_DIR);
  console.log(`📁 ${files.length} archivos encontrados.\n`);

  const analyzed = files.map(f => analyzeFile(f));

  // ── Estadísticas generales ──
  const totalLines = analyzed.reduce((acc, f) => acc + f.lines, 0);
  const pipelineFiles = analyzed.filter(f => f.hasPipeline);
  const incompleteFiles = analyzed.filter(f => f.incompleteLines.length > 0);
  const apiRoutes = analyzed.filter(f => f.isApiRoute);
  const noCatchFiles = analyzed.filter(f => f.hasPipeline && !f.hasCatch);

  // ── Detectar duplicidad de conceptos (ej. múltiples motores de scoring) ──
  const allExports = analyzed.flatMap(f => f.exports);
  const duplicateExports = {};
  const exportCount = {};
  for (const exp of allExports) {
    // Extraer nombre de la entidad exportada
    const nameMatch = exp.match(/export\s+(?:default\s+)?(?:const|let|var|function|class|async\s+function)\s+(\w+)/);
    if (nameMatch) {
      const name = nameMatch[1];
      exportCount[name] = (exportCount[name] || 0) + 1;
    }
  }
  for (const [name, count] of Object.entries(exportCount)) {
    if (count > 1 && name.length > 3) {
      duplicateExports[name] = count;
    }
  }

  // ── Detectar posibles contradicciones (mismos nombres en diferentes carpetas) ──
  const moduleMap = {};
  for (const f of analyzed) {
    const parts = f.path.split(path.sep);
    if (parts.length >= 2) {
      const firstDir = parts[0];
      const fileName = parts[parts.length - 1];
      if (!moduleMap[fileName]) moduleMap[fileName] = [];
      moduleMap[fileName].push(firstDir);
    }
  }
  const duplicateFiles = Object.entries(moduleMap)
    .filter(([name, dirs]) => dirs.length > 1 && name !== 'index.ts' && !name.startsWith('_'))
    .map(([name, dirs]) => ({ name, dirs }));

  // ── Construir informe ──
  const reportLines = [];
  reportLines.push('='.repeat(80));
  reportLines.push('              SYSTEM FRICTION — QA AUDIT REPORT');
  reportLines.push('='.repeat(80));
  reportLines.push(`Fecha: ${new Date().toISOString()}`);
  reportLines.push(`Archivos escaneados: ${files.length}`);
  reportLines.push(`Líneas totales: ${totalLines}`);
  reportLines.push('\n');

  // ──────────────────────────────────────────────
  // SECCIÓN 1: PIPELINES EXISTENTES
  // ──────────────────────────────────────────────
  reportLines.push('━'.repeat(80));
  reportLines.push('1. PIPELINES ENCONTRADAS');
  reportLines.push('━'.repeat(80));

  if (pipelineFiles.length === 0) {
    reportLines.push('⚠️  No se encontraron pipelines en el código.');
  } else {
    const pipelineNames = pipelineFiles.flatMap(f => f.pipelineNames);
    reportLines.push(`✅ ${pipelineFiles.length} archivos contienen lógica de pipeline.`);
    reportLines.push(`🔹 Nombres detectados: ${pipelineNames.join(', ') || '(sin nombre explícito)'}`);
    reportLines.push('\n📄 Archivos con pipelines:');
    for (const f of pipelineFiles) {
      const names = f.pipelineNames.length ? f.pipelineNames.join(', ') : '(sin nombre)';
      const catchStatus = f.hasCatch ? '✅ con catch' : '⚠️ sin catch (riesgo)';
      reportLines.push(`  - ${f.path} (${names}) → ${catchStatus}`);
    }
  }
  reportLines.push('\n');

  // ──────────────────────────────────────────────
  // SECCIÓN 2: INCOMPLETITUDES (TODO, FIXME, STUBS)
  // ──────────────────────────────────────────────
  reportLines.push('━'.repeat(80));
  reportLines.push('2. CÓDIGO INCOMPLETO / PENDIENTE');
  reportLines.push('━'.repeat(80));

  if (incompleteFiles.length === 0) {
    reportLines.push('✅ No se encontraron marcadores de incompletitud.');
  } else {
    reportLines.push(`⚠️  ${incompleteFiles.length} archivos tienen tareas pendientes o stubs:`);
    for (const f of incompleteFiles) {
      reportLines.push(`\n  📁 ${f.path}`);
      for (const item of f.incompleteLines.slice(0, 5)) {
        reportLines.push(`    L${item.line}: ${item.text}`);
      }
      if (f.incompleteLines.length > 5) {
        reportLines.push(`    ... y ${f.incompleteLines.length - 5} más.`);
      }
    }
  }
  reportLines.push('\n');

  // ──────────────────────────────────────────────
  // SECCIÓN 3: DUPLICIDAD Y CONTRADICCIONES
  // ──────────────────────────────────────────────
  reportLines.push('━'.repeat(80));
  reportLines.push('3. DUPLICIDAD / CONTRADICCIONES POTENCIALES');
  reportLines.push('━'.repeat(80));

  if (Object.keys(duplicateExports).length === 0 && duplicateFiles.length === 0) {
    reportLines.push('✅ No se detectaron duplicidades obvias.');
  } else {
    if (Object.keys(duplicateExports).length > 0) {
      reportLines.push('🔁 Exportaciones duplicadas (mismo nombre en varios archivos):');
      for (const [name, count] of Object.entries(duplicateExports)) {
        reportLines.push(`  - "${name}" aparece ${count} veces.`);
      }
    }
    if (duplicateFiles.length > 0) {
      reportLines.push('\n📁 Archivos con el mismo nombre en distintas carpetas:');
      for (const item of duplicateFiles.slice(0, 10)) {
        reportLines.push(`  - ${item.name} → ${item.dirs.join(', ')}`);
      }
    }
  }
  reportLines.push('\n');

  // ──────────────────────────────────────────────
  // SECCIÓN 4: RUTAS API (endpoints)
  // ──────────────────────────────────────────────
  reportLines.push('━'.repeat(80));
  reportLines.push('4. ENDPOINTS DE API (routes.ts)');
  reportLines.push('━'.repeat(80));

  if (apiRoutes.length === 0) {
    reportLines.push('⚠️  No se encontraron rutas API.');
  } else {
    reportLines.push(`🌐 ${apiRoutes.length} endpoints:`);
    for (const f of apiRoutes) {
      const methods = f.httpMethods.length ? f.httpMethods.join(', ') : 'sin método explícito';
      const inc = f.incompleteLines.length ? `⚠️ ${f.incompleteLines.length} pendientes` : '✅';
      reportLines.push(`  - ${f.path} → [${methods}] ${inc}`);
    }
  }
  reportLines.push('\n');

  // ──────────────────────────────────────────────
  // SECCIÓN 5: PIPELINES SIN MANEJO DE ERRORES
  // ──────────────────────────────────────────────
  reportLines.push('━'.repeat(80));
  reportLines.push('5. PIPELINES CRÍTICAS SIN "catch"');
  reportLines.push('━'.repeat(80));

  if (noCatchFiles.length === 0) {
    reportLines.push('✅ Todas las pipelines tienen manejo de errores (catch).');
  } else {
    reportLines.push(`⚠️  ${noCatchFiles.length} pipelines carecen de bloque catch:`);
    for (const f of noCatchFiles) {
      reportLines.push(`  - ${f.path}`);
    }
    reportLines.push('\n👉 Recomendación: agregar try/catch para evitar fallos silenciosos.');
  }
  reportLines.push('\n');

  // ──────────────────────────────────────────────
  // SECCIÓN 6: SUGERENCIAS DE LIMPIEZA / ELIMINACIÓN
  // ──────────────────────────────────────────────
  reportLines.push('━'.repeat(80));
  reportLines.push('6. SUGERENCIAS DE LIMPIEZA');
  reportLines.push('━'.repeat(80));

  // Archivos sospechosos: muy pequeños o sin exports
  const tinyFiles = analyzed.filter(f => f.lines < 10 && !f.isApiRoute);
  const noExports = analyzed.filter(f => f.exports.length === 0 && f.imports.length > 0 && !f.isApiRoute);

  if (tinyFiles.length > 0) {
    reportLines.push(`🗑️  Archivos muy pequeños (<10 líneas) que podrían ser eliminados o fusionados:`);
    for (const f of tinyFiles.slice(0, 10)) {
      reportLines.push(`  - ${f.path} (${f.lines} líneas)`);
    }
  }
  if (noExports.length > 0) {
    reportLines.push(`\n📭 Archivos que importan pero no exportan nada (posible código muerto):`);
    for (const f of noExports.slice(0, 10)) {
      reportLines.push(`  - ${f.path}`);
    }
  }

  // Archivos con "engine" duplicado (contradicción de conceptos)
  const engineFiles = analyzed.filter(f => f.path.includes('engine') && f.hasPipeline);
  if (engineFiles.length > 1) {
    reportLines.push(`\n⚙️  Múltiples archivos con "engine" que tienen pipelines, posible redundancia:`);
    for (const f of engineFiles) {
      reportLines.push(`  - ${f.path}`);
    }
    reportLines.push('👉 Revisar si se pueden unificar (ej. MetricsEngine vs LongitudinalEngine vs StochasticEngine).');
  }
  reportLines.push('\n');

  // ──────────────────────────────────────────────
  // SECCIÓN 7: RESUMEN EJECUTIVO
  // ──────────────────────────────────────────────
  reportLines.push('━'.repeat(80));
  reportLines.push('7. RESUMEN EJECUTIVO');
  reportLines.push('━'.repeat(80));
  reportLines.push(`✅ Archivos totales: ${files.length}`);
  reportLines.push(`✅ Líneas totales: ${totalLines}`);
  reportLines.push(`⚠️  Pendientes (TODO/FIXME): ${incompleteFiles.length} archivos`);
  reportLines.push(`⚠️  Pipelines sin catch: ${noCatchFiles.length}`);
  reportLines.push(`🔁 Duplicados de exportaciones: ${Object.keys(duplicateExports).length}`);
  reportLines.push(`🗑️  Archivos candidatos a limpieza: ${tinyFiles.length + noExports.length}`);
  reportLines.push('\n👉 Recomendación general:');
  reportLines.push('  1. Completar los TODOs en los archivos listados en la sección 2.');
  reportLines.push('  2. Unificar motores duplicados (sección 3).');
  reportLines.push('  3. Agregar try/catch a las pipelines sin manejo de errores (sección 5).');
  reportLines.push('  4. Revisar archivos muy pequeños o sin exports (sección 6) para eliminar o fusionar.');
  reportLines.push('  5. Verificar que las rutas API (sección 4) estén todas implementadas y documentadas.');

  reportLines.push('\n' + '='.repeat(80));
  reportLines.push('FIN DEL INFORME');
  reportLines.push('='.repeat(80));

  // ──────────────────────────────────────────────
  // ESCRIBIR ARCHIVO
  // ──────────────────────────────────────────────
  const reportContent = reportLines.join('\n');
  fs.writeFileSync(OUTPUT_FILE, reportContent, 'utf8');
  console.log(`✅ Informe generado: ${OUTPUT_FILE}`);
  console.log(`📊 Resumen rápido:`);
  console.log(`   - Pipelines: ${pipelineFiles.length}`);
  console.log(`   - Incompletos: ${incompleteFiles.length}`);
  console.log(`   - APIs: ${apiRoutes.length}`);
  console.log(`   - Duplicados: ${Object.keys(duplicateExports).length}`);
}

// ──────────────────────────────────────────────
// EJECUTAR
// ──────────────────────────────────────────────
try {
  runAudit();
} catch (err) {
  console.error('❌ Error durante la auditoría:', err.message);
  process.exit(1);
}