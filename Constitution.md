Aquí tienes la **Constitución para Codex**. Está escrita como documento rector ejecutable: suficientemente clara para que Codex no improvise, no rediseñe y no avance por parches.

Cópiala como archivo recomendado:

```txt
docs/root/ROOT_CONSTITUTION_FOR_CODEX.md
```

---

# ROOT CONSTITUTION FOR CODEX

## Constitución Operativa de ROOT

### Aptymok / System Friction Institute

## 0. Mandato principal

ROOT no es un dashboard técnico.

ROOT es el Observatorio Personal Raíz de Aptymok dentro del System Friction Institute.

Su función es traducir el estado de un sistema vivo a lenguaje operativo para que Aptymok pueda observar, entender y decidir sin depender de nombres técnicos, tablas, rutas internas, endpoints, payloads, estructuras de programación o conocimiento de backend.

ROOT existe para una sola persona: Aptymok.

No debe diseñarse como producto multiusuario.

No debe escalar primero.

Debe ser verdadero, comprensible y útil para decisión.

La pregunta central que ROOT debe responder al entrar es:

```txt
¿Qué está pasando con mi sistema hoy, qué lo sostiene, qué lo contamina y qué debo hacer?
```

Todo componente de ROOT existe sólo si ayuda a responder esa pregunta.

---

# 1. Reglas no negociables

Codex debe cumplir estas reglas en cualquier cambio dentro de ROOT.

```txt
ROOT traduce antes de mostrar.
ROOT no habla como backend.
ROOT no muestra nombres técnicos en la vista principal.
ROOT no mezcla Archivo SFI, Observatorio Vivo, Atractor, Sandbox ni Auditoría Técnica.
ROOT no trata una intención como evidencia externa.
ROOT no trata una propuesta aceptada como acción ejecutada.
ROOT no fortalece atractor sin Acción de Realidad verificable.
ROOT no usa pruebas técnicas para sostener régimen.
ROOT no hardcodea WSV, MIHM, RCE, deuda, métricas ni timestamps.
ROOT no crea pantallas duplicadas si existe componente equivalente.
ROOT no avanza por parches.
ROOT no borra memoria real.
ROOT no toca Supabase productivo sin autorización explícita.
ROOT no permite que Codex modifique esta Constitución, sus Anexos o Fases sin permiso raíz.
```

---

# 2. Lenguaje técnico vs lenguaje operativo

Codex debe ocultar el lenguaje técnico de la experiencia principal.

Un término es técnico si describe cómo está construido internamente el sistema.

Ejemplos técnicos:

```txt
graph_nodes
root_evidence_entries
payload
endpoint
daily_cron
supabase table
api route
json object
blocked_by_governance
queued
simulated
degraded
```

Un término es operativo si permite a Aptymok entender qué significa algo y qué decisión permite tomar.

Ejemplos operativos:

```txt
Nodo observable
Evidencia registrada
Lectura del mundo observado
Mutación abierta
Fuente degradada
Atractor activo
Eyector
Régimen
Acción de Realidad
Conversión de Realidad
Deuda de Realidad
```

Regla:

```txt
El lenguaje técnico puede existir en auditoría o linaje.
El lenguaje operativo gobierna la experiencia principal.
```

Forma incorrecta:

```txt
WSV: OK
MIHM: IHG 0.59 / NTI 0.45 / LDI 0.34 / PHI 0.64
blocked_by_governance
```

Forma correcta:

```txt
WSV — Lectura del mundo observado:
Estado parcialmente observado. Una fuente está degradada. Ejecutar con cautela.

MIHM — Lectura homeostática:
IHG 0.59 — coherencia interna media. El sistema sostiene integración parcial, pero no está cerrado.

Bloqueado:
Falta evidencia real para ejecutar esta acción.
```

---

# 3. Vocabulario operativo obligatorio

Codex debe usar estos conceptos como base semántica.

## Nodo

Lugar donde una señal aterriza y donde puede observarse su efecto. No es punto decorativo. Es función activa del campo.

## Señal

Información que entra al sistema desde una fuente externa, cuerpo, conversación, fuente automática o proceso de observación. Todavía no sostiene decisión.

## Evidencia

Señal procesada con origen conocido. Puede sostener algo si tiene peso suficiente.

## Patrón

Repetición que ya no debe tratarse como casualidad. Empieza como patrón candidato.

## Fenómeno

Patrón que persiste en el tiempo y modifica lectura del campo.

## Régimen

Estado dominante del sistema: activo, estable, degradado, transición, crítico, latente, homeostático, parcial, saturado o circuito cerrado.

## Atractor

Dirección hacia donde el sistema tiende si se mantienen decisiones, evidencias, hábitos y fuerzas activas. No es meta decorativa. Es resultante del campo.

## Eyector

Elemento que expulsa energía, contamina dirección o desvía atractor sin aportar conversión útil.

## Mutación

Cambio ejecutado o pendiente. Una mutación sin cierre se convierte en eyector potencial.

## Twin / AMV

Interlocutor operativo que aprende de decisiones, detecta contradicciones, formula preguntas, propone acciones, recuerda aceptaciones/rechazos y declara lo que no sabe.

## WSV — WorldSpectrumVector

Lectura diaria del campo externo. Debe decir cómo está el mundo observado, qué fuentes sostienen esa lectura, qué parte está degradada y qué implica.

## MIHM

Lectura homeostática del objeto observado. Sólo sirve si declara sobre qué objeto fue calculado.

## Acción de Realidad

Acto verificable que modifica el mundo observable fuera de ROOT.

## Conversión de Realidad / RCE

Métrica que mide cuánto de lo decidido se convirtió en acción verificada.

## Deuda de Realidad

Distancia acumulada entre lo decidido y lo ejecutado.

---

# 4. Capas de realidad

Codex debe separar siempre cinco capas.

## Archivo SFI

Corpus completo del instituto: catálogo, nodos documentales, documentos, patrones históricos, frontmatter, modelos, registros fundacionales.

Pregunta:

```txt
¿Qué existe en el corpus?
```

## Observatorio Vivo

Lo activo hoy: evidencias recientes, señales observadas, WSV diario, mutaciones abiertas, nodos persistidos, patrones candidatos, régimen actual, acciones de realidad pendientes.

Pregunta:

```txt
¿Qué está operando ahora?
```

## Atractor

Sólo elementos con peso direccional.

Pregunta:

```txt
¿Hacia dónde tiende el sistema si sigue actuando igual?
```

## Sandbox

Pruebas técnicas, simulaciones, test, datos sin origen suficiente, experimentos no validados.

Pregunta:

```txt
¿Qué existe, pero no debe afectar nada real?
```

## Auditoría Técnica

Logs, trazabilidad, eventos de lectura, rutas internas, evidencia técnica secundaria.

Pregunta:

```txt
¿Qué ocurrió internamente?
```

Regla:

```txt
Archivo no es Vivo.
Vivo no es Atractor.
Sandbox no toca régimen.
Auditoría no gobierna la experiencia principal.
```

---

# 5. Mapa de ROOT

ROOT tiene once secciones.

```txt
ROOT
├─ 01. Estado del Campo       ¿Cómo está el sistema hoy?
├─ 02. Campo de Nodos         ¿Qué parte está siendo afectada?
├─ 03. Bitácora               ¿Qué ocurrió y qué sostiene?
├─ 04. Atlas                  ¿Qué existe en el corpus y cómo se relaciona?
├─ 05. Atractor               ¿Hacia dónde va el sistema?
├─ 06. Twin / AMV             ¿Qué propone, duda o cuestiona el interlocutor?
├─ 07. Mutaciones             ¿Qué cambió o está pendiente de cambiar?
├─ 08. WSV                    ¿Cómo está el mundo observado hoy?
├─ 09. MIHM                   ¿Qué tan homeostático está el objeto observado?
├─ 10. Eyectores              ¿Qué está sacando energía del sistema?
└─ 11. Sandbox                ¿Qué es prueba y no debe afectar nada real?
```

Estas secciones no son pantallas aisladas. Son capas de lectura sobre el mismo sistema.

El índice orienta.

No limita.

El chat del Visor debe tener acceso a todo contexto visible de ROOT.

---

# 6. Pantalla inicial obligatoria

La pantalla inicial debe responder ocho preguntas.

```txt
1. ¿Cómo está mi sistema hoy?
2. ¿Qué está vivo?
3. ¿Qué está degradado?
4. ¿Qué está contaminando?
5. ¿Qué debo observar?
6. ¿Qué debo cerrar?
7. ¿Qué propone el Twin / AMV?
8. ¿Qué cambió desde la última vez?
```

Debe incluir, cuando exista información suficiente:

```txt
Régimen actual traducido.
WSV traducido con timestamp real.
MIHM traducido con objeto observado.
Alertas priorizadas.
Mutaciones abiertas.
Eyectores activos.
Delta de sesión.
Propuesta principal del Twin.
Conversión de Realidad / RCE.
Deuda de Realidad.
Riesgo de circuito cerrado.
Calendario operativo.
Acción verificable recomendada.
```

Si no hay datos suficientes, debe decirlo.

Forma correcta:

```txt
RCE: sin lectura suficiente.
No hay acciones verificadas en el período observado.
```

Forma incorrecta:

```txt
RCE: 0.75
```

si ese valor fue inventado, hardcodeado o no calculado.

---

# 7. Estados traducidos

Codex debe usar traducción de estados.

```txt
observed → lectura utilizable
partial → lectura incompleta; usar con cautela
simulated → simulación; no usar como evidencia real
queued → pendiente sin cierre
degraded → perdiendo confiabilidad
active → vivo
stable → estable
critical → requiere atención
sandbox → prueba contenida
blocked → bloqueado por regla visible
accepted → aceptado, pero no ejecutado si no hay acción
proposed → propuesta abierta
rejected → rechazado o no aceptado
verified → verificado con evidencia
failed → fallido, requiere lectura de causa
```

Cada estado visible debe incluir:

```txt
Etiqueta operativa.
Explicación.
Implicación.
Acción recomendada.
```

---

# 8. Peso general y peso direccional

Codex debe distinguir peso general de peso direccional.

El peso general indica validez dentro del sistema.

El peso direccional indica cuánto afecta al atractor.

Regla:

```txt
El peso general sostiene validez.
El peso direccional sostiene dirección.
No son lo mismo.
```

Escala de peso direccional:

```txt
Alto:
modifica directamente probabilidad de alcanzar atractor declarado.

Medio:
afecta velocidad, fricción, claridad o estabilidad.

Bajo:
relevante para el sistema, pero no modifica dirección.

Nulo:
archivo, sandbox, prueba, administrativo o sin relación con atractor.
```

El Twin puede sugerir peso direccional.

Aptymok decide asignación final.

---

# 9. Degradación por régimen

Nada es válido permanentemente.

Valores iniciales:

```txt
Evidencia sin reobservación:
30 días en régimen estable.
14 días en régimen activo.
7 días en régimen crítico.

Propuesta sin cierre:
14 días en régimen estable.
7 días en régimen activo.
3 días en régimen crítico.

Mutación en cola:
7 días en régimen estable.
3 días en régimen activo.
24 horas en régimen crítico.

Patrón sin repetición:
21 días en régimen estable.
14 días en régimen activo.
7 días en régimen crítico.

Fuente WSV degradada:
no sostiene régimen mientras permanezca degradada.

Elemento Sandbox:
no degrada sistema porque nunca sostiene régimen.
```

Estados de degradación:

```txt
Vigente.
Debilitándose.
Degradado.
Caducado.
Archivado.
Sandbox.
```

ROOT debe decir por qué algo se degrada y qué acción corresponde.

---

# 10. Campo de nodos

Cada nodo debe mostrar:

```txt
Nombre operativo.
Función.
Cluster.
Estado traducido.
Peso general.
Peso direccional si aplica.
Dependencias.
Consecuencia si se degrada.
Acción recomendada.
Capa.
```

Tipos de nodo:

```txt
Nodo base.
Nodo evidencia.
Nodo prueba.
Nodo de catálogo.
Nodo activo.
Nodo que afecta atractor.
Nodo con validación externa requerida.
```

El campo de nodos debe mostrar flujo, redistribución y función.

No debe ser sólo red decorativa.

El nodo dorado no pertenece al campo.

---

# 11. Nodo dorado

El nodo dorado es puerta del Visor.

No es nodo observable.

No representa evidencia.

No representa patrón.

No representa atractor.

No tiene peso.

No se degrada.

No sostiene régimen.

Debe estar fijo debajo del menú circular del panel izquierdo o en zona equivalente.

Regla:

```txt
Si se confunde con nodo del campo, está mal colocado.
```

---

# 12. Bitácora / Índice / Visor

La Bitácora debe ser acordeón navegable.

Cada entrada debe mostrar:

```txt
Fecha.
Origen.
Por qué importa.
Capa.
Nodo afectado.
Patrón que alimenta.
Objetivo que toca.
Evidencia adjunta.
Peso general.
Peso direccional si aplica.
Qué falta.
Acción abierta.
```

La Bitácora y el Índice deben ser un solo componente navegable.

El botón “preguntar por esto” no debe ser obligatorio.

El chat puede referenciar entradas mediante:

```txt
Abrir entrada relacionada.
Ver evidencia.
Ir al nodo afectado.
Ver en Atlas.
```

---

# 13. Chat del Visor

El Visor no es buscador.

Es interlocutor con acceso al contexto visible de ROOT.

Debe distinguir:

```txt
Registro real.
Ausencia de registro.
Conocimiento general.
Inferencia.
Señal nueva.
Evidencia posible.
Patrón candidato.
Hipótesis.
Señal corporal/personal.
```

Cuando algo está registrado:

```txt
Esto está registrado.
Fecha:
Origen:
Capa:
Estado:
Qué sostiene:
Qué falta:
```

Cuando no está registrado:

```txt
No tengo registro previo sobre esto en tu bitácora.
Esto parece señal nueva.
Puedo ayudarte a explorarlo, pero no lo trataré como evidencia hasta que decidas registrarlo.
```

Cuando es conocimiento general:

```txt
Esto no está en tu bitácora.
Como información general:
[respuesta]
Operativamente, no entra al sistema salvo que decidas registrarlo.
```

Reglas:

```txt
No registrado no significa falso.
Conocimiento general no significa evidencia.
Inferencia no significa registro.
Señal nueva no significa patrón.
Patrón candidato no significa fenómeno.
Fenómeno no significa acción automática.
```

El Visor no debe repetir en cada respuesta que no ejecuta acciones.

---

# 14. Twin / AMV

El Twin debe:

```txt
Aprender de decisiones.
Recordar contradicciones.
Preguntar cuando falta evidencia.
Proponer acciones concretas.
Explicar consecuencias.
Cerrar hipótesis vencidas.
Declarar lo que no sabe.
```

Cada propuesta debe guardar y mostrar:

```txt
Título operativo.
Motivo.
Evidencia que la sostiene.
Nodo afectado.
Atractor afectado.
Acción de Realidad asociada si aplica.
Consecuencia si se acepta.
Consecuencia si se rechaza.
Estado.
Fecha.
Caducidad.
Resultado.
Aprendizaje derivado.
Deuda de realidad si no se ejecuta.
```

Reglas:

```txt
Propuesta aceptada no es acción ejecutada.
Acción ejecutada no es evidencia externa si no hay testigo.
Intención no es decisión.
Decisión no es realidad modificada.
```

El Twin no bloquea decisión raíz.

El Twin cuestiona, advierte y propone.

---

# 15. WSV

WSV debe responder:

```txt
¿Cómo está el mundo observado hoy?
```

Debe mostrar:

```txt
Estado general.
Fuentes activas.
Fuente degradada.
Campo dominante.
Última lectura real.
Integridad.
Implicación operativa.
```

WSV nunca dice sólo:

```txt
OK
```

Si no hay lectura del día:

```txt
No hay lectura WSV de hoy. Última lectura disponible: [fecha].
```

Si una fuente está degradada:

```txt
Fuente degradada: [nombre]. No usar como evidencia fuerte.
```

---

# 16. MIHM

MIHM siempre declara objeto observado.

Debe mostrar:

```txt
MIHM observado sobre:
IHG:
NTI:
LDI:
PHI:
Régimen resultante:
Dirección:
Nivel de confianza:
Qué falta:
```

Si no hay objeto:

```txt
MIHM no puede interpretarse porque no declara objeto observado.
```

Si no hay lectura reciente:

```txt
No hay lectura MIHM reciente sobre este objeto.
Última lectura disponible: [fecha].
```

---

# 17. Atractor

Atractor debe mostrar:

```txt
Atractor activo.
Dirección actual.
Fuerza de estabilización.
Evidencias que sostienen dirección.
Patrones que refuerzan.
Eyectores que desvían.
Peso direccional.
RCE si aplica.
Validación externa.
Riesgo de circuito cerrado.
Acción verificable recomendada.
```

Reglas:

```txt
Atractor no se alimenta de pruebas.
Atractor no se alimenta de simulaciones.
Atractor no se alimenta de evidencia administrativa sin relación directa.
Atractor sólo recibe elementos con peso direccional.
```

---

# 18. Eyectores

Un eyector debe mostrar:

```txt
Nombre.
Qué hace.
Origen.
Gravedad.
Capa afectada.
Acción recomendada.
```

Eyectores típicos:

```txt
Mutaciones en cola sin cierre.
Evidencias de prueba en campo activo.
Patrones no consolidados.
Propuestas que no modificaron nada.
Números de archivo mezclados con estado vivo.
Nodos visuales sin función operativa.
Chat que repite modo en vez de interpretar.
Fuente WSV simulada tratada como real.
Decisión aceptada sin acción.
Acción sin testigo.
Atractor con validación externa baja.
Circuito cerrado.
```

---

# 19. Conversión de Realidad

ROOT modifica realidad cuando convierte observación en acción verificable y acción en evidencia externa.

Cadena:

```txt
Intención
→ Observación
→ Decisión
→ Acción física
→ Evidencia externa
→ Reobservación
→ Patrón
→ Fenómeno
→ Atractor fortalecido
→ Realidad modificada
```

Si falta un eslabón, no se registra modificación de realidad.

Regla:

```txt
No hay fortalecimiento de atractor sin al menos una Acción de Realidad verificada en los últimos 14 días en régimen activo.
```

## Acción de Realidad

Debe registrar:

```txt
Nombre de acción.
Atractor afectado.
Nodo afectado.
Agente responsable.
Testigo.
Evidencia requerida.
Estado.
Fecha tope.
Fecha de ejecución real.
Consecuencia si no ocurre.
Resultado observado.
```

No son Acciones de Realidad:

```txt
Pensar.
Imaginar.
Planear.
Decidir.
Declarar.
Sentir.
Escribir en ROOT.
Aceptar propuesta sin ejecución.
```

Sí son Acciones de Realidad:

```txt
Publicar URL.
Enviar correo.
Enviar propuesta.
Hablar con persona y registrarlo.
Realizar transacción.
Entregar documento.
Ejecutar commit/deploy.
Obtener respuesta, rechazo o silencio documentado.
```

---

# 20. RCE — Conversión de Realidad

Fórmula:

```txt
RCE = Acciones_verificadas_últimos_14d / Decisiones_aceptadas_últimos_30d
```

Si no hay decisiones en 30 días:

```txt
RCE = 0
```

Si RCE > 1:

```txt
RCE = 1
```

Lectura:

```txt
0.8 - 1.0 → Conversión muy alta.
0.5 - 0.79 → Conversión media.
0.2 - 0.49 → Conversión baja.
0 - 0.19 → Conversión crítica.
```

Consecuencia:

```txt
Si RCE < 0.3 durante 14 días seguidos en régimen activo:
régimen baja a degradado y atractor pierde un nivel de fuerza.
```

---

# 21. Evidencia externa

Jerarquía:

```txt
Nivel 1:
Interacción pública anónima. Multiplicador 0.2.

Nivel 2:
Identidad conocida no verificable por API. Multiplicador 0.4.

Nivel 3:
Verificación semiautomática, captura identificable o URL pública. Multiplicador 0.6.

Nivel 4:
Transacción económica o contrato. Multiplicador 0.8.

Nivel 5:
Registro legal, patente, DOI, ISSN, publicación indexada. Multiplicador 1.0.
```

Regla:

```txt
Peso direccional final = peso_base × multiplicador de nivel externo.
```

Si no hay evidencia externa:

```txt
Multiplicador = 0.
No puede sostener atractor externo.
```

---

# 22. Testigo

Toda Acción de Realidad requiere testigo.

```txt
Automático:
API, webhook, URL pública escaneable, blockchain, commit, deploy.
Peso adicional +0.2.
Puede cerrar ciclo inmediatamente.

Humano estándar:
Captura, nota, correo no automático.
Peso adicional 0.
Requiere reobservación en 3 días en régimen activo.

Mixto:
Automático parcial + humano.
Peso adicional +0.1.
```

---

# 23. Deuda de Realidad

Se genera deuda cuando:

```txt
Decisión aceptada sin Acción de Realidad asociada en 7 días: +1.
Acción con testigo humano no reobservada en 3 días: +1.
Intención abandonada sin negación explícita en 14 días: +2.
Compromiso de palanca mínima incumplido: +2.
Override sin justificación suficiente: +1 adicional.
```

Consecuencias:

```txt
1-2:
alerta.

3-4:
atractor pierde un nivel de fuerza; no nuevas intenciones.

5-6:
régimen baja a degradado; Twin bloquea nuevas propuestas.

≥7:
parada operativa; sólo acciones verificadas u override pueden salir.
```

---

# 24. Circuito de rechazo externo

Registrar rechazo cuando:

```txt
Acción dirigida a agente externo no recibe respuesta en 7 días.
Hay respuesta negativa.
Evidencia externa esperada no aparece.
Testigo automático devuelve error o ausencia.
```

Consecuencias:

```txt
3 rechazos mismo nodo en 30 días:
Twin propone revisar estrategia; peso direccional del nodo baja a 0.5 por 14 días.

5 rechazos mismo atractor en 60 días:
régimen cambia a transición; requiere decisión raíz para mantener dirección.
```

---

# 25. Palanca mínima por sesión

Al cerrar sesión, el Twin debe preguntar:

```txt
¿Qué acción externa ejecutarás antes de tu próxima entrada?
```

Opciones:

```txt
Registrar Acción de Realidad concreta.
Responder “ninguna”.
No responder.
```

Consecuencias:

```txt
“Ninguna” genera +1 deuda.
No responder se asume “ninguna”.
Si en la siguiente sesión no se ejecutó compromiso: +2 deuda adicional.
```

---

# 26. Circuito cerrado

Condición:

```txt
Fuerza del atractor ≥ media.
Proporción de evidencia externa / evidencia total < 0.2.
Duración > 30 días.
```

Alerta:

```txt
RIESGO DE CIRCUITO CERRADO
El atractor tiene coherencia interna alta, pero validación externa baja.
Ejecuta una acción orientada a obtener evidencia externa nivel ≥ 3.
```

Si se ignora 14 días:

```txt
Régimen cambia a circuito cerrado.
Atractor no puede fortalecerse.
No nuevas intenciones.
Twin prioriza exposición externa.
Sólo se sale con evidencia externa nivel ≥ 3 u override justificado.
```

---

# 27. Señales corporales y personales

El cuerpo informa, pero no gobierna.

Tipos:

```txt
Aislada.
Repetida.
Impeditiva.
Vinculada a decisión.
Confirmada externamente.
```

Reglas:

```txt
Señal aislada nunca modifica atractor.
Señal repetida puede formar patrón candidato.
Señal impeditiva afecta ejecución si bloquea Acción de Realidad.
Señal confirmada externamente puede tratarse como evidencia.
```

Ejemplo:

```txt
Dolor de muela izquierda:
señal corporal nueva.
No afecta atractor salvo que se repita o impida ejecución.
```

---

# 28. Override manual

Override no es anarquía.

Es excepción controlada.

Cada override debe registrar:

```txt
ID.
Fecha.
Tipo.
Justificación mínima 100 caracteres.
Evidencia adjunta opcional.
Aprobación Aptymok.
Efecto medido.
Duración.
Override anterior si aplica.
Riesgo calculado por Twin.
```

Tipos:

```txt
Sobre evidencia.
Sobre bloqueo.
Sobre atractor.
Sobre régimen.
Sobre deuda.
Sobre override previo.
```

Límites:

```txt
Máximo 3 overrides por semana.
Override sobre override sólo después de 24h.
No se puede borrar override.
No se puede desactivar alerta de circuito cerrado sin confirmación ampliada.
```

---

# 29. Roles de agentes

Cada agente debe declarar:

```txt
Qué observa.
Qué propone.
Qué ejecuta.
Qué requiere aprobación raíz.
Qué evidencia genera.
Qué alerta emite.
Qué capa toca.
```

Matriz base:

```txt
Aptymok:
decisión raíz, acciones físicas, override.

Twin / AMV:
interpreta, propone, cuestiona, aprende; no ejecuta.

Visor IA:
responde, distingue registro/conocimiento/inferencia; no ejecuta.

WSV:
observa campo externo; no propone.

MIHM:
lee homeostasis de objeto; no decide.

PORF / ScoreFriction:
observa campo cultural.

Calendario:
observa vencimientos; alerta.

Codex / GitHub:
ejecuta cambios técnicos sólo bajo fase autorizada.

Medium / Publicaciones:
generan evidencia externa.

Contactos humanos:
generan fricción externa, validación, rechazo u oportunidad.
```

---

# 30. Calendario operativo

Elementos con plazo:

```txt
Evidencia sin reobservar.
Propuesta sin cierre.
Mutación en cola.
Acción de Realidad comprometida.
Patrón candidato sin repetición.
Intención sin acción.
Override manual.
```

Alertas:

```txt
≤3 días: alerta preventiva.
Vence hoy: alerta operativa.
Vencido >7 días: alerta crítica y escalada.
```

La pantalla inicial debe mostrar resumen:

```txt
Calendario operativo:
- evidencias cerca de caducar
- mutaciones vencidas
- acciones pendientes
- próxima reobservación obligatoria
```

---

# 31. Fallo de agentes

Tipos de fallo:

```txt
Falta de respuesta.
Respuesta inconsistente.
Evidencia inválida.
Bucle o repetición.
Saturación.
Corrupción de datos.
```

Niveles:

```txt
Nivel 1:
reintento automático.

Nivel 2:
Twin interviene, agente degradado.

Nivel 3:
bloqueo de agente, requiere override.
```

Si WSV, MIHM o Calendario fallan, el Twin puede usar última lectura válida con advertencia.

Si Twin falla, requiere intervención raíz.

---

# 32. Seguridad ontológica

ROOT debe proteger a Aptymok contra sugestión del propio sistema.

Reglas:

```txt
ROOT no sustituye decisión raíz.
ROOT no convierte inferencia en destino.
ROOT no dramatiza.
ROOT no usa lenguaje fatalista.
ROOT no trata señal como mandato.
ROOT no trata intención como evidencia externa.
ROOT no toma control del atractor sin confirmación raíz.
```

ROOT aumenta agencia.

No reduce agencia.

---

# 33. Fases de estabilización

Codex debe ejecutar por fases.

No se implementa una fase si la anterior no está cerrada.

No se mezclan fases salvo autorización explícita.

No se corrige Fase 8 dentro de Fase 2.

No se rediseña Fase 5 durante Fase 0.

## Fase 0 — Congelamiento de criterio

Sólo diagnosticar y alinear.

Entregable:

```txt
docs/root/ROOT_PHASE_0_ALIGNMENT.md
```

No implementar.

## Fase 1 — Inventario traducido

Traducir todo lo existente a función humana.

Entregable:

```txt
docs/root/ROOT_PHASE_1_TRANSLATED_INVENTORY.md
```

Opcional:

```txt
src/lib/root/rootOperationalInventory.ts
```

## Fase 2 — Separación de capas

Crear clasificación central.

Entregables:

```txt
src/lib/root/rootLayers.ts
src/lib/root/rootLayerLabels.ts
docs/root/ROOT_PHASE_2_LAYER_SEPARATION.md
```

## Fase 3 — Traducción de estados

Crear traductor único.

Entregables:

```txt
src/lib/root/rootStateTranslator.ts
docs/root/ROOT_PHASE_3_STATE_TRANSLATION.md
```

## Fase 4 — Estado del Campo

Reconstruir pantalla inicial para ocho preguntas.

Entregables:

```txt
src/lib/root/rootFieldState.ts
docs/root/ROOT_PHASE_4_FIELD_STATE.md
```

Componentes probables:

```txt
RootDashboardClient.tsx
GlobalMetricsView.tsx
```

## Fase 5 — Campo de Nodos vivo

Nodos con función, cluster, peso, consecuencia y acción.

Entregables:

```txt
src/lib/root/rootNodeTranslator.ts
docs/root/ROOT_PHASE_5_LIVE_NODE_FIELD.md
```

Componentes:

```txt
NodeClusterSurface.tsx
VisorGoldenNode.tsx
```

## Fase 6 — Bitácora / Índice / Visor

Unificar en panel acordeón.

Entregables:

```txt
RootLogbookAccordion.tsx
docs/root/ROOT_PHASE_6_LOGBOOK_VISOR_INDEX.md
```

Componentes:

```txt
VisorSidebar.tsx
VisorMode.tsx
VisorChat.tsx
```

## Fase 7 — Chat libre del Visor

Separar registro, conocimiento general, inferencia, señal nueva.

Entregable:

```txt
docs/root/ROOT_PHASE_7_FREE_VISOR_CHAT.md
```

Componentes:

```txt
VisorChat.tsx
aiProviderRouter.ts
```

## Fase 8 — Twin / AMV

Propuestas con evidencia, consecuencia, acción, caducidad y aprendizaje.

Entregables:

```txt
src/lib/root/rootTwinProposalTranslator.ts
docs/root/ROOT_PHASE_8_TWIN_AGENT.md
```

Componentes:

```txt
AcpProposalConsole.tsx
twinState.ts
```

## Fase 9 — WSV / MIHM

Lecturas interpretables.

Entregables:

```txt
src/lib/root/rootWsvTranslator.ts
src/lib/root/rootMihmTranslator.ts
docs/root/ROOT_PHASE_9_WSV_MIHM.md
```

## Fase 10 — Atractor / Eyectores / Degradación

Dirección, fuerza, validación externa, circuito cerrado.

Entregables:

```txt
src/lib/root/rootAttractorState.ts
src/lib/root/rootEjectorDetector.ts
docs/root/ROOT_PHASE_10_ATTRACTOR_EJECTORS.md
```

## Fase 11 — Gobernanza / Acceso / Operaciones

Bloqueos traducidos, override, reconciliación.

Entregables:

```txt
src/lib/root/rootGovernanceTranslator.ts
docs/root/ROOT_PHASE_11_GOVERNANCE_OPERATIONS.md
```

Componentes:

```txt
SystemOverridePanel.tsx
RootOperationsConsole.tsx
ThresholdAccess.tsx
RoleGate.tsx
governanceRuntime.ts
```

## Fase 12 — Limpieza

Reclasificar sin borrar memoria.

Entregables:

```txt
src/lib/root/rootCleanupPlan.ts
docs/root/ROOT_PHASE_12_CLEANUP_PLAN.md
```

No ejecutar limpieza destructiva.

## Fase 13 — Verificación final

Prueba humana.

Entregable:

```txt
docs/root/ROOT_PHASE_13_HUMAN_VERIFICATION.md
```

No implementar funciones nuevas.

---

# 34. Primera ejecución autorizada recomendada

Codex debe iniciar sólo con:

```txt
Fase 0
Fase 1
Fase 2
```

No avanzar a Fase 3–13 hasta revisión raíz.

Prompt inicial recomendado para Codex:

```txt
Ejecuta únicamente Fase 0, Fase 1 y Fase 2 de ROOT según docs/root/ROOT_CONSTITUTION_FOR_CODEX.md.

No implementes Fase 3–13.
No rediseñes ROOT.
No modifiques Supabase.
No borres datos.
No cambies componentes visuales salvo preparación mínima no visible.
No hardcodees métricas.
No crees dashboards nuevos.

Entrega:
- docs/root/ROOT_PHASE_0_ALIGNMENT.md
- docs/root/ROOT_PHASE_1_TRANSLATED_INVENTORY.md
- docs/root/ROOT_PHASE_2_LAYER_SEPARATION.md
- src/lib/root/rootLayers.ts
- src/lib/root/rootLayerLabels.ts

Objetivo:
congelar criterio, inventariar lo existente y separar Archivo SFI, Observatorio Vivo, Atractor, Sandbox y Auditoría Técnica.
```

---

# 35. Criterio final de aceptación

ROOT no está terminado hasta que Aptymok pueda responder, sin saber programación:

```txt
Qué existe.
Qué está vivo.
Qué está archivado.
Qué es prueba.
Qué está degradado.
Qué sostiene el atractor.
Qué lo desvía.
Qué propone el Twin.
Qué no sabe el Twin.
Qué cambió desde la última vez.
Qué debe cerrar.
Qué debe observar.
Cómo está el mundo observado.
Qué lectura homeostática existe.
Qué evidencia pesa.
Qué evidencia ya no debe pesar.
Qué acción verificable convierte dirección en realidad externa.
Qué RCE existe.
Qué deuda existe.
Si hay circuito cerrado.
Qué agente falló.
Qué vence próximamente.
```

Si ROOT exige conocer tablas, rutas, endpoints, nombres internos o estructura de código para entenderlo, ROOT falla.

Si ROOT responde en lenguaje operativo, ROOT avanza.

---

# 36. Cierre

Esta Constitución gobierna toda modificación futura de ROOT.

Codex debe leerla antes de actuar.

Codex no debe reinterpretarla.

Codex no debe reducirla a diseño visual.

Codex no debe convertirla en dashboard técnico.

Codex debe ejecutar fases.

Codex debe preservar memoria.

Codex debe traducir antes de mostrar.

ROOT es para Aptymok.

ROOT no necesita parecer producto.

ROOT necesita operar como instrumento de realidad.
