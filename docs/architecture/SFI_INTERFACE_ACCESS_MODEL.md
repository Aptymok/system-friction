# SFI Interface Access Model

## Estado

Documento operativo de formalización institucional.

## Propósito

Este documento fija la separación funcional entre las interfaces principales del ecosistema System Friction Institute: `/root`, `/studio` y `/field`.

La separación no es estética. Es una regla de gobernanza. ScoreFriction opera como motor de evaluación transversal; las rutas exponen funciones distintas del mismo sistema.

## Principio central

ScoreFriction es el motor.

`/root`, `/studio` y `/field` son superficies de operación sobre ScoreFriction y los demás subsistemas del Instituto.

Ninguna interfaz debe duplicar el motor. Ninguna interfaz debe reinterpretar datos sin contrato. Ninguna interfaz debe convertir una medición en narrativa si ScoreFriction no emitió antes evidencia, vector, hipótesis o dictamen.

## Matriz de acceso

| Ruta | Usuario primario | Función | Nivel |
|---|---|---|---|
| `/root` | Juan Antonio Marín Liera / Aptymok | Consola privada total del fundador, gobernanza, calibración, hipótesis, reglas, llaves, revisión y control institucional | Privado / fundador |
| `/studio` | Edwing | Laboratorio creativo-operativo para cargar, producir, probar y comparar sustratos: audio, texto, imagen, video, piezas KXTXR/REM618 y prototipos | Operador autorizado |
| `/field` | Usuarios externos, clientes, colaboradores, casos MOPH | Aplicación, seguimiento, evaluación de sustratos y consulta controlada de dictámenes | Público controlado / cliente |

## `/root` — Consola privada del fundador

`/root` no es una sección pública ni un dashboard de consulta general.

`/root` es la consola privada de Juan Antonio Marín Liera. Solo el fundador debe entrar a esta superficie.

Funciones obligatorias de `/root`:

1. Gobernanza del Instituto.
2. Control de hipótesis.
3. Aprobación o congelamiento de reglas.
4. Revisión de calibraciones.
5. Auditoría de observaciones y evidencia.
6. Control de acceso.
7. Gestión de pesos, umbrales y protocolos.
8. Activación de modos de emergencia o restauración.
9. Vista completa de ScoreFriction, WorldSpect, Field, MOPH, Studio y memoria.
10. Bitácora de eventos epistémicos.

`/root` debe permitir ver todo, pero no todo debe poder actuar sin confirmación. Las acciones de gobernanza deben quedar registradas con hash, timestamp y evento epistémico.

### Reglas de `/root`

- Nadie más entra a `/root`.
- No se expone como producto.
- No se usa para demostraciones comerciales.
- No se confunde con `/field`.
- Toda acción de alto impacto debe registrar intención, cambio, motivo y reversibilidad.
- La consola debe poder ver hipótesis propuestas, hipótesis verificadas, hipótesis fallidas, calibraciones y desviaciones.

## `/studio` — Laboratorio de Edwing

`/studio` es la superficie de producción, prueba y composición operativa asignada a Edwing.

No es consola de fundador. No es field público. Es laboratorio autorizado.

Funciones obligatorias de `/studio`:

1. Carga de sustratos creativos y culturales.
2. Evaluación de canciones, piezas, imágenes, videos, textos y materiales KXTXR.
3. Cotejo entre MIHM interno y WSV externo.
4. Generación de propuestas creativas como hipótesis verificables.
5. Producción de briefs para música, imagen, video y redes.
6. Registro de prototipos.
7. Comparación entre versiones.
8. Verificación posterior por métricas de plataforma.

`/studio` debe operar bajo ScoreFriction. La IA puede proponer, pero no debe declarar verdad sin vector, evidencia o hipótesis verificable.

### Reglas de `/studio`

- Edwing puede cargar y probar sustratos.
- Edwing puede generar prototipos y briefs.
- Edwing no debe modificar reglas de gobernanza.
- Edwing no debe recalibrar pesos globales.
- Toda propuesta generada en `/studio` debe quedar como hipótesis, no como dictamen institucional.
- Las propuestas pueden escalar a `/root` para aprobación, ajuste o archivo.

## `/field` — Superficie de aplicación y seguimiento

`/field` es la interfaz para terceros.

Se usa para aplicar ScoreFriction, dar seguimiento a MOPH, consultar evaluaciones, cargar evidencia controlada y ver dictámenes autorizados.

Funciones obligatorias de `/field`:

1. Iniciar casos MOPH.
2. Seguir pruebas de 72 horas.
3. Evaluar sustratos no privados.
4. Mostrar dictámenes autorizados.
5. Mostrar estado de observación sin exponer gobernanza interna.
6. Permitir carga controlada de evidencia.
7. Mostrar progreso, fricción, trazabilidad y recomendación.

`/field` no debe mostrar llaves, pesos internos sensibles, consola root, hipótesis privadas ni memoria no autorizada.

### Reglas de `/field`

- Es la superficie de aplicación.
- Puede ser usada por clientes, colaboradores o usuarios externos.
- No tiene acceso a gobernanza.
- No puede cambiar pesos globales.
- Solo muestra lo necesario para seguimiento y aplicación.
- Puede mostrar MOPH, evaluación de cosas, dictámenes y recomendaciones.

## Relación con ScoreFriction

ScoreFriction queda como motor común.

```text
/studio  -> ScoreFriction.evaluate(substrate) -> propuesta/prototipo
/field   -> ScoreFriction.evaluate(substrate) -> dictamen/seguimiento
/root    -> ScoreFriction.govern() + ScoreFriction.calibrate() + ScoreFriction.audit()
```

## Separación de responsabilidades

| Responsabilidad | ScoreFriction | `/root` | `/studio` | `/field` |
|---|---:|---:|---:|---:|
| Identificar sustrato | Sí | Consulta | Usa | Usa |
| Extraer features | Sí | Audita | Usa | Usa |
| Calcular vectores | Sí | Audita | Usa | Usa |
| Proponer hipótesis | Sí | Aprueba/observa | Solicita | Puede solicitar si está autorizado |
| Recalibrar pesos | Sí, bajo control | Sí | No | No |
| Gobernanza | No decide solo | Sí | No | No |
| Cargar piezas creativas | Sí | Puede | Sí | Limitado |
| Ejecutar MOPH | Sí | Audita | Puede probar | Sí |
| Emitir dictamen final | Sí, si hay evidencia | Autoriza | No final | Consulta |

## Regla de seguridad institucional

Una interfaz no puede reclamar más autoridad que su rol.

- `/root` gobierna.
- `/studio` experimenta.
- `/field` aplica y da seguimiento.
- ScoreFriction mide, propone, compara y aprende bajo reglas.

## Implementación recomendada

1. Agregar middleware o guardas de acceso por ruta.
2. Declarar roles mínimos: `founder`, `studio_operator`, `field_user`, `client`, `viewer`.
3. Bloquear `/root` para cualquier usuario no fundador.
4. Dar a `/studio` permisos de carga, análisis y prototipo, no de gobernanza.
5. Dar a `/field` permisos de aplicación, seguimiento y evidencia controlada.
6. Registrar todo evento sensible como evento epistémico.
7. Enlazar toda evaluación a `ScoreFrictionEvaluation`.
8. Enlazar toda hipótesis a `HypothesisRegistry`.
9. Enlazar toda recalibración a `CalibrationLedger`.

## Criterio de cierre

La formalización queda completa cuando:

- `/root` muestra todo y gobierna todo, pero solo para el fundador.
- `/studio` permite a Edwing operar sustratos creativos sin tocar gobernanza.
- `/field` permite a usuarios aplicar MOPH y consultar evaluaciones sin ver consola privada.
- ScoreFriction queda como motor único de evaluación transversal.
