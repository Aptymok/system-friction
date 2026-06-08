# AMV Neural Graph

AMV expone un grafo observable de contrato en `src/lib/amv/core/amvGraphTypes.ts` y `amvGraphBuilder.ts`.

Nodos permitidos: bitacora, evidencia, patron, agente, atractor, eyector, simulacion, documento, accion, degradacion, senal, objetivo, fenomeno, cluster, decision, scope y output.

Aristas permitidas: sostiene, contradice, degrada, converge, eyecta, depende, hereda, valida, temporaliza, acopla, desacopla, contamina, proyecta y recomienda.

Global U declara subject, scope, fecha, WSV, MIHM, regimen, atractor dominante, eyectores, deuda, permisos, evidenceTrust y archiveLayer.

Limite: el grafo describe estado visible; no escribe DB ni ejecuta agentes.
