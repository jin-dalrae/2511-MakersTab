#!/bin/bash

# MakersTab Database Restore Script
# Usage: ./restore_db.sh <backup_file>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -lh /app/backups/makerstab_backup_*.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="meal_plan_tracker"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will restore the database from: $BACKUP_FILE"
echo "All current data will be replaced!"
read -p "Are you sure? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Starting restore at $(date)"

# Drop existing database
mongosh mongodb://localhost:27017/${DB_NAME} --quiet --eval "db.dropDatabase()"

# Restore from backup
mongorestore --uri="mongodb://localhost:27017" \
  --db=${DB_NAME} \
  --archive=${BACKUP_FILE} \
  --gzip

echo "Database restored successfully at $(date)"
echo "Please restart the application: sudo supervisorctl restart backend"
