# KXTXR — inventario externo ampliado y contradicciones (24/10/2026)

**Estado:** investigación pública de solo lectura. La disponibilidad o un enlace no equivale a recepción, aprobación, publicación fechada verificada ni RETURN. No se ha alterado el expediente KXTXR, la producción ni los documentos originales.

## Inventario observado

| Plano | Fuente | Hallazgo reproducible | Límite |
| --- | --- | --- | --- |
| Identidad web | https://kxtxr.vercel.app/ | Sitio accesible con música REM618/111/QUE NO, archivo, LIVE, QUE NO Representation Field y enlaces externos. | Representación editorial, no recibo de plataformas. |
| Código fuente | https://github.com/Aptymok/kxtxr | Repositorio **público** accesible con datos `/data`, `/grimoire`, `/campaigns`, código y documentación de control/evidencia. | Los estados declarados no certifican eventos externos. |
| Enlaces sociales | https://linktr.ee/kxtxr | Perfil Linktree referencia Instagram `_kxtxr`, TikTok `_kxtxr` y KXTXR web. | No se pudo extraer cronología/alcance de los perfiles directamente con acceso web automatizado. |
| Instagram | https://www.instagram.com/_kxtxr/ | URL de cuenta declarada y enlazada desde Linktree. | Página de publicaciones y Insights no verificables mediante acceso actual. |
| TikTok | https://www.tiktok.com/@_kxtxr | URL de cuenta enlazada desde Linktree. | Perfil bloquea lectura automatizada; no se validaron IDs ni métricas por vídeo. |
| Spotify | https://open.spotify.com/artist/5Iwk9h7kNRB8GPNGeiRKGh | Identificador declarado en `kxtxr/index.md`; el embed público de la playlist https://open.spotify.com/embed/playlist/1Rt2nCZ0NRc4UgIUy1Eyad lista `REM 618` por KXTXR y Blegh! Label en la posición 98 de esa lista consultada. | No demuestra streams, oyentes, guardados ni ranking editorial; tampoco se pudo cargar directamente la página del artista. |
| Apple Music | https://music.apple.com/us/album/111/6803518421?i=6803518424 | Ficha indexada: `111` de KXTXR y Blegh! Label, fecha pública **25 de agosto de 2026**. | Fuente secundaria de catálogo; registrar fecha y jurisdicción de storefront. |
| Amazon Music | https://music.amazon.co.jp/artists/B0H2WWMK54/kxtxr | Catálogo indexado también muestra `111` fechado 25/08/2026 y `REM 618`. | Sin consumo analítico privado. |
| YouTube | https://www.youtube.com/@kxtxrsignal | Canal identificado por la fuente `kxtxr/index.md`. Fuente pública independiente https://socialdiscovery.app/es/youtube/channel/blegh-label lista `KXTXR - REM 618 #BleghLabel` con fecha **12 de junio de 2026**. | No se pudo inspeccionar la página del canal directamente; la lista de Blegh! Label **no** demuestra subida al canal KXTXR ni su número de vistas. |
| Música analizada | https://github.com/Aptymok/kxtxr/blob/main/data/music-field.json | Fuente versionada con análisis previo de **ocho WAV masters** (LUFS, LRA, true peak, correlación estéreo, centroides, bandas espectrales y distancias), no incluye como masters medidos de ese conjunto a REM618/111/QUE NO. | Mediciones declaradas por el repo; no reproducidas hoy desde archivos WAV originales. |
| Conectores | https://github.com/Aptymok/kxtxr/blob/main/data/control-plane.json | Instagram/TikTok figuran como `UNCONFIGURED`; Spotify y Apple tienen catálogo observable, pero analíticas privadas requieren exportación de artista. | El diagnóstico histórico del repo no sustituye consulta de conexiones actual. |

## Contradicción temporal que requiere adjudicación

- `Aptymok/kxtxr` archivo `data/releases.json` declara `111.publication_date = 2026-11-21` y `state = QA_LOCK`, actualizado 26/09/2026.
- Apple Music y Amazon Music presentan `111` con fecha **2026-08-25**, anterior a la fecha declarada en el repo.
- **No elegir silenciosamente** entre lanzamiento de catálogo y fecha de un evento audiovisual u otro ciclo. Posibles explicaciones son semánticas distintas de publicación, metadatos desfasados o error; siguen siendo hipótesis.
- El smartlink público https://lnk.dmsmusic.co/kxtxrbleghlabel_rem618 muestra `REM 816` mientras su ruta refiere `rem618`. Conservar la discrepancia textual y verificar los metadatos del distribuidor antes de corregir.

## Regla para Reality Chain

1. Separar SOURCE declarada (`kxtxr` repo), catálogo de distribuidor, datos indexados de terceros y observación directamente autenticada.
2. Registrar `SOURCE_CONTRADICTION` para `111`; enlazar URLs y capturas/hashes cuando puedan conservarse bajo autorización.
3. Utilizar la página web, repositorio y materiales de archivo como entradas para cronología retrolongitudinal REM618 → 111 → QUE NO.
4. Los enlaces sociales son identificadores para investigación, **no cobertura de publicaciones**. Sin listado auténtico de posts no inferir cero emisiones.
5. Los análisis musicales previos pueden incorporarse como DERIVED_FROM_REPO (si se admite su fuente) sin presentarlos como streams, audiencia ni causalidad.
6. Mantener la distinción entre T0 del plan 90D (20/10/2026) y T0 del recorrido artístico más largo (al menos junio de 2026, sujeto a reconstrucción documental).

**Ninguna de estas observaciones autoriza escritura canónica en el caso institucional GATED, publicación, ejecución ni Passport final.**
