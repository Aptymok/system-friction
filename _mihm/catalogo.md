---
layout: audit
title: "Catálogo MIHM — Componentes del Framework"
version: "1.1"
status: validated
origin: vhpd
date: 2026-02-23
---

# Catálogo de Componentes MIHM v2.0

Definición completa de todos los componentes del Multinodal Homeostatic Integration Model. Sin omisiones.

---

## 1. Métricas Maestras

| Componente | Símbolo | Definición | Umbral UCAP |
|------------|---------|------------|-------------|
| Índice de Gobernanza Homeostática | IHG | $\frac{1}{N}\sum(C_i-E_i)(1-L_i^{\text{eff}})$ | $< -0.50$ |
| Nodo de Trazabilidad Institucional | NTI | $\frac{1}{5}[(1-\text{LDI}_n)+\text{ICC}_n+\text{CSR}+\text{IRCI}_n+\text{IIM}]$ | $< 0.40$ |
| Índice de Concentración Entrópica | ICE | $\max(E_i)/\sum(E_i)$ | $> 0.30$ |
| Fricción Institucional | $f$ | $(t/T) + O$ | $> 1.00$ |

---

## 2. Variables de Nodo (CELKR)

| Variable | Símbolo | Dominio | Descripción |
|----------|---------|---------|-------------|
| Capacidad adaptativa | $C_i$ | $[0,1]$ | Capacidad del nodo para absorber perturbaciones |
| Carga entrópica | $E_i$ | $[0,1]$ | Desorden acumulado en el nodo |
| Latencia operativa | $L_i$ | $[0,1]$ | Retardo funcional observado |
| Conectividad funcional | $K_i$ | $[0,1]$ | Grado de integración con otros nodos |
| Redistribución | $R_i$ | $[0,1]$ | Capacidad de transferir carga a nodos vecinos |
| Módulo de coherencia | $M_i$ | $[0,1]$ | Integridad institucional del nodo |

---

## 3. Nodos del Sistema — Nodo Aguascalientes

| ID | Etiqueta | Descripción | Documento de referencia |
|----|----------|-------------|-------------------------|
| N1 | Agua/Ambiente | Capital natural. Acuífero. Infraestructura hídrica | [AGS-03](_nodes/ags/ags-03) |
| N2 | Capital Social | Cohesión, legitimidad, capital institucional acumulado | [AGS-01](_nodes/ags/ags-01) |
| N3 | Logística | Cadena automotriz, conectividad industrial | [AGS-04](_nodes/ags/ags-04) |
| N4 | Seguridad | Capacidad de respuesta policial y judicial | [AGS-02](_nodes/ags/ags-02) |
| N5 | Coordinación | Cadena de mando federal–estatal–municipal | [AGS-05](_nodes/ags/ags-05) |
| N6 | Seguridad Exógena | Nodo introducido v2.0. Captura shocks externos | [AGS-06](_nodes/ags/ags-06) |

---

## 4. Componentes NTI

| Componente | Símbolo | Descripción |
|------------|---------|-------------|
| Latencia de Decisión Institucional | LDI$_n$ | Normalización del tiempo federal–local |
| Índice de Concentración de Conocimiento | ICC$_n$ | Concentración operativa en pocos actores |
| Cumplimiento de Reducción de Incidentes | CSR | Brecha entre meta y resultado |
| Índice de Resiliencia de Capital Institucional | IRCI$_n$ | Compactación acuífero como proxy |
| Índice de Integridad de Métricas | IIM | Razón reportados / verificados |

---

## 5. Gates de Validación (H1–H3)

| Gate | Criterio | Método de verificación |
|------|----------|------------------------|
| H1 — Coherencia | Datos AGS vs realidad observable | Desviación < 15% |
| H2 — Trazabilidad | Cadena federal → local documentada | Evidencia textual VHpD |
| H3 — Homeostasis | IHG > −0.30 a 180 días post-shock | Proyección Monte Carlo |

---

## 6. Protocolos

| Protocolo | Umbral de activación | Acciones |
|-----------|----------------------|---------|
| Decisión de Emergencia | IHG < −0.50 o NTI < 0.40 | Activar intervenciones rank 1–2, reporte a 24h |
| Modo Ciego | NTI < 0.40 | IHG se calcula con corrección NTI. Validación manual |
| Escalada Federal | IHG < −0.80 | Notificación SSPC, activación FONDEN |

---

## 7. Roadmap 2026–2030

| Plazo | Hito | Gate |
|-------|------|------|
| Corto (7 días) | Telemetría N6, restauración M5 | H3 |
| Corto (1er sem 2027) | Dashboard Gemini, normalización v1.1 | H1 |
| Mediano (2027–2028) | Publicación *Complexity*, validación INEGI | H2 |
| Largo (2029–2030) | Observatorio Permanente de Gobernanza Adaptativa | H1+H2+H3 |

---

[Catálogo →](/mihm/catalogo/) · [Dashboard →](/mihm/) · [Hub Nodo AGS →](/mihm/hub/) · [NTI →](/mihm/nti/) · [Patrones →](/mihm/patrones/)