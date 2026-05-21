# RISK REGISTER

Fecha: 2026-05-21  
Fase: FASE 3A - registro documental de riesgos

Escala:

- Probabilidad: baja, media, alta.
- Impacto: bajo, medio, alto, critico.

| Riesgo | Probabilidad | Impacto | Mitigacion | Fase de mitigacion | Owner tecnico |
|---|---|---|---|---|---|
| Service role expuesto en handlers amplios | Alta | Critico | Encapsular service role en repos server-only, reducir imports, auditar escrituras. | FASE 3B+ | Security Core + DB Core |
| Webhooks sin firma/replay protection | Alta | Alto | Verificacion de firma, timestamp, idempotency key y raw body handling. | FASE 3B+ | Integration Core |
| Cron invocable sin identidad fuerte | Media | Alto | Cron secret, scheduler identity, locks e idempotencia. | FASE 3B+ | Worker/Integration Core |
| `field/persist` multiplexa demasiadas escrituras | Alta | Alto | Dividir comandos por dominio, schemas y ownership estricto. | FASE 4+ | Field Core + API |
| localStorage confundido con estado canonico | Alta | Medio | Etiquetar como cache/local_only, reconciliar con API. | FASE 4+ | Interface Core |
| CognitiveTwin produce inferencias sin lineage | Media | Alto | Mantener cuarentena, exigir eventos epistemicos y tests. | FASE 4+ | Agent Core |
| Agente experimental ejecuta acciones sin policy | Media | Critico | Prohibir writes directos, policy gate y audit logs. | FASE 4+ | Agent Core + Security Core |
| Secretos presentes en archivos del workspace | Alta | Critico | Rotacion, secret manager, git history review, secret scanning. | Inmediata / FASE 3B | Security Core |
| Apps futuras acceden directo a DB | Media | Alto | Workspaces + boundary checker + API contracts obligatorios. | FASE 2B/3B | API + DB Core |
| APIs sin schema validation | Alta | Alto | Zod/OpenAPI o validator nativo por endpoint antes de persistir. | FASE 3B+ | API Core |
| Falta de rate limiting durable | Media | Medio | Redis/Supabase-backed rate limits, per actor/source. | FASE 3B+ | Security Core |
| Root/system sin auditoria fuerte | Media | Critico | Audit log inmutable, reason codes, MFA posterior. | FASE 3B+ | Security Core |
| WorldSpect obsoleto presentado como vivo | Media | Alto | `SourceHealth`, freshness windows y estado `missing`. | FASE 4+ | Integration + Field Core |
| Eventos sin checksum | Media | Medio | Checksum canonico de payload y lineage. | FASE 3C+ | Events/API Contracts |
| Falta de RTO/RPO definidos | Media | Alto | Runbooks, backups, restore drills. | FASE 3A/3B | Ops |
| Dependencia de memoria global en proceso | Media | Medio | Migrar a event store o marcar como ephemeral. | FASE 4+ | Agent/Field Core |
| Falta de aislamiento de experimental | Media | Alto | Quarantine package, no DB direct, no service role. | FASE 3B+ | Agent Core |
| Package boundaries evadidos por aliases | Baja | Medio | Mejorar checker con TS resolver en fase futura. | FASE 3C+ | Workspace Core |
| Logs locales con datos sensibles | Media | Medio | Log redaction, retention policy, no secrets in logs. | FASE 3B+ | Ops/Security |
| Supply chain por dependencias nuevas | Media | Alto | No agregar deps sin threat review, lockfile review. | Continua | Workspace/Security |

