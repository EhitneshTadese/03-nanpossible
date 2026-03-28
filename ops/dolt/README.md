# Dolt migration ledger

This directory keeps a local Dolt repository for the migration audit trail.

What it tracks:

- `source_pages`: migrated page sources and safe-to-publish status
- `source_assets`: verified assets retained from the current WIAL domain
- `migration_runs`: import passes and skipped legacy items
- `seed_snapshots`: generated artifacts such as `supabase/seed.sql`

Usage:

```bash
npm run content:sync
npm run dolt:setup
npm run dolt:status
npm run dolt:log
```

The actual Dolt storage lives under `ops/dolt/repo/.dolt/` and is ignored by Git.
