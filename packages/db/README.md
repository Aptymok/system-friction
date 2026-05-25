# packages/db

Repositorios, schemas, migrations y adaptadores Supabase/Postgres.

Responsabilidad declarada:
- centralizar acceso a datos en repositorios;
- evitar que apps accedan directo a base de datos;
- contener schemas y migraciones futuras.

Limites:
- no toca migraciones Supabase actuales durante FASE 2A;
- no conecta DB;
- no mueve `src/lib/supabase`;
- no introduce ORM nuevo.

