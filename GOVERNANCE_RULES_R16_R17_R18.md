# GOVERNANCE RULES R16 R17 R18

## R16

Regla: un nodo es valido si tiene traza al nodo raiz.

Visible:

`Este nodo necesita origen.`

## R17

Regla: la friccion no resuelta se redistribuye.

Visible:

`Esto no desaparecio. Se movio a otra parte.`

## R18

Regla: restauracion del canal.

Condicion:

`NTI < 0.30` y `v_tau > 0.086`

Accion:

- Pausar decisiones de impacto alto.
- Congelar estado declarado.
- Acumular deuda de validacion.
- Emitir pulso al nodo raiz.
- Reconciliar al retorno.

Visible:

```text
No hay referencia suficiente.
Las decisiones grandes quedan pausadas.
Se necesita validar el estado.
```
