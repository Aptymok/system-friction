# MIHM NODE SPEC

Nodo: `MIHM`  
Palabra visible: `Estabilidad`  
Oracion visible: `Mide que sostiene o rompe el sistema.`

## Funcion

- Recibe senales del campo.
- Calcula o recibe IHG, NTI, LDI, ICE, CRM y F.
- Alimenta patrones.
- Actualiza friccion.
- Registra resultado en bitacora.

## Reglas de interfaz

MIHM no se presenta como calculadora. Se presenta como nodo del campo.

FIELD_LAYER:

```text
Veo:
La estabilidad depende de evidencia y ejecucion.

Significa:
Si falta origen, la decision pierde soporte.

Sigue:
Validar el estado antes de mover una decision grande.
```

TRACE_LAYER puede mostrar variables cuando el usuario pide origen.
