# Social Execution Policy

El pipeline social prepara borradores. No publica.

## Reglas

1. No publicar sin doble aprobacion.
2. No optimizar solo por engagement.
3. No explotar vulnerabilidad emocional.
4. No simular consenso.
5. No ocultar intencion.
6. No generar urgencia falsa.
7. No presentar metricas como reales si no vienen de API.
8. Optimizar por claridad, coherencia, trazabilidad y retorno observable.
9. Todo retorno real debe ser `SOCIAL_RETURN`.
10. Todo dato no conectado debe quedar como `LOCAL_CONTEXT` o `WORLDSPECT_LOCAL`.

## Estado actual

La publicacion real no esta habilitada en esta fase.

`assertCanPublishSocialDraft` debe devolver siempre:

```txt
canPublish: false
reason: "Publicación real no habilitada en esta fase."
```

## Fuente

WorldSpect local prepara decisiones publicas, pero no afirma tendencias externas.

Social return solo existe cuando una API real captura metricas de plataforma.
