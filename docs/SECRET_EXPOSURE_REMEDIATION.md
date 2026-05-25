# SECRET EXPOSURE REMEDIATION

Fecha: 2026-05-22
Fase: FASE 10B - Secret exposure remediation plan

## Objetivo

Definir plan controlado para:

- sacar secretos del repo/workspace;
- rotar credenciales;
- reducir superficie de exposicion;
- evitar reinfeccion operacional.

FASE 10B no modifica secretos reales.

## Principio rector

Un secreto comprometido no se "protege".

Se considera:

- observable;
- potencialmente filtrado;
- revocable;
- rotatable.

## Inventario potencial de superficies sensibles

Revisar:

- `.env`
- `.env.production`
- `.env.local`
- `.env.*`
- `vercel env`
- GitHub Actions secrets
- Supabase service role keys
- Postgres URLs
- Stripe secrets
- OAuth client secrets
- WhatsApp webhook secrets
- API tokens
- local scripts
- exported backups
- CI artifacts
- shell history
- docs con ejemplos reales
- screenshots
- logs serializados
- tsconfig build artifacts

## Riesgo actual

Si secretos estuvieron:

- committeados;
- push a GitHub;
- compartidos;
- usados en screenshots;
- serializados en logs;

Entonces deben considerarse potencialmente expuestos.

## Orden recomendado de remediacion

1. Inventario completo.
2. Activar secret scanning.
3. Congelar nuevos commits sensibles.
4. Separar entornos local/staging/production.
5. Rotar secrets externos.
6. Rotar DB credentials.
7. Rotar Supabase service role.
8. Rotar OAuth credentials.
9. Invalidar tokens legacy.
10. Revisar historial Git.
11. Aplicar protection rules.
12. Revalidar CI/CD.

## Revisar historial Git

Revisar:

- commits antiguos;
- ramas abandonadas;
- tags;
- forks;
- PR comments;
- Actions logs;
- cached artifacts.

Herramientas posibles:

- git filter-repo
- BFG Repo-Cleaner
- GitHub secret scanning
- trufflehog
- gitleaks

## Activar secret scanning

Recomendado:

- GitHub Advanced Security si existe acceso;
- push protection;
- branch protection;
- PR review obligatoria;
- secret scanning alerts.

## Separacion de environments

Definir:

- `.env.local` → desarrollo local
- `.env.staging` → staging
- production secrets → provider runtime only

Nunca:

- commitear production env;
- compartir secrets por chat;
- usar mismo secreto en todos los entornos.

## Politica de no commit

Agregar reglas:

- `.env*` ignorados;
- hooks pre-commit;
- scanners pre-push;
- CI scanning;
- policy review.

## Riesgos si se hace mal

- downtime;
- lockout de servicios;
- invalidacion OAuth;
- corrupcion CI/CD;
- perdida de webhooks;
- drift entre entornos;
- ruptura de workers;
- invalidacion de sesiones.

## Rollback operativo

Antes de rotar:

- snapshot configuracion;
- backup env mapping;
- registrar dependencias;
- documentar owners;
- definir ventana;
- definir rollback.

Rollback:

- restaurar secret previo;
- restaurar deployment previo;
- restaurar provider config;
- verificar webhooks;
- verificar DB connections;
- verificar Actions.

## Estado actual

FASE 10B solo documenta.

No:

- elimina secrets;
- rota secrets;
- modifica runtime;
- modifica CI;
- modifica providers.
