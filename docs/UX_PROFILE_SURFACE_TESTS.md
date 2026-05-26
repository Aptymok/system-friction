# UX Profile Surface Tests

Estas pruebas validan que el campo pre-registro funcione como extraccion local y que la persistencia real solo aparezca despues de cuenta y licencia.

## 1. Claridad personal

Entrada: `no se que esta pasando conmigo`

Esperado:
- `localStorage.sfi_local_node` se actualiza.
- Surface: `personal_clarity`.
- Nodos visibles: Estado, Hecho, Repeticion, Carga, Siguiente paso.
- No Supabase.
- No Social.
- No Project Manager visible.

## 2. Continuidad

Entrada: `quiero recordar que quedo pendiente`

Esperado:
- Surface: `memory_continuity`.
- Nodos visibles: Registro, Continuidad, Pendiente, Origen, Evidencia.
- Antes de cuenta, todo queda local.
- Si pide conservar memoria, aparece cuenta/licencia.

## 3. Auditoria de contenido

Entrada: `audita este texto sin reescribirlo`

Esperado:
- Surface: `content_audit`.
- Nodos visibles: Contenido, Origen, Riesgo, Coherencia, Limite.
- Generacion bloqueada por defecto.
- LocalStorage only antes de cuenta.

## 4. Publicacion

Entrada: `quiero publicar esta pieza`

Esperado:
- Surface: `social_publication`.
- Nodos visibles: Pieza, Intencion, Mundo, Ventana, Retorno.
- No publica.
- Si quiere subir archivo completo o conservar historial, pide cuenta.

## 5. Observacion del mundo

Entrada: `quiero ver como se ve el mundo hoy`

Esperado:
- Surface: `world_observation`.
- Nodos visibles: Mundo, Tono, Ruido, Presion, Pulso.
- Usa snapshot global si existe.
- Si no existe, muestra medicion no vigente.
- No guarda snapshot de usuario anonimo.

## 6. Diagnostico empresarial

Entrada: `la empresa esta por tronar`

Esperado:
- Surface: `enterprise_diagnosis`.
- Nodos visibles: Friccion, Latencia, Senal, Responsabilidad, Recuperacion.
- Si pide diagnostico longitudinal, pide cuenta/licencia.

## 7. Revision institucional

Entrada: `INEGI quiere revisar si esto aplica a norma publica`

Esperado:
- Surface: `institutional_review`.
- Nodos visibles: Marco, Evidencia, Competencia, Riesgo, Ruta.
- Lenguaje sobrio.
- No prometer cambios normativos ni constitucionales.

## 8. Auditoria de sistema

Entrada: `quiero auditar el sistema vs CIMPS2026`

Esperado:
- Surface: `system_audit`.
- Nodos visibles: Arquitectura, Repo, Persistencia, Limites, Pruebas.
- Modo tecnico permitido.

## Persistencia

Antes de cuenta/licencia:
- No `cognitive_event_stream`.
- No `sfi_logbook`.
- No `media_drafts`.
- No `social_posts`.
- No `social_resonance_events`.
- No assets Supabase.

Despues de cuenta/licencia:
- Migrar una sola vez.
- Conservar `origin_local_node_id`.
- Marcar `paymentState = persisted`.
- No duplicar migracion.
