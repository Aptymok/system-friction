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
    ()=>SFI_KERNEL
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
    const content = `# System Friction

## Fuente primaria
systemprompt.html / ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$agents$2f$systemPrompt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SFI_KERNEL"].name}

## Ecuacion
${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$agents$2f$systemPrompt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SFI_KERNEL"].equation}

## Variables
- IHG: Indice Homeostatico General (-1 a 1)
- NTI: Nivel de Transparencia Informacional (0 a 1)
- LDI: Latencia de Decision e Implementacion (horas)
- Loop Score: repeticion longitudinal
- Divergence: distancia entre claridad y ejecucion

## Modos
- Umbral
- Auditoria
- Observatorio
- Resolucion

## Endpoints
- POST /api/audit
- POST /api/link/generate
- POST /api/link/verify
- POST /api/whatsapp/webhook
`;
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