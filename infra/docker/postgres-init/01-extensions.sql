-- AqarFlow — PostgreSQL extensions
-- Runs on first DB initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy/Arabic search
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- composite GIN indexes
-- PostGIS deferred to production (not required in MVP — coordinates stored as Decimal)
