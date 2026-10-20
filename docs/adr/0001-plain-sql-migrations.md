# ADR 0001: Plain SQL migrations with a small runner

## Status
Accepted — 2026-10-20

## Context
The test asks for "database initial and migration" steps that a reviewer can run on a fresh machine. The schema is three tables. Options were an ORM with its own migration tool (Prisma, TypeORM), a query builder (Knex) or plain SQL files.

## Decision
Migrations are plain `.sql` files in `backend/db/migrations`, applied in filename order by `db/migrate.js`. Each file runs in its own transaction and is recorded in `schema_migrations`. Queries use `pg` with parameters everywhere.

## Alternatives considered
- **Prisma** – generated client and migration history are convenient, but it adds an engine binary, a schema DSL and a generate step to the install guide, which is a lot for three tables.
- **Knex** – good migration tooling, but migrations would be JS builders instead of the SQL a reviewer can paste into `psql`.

## Consequences
- The schema is readable as-is and can be checked with `psql -f`.
- There are no down-migrations; a rollback is a new forward migration.
- Data access is hand-written SQL (`src/services/weeksRepo.js`), so the column↔field mapping is done in code (`normalizeDays`).
