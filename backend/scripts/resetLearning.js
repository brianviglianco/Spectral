#!/usr/bin/env node

// resetLearning.js - Reset learning database
'use strict';

const fs = require('fs');
const path = require('path');

const LEARNING_DB_PATH = path.join(__dirname, '../data/cookie_learning.json');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

async function resetLearning(keepBackup = true) {
    console.log('[Reset Learning] Starting...');
    
    // Create backup if requested
    if (keepBackup && fs.existsSync(LEARNING_DB_PATH)) {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `cookie_learning_${timestamp}.json`);
        
        const data = fs.readFileSync(LEARNING_DB_PATH, 'utf8');
        fs.writeFileSync(backupPath, data);
        console.log(`[Reset Learning] Backup saved to: ${path.basename(backupPath)}`);
        
        // Show what we're losing
        try {
            const oldData = JSON.parse(data);
            console.log('[Reset Learning] Previous stats:');
            console.log(`  - Patterns: ${Object.keys(oldData.patterns || {}).length}`);
            console.log(`  - Domains: ${Object.keys(oldData.domains || {}).length}`);
            console.log(`  - Global patterns: ${Object.keys(oldData.globalPatterns || {}).length}`);
        } catch(e) {
            // Ignore
        }
    }
    
    // Create fresh learning database
    const freshData = {
        patterns: {},
        domains: {},
        cooccurrence: {},
        confidence: {},
        globalPatterns: {}
    };
    
    // Ensure data directory exists
    const dataDir = path.dirname(LEARNING_DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(LEARNING_DB_PATH, JSON.stringify(freshData, null, 2));
    console.log('[Reset Learning] Learning database reset successfully');
    console.log('[Reset Learning] The system will now learn from scratch');
}

// Main execution
const args = process.argv.slice(2);
const noBackup = args.includes('--no-backup');

if (args.includes('--help')) {
    console.log('Usage: node resetLearning.js [--no-backup]');
    console.log('  --no-backup    Don\'t create a backup before resetting');
    process.exit(0);
}

resetLearning(!noBackup).catch(console.error);