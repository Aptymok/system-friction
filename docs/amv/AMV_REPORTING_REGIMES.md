# AMV Reporting Regimes

## Objetivo

Definir etiquetas interpretativas para reportes AMV. Un `ReportRegime` ayuda a leer tono, estado y condicion del reporte, pero no es evidencia por si mismo.

El vocabulario fuente vive en `src/lib/amv/core/regimeTypes.ts`.

## Regimenes

| Regimen | Lectura | Limite |
| --- | --- | --- |
| `contemplative` | Observacion sin demanda inmediata de accion. | No prueba estabilidad. |
| `performative` | Apariencia de salida sin conversion real visible. | Requiere evidencia de comportamiento. |
| `saturated` | Demasiadas senales para decidir sin reduccion. | No autoriza descartar evidencia sin criterio. |
| `proto_critical` | Senales tempranas de riesgo critico o cambio. | No equivale a crisis confirmada. |
| `dissonant` | Contradiccion operativa entre capas. | Debe apuntar a evidencia concreta. |
| `extractive` | Dinamica que extrae energia, datos o legitimidad sin retorno visible. | No acusa intencion sin soporte. |
| `ghost` | Ausencia, sombra o legado condiciona lectura. | Ausencia no prueba causalidad. |
| `coupling` | Dependencia fuerte entre elementos. | Acoplamiento no implica causalidad automatica. |
| `active_ejector` | Eyector activo puede degradar o bloquear cierre. | Debe estar sostenido por senal o evidencia. |
| `emergent_attractor` | Direccion aparece con peso suficiente para orientar ruta. | No ejecuta ni cierra ruta. |

## Regla de evidencia

Los regimenes de reporte son etiquetas interpretativas. No sustituyen `EvidenceTrust`, no alimentan regimen operacional por si mismos y no cierran decisiones sin evidencia visible.
