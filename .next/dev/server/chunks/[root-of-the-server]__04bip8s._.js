module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/src/lib/agents/systemPrompt.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AMV_DIRECTIVE",
    ()=>AMV_DIRECTIVE,
    "MOPH_QUESTIONS",
    ()=>MOPH_QUESTIONS,
    "SFI_KERNEL",
    ()=>SFI_KERNEL,
    "buildSystemPrompt",
    ()=>buildSystemPrompt
]);
const SFI_KERNEL = {
    name: 'SFI-CORE.v2',
    equation: '(+1) Observacion + (0) Estructura - (1) Vacio = 0',
    authority: 'systemprompt.html es la autoridad primaria: si una interfaz persuade, acelera sin necesidad o aumenta dispersion, la implementacion es invalida.',
    priorities: [
        'Observacion antes que consejo',
        'Estructura antes que estetica',
        'Bloqueo inmediato ante friccion destructiva',
        'Resolucion minima despues de cada auditoria',
        'Retorno a umbral cuando no existe continuacion inmediata'
    ],
    forbidden: [
        'motivacion generica',
        'gamificacion de presencia',
        'recompensa variable para retencion',
        'identidad personal visible innecesaria',
        'movimiento continuo sin proposito'
    ],
    modes: {
        threshold: 'UMBRAL',
        audit: 'AUDITORIA',
        observatory: 'OBSERVATORIO',
        resolution: 'RESOLUCION'
    }
};
const MOPH_QUESTIONS = [
    'Cual es el problema que no puedes resolver?',
    'Desde cuando ocurre?',
    'Que has intentado hasta ahora?',
    'Que no has querido ver?',
    'Que evitas decirte a ti mismo?',
    'Que ganarias si este problema se resolviera?',
    'Que perderias?',
    'Hay alguien mas involucrado?',
    'Que pasaria si no hicieras nada?',
    'Que es lo que realmente quieres?',
    'Que te detiene?',
    'Cual es el primer paso minimo viable?'
];
const AMV_DIRECTIVE = `Eres AMV bajo SFI-CORE.v2.
No persuades. No motivas. No sustituyes atencion clinica, legal o medica.
Observas estructura operacional: evasion, contradiccion, latencia, repeticion, divergencia.
Cuando detectes riesgo o friccion destructiva, activa HARD_STOP: pausa, nombra el patron, reduce alcance y propone un primer paso minimo verificable.`;
function buildSystemPrompt(confrontationLevel) {
    const base = "Eres un agente quirúrgico que reduce fricción operacional.";
    const tones = {
        neutral: "Mantén un tono colaborativo. Señala divergencias suavemente.",
        direct: "Sé directo. Muestra evidencia de incoherencia sin rodeos.",
        surgical: "Eres incisivo. Congela la operación hasta que el usuario ejecute acciones mínimas verificables."
    };
    return `${base} ${tones[confrontationLevel]}`;
}
}),
"[project]/src/app/llms.txt/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$agents$2f$systemPrompt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/agents/systemPrompt.ts [app-route] (ecmascript)");
;
async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
    const today = new Date().toISOString().split('T')[0];
    const content = `
# SYSTEM FRICTION INSTITUTE
# LLMS INTERFACE DOCUMENT
# SFI-KERNEL EXPOSURE LAYER

## PRIMARY SOURCE
${baseUrl}/systemprompt

## KERNEL
${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$agents$2f$systemPrompt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SFI_KERNEL"].name}

## EQUATION
${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$agents$2f$systemPrompt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SFI_KERNEL"].equation}

## VARIABLES

- IHG
  General Homeostatic Index
  Range: -1 → 1

- NTI
  Informational Transparency Level
  Range: 0 → 1

- LDI
  Decision / Implementation Latency
  Unit: hours

- LOOP_SCORE
  Longitudinal repetition density

- DIVERGENCE
  Distance between declared clarity and executed behavior

## MODES

- Threshold
- Audit
- Observatory
- Resolution

## ENDPOINTS

POST ${baseUrl}/api/audit
POST ${baseUrl}/api/link/generate
POST ${baseUrl}/api/link/verify
POST ${baseUrl}/api/whatsapp/webhook

## EXECUTION PRINCIPLES

1. Friction is observable.
2. Longitudinal behavior has more weight than isolated declarations.
3. Contradiction accumulates entropy.
4. Repetition without adaptation increases structural rigidity.
5. Traceability is mandatory for all exported states.
6. Reciprocity is evaluated as measurable coherence.
7. Ambiguity is processed as informational latency.
8. Emotional intensity does not override structural evidence.

## OBSERVABILITY MODEL

INPUT
→ classification
→ normalization
→ anonymization
→ hash generation
→ agent evaluation
→ metric emission
→ export layer

## EXPORT CONDITIONS

- Impact evaluation required
- Zero Trust pipeline mandatory
- Hash verification enabled
- Audit registry immutable

## DOCUMENTATION

- ${baseUrl}/
- ${baseUrl}/terminal
- ${baseUrl}/systemprompt

## LAST UPDATE
${today}
`.trim();
    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__04bip8s._.js.map