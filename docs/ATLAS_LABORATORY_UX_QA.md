# ATLAS Laboratory UX QA

Pruebas de cierre para la vista `/terminal` como laboratorio ATLAS.

## 1. Terminal local sin sesion

Esperado:
- fondo negro;
- nodo dorado central;
- clusters conectados alrededor;
- WorldSpect visible arriba;
- un solo cuadro de mando;
- barra inferior fija;
- no aparece "Dashboard" como titulo dominante.

## 2. Cluster Auditoria

Esperado:
- hexagono azul activo;
- procesos visibles;
- el cuadro de mando cambia a Auditoria.

## 3. Cluster Simulacion

Esperado:
- triangulo purpura activo;
- modo visible: Planificacion flexible.

## 4. Comando: "audita este texto sin reescribirlo"

Esperado:
- Auditoria activa;
- respuesta: "Generacion bloqueada. Revisare coherencia, origen y riesgo."

## 5. Comando: "estoy saturado no entiendo"

Esperado:
- modo Auto-organizacion;
- menos nodos activos;
- respuesta breve;
- ecos reducidos.

## 6. Comando: "quiero publicar esta pieza"

Esperado:
- Presencia activa;
- no publica;
- el cuadro de mando indica preparacion.

## 7. Mobile

Esperado:
- sin empalmes;
- cuadro de mando como bottom sheet;
- clusters legibles;
- nodo dorado visible.

## 8. WorldSpect

Esperado:
- si hay snapshot: muestra medido con WSI/NTI;
- si no hay snapshot: "WorldSpect sin medicion vigente";
- nunca muestra "local" como estado de mundo.
