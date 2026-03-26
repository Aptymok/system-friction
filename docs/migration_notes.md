# Migration Notes — SystemFriction v2 Rebuild

**Fecha:** 2026-03-26
**Autor:** Aptymok (Juan Antonio)
**Propósito:** Inventario del estado anterior + decisiones de migración.

---

## 1) ¿Qué existía (estado del repo antes del rebuild)?

### Motor MIHM (Python)
- `scripts/mihm_v2.py` — Versión 2 del motor MIHM (matemáticas de fricción sistémica).
- `scripts/mihm_v3.1_pon_frozen.py` — Versión 3.1 congelada (frozen), considerada estable para referencia.
- `scripts/mihm_server.py` — Servidor Flask/Python que exponía MIHM como API REST.
- `scripts/brain_bridge.py` — Puente entre motor Python y frontend JS.
- `scripts/requirements.txt` — Dependencias Python.

### Motor Eidolon / JS
- `eidolon_engine/eidolon_engine.js` — Motor principal de razonamiento Eidolon.
- `eidolon_engine/eidolon_mihm.js` — Integración MIHM dentro de Eidolon.
- `eidolon_engine/eidolon_agents.js` (si existía) — Agentes del sistema.
- `eidolon_engine/eidolon_UI.js` — Capa UI del motor Eidolon.
- `eidolon_engine/eidolon_bridge.js` — Bridge entre Eidolon y otros sistemas.
- `eidolon_engine/eidolon_patterns.js` — Patrones cognitivos.
- `eidolon_engine/eidolon_persona.js` — Perfiles de personas/roles.
- `eidolon_engine/eidolon_retro.js` — Retrospectiva / timeline narrativo.
- `eidolon_engine/eidolon_semantic.js` — Semántica / análisis de texto.

### Nodos y datos
- `nodes/` — Nodos cognitivos (JSON + JS), perfiles APTYMOK, resultados Observatory.
- `scripts/results.json` — Resultados de simulaciones anteriores.
- `scripts/mihm_v3.json` — Configuración/snapshot MIHM v3.
- `scripts/patterns_v3.json` — Patrones v3.
- `scripts/aptymok_profiles.json` — Perfiles cognitivos de Aptymok.

### Documentación core
- `_core/postulado-central.md` — Postulado central del sistema.
- `_core/hub.md` — Hub conceptual.
- `_core/nti.md` — Descripción del índice NTI.
- `_core/patrones.md` — Patrones cognitivos documentados.
- `_mihm/` — Documentación MIHM (casos de estudio, patrones).

### UI / Web
- `app/` — App web React (Vite), con componentes de dashboard/lab/salón.
- `assets/` — Recursos estáticos.
- `index.html` — Página principal (Jekyll / static).
- `SF_2.html`, `SF_Atlas.html`, `scorefriction.html` — Vistas HTML legacy.

### Infra Jekyll
- `_config.yml`, `Gemfile` — Configuración Jekyll (sitio estático legacy).
- `_layouts/`, `_includes/` — Templates Jekyll.

---

## 2) ¿Qué se rescata conceptualmente?

| Concepto | Origen | Destino nuevo |
|---|---|---|
| Motor MIHM (IHG, NTI, R, IAD, ETE) | `scripts/mihm_v3.1_pon_frozen.py` | `packages/sf-engine` |
| Tipos cognitivos (snapshot, escenario, acción) | `nodes/`, Eidolon | `packages/sf-core` |
| Roles APTYMOK (SHINJI/REI/SHADOW/KAWORU) | `eidolon_engine/eidolon_persona.js` | `packages/sf-agents` |
| Debate de agentes | `eidolon_engine/eidolon_engine.js` | `packages/sf-agents` |
| Timeline narrativo / retrospectiva | `eidolon_engine/eidolon_retro.js` | `apps/ios` (Salón Eidelon) |
| Patrones cognitivos | `_core/patrones.md`, `scripts/patterns_v3.json` | `packages/sf-core` |
| Postulado central | `_core/postulado-central.md` | `docs/architecture.md` |

---

## 3) ¿Qué se depreca? (sin borrar, sin importar en core nuevo)

| Elemento | Razón de deprecación |
|---|---|
| `scripts/mihm_server.py` | Reemplazado por `infra/groq-proxy/` (serverless) |
| `scripts/mihm_v2.py` | Versión anterior; referencia en `mihm_v3.1_pon_frozen.py` |
| `SF_2.html`, `SF_Atlas.html`, `scorefriction.html` | UIs legacy monolíticas; reemplazadas por `apps/web/` |
| `_config.yml` / Jekyll infra | Reemplazado por Vite/React en `apps/web/` |
| `_nodo_ags/` | Módulo AGS obsoleto; funcionalidad no incluida en v2 MVP |
| `nodes/SF_IMAGE.html`, `nodes/dashboard.js` | Reemplazados por `apps/ios` dashboard |
| `_consola/`, `_audit/` | Herramientas de consola/auditoría legacy; no parte del MVP |

---

## 4) Decisiones de arquitectura tomadas

- **iOS-first**: la app principal es SwiftUI. La web es solo landing + inicio de plática.
- **Motor en JS/TS**: `sf-engine` y `sf-core` son paquetes JS/TS para poder compartirse entre web y (futuro) un módulo Node.js. La lógica del motor se expone como funciones puras, deterministas por seed.
- **Python eliminado del core**: `mihm_server.py` se reemplaza por el proxy serverless (Cloudflare Worker / serverless).
- **Trazabilidad radical**: todos los outputs incluyen `{inputs_hash, method, seed, engine_version, timestamp}`.
- **Groq es opcional**: si no hay proxy configurado, el sistema funciona solo con el motor matemático local.

---

## 5) Archivos legacy activos como referencia

Para implementar `sf-engine`, consultar:
- `legacy/repo_snapshot/scripts/mihm_v3.1_pon_frozen.py` — implementación de referencia de IHG, NTI, R, IAD, ETE.

Para implementar `sf-agents`, consultar:
- `legacy/repo_snapshot/eidolon_engine/eidolon_persona.js` — roles APTYMOK.
- `legacy/repo_snapshot/eidolon_engine/eidolon_engine.js` — lógica de debate.

---

*Este archivo se actualiza conforme avanza el rebuild.*
