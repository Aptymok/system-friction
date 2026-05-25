# WorldSpect Triggers

WorldSpect se activa por interdependencia cognitiva, no por boton manual.

## Disparadores

| Trigger | Simbolo | Activa | Resumen visible |
| --- | --- | --- | --- |
| TR_PUBLICATION_INTENT | ↗P | platform, semantic, social, factual | La senal quiere salir al campo publico. |
| TR_CAMPAIGN_INTENT | ⟲C | platform, semantic, social, attention | La senal depende de respuesta social. |
| TR_RISK_PATTERN | ⚠T | risk, factual, macro | La senal toca riesgo antes de moverse. |
| TR_CONTRADICTION | ⧉K | semantic, factual, risk | Hay diferencia entre lo dicho y lo observado. |
| TR_LOW_MIHM_STABILITY | ↓H | risk, macro, factual | La estabilidad no alcanza para una decision grande. |
| TR_EXTERNAL_EVENT | ◎E | macro, factual, attention | El campo recibio una senal externa. |
| TR_SOCIAL_RETURN | ↩R | platform, attention, social | La respuesta del campo social regreso al sistema. |
| TR_PUBLIC_DECISION | ◆D | risk, semantic, factual, platform | La decision puede quedar visible fuera del sistema. |
| TR_ORIGIN_REQUEST | ◷O | factual, semantic | Se necesita origen antes de continuar. |

## Reglas

- Publicacion, campana o redes activan plataforma, semantica, social y factual.
- Patron critico nivel 5 activa riesgo, factual y macro.
- MIHM bajo activa riesgo, macro y factual.
- Solicitud de origen activa factual y semantica.
- Retorno de red activa plataforma, atencion y social.

## Eventos

WorldSpect registra:

- WORLD_SPECT_TRIGGER_DETECTED
- WORLD_SPECT_READING_TRIGGERED
- OBSERVATION_WINDOW_SUGGESTED
- WORLD_SPECT_PANEL_OPENED

El payload de traza contiene trigger, simbolo, variables, fuente, confianza, nodo activo y patron primario.
