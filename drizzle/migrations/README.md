# Empower18 opportunity migrations

The immutable `0000_petite_luckman.sql` schema migration is intentionally unchanged. Apply the incremental migrations in filename order only after reviewing them against the hosted Supabase database:

- `0001_enable_rls.sql` enables the existing row-level-security policies.
- `0002_high_miss_america.sql` adds unique protection for canonical URLs and `(source_id, source_record_id)` pairs.
- `0003_mixed_blizzard.sql` adds nullable `category` and `route` fields plus lookup indexes.

These migrations were generated and inspected locally. They were **not applied automatically** to the hosted database by this implementation. Before applying them, check for duplicate non-null canonical URLs or source records and verify that existing records can accept nullable route/category fields.
