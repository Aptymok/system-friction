# Transversal QA

## Commands

```bash
npm run typecheck
npm run build
```

`npm run lint` puede ejecutarse como referencia, pero si falla con `Invalid project directory provided, no such directory: D:\system friction\lint`, documentar el resultado y no mezclar esa reparación con esta tarea.

## Smoke

Con el servidor local activo:

```bash
curl http://localhost:3000/
curl http://localhost:3000/login
curl http://localhost:3000/contact
curl http://localhost:3000/instruments
curl http://localhost:3000/surfaces
curl http://localhost:3000/api/sfi/surfaces
curl http://localhost:3000/api/signals/state
curl http://localhost:3000/api/scorefriction/state
curl -X POST http://localhost:3000/api/sfi/media/render \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SFI-QA-001\",\"provider\":\"auto\",\"assets\":[\"text\",\"markdown\",\"json\",\"image\"],\"prompt\":\"QA transversal\"}"
```

## Expected results

- `GET /` muestra landing institucional con navegación real.
- `GET /login` muestra un login normal sin `LoginNeuralAccess`, `ThresholdAccess`, nodos ni canvas.
- `GET /contact` muestra contacto institucional y `mailto`.
- `GET /instruments` lista MIHM, ScoreFriction, SFI-PSI, WorldSpectrumVector y ROOT.
- `GET /surfaces` lista superficies, estados, rutas, conexiones y notas.
- `GET /api/sfi/surfaces` devuelve `{ ok: true, surfaces, generatedAt }` sin tocar Supabase.
- `GET /api/signals/state` puede devolver estado o error explícito si Supabase/migración no están disponibles.
- `GET /api/scorefriction/state` debe responder sin romper la ruta.
- `POST /api/sfi/media/render` devuelve `provider: "deterministic"` y assets locales; imagen/video/audio no deben declararse generados si no hay proveedor real.
