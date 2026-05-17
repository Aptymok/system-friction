-- =====================================================
-- NORMALIZACIÓN FINAL user_id -> auth.users(id)
-- =====================================================

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE telemetry_sources
  DROP CONSTRAINT IF EXISTS telemetry_sources_user_id_fkey,
  ADD CONSTRAINT telemetry_sources_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE external_signals
  DROP CONSTRAINT IF EXISTS external_signals_user_id_fkey,
  ADD CONSTRAINT external_signals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE cognitive_snapshots
  DROP CONSTRAINT IF EXISTS cognitive_snapshots_user_id_fkey,
  ADD CONSTRAINT cognitive_snapshots_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE episodic_memory
  DROP CONSTRAINT IF EXISTS episodic_memory_user_id_fkey,
  ADD CONSTRAINT episodic_memory_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE licenses
  DROP CONSTRAINT IF EXISTS licenses_user_id_fkey,
  ADD CONSTRAINT licenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;