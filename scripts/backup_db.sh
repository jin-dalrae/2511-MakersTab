#!/bin/bash

# MakersTab Database Backup Script
# Run daily via cron: 0 2 * * * /app/scripts/backup_db.sh

set -e

BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="meal_plan_tracker"
BACKUP_FILE="${BACKUP_DIR}/makerstab_backup_${TIMESTAMP}.gz"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "Starting backup at $(date)"

# Create backup with mongodump
mongodump --uri="mongodb://localhost:27017" \
  --db=${DB_NAME} \
  --archive=${BACKUP_FILE} \
  --gzip

echo "Backup created: ${BACKUP_FILE}"

# Get backup size
BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Delete backups older than RETENTION_DAYS
find ${BACKUP_DIR} -name "makerstab_backup_*.gz" -mtime +${RETENTION_DAYS} -delete
echo "Old backups cleaned up (older than ${RETENTION_DAYS} days)"

# Count remaining backups
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/makerstab_backup_*.gz 2>/dev/null | wc -l)
echo "Total backups: ${BACKUP_COUNT}"

echo "Backup completed successfully at $(date)"

# Optional: Send notification (uncomment if needed)
# curl -X POST https://your-webhook-url.com \
#   -H "Content-Type: application/json" \
#   -d "{\"message\":\"MakersTab backup completed: ${BACKUP_SIZE}\"}"
