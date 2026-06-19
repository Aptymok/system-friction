# SFI Operator Language Contract

Fecha: 2026-06-19

## Regla central

SFI debe mostrar primero significado operativo y despues detalle tecnico.

La consola debe responder en este orden:

1. Que esta pasando.
2. Por que importa.
3. Que evidencia sostiene la lectura.
4. Que accion minima corresponde.
5. Que ocurre si no se actua.

## Traducciones obligatorias

| Texto tecnico | Texto para operador |
|---|---|
| Nodo degradado | Esta observacion no tiene evidencia suficiente para orientar una decision. |
| Source degraded | Una fuente de verificacion no entrego datos utiles. |
| PARTIAL_EXTERNAL_FAILURE | La observacion sigue disponible, pero parte de la verificacion externa no respondio. |
| No active attractor | El sistema no tiene un futuro declarado contra el cual priorizar. |
| Scope sin conector vivo | Este observatorio existe, pero aun no recibe evidencia real suficiente. |
| Trust bajo | La lectura sirve para observar, no para ejecutar. |
| Recovery queue | Hay decisiones antiguas esperando revision. |
| Proposal alignment pending | La propuesta requiere compararse contra el futuro declarado. |
| Degradation | Costo operativo acumulado por falta de evidencia, cierre o mantenimiento. |

## Regla de interfaz

Toda vista debe separar tres capas.

### 1. Capa operador

Texto claro para decidir.

Ejemplo:

La observacion global perdio parte de su verificacion externa. El sistema conserva lectura interna, pero no debe usar esta lectura como certeza completa hasta recuperar mas fuentes.

### 2. Capa evidencia

Datos minimos que sostienen la lectura.

Ejemplo:

Fuentes vivas: 14. Fuentes sin respuesta: 11. Ultima lectura: 2026-06-18.

### 3. Capa tecnica

Detalle expandible.

Ejemplo:

source_state, confidence, degraded_sources, adapter_error, raw_payload.

## Regla WorldSpect

WorldSpect no debe reducir toda lectura a degradado cuando todavia existen fuentes vivas.

Estados permitidos para operador:

- Observacion confiable.
- Observacion parcial.
- Observacion interna sin verificacion externa suficiente.
- Observacion detenida.
- Sin lectura.

## Regla de decision

Ninguna vista debe mostrar una metrica si no dice que accion habilita.

Si una metrica no permite decidir, debe moverse a trazabilidad.

## Cierre

SFI conserva precision conceptual, pero la consola debe hablar como instrumento de decision. El operador no debe interpretar infraestructura. El sistema debe traducirla.
