const fs = require('fs');
const path = require('path');

// ============================================================
// RUTAS HARDCODEADAS SEGÚN TU ÁRBOL (sin node_modules, .next, etc.)
// ============================================================
const filePaths = [
  // Root
  'next.config.js',
  'package.json',
  'postcss.config.js',
  'tailwind.config.js',
  'tsconfig.json',
  'systemprompt.html',
  'terminal.html',
  'index.html',
  'README.md',

  // Services Python
  'services/python/audio_features.py',
  'services/python/config.py',
  'services/python/lyrics_extract.py',
  'services/python/mihm_extract_full.py',
  'services/python/montecarlo.py',
  'services/python/montecarlo_cli.py',
  'services/python/world_cli.py',
  'services/python/world_spectrum.py',

  // Src root
  'src/proxy.ts',

  // App (auth, public, terminal, api)
  'src/app/(auth)/layout.tsx',
  'src/app/(auth)/forgot/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/(auth)/reset/page.tsx',
  'src/app/(auth)/setup-profile/page.tsx',
  'src/app/(auth)/verify/page.tsx',
  'src/app/(public)/page.tsx',
  'src/app/(public)/start/page.tsx',
  'src/app/(terminal)/layout.tsx',
  'src/app/(terminal)/link/[token]/page.tsx',
  'src/app/(terminal)/terminal/page.tsx',
  'src/app/globals.css',
  'src/app/layout.tsx',
  'src/app/llms.txt/route.ts',
  'src/app/robots.txt/route.ts',
  'src/app/sitemap.xml/route.ts',

  // API Routes
  'src/app/api/actions/[id]/verify/route.ts',
  'src/app/api/amv/respond/route.ts',
  'src/app/api/amv/session/route.ts',
  'src/app/api/audit/route.ts',
  'src/app/api/framework/route.ts',
  'src/app/api/intake/route.ts',
  'src/app/api/license/route.ts',
  'src/app/api/link/generate/route.ts',
  'src/app/api/link/verify/route.ts',
  'src/app/api/methodology/route.ts',
  'src/app/api/mihm/route.ts',
  'src/app/api/montecarlo/route.ts',
  'src/app/api/node/bootstrap/route.ts',
  'src/app/api/node/[id]/route.ts',
  'src/app/api/protocol/download/route.ts',
  'src/app/api/sfi-manifes/route.ts',
  'src/app/api/telemetry/ingest/route.ts',
  'src/app/api/telemetry/sources/route.ts',
  'src/app/api/webhooks/stripe/route.ts',
  'src/app/api/whatsapp/webhook/route.ts',
  'src/app/api/world-spectrum/route.ts',

  // Components
  'src/components/auth/AuthTerminal.tsx',
  'src/components/landing/AMVThoughts.tsx',
  'src/components/landing/CasesPreview.tsx',
  'src/components/landing/EmergentPatterns.tsx',
  'src/components/landing/Estratos.tsx',
  'src/components/landing/Footer.tsx',
  'src/components/landing/Header.tsx',
  'src/components/landing/Hero.tsx',
  'src/components/landing/IntakeTerminal.tsx',
  'src/components/landing/InterruptionAlert.tsx',
  'src/components/landing/LandingClient.tsx',
  'src/components/landing/NodeActivity.tsx',
  'src/components/landing/OperationalCTA.tsx',
  'src/components/landing/OperationalDetection.tsx',
  'src/components/landing/OperationalSignals.tsx',
  'src/components/landing/OperationalUtility.tsx',
  'src/components/landing/SignalFragments.tsx',
  'src/components/landing/TelemetryPreview.tsx',
  'src/components/shared/Badge.tsx',
  'src/components/shared/LicenseGate.tsx',
  'src/components/terminal/AMVChat.tsx',
  'src/components/terminal/ConsoleColumn.tsx',
  'src/components/terminal/MemoryColumn.tsx',
  'src/components/terminal/MetricsPanel.tsx',
  'src/components/terminal/SimulationCanvas.tsx',
  'src/components/terminal/StateColumn.tsx',
  'src/components/terminal/SystemLog.tsx',

  // Lib
  'src/lib/actions/generate-protocol.ts',
  'src/lib/agents/amv.ts',
  'src/lib/agents/auditor.ts',
  'src/lib/agents/cognitive-twin.ts',
  'src/lib/agents/cultural-feeling.ts',
  'src/lib/agents/longitudinal.ts',
  'src/lib/agents/metrics.ts',
  'src/lib/agents/moph.ts',
  'src/lib/agents/stochastic-engine.ts',
  'src/lib/agents/systemPrompt.ts',
  'src/lib/agents/world-spectrum.ts',
  'src/lib/auth/actions.ts',
  'src/lib/auth/rateLimit.ts',
  'src/lib/db/events.ts',
  'src/lib/licensing/entitlements.ts',
  'src/lib/memory/embeddings.ts',
  'src/lib/memory/facts.ts',
  'src/lib/store/attractor-logic.ts',
  'src/lib/store/maker-mihm.ts',
  'src/lib/store/media-mihm.ts',
  'src/lib/store/nodeStore.ts',
  'src/lib/store/project-manager.ts',
  'src/lib/store/runtimeStore.ts',
  'src/lib/supabase/client.ts',
  'src/lib/supabase/server.ts',
  'src/lib/supabase/migrations/001_initial.sql',
  'src/lib/supabase/migrations/002_vnext_longitudinal.sql',
  'src/lib/supabase/migrations/003_system_logs.sql',
  'src/lib/telemetry/BehavioralTracker.ts',
  'src/lib/telemetry/normalize.ts',
  'src/lib/telemetry/connectors/base.ts',
  'src/lib/telemetry/connectors/manual.ts',
  'src/lib/telemetry/connectors/registry.ts',
  'src/lib/types/index.ts',
  'src/lib/utils/cn.ts',
  'src/lib/utils/tokens.ts',
  'src/lib/validation/schemas.ts',

  // Docs
  'docs/SFI_CORE_vNEXT_ARCHITECTURE.md',
  'public/casos/nodo-ags/findings.json',
  'public/casos/nodo-ags/index.md'
];

// ============================================================
// GENERAR REPORTE
// ============================================================
const outputFile = 'codigo_extraido.txt';
let report = `=== EXTRACCIÓN DE CÓDIGO ===\n`;
report += `Fecha: ${new Date().toISOString()}\n`;
report += `Directorio base: ${process.cwd()}\n\n`;

let successCount = 0;
let failCount = 0;

for (const relPath of filePaths) {
  const fullPath = path.join(process.cwd(), relPath);
  report += `\n--- ${relPath} ---\n`;
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      report += content;
      successCount++;
    } else {
      report += `[ERROR] Archivo no encontrado: ${fullPath}\n`;
      failCount++;
    }
  } catch (err) {
    report += `[ERROR] No se pudo leer: ${err.message}\n`;
    failCount++;
  }
}

report += `\n\n=== RESUMEN ===\n`;
report += `Archivos leídos correctamente: ${successCount}\n`;
report += `Archivos con error: ${failCount}\n`;

fs.writeFileSync(outputFile, report, 'utf8');
console.log(`✅ Reporte generado: ${outputFile}`);
console.log(`✅ Archivos OK: ${successCount}, Fallidos: ${failCount}`);