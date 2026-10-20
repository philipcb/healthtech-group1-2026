#!/bin/sh
# Creates the login and aggregate roles/databases if they don't exist yet.
# Idempotent: safe to run on every deploy. Also re-syncs the role passwords with the env file.
# Runs inside the `db-init` one-shot service (see docker-compose.prd.yml), which gets its
# variables from ~/env/backend.env.
set -eu

export PGPASSWORD="$POSTGRES_PASSWORD"

psql -v ON_ERROR_STOP=1 -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v login_user="$LOGIN_USER" -v login_password="$LOGIN_PASSWORD" -v login_db="$LOGIN_DB" \
  -v agg_user="$AGGREGATE_USER" -v agg_password="$AGGREGATE_PASSWORD" -v agg_db="$AGGREGATE_DB" <<'SQL'

-- Roles
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'login_user', :'login_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'login_user') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'login_user', :'login_password') \gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'agg_user', :'agg_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'agg_user') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'agg_user', :'agg_password') \gexec

-- Databases
SELECT format('CREATE DATABASE %I OWNER %I', :'login_db', :'login_user')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'login_db') \gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'agg_db', :'agg_user')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'agg_db') \gexec
SQL

echo "Login and aggregate databases are ready."
