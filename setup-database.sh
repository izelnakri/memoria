#!/bin/sh
set -oe allexport

# Wait for Postgres to become available.
until psql -h $PGHOST -U "$PGUSER" -c '\q' 2>/dev/null; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

echo "\nPostgres is available: continuing with database setup..."
