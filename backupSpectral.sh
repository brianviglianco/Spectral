#!/bin/bash

# backupSpectral.sh - Fixed version for macOS

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="spectral_backup_${TIMESTAMP}.tar.gz"
BACKUP_DIR="$HOME/Desktop/SpectralBackups"

echo -e "${GREEN}=== SPECTRAL BACKUP SYSTEM ===${NC}"
echo "Timestamp: ${TIMESTAMP}"
echo "Backup file: ${BACKUP_NAME}"
echo "Working directory: $(pwd)"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check what exists to backup
echo -e "${YELLOW}Checking directories...${NC}"
DIRS_TO_BACKUP=""
FILES_TO_BACKUP=""

if [ -d "backend" ]; then
    echo "✓ backend/ found"
    DIRS_TO_BACKUP="$DIRS_TO_BACKUP backend"
fi

if [ -d "reports" ]; then
    echo "✓ reports/ found"
    DIRS_TO_BACKUP="$DIRS_TO_BACKUP reports"
fi

# Check for mjs files
if ls *.mjs 1> /dev/null 2>&1; then
    echo "✓ *.mjs files found"
    FILES_TO_BACKUP="$FILES_TO_BACKUP *.mjs"
fi

# Check for package files
if [ -f "package.json" ]; then
    echo "✓ package.json found"
    FILES_TO_BACKUP="$FILES_TO_BACKUP package.json"
fi

if [ -f "package-lock.json" ]; then
    echo "✓ package-lock.json found"
    FILES_TO_BACKUP="$FILES_TO_BACKUP package-lock.json"
fi

if [ -f ".env" ]; then
    echo "✓ .env found"
    FILES_TO_BACKUP="$FILES_TO_BACKUP .env"
fi

echo ""

# Count files to backup
if [ -n "$DIRS_TO_BACKUP" ]; then
    FILE_COUNT=$(find $DIRS_TO_BACKUP -type f 2>/dev/null | wc -l | tr -d ' ')
else
    FILE_COUNT=0
fi

echo -e "${YELLOW}Total files to backup: ${FILE_COUNT}${NC}"
echo ""

# Create the tar archive
echo -e "${GREEN}Creating backup...${NC}"

# Build tar command
TAR_CMD="tar -czf $BACKUP_DIR/$BACKUP_NAME"
TAR_CMD="$TAR_CMD --exclude=node_modules"
TAR_CMD="$TAR_CMD --exclude=*.log"
TAR_CMD="$TAR_CMD --exclude=.git"
TAR_CMD="$TAR_CMD --exclude=screenshots"
TAR_CMD="$TAR_CMD --exclude=*.tmp"
TAR_CMD="$TAR_CMD --exclude=*.cache"
TAR_CMD="$TAR_CMD --exclude=.DS_Store"

# Add items to backup
if [ -n "$DIRS_TO_BACKUP" ]; then
    TAR_CMD="$TAR_CMD $DIRS_TO_BACKUP"
fi

if [ -n "$FILES_TO_BACKUP" ]; then
    TAR_CMD="$TAR_CMD $FILES_TO_BACKUP"
fi

# Execute tar
eval $TAR_CMD 2>/dev/null

# Check if backup was created successfully
if [ -f "$BACKUP_DIR/$BACKUP_NAME" ]; then
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
    
    echo -e "${GREEN}✅ BACKUP SUCCESSFUL${NC}"
    echo "Location: $BACKUP_DIR/$BACKUP_NAME"
    echo "Size: $BACKUP_SIZE"
    echo ""
    
    # Create restore script
    RESTORE_SCRIPT="$BACKUP_DIR/restore_${TIMESTAMP}.sh"
    cat > "$RESTORE_SCRIPT" << EOF
#!/bin/bash
# Auto-generated restore script for backup $TIMESTAMP

BACKUP_FILE="\$1"

if [ -z "\$BACKUP_FILE" ]; then
    echo "Usage: ./restore_${TIMESTAMP}.sh $BACKUP_NAME"
    echo "Or provide full path to backup file"
    exit 1
fi

# If only filename provided, assume it's in current directory
if [ ! -f "\$BACKUP_FILE" ]; then
    if [ -f "$BACKUP_DIR/\$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/\$BACKUP_FILE"
    else
        echo "Error: Backup file not found: \$BACKUP_FILE"
        exit 1
    fi
fi

echo "WARNING: This will restore Spectral to the backed up state"
echo "Current files will be overwritten!"
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! \$REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 1
fi

# Change to Spectral directory
cd ~/Desktop/Spectral

# Extract backup
echo "Restoring from: \$BACKUP_FILE"
tar -xzf "\$BACKUP_FILE"

echo "✅ Restore complete"
echo "Run 'npm install' to restore node_modules"
EOF
    
    chmod +x "$RESTORE_SCRIPT"
    echo -e "${YELLOW}Restore script created: $(basename $RESTORE_SCRIPT)${NC}"
    
    # List last 5 backups
    echo ""
    echo -e "${GREEN}Recent backups:${NC}"
    ls -lht "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -5 | while read line; do
        echo "  $line"
    done
    
    echo ""
    echo -e "${GREEN}=== BACKUP COMPLETE ===${NC}"
    echo "To restore: $BACKUP_DIR/restore_${TIMESTAMP}.sh $BACKUP_NAME"
    echo "Safe to proceed with development!"
    
else
    echo -e "${RED}❌ BACKUP FAILED${NC}"
    echo "Debug info:"
    echo "  Working dir: $(pwd)"
    echo "  Backup dir: $BACKUP_DIR"
    echo "  Dirs found: $DIRS_TO_BACKUP"
    echo "  Files found: $FILES_TO_BACKUP"
    exit 1
fi