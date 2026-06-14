# SFI Operational Patch P01 · Membrana Operacional

Este parche no borra ni mueve módulos existentes. Agrega una capa operacional mínima para que el sitio deje de ser una colección de superficies y empiece a exponer un estado central del organismo SFI.

## Agregado

- `src/lib/operational/organs.ts`
- `src/app/api/sfi/operational-state/route.ts`
- `src/app/scorefriction-operational/page.tsx`
- `src/app/api/publisher/draft/route.ts`
- `src/app/api/market/opportunities/route.ts`
- `src/app/api/governance/access-request/route.ts`

## Resultado esperado

Ruta pública Next:

- `/scorefriction-operational`

API central:

- `/api/sfi/operational-state`

Stubs institucionales:

- `/api/publisher/draft`
- `/api/market/opportunities`
- `/api/governance/access-request`

## Qué hace

Declara los órganos vivos, parciales, latentes y ausentes:

1. ScoreFriction
2. Evaluator / MIHM
3. AMV + Gemelo Cognitivo
4. Observatorio Longitudinal
5. Laboratorio de Intervención
6. Archivo / Memoria
7. Publicador
8. Mercado / Oportunidades
9. Gobernanza
10. Expansión

## Qué no hace todavía

- No escribe a Supabase.
- No publica en Medium ni LinkedIn.
- No entrega el motor generador.
- No mueve experimental a cuarentena.
- No borra rutas existentes.

## Siguiente parche recomendado

P02 debe conectar `/api/sfi/operational-state` con datos reales de:

- `/api/scorefriction/state`
- `/api/worldspect/state`
- `/api/mihm/process`
- `/api/amv/state`
- `/api/events/append`
- `/api/root/evidence`

## Aplicación

Copiar este ZIP sobre el repo actual o reemplazar el repo local con el paquete entregado.

Comandos:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Después abrir:

```text
http://localhost:3000/scorefriction-operational
http://localhost:3000/api/sfi/operational-state
```
