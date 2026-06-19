# SFI Supabase Rehydration

Purpose: clean operational noise and rehydrate Supabase with real SFI canonical history.

This pipeline does not touch `auth.users`.
It inventories `profiles` but does not reset it by default.

## Required env

`.env.local` must contain:

```txt
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SYSTEM_ROOT_EMAIL=...
```

## Execution

```powershell
cd "D:\system friction"
npm run db:export
npm run db:inventory
$env:SFI_DB_RESET_CONFIRM="RESET_SFI_OPERATIONAL"; npm run db:reset:sfi
Remove-Item Env:SFI_DB_RESET_CONFIRM
npm run db:seed:sfi
npm run db:verify:sfi
npm run typecheck
npm run build
```

## Principle

Do not fake history. Seed only from canonical files already present in the repository or exported Supabase data.

If an insert fails because a table schema differs, the script records the failure in `docs/db/SFI_SEED_REPORT_*.json`. Fix schema or mapping. Do not invent columns.