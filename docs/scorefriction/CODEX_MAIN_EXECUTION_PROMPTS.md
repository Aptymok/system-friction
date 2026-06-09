# ScoreFriction — Codex main execution prompts

Regla global para todos los prompts:

- Trabaja sobre `main`.
- No crees branch.
- No generes mock data.
- No dejes TODOs.
- No dejes pantallas desconectadas.
- Implementa, prueba, corrige y commitea.
- Ejecuta `npm run lint` y `npm run build`.
- Si falla el build, corrige hasta que compile.
- Cada fase debe terminar con commit en `main`.
- Considera siempre el ecosistema completo SFI: Carta Fundacional, modelos MIHM/WSV, ROOT, ScoreFriction, Cluster Atlas, Signal Vane, Cognitive Twin Engine y Reality Layer.
- Mantén coherencia visual con la estética SFI: fondo negro, dorado institucional, tipografía mono/serif, campo nodal navegable, tarjetas de lectura, conexiones entre nodos, minimapa o equivalente, y lenguaje operativo.
- Ninguna fase debe quedar aislada como módulo CRUD. Cada fase debe integrarse al observatorio y al repositorio fundacional del ecosistema.

---

## PROMPT 0 — Repositorio Fundacional / Campo Navegable SFI

Implementa un lugar real dentro del ecosistema SFI para contener la Carta Fundacional, los modelos, los principios, los observatorios y sus conexiones.

Objetivo: crear un repositorio fundacional navegable como campo nodal vivo, no como página estática. Debe usar el lenguaje visual del diseño de referencia: campo negro, nodos dorados, conexiones, tarjetas de lectura, entrada ritual mínima, navegación por nodos, minimapa o vista de orientación, y contenido institucional conectado.

Implementa:

1. Crear ruta principal `src/app/repository/page.tsx` o `src/app/foundation/page.tsx`. Usa una sola ruta estable y enlázala desde la navegación SFI si existe.
2. Crear componente React operativo `src/components/sfi/FoundationFieldRepository.tsx` o ruta equivalente ya usada por el proyecto.
3. No pegar HTML crudo. Convertir el diseño a React/Next funcional.
4. Implementar nodos mínimos: `manifiesto`, `principios`, `fundador`, `actualidad`, `mision`, `metodologias`, `wsv`, `mihm`, `valores`, `ecosistema`, `scorefriction`, `root`, `worldspect`.
5. Cada nodo debe tener: `id`, `label`, `category`, `position`, `radius`, `connections`, `super`, `title`, `content`.
6. El contenido debe tomar como base la Carta Fundacional, Constitución, principios SFI, modelos MIHM/WSV y la información institucional existente en `docs/`, sin inventar datos nuevos.
7. Si existe información en documentos internos del repo, usarla. Si falta contenido, declarar `contenido institucional pendiente de formalización` dentro de la tarjeta, no inventar narrativa.
8. Implementar canvas o SVG para campo nodal. Debe permitir pan, zoom, hover, selección de nodo y apertura de tarjeta.
9. Implementar tarjeta de nodo con secciones, conexiones clicables y cierre.
10. Implementar minimapa o panel de orientación.
11. Integrar enlaces hacia `/scorefriction`, `/root` y demás observatorios existentes sin romper rutas.
12. El repositorio fundacional debe funcionar como índice ontológico del ecosistema, no como landing decorativa.
13. No usar datos simulados para métricas. Solo se permite contenido institucional estático tomado del repo.
14. Ejecutar `npm run lint` y `npm run build`. Corregir errores.
15. Hacer commit directo a `main`.

Criterio de cierre:

- Existe una ruta navegable del Repositorio Fundacional.
- La ruta muestra un campo nodal real con tarjetas de lectura.
- Los nodos conectan Carta Fundacional, modelos y observatorios.
- `/scorefriction` queda enlazado como parte del ecosistema, no como módulo aislado.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(sfi): implement foundational field repository`.

---

## PROMPT 0.1 — Instrumento MOP-H / Field Gate

Implementa el instrumento MOP-H Field Gate como parte del ecosistema SFI.

Objetivo: crear una experiencia de observación interactiva que funcione como instrumento fenomenológico, no como cuento decorativo ni demo aislada. El instrumento debe observar el comportamiento del usuario mientras navega un campo narrativo y debe convertir esa interacción en evidencia operativa MOP-H.

Implementa:

1. Crear ruta estable `src/app/moph/page.tsx` o `src/app/instruments/moph/page.tsx`. Usa una sola ruta y enlázala desde el Repositorio Fundacional.
2. Crear componente React operativo `src/components/sfi/MophFieldGate.tsx` o ubicación equivalente usada por el proyecto.
3. No pegar HTML crudo. Convertir el diseño a React/Next funcional.
4. Mantener la estética del diseño de referencia: fondo negro, grano, viñeta, marco dorado, letras arrastrables, campo canvas, nodos emergentes, capítulo flotante no modal, panel MOP-H, gate final y puertas de salida.
5. Implementar motor de campo con canvas: partículas, perturbaciones, marcas, formas fenomenológicas, árbol/raíz, nodos conductuales y conexiones al final.
6. Implementar letras arrastrables del título `LA SUTURA DEL OBSERVADOR`. Deben poder moverse, cambiar color con `C`, ocultarse con Delete/Backspace y persistir en localStorage.
7. Implementar capítulos como paneles inline, no modales bloqueantes. Deben tener texto, acciones, preguntas, decisiones y campo de escritura.
8. Implementar historia base con capítulos equivalentes a: carta, preludio, cap1-cap12 y epílogo. El contenido debe poder vivir en archivo separado `src/lib/moph/story.ts` para mantenimiento.
9. Implementar nodos conductuales emergentes: `errancia`, `persistencia`, `fuga`, `resonancia`, `hesitacion`. Deben aparecer por comportamiento observado, no por temporizador arbitrario.
10. Implementar métricas MOP-H reales derivadas de la sesión: `IHG`, `NTI`, `LDI`, `G.O.`, `epsilon`, `Phi(t)`.
11. Registrar señales de sesión: tiempo de lectura, capítulos reabiertos, capítulos saltados, recorrido del mouse, marcas, pausas, elecciones, texto escrito, latencias y patrones de evasión.
12. Persistir sesión en localStorage para continuidad local. No enviar datos externos sin endpoint explícito.
13. Crear endpoint opcional `POST /api/moph/session` solo si existe patrón de persistencia compatible en el proyecto. Si se crea, debe guardar payload fenomenológico con timestamp, métricas y evidencia. No debe guardar datos sensibles innecesarios.
14. El gate final debe mostrar métricas calculadas y declarar que el usuario produjo evidencia, no solo que leyó un cuento.
15. Agregar enlace desde el Repositorio Fundacional al instrumento MOP-H.
16. Agregar enlace desde MOP-H hacia `/repository`, `/scorefriction` y `/root` si las rutas existen.
17. No usar mock metrics. Si una métrica no puede calcularse, mostrar `no calculable` y explicar por qué en el panel.
18. Separar claramente: lectura narrativa, observación conductual, evidencia generada y decisión de salida.
19. Ejecutar `npm run lint` y `npm run build`. Corregir errores.
20. Hacer commit directo a `main`.

Criterio de cierre:

- Existe ruta MOP-H funcional.
- El instrumento permite interacción real con campo, letras, capítulos, preguntas y nodos emergentes.
- Las métricas MOP-H se calculan desde comportamiento observable de la sesión.
- La sesión se conserva localmente.
- El gate final muestra evidencia y métricas reales de la sesión.
- El Repositorio Fundacional enlaza MOP-H como instrumento del ecosistema.
- No hay HTML crudo pegado como página muerta.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(moph): implement field gate instrument`.

---

## PROMPT 1 — FASE 7: Protoatractores reales

Implementa la FASE 7 completa de ScoreFriction: protoatractores reales.

Objetivo: convertir observaciones y vectores MIHM-Cultural persistidos en objetos observables llamados protoatractores.

Implementa:

1. Migración Supabase nueva para `scorefriction_proto_attractors`.
2. Columnas obligatorias: `id`, `case_id`, `name`, `description`, `scope`, `confidence`, `density`, `persistence`, `status`, `evidence_count`, `observation_count`, `supporting_vectors`, `worldspect_snapshot`, `mihm_snapshot`, `generated_by`, `first_seen`, `last_seen`, `created_at`, `updated_at`.
3. Estados permitidos: `latent`, `emerging`, `crystallizing`, `consolidated`, `degraded`.
4. Servicio `src/lib/scorefriction/proto-attractors.ts`.
5. Endpoint `POST /api/scorefriction/proto-attractors/detect`.
6. Endpoint `GET /api/scorefriction/proto-attractors?case_id=...`.
7. Integración visual en `/scorefriction` dentro de `ScoreFrictionUnifiedObservatoryV2`.
8. Panel visible: nombre, estado, confianza, densidad, persistencia, evidencia, última actualización.
9. Sin datos simulados. Si no hay evidencia, mostrar `sin protoatractores detectados`.
10. Enlazar protoatractores con el Repositorio Fundacional si existe. El nodo `scorefriction` debe poder explicar qué protoatractores está observando sin duplicar datos.

Criterio de cierre:

- `/scorefriction` detecta protoatractores desde datos reales.
- El resultado se persiste en Supabase.
- El panel se actualiza desde endpoint real.
- La relación con el Repositorio Fundacional queda visible o preparada por contrato.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(scorefriction): implement proto-attractors`.

---

## PROMPT 2 — FASE 8: Observación longitudinal

Implementa la FASE 8 completa de ScoreFriction: observación longitudinal real.

Objetivo: registrar snapshots temporales de protoatractores para observar evolución cultural.

Implementa:

1. Migración Supabase nueva para `scorefriction_attractor_snapshots`.
2. Columnas obligatorias: `id`, `proto_attractor_id`, `case_id`, `density`, `confidence`, `persistence`, `status`, `observation_count`, `evidence_count`, `mihm_snapshot`, `worldspect_snapshot`, `created_at`.
3. Servicio `src/lib/scorefriction/longitudinal.ts`.
4. Endpoint `POST /api/scorefriction/longitudinal/snapshot`.
5. Endpoint `GET /api/scorefriction/longitudinal?case_id=...`.
6. Integración en `/scorefriction` dentro del panel Cronología Viva.
7. La cronología debe leer snapshots reales.
8. Si no hay snapshots, mostrar `sin trayectoria longitudinal`.
9. Después de detectar protoatractores, crear snapshot automático.
10. La trayectoria longitudinal debe poder referenciarse desde el nodo `scorefriction` del Repositorio Fundacional.

Criterio de cierre:

- La cronología deja de ser simulada.
- Los snapshots se persisten.
- La UI muestra trayectoria real por caso.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(scorefriction): implement longitudinal attractor snapshots`.

---

## PROMPT 3 — FASE 9: Cognitive Twin Cultural

Implementa la FASE 9 completa de ScoreFriction: Cognitive Twin Cultural.

Objetivo: registrar hipótesis culturales vivas derivadas de protoatractores y observaciones.

Implementa:

1. Migración Supabase nueva para `scorefriction_cultural_hypotheses`.
2. Columnas obligatorias: `id`, `case_id`, `proto_attractor_id`, `title`, `statement`, `confidence`, `status`, `verification_window_days`, `expected_signal`, `actual_signal`, `result`, `created_from`, `created_at`, `updated_at`.
3. Estados permitidos: `open`, `tracking`, `verified`, `refuted`, `expired`.
4. Servicio `src/lib/scorefriction/cultural-twin.ts`.
5. Endpoint `POST /api/scorefriction/cultural-twin/hypotheses/generate`.
6. Endpoint `GET /api/scorefriction/cultural-twin?case_id=...`.
7. Panel nuevo en `/scorefriction`: Cognitive Twin Cultural.
8. Mostrar hipótesis, estado, confianza, ventana de verificación y resultado.
9. No generar hipótesis si no existe protoatractor con evidencia suficiente.
10. El Repositorio Fundacional debe explicar que el Cognitive Twin Cultural observa hipótesis, no gustos musicales.

Criterio de cierre:

- El twin cultural genera hipótesis reales desde protoatractores.
- Las hipótesis se persisten.
- La UI muestra hipótesis reales.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(scorefriction): implement cultural twin hypotheses`.

---

## PROMPT 4 — FASE 10: Proposal Engine

Implementa la FASE 10 completa de ScoreFriction: Proposal Engine operacional.

Objetivo: generar propuestas de acción desde hipótesis culturales y protoatractores, reutilizando la tabla global `action_proposals` si ya existe.

Implementa:

1. Revisa el contrato actual de `action_proposals`.
2. No dupliques tabla si ya existe.
3. Servicio `src/lib/scorefriction/proposal-engine.ts`.
4. Endpoint `POST /api/scorefriction/proposals/generate`.
5. Endpoint `GET /api/scorefriction/proposals?case_id=...`.
6. Cada propuesta debe incluir: acción, fundamento, evidencia, riesgo, impacto esperado, ventana de verificación, estado.
7. Estados: `draft`, `proposed`, `accepted`, `rejected`, `executed`, `verified`.
8. Integrar panel Propuestas en `/scorefriction`.
9. No generar propuestas sin hipótesis cultural activa.
10. Las propuestas deben poder mapearse al ecosistema SFI como intervenciones observables, no como recomendaciones sueltas.

Criterio de cierre:

- Las propuestas se generan desde hipótesis reales.
- Las propuestas se guardan en tabla persistente.
- La UI muestra propuestas reales.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(scorefriction): implement proposal engine`.

---

## PROMPT 5 — FASE 11: Verification Engine

Implementa la FASE 11 completa de ScoreFriction: Verification Engine.

Objetivo: cerrar el ciclo propuesta → ejecución → resultado → aprendizaje.

Implementa:

1. Migración Supabase nueva para `scorefriction_proposal_verifications` si no existe tabla equivalente.
2. Columnas obligatorias: `id`, `proposal_id`, `case_id`, `expected_result`, `actual_result`, `delta`, `verified`, `confidence`, `evidence_payload`, `verified_at`, `created_at`.
3. Servicio `src/lib/scorefriction/verification-engine.ts`.
4. Endpoint `POST /api/scorefriction/verifications/record`.
5. Endpoint `GET /api/scorefriction/verifications?case_id=...`.
6. Integrar panel Verificación en `/scorefriction`.
7. Al verificar, actualizar propuesta e hipótesis asociada.
8. Si el resultado contradice la hipótesis, marcarla como `refuted`.
9. Si el resultado confirma la hipótesis, marcarla como `verified`.
10. El Repositorio Fundacional debe poder describir el ciclo propuesta → verificación como ley operativa del observatorio.

Criterio de cierre:

- Se puede registrar verificación real.
- La propuesta cambia de estado.
- La hipótesis cambia de estado.
- La UI muestra el cierre del ciclo.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(scorefriction): implement verification engine`.

---

## PROMPT 6 — FASE 12: Worldspect convergence

Implementa la FASE 12 completa de ScoreFriction: convergencia con Worldspect.

Objetivo: integrar ScoreFriction con snapshots Worldspect para que cada protoatractor, hipótesis, propuesta y verificación pueda leer contexto externo.

Implementa:

1. Revisa `worldspect_snapshots` y contratos existentes.
2. No crees tabla duplicada si ya existe `worldspect_snapshots`.
3. Servicio `src/lib/scorefriction/worldspect-convergence.ts`.
4. Endpoint `GET /api/scorefriction/worldspect?case_id=...`.
5. Vincular latest Worldspect snapshot con protoatractores y snapshots longitudinales.
6. Agregar `worldspect_snapshot` donde falte en servicios nuevos.
7. Integrar panel Worldspect real en `/scorefriction`.
8. El panel debe mostrar snapshot real o estado `worldspect_unavailable`.
9. No usar barras simuladas cuando exista dato real.
10. El nodo `worldspect` del Repositorio Fundacional debe explicar el rol de WSV/Worldspect como entorno externo del objeto observado.

Criterio de cierre:

- ScoreFriction lee Worldspect real si existe.
- Protoatractores y snapshots guardan contexto Worldspect.
- La UI muestra contexto externo real.
- `npm run lint` pasa.
- `npm run build` pasa.
- Commit final: `feat(scorefriction): converge with worldspect`.

---

## PROMPT 7 — Cierre de integración

Ejecuta cierre de integración ScoreFriction.

Objetivo: dejar `/scorefriction` como observatorio único y operativo.

Implementa:

1. Revisar `/scorefriction`, `/scorefriction/wave`, `/scorefriction/cases`, `/scorefriction/evidence`, `/scorefriction/lab`.
2. Mantener rutas secundarias solo si no duplican el observatorio principal.
3. La ruta principal `/scorefriction` debe concentrar observación, evaluación, protoatractores, hipótesis, propuestas y verificaciones.
4. Eliminar navegación que fragmente el uso principal.
5. Corregir imports muertos.
6. Corregir componentes no usados.
7. Ejecutar lint.
8. Ejecutar build.
9. Corregir todo error de TypeScript o Next.
10. Verificar que `/repository` o `/foundation` exista y conecte SFI, Carta Fundacional y ScoreFriction.
11. Verificar que `/moph` o `/instruments/moph` exista y funcione como instrumento MOP-H Field Gate dentro del ecosistema.
12. Commit final: `chore(scorefriction): finalize unified observatory integration`.

Criterio de cierre:

- `/scorefriction` funciona como observatorio principal.
- El Repositorio Fundacional existe como campo navegable dentro del ecosistema.
- El instrumento MOP-H existe como Field Gate operativo.
- No hay mock visual donde existan datos reales.
- No hay build roto.
- No hay rutas principales duplicando operación.
