# Laboratory UX QA

Pruebas de cierre para `/terminal` como campo operacional nodal.

## 1. Entrada local sin sesion

Esperado:
- nodo dorado central;
- clusters alrededor;
- WorldSpect strip visible;
- un solo cuadro de mando;
- sin dashboards/tabs;
- sin "Project Manager" visible.

## 2. Click cluster Auditoria

Esperado:
- Auditoria se expande;
- procesos visibles;
- chat cambia a modo auditoria;
- el grafo muestra conexiones al proceso.

## 3. Click cluster Simulacion

Esperado:
- se muestra modo de planificacion/evaluacion;
- GraphMode visible: Planificacion flexible;
- `CSCG` aparece solo en Origen/trace.

## 4. Comando: "audita este texto sin reescribirlo"

Esperado:
- cluster Auditoria activo;
- proceso de generacion bloqueada;
- mensaje simple.

## 5. Comando: "quiero decidir entre dos rutas"

Esperado:
- cluster Simulacion o Resultado activo;
- modo Planificacion flexible / Atencion sobre grafo.

## 6. Comando: "estoy saturado no entiendo"

Esperado:
- modo Auto-organizacion;
- menos nodos;
- menos conexiones;
- mensaje breve.

## 7. Comando: "quiero publicar esta pieza"

Esperado:
- se revela Presencia;
- no publica;
- prepara proceso;
- WorldSpect sigue visible como capa basal.

## 8. Mobile

Esperado:
- no hay empalmes;
- cuadro de mando como bottom sheet;
- nodos legibles;
- barra de accion fija abajo.
