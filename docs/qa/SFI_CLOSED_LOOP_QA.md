# SFI Closed Loop QA

Fecha: 2026-06-18

## Rutas canonicas

1. `/scorefriction` no usa iframe: verificar `src/app/scorefriction/page.tsx`; renderiza React real con `ScoreFrictionFieldExperience`.
2. `/scorefriction` es la unica ventana operativa ScoreFriction.
3. `public/scorefriction-operational.html` ya no se usa: archivo eliminado.
4. `/scorefriction-operational` no existe como ruta operativa: carpeta eliminada.
5. `/scorefriction/wave` no existe como dashboard separado: carpeta eliminada.
6. `/scorefriction/wide` no existe como dashboard separado: carpeta eliminada.
7. `/scorefriction/lab` no existe como dashboard separado: carpeta eliminada.
8. `/scorefriction/cases` no existe como dashboard separado: carpeta eliminada.
9. `/scorefriction/evidence` no existe como dashboard separado: carpeta eliminada.
10. `/sfi-lab` no existe como ruta operativa: carpeta eliminada.

## SFI-LAB integrado

11. SFI-LAB vive dentro de `/scorefriction` como drawer interno `SFI-LAB / Campaign Generator`.
12. `SfiLabClient` se importa desde `src/components/scorefriction/SfiLabClient.tsx`.
13. No existen fetches operativos a `/api/sfi/lab/*`.
14. No existen fetches operativos a `/api/sfi/assets*`.
15. `/api/scorefriction/lab/analyze` funciona y persiste analisis, evidencia, bitacora y AMV learning cuando hay backend disponible.
16. `/api/scorefriction/lab/report` funciona y genera reporte desde analisis/caso.
17. `/api/scorefriction/lab/media-plan` funciona y conecta plan con `/api/scorefriction/media/render`.
18. `/api/scorefriction/assets` funciona como ruta canonica; sin sesion valida debe responder protegido, no 404.
19. `/api/scorefriction/assets/[asset_id]/measurements` funciona como ruta canonica para mediciones.

## Ciclo ScoreFriction

20. SFI-LAB conserva generacion de campanas, reportes, media-plan, contenido real, evidencia, verificacion y AMV learning.
21. `/scorefriction` muestra objetivo, regimen, direccion, degradacion, alerta y accion minima en el primer viewport.
22. Neural Field / Attractor Map usa datos reales de ciclo, graph, señales, persistencia y atractores; si faltan eventos muestra `sin datos suficientes`.
23. AMV Thoughts usa lenguaje simple y no se presenta como log tecnico.
24. Bitacora inferior consume `/api/logbook/visible`.
25. Fallbacks son visibles en `technical_state.warnings` y no se presentan como exito.

## WorldSpectrumVector

26. `/world-vector` consume WSV real o estado degraded explicito desde `/api/worldspect/operational-state`.
27. WSV muestra direccion, regimen, degradacion, senales y persistencia.
28. Fuentes no son contenido principal: solo aparecen como salud tecnica.
29. Contraste contra objeto solo ocurre al ejecutar evaluador.

## ROOT

30. ROOT muestra neural graph vivo: `RootLiveGraphPanel` consume `/api/root/neural-graph/live`.
31. AMV thoughts se guardan: `/api/amv/learning/append` escribe aprendizaje y bitacora.
32. Self Observability detecta rutas rotas y modulos desconectados: `/api/root/self-observability`.
33. Self Reconstruction propone patch sin simular exito: `/api/root/self-reconstruction/propose` y `/patch`.
34. Toda observacion relevante entra a bitacora: `src/lib/logbook/query.ts`.
35. Permisos de bitacora funcionan: `src/lib/logbook/permissions.ts`.
36. Aptymok/SYSTEM_ROOT_EMAIL puede ver todas las bitacoras con rol system/root.

## Supabase y degradacion honesta

37. Si Supabase falla por `SELF_SIGNED_CERT_IN_CHAIN`, `technical_state.supabase_ok` debe ser `false`.
38. La UI debe mostrar Supabase como degraded, no como exito.
39. La causa debe quedar visible en warnings.
40. En entornos con proxy o certificado corporativo, configurar `NODE_EXTRA_CA_CERTS` con la CA local.
41. No usar `NODE_TLS_REJECT_UNAUTHORIZED=0` como solucion permanente.

## Comandos de validacion

```powershell
npm run typecheck
npm run build
Get-ChildItem src,public -Recurse -File | Select-String "/api/sfi/|/sfi-lab"
```

Resultado esperado del `Select-String`: cero referencias operativas en `src` y `public`.

## Pruebas API minimas

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/scorefriction/lab/analyze -ContentType "application/json" -Body '{"text":"senal cultural recurrente","source":"qa"}'
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/scorefriction/lab/report -ContentType "application/json" -Body '{"case_id":"qa-sfi-lab","analysis":{"summary":"senal recurrente"}}'
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/scorefriction/lab/media-plan -ContentType "application/json" -Body '{"case_id":"qa-sfi-lab","objective":"probar plan canonico","analysis":{"summary":"senal recurrente"}}'
Invoke-WebRequest -Uri http://127.0.0.1:3000/api/scorefriction/assets -UseBasicParsing
```

`/api/scorefriction/assets` puede responder `401` sin sesion; eso valida ruta protegida y canonica. No debe responder `404`.
