# SFI-PCP-001 · Protocolo de Campo Personal

Estado: v1.0 operativo  
Nivel de integración: Observatorio Nivel 2  
Componentes relacionados: `SfiObservatoryOS`, `SfiFinalPublicSurface`, `/api/observatory/state`, `/api/mihm/process`, `action_proposals`, `epistemic_events`, `mihm_analyses`.

## 1. Definición operacional

El Protocolo de Campo Personal organiza la relación entre tres artefactos físicos/digitales: Atlas, Cuadernillo y Sobre Negro. No son piezas decorativas. Son superficies de captura, revisión y cierre de evidencia personal dentro del marco SFI.

### Atlas

El Atlas contiene estructura estable. Recibe mapas, criterios, definiciones, coordenadas, modelos, rutas y relaciones entre nodos. Su función es sostener orientación cuando el campo cambia. No recibe descarga emocional inmediata ni evidencia cruda sin clasificación.

Uso operativo: cuando una observación deja de ser episodio aislado y se convierte en patrón, relación, coordenada o regla de lectura.

### Cuadernillo

El Cuadernillo contiene observación continua. Recibe notas diarias, señales débiles, contradicciones, eventos de energía, microdecisiones, síntomas de transición y registros breves. Su función es mantener trazabilidad longitudinal sin sobredeterminar la lectura.

Uso operativo: cuando todavía no existe suficiente evidencia para mover el Atlas ni suficiente gravedad para sellar el Sobre Negro.

### Sobre Negro

El Sobre Negro contiene evidencia de cierre, ruptura, daño, clausura, mutación de atractor o cambio irreversible de lectura. Su función no es castigar. Su función es preservar pruebas que ya no deben reentrar al campo como ambigüedad.

Uso operativo: cuando un hecho modifica el régimen de confianza, confirma una reincidencia o exige que una hipótesis deje de tratarse como abierta.

## 2. Criterio de routing

| Entrada observada | Artefacto destino | Criterio operativo | Acción posterior |
| --- | --- | --- | --- |
| Nota breve, sensación, fricción menor, incomodidad sin evidencia suficiente | Cuadernillo | Registro temprano. Señal no estabilizada. | Revisar en ciclo diario/semanal. |
| Patrón repetido, criterio nuevo, mapa de relación, regla de lectura | Atlas | La señal ya tiene estructura. Puede orientar decisiones futuras. | Integrar como nodo, matriz o ruta. |
| Evidencia fuerte, reincidencia, ruptura, contradicción probada, cierre de ciclo | Sobre Negro | La señal ya cambia el régimen del campo. | Sellar, fechar y vincular a checkpoint. |
| Duda sobre destino | Cuadernillo | Si no hay peso suficiente, no se fuerza cierre. | Revisión semanal. |
| Evidencia con valor institucional o legal | Sobre Negro + respaldo digital | No se interpreta sin copia íntegra. | Registrar hash, fuente y fecha. |
| Aprendizaje metodológico transferible | Atlas | La observación ya produce criterio. | Convertir en regla, matriz o diagrama. |

## 3. Ciclos de revisión

| Ciclo | Artefacto principal | Pregunta guía | Salida esperada |
| --- | --- | --- | --- |
| Diario | Cuadernillo | ¿Qué cambió hoy en percepción, energía, contradicción o decisión? | 1 a 3 señales fechadas. |
| Semanal | Cuadernillo → Atlas | ¿Qué señales se repitieron y cuáles fueron ruido? | Agrupar patrones. Descartar residuo. |
| Mensual | Atlas | ¿Qué mapa, regla o relación debe actualizarse? | Ajuste de nodo, ruta o matriz. |
| Trimestral | Atlas + Sobre Negro | ¿El atractor personal sigue siendo el mismo? | Checkpoint de atractor. |
| Semestral | Sobre Negro + Atlas | ¿Qué ciclos deben clausurarse y qué evidencia debe preservarse? | Sellado de cierres y actualización de modelo. |
| Anual | Los tres artefactos | ¿Qué estructura quedó después de la observación longitudinal? | Síntesis anual, reencuadre y nuevo vector. |

## 4. Indicadores de cambio de atractor

Un atractor cambia cuando el sistema ya no regresa al mismo centro después de una perturbación.

Indicadores mínimos:

1. El mismo estímulo produce una respuesta distinta durante tres ciclos consecutivos.
2. La energía disponible se redistribuye sin intención deliberada.
3. Una relación, proyecto o hábito pierde capacidad de ordenar decisiones.
4. Aumenta la claridad pero disminuye la necesidad de explicación externa.
5. Aparece una nueva ruta de acción que antes no era perceptible.
6. El costo de sostener el atractor anterior supera su función de orientación.
7. El Sobre Negro acumula evidencia que invalida una hipótesis previa.
8. El Atlas requiere una nueva coordenada para no deformar el campo.

## 5. Protocolo de integración con el Observatorio · Nivel 2

El Observatorio Nivel 2 no reemplaza los artefactos. Los indexa.

### Entrada desde Cuadernillo

Formato mínimo:

```json
{
  "source": "cuadernillo",
  "date": "YYYY-MM-DD",
  "signal": "texto breve",
  "regime": "observacion | contradiccion | energia | validacion | temporalidad | gobernanza",
  "confidence": 0.0,
  "route": "pending_review"
}
```

Destino SFI:

- `epistemic_events` para registro de observación.
- `mihm_analyses` si la señal se procesa por MIHM.
- `logbook_signals` cuando exista ruta de bitácora activa.

### Entrada desde Atlas

Formato mínimo:

```json
{
  "source": "atlas",
  "node_key": "personal_attractor_current",
  "definition": "criterio o mapa actualizado",
  "linked_nodes": [],
  "linked_documents": [],
  "route": "field_matrix_update"
}
```

Destino SFI:

- `graph_nodes` para coordenadas estructurales.
- `graph_edges` para relaciones.
- `action_proposals` si la integración requiere aprobación.

### Entrada desde Sobre Negro

Formato mínimo:

```json
{
  "source": "sobre_negro",
  "evidence_id": "SN-YYYY-MM-DD-001",
  "event": "hecho sellado",
  "impact": "confianza | cierre | ruptura | reincidencia | mutacion",
  "hash": "optional_hash",
  "route": "sealed_evidence"
}
```

Destino SFI:

- `epistemic_events` para trazabilidad.
- `action_proposals` si exige acción posterior.
- `policy_decisions` si requiere bloqueo, cuarentena o aprobación.

## 6. Reglas de cierre

1. Ningún elemento del Sobre Negro regresa al Cuadernillo como duda abierta.
2. Ningún elemento del Cuadernillo entra al Atlas sin repetición o criterio.
3. Ningún elemento del Atlas entra al Sobre Negro sin evidencia fechada.
4. El Observatorio solo integra; no dramatiza.
5. La revisión trimestral decide si el atractor permanece, se ajusta o se clausura.

## 7. Estado mínimo para Observatorio Nivel 2

El módulo Personal Attractor Registry debe leer este protocolo y exponer:

- Atractor actual en seis dimensiones.
- Indicadores de transición.
- Eventos de cascada.
- Checkpoint trimestral.
- Enlaces internos a Atlas y Sobre Negro.

Este módulo queda bloqueado hasta estabilizar `P-01 · Observatory Organic Interaction Pass`.
