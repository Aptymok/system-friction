# Known Gaps

## Auth and access

- Login neural fue removido de `/login`; los componentes visuales legacy pueden seguir existiendo si otros imports los requieren.
- `/root` requiere rol `root` o `system`, o que el email coincida con `SYSTEM_ROOT_EMAIL`.
- Las rutas protegidas preservan `next` hacia `/login`; si no hay sesión, no deben redirigir por defecto a `/terminal`.

## Local validation

- `npm run lint` puede fallar por el problema existente: `Invalid project directory provided, no such directory: D:\system friction\lint`.
- Supabase runtime puede fallar localmente si variables de entorno, certificados o conectividad no están listos.
- APIs que requieren DB deben declarar error sin fingir `ok`.

## Operational surfaces

- `/api/sfi/media/render` es determinístico local, no generador real de imagen, video o audio.
- Si se solicitan `image`, `video` o `audio`, el endpoint devuelve metadata con `not_generated_locally`.
- Visualizaciones de `ScoreFriction Operational` quedan marcadas como `visualizacion local / no medicion directa` cuando no tienen dato real.
- SFI-PSI necesita que la migración `20260616120000_create_persistent_signal_instrument.sql` esté aplicada para persistir señales.

## Instrument integration

- SFI-PSI queda conectado a ROOT como panel `Signals` y a `/api/signals/state`, pero la persistencia depende de Supabase.
- `/api/sfi/surfaces` es introspectivo/estático y no verifica disponibilidad runtime de cada API.
