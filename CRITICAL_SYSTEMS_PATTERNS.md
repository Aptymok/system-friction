# Critical Systems Patterns 0-100

Este catalogo inserta el ecosistema de sistemas criticos dentro del Campo Operativo de Patrones.

No reemplaza los patrones raiz de SFI.
Los expande.

## Funcion

Cada patron permite que el campo detecte:

- friccion
- omision
- latencia
- degradacion
- perdida de contexto
- decision implicita
- responsabilidad distribuida
- alerta ignorada
- umbral real vs. oficial

## Uso en /terminal

El AMV no debe mostrar el catalogo completo al usuario.

Debe usarlo para:

1. detectar patron activo;
2. activar nodos relacionados;
3. proponer ruta minima;
4. registrar evento;
5. abrir trazabilidad si el usuario la pide.

## Regla de lenguaje

FIELD_LAYER:

```text
Veo:
[hecho]

Significa:
[patron simple]

Sigue:
[accion]
```

## Regla de insercion

Los patrones criticos viven en:

`src/observatory/field/criticalSystemsPatterns.ts`

Los patrones raiz viven en:

`src/observatory/field/patternModel.ts`

La exportacion publica debe ser:

`fieldPatterns = coreFieldPatterns + criticalSystemsPatterns`
