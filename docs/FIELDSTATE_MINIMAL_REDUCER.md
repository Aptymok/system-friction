# FIELDSTATE MINIMAL REDUCER

Fecha: 2026-05-22  
Fase: FASE 9C - FieldState minimal reducer

## Objetivo

Derivar un `FieldState` minimo desde señales declaradas sin acceso directo a DB y sin integracion UI.

## Estado epistemico

El reducer:

- no observa fuentes externas;
- no calcula SourceHealth;
- no infiere conciencia;
- no produce verdad absoluta.

Cuando existen señales validas:

- `sourceState = derived`
- `evidenceLevel = behavioral`

Cuando no existen señales validas:

- `sourceState = missing`
- `evidenceLevel = none`

## Reglas provisionales

La degradacion inicial es provisional.

Se deriva usando:

- volumen relativo de señales;
- presion por baja confianza.

La capacidad operacional es provisional y depende de:

- confidence promedio;
- degradacion provisional.

## Restricciones

El reducer:

- no accede DB;
- no importa Supabase;
- no importa React/Next/UI;
- no toca `/terminal`;
- no escribe eventos.
