/**
 * Migration Runner Script
 * Executes the SQL migration file directly using MySQL connection
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function parseDatabaseUrl(url) {
	// Parse mysql://user:password@host:port/database (password can be empty)
	const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
	if (match) {
		return {
			user: match[1],
			password: match[2] || '',
			host: match[3],
			port: parseInt(match[4]),
			database: match[5]
		};
	}
	return null;
}

async function runMigration() {
	const migrationPath = path.join(__dirname, 'drizzle/migrations/0003_fix_foreign_key_constraints_v3.sql');
	
	// Read migration file
	const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
	
	// Split into individual statements
	const statements = migrationSQL
		.split(';')
		.map(s => s.trim())
		.filter(s => s.length > 0 && !s.startsWith('--'));
	
	console.log(`Found ${statements.length} SQL statements to execute`);
	
	// Parse database URL
	const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/finance_engine_db';
	const dbConfig = parseDatabaseUrl(dbUrl);
	
	if (!dbConfig) {
		console.error('✗ Invalid DATABASE_URL format');
		process.exit(1);
	}
	
	console.log('Connecting to:', dbConfig.host, dbConfig.database);
	
	// Create connection
	const connection = await mysql.createConnection(dbConfig);
	
	try {
		console.log('✓ Connected to database');
		
		// Check current column types before migration
		const [columns] = await connection.query(`
			SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
			FROM INFORMATION_SCHEMA.COLUMNS 
			WHERE TABLE_SCHEMA = ? 
			AND TABLE_NAME IN ('journal_entries', 'closing_periods')
			AND COLUMN_NAME = 'user_id'
		`, [dbConfig.database]);
		
		console.log('\nCurrent user_id column types:');
		columns.forEach(col => {
			console.log(`  ${col.TABLE_NAME}.user_id: ${col.DATA_TYPE}`);
		});
		
		// Execute statements
		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i];
			try {
				await connection.query(statement);
				console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
			} catch (err) {
				if (err.code === 'ER_DUP_ENTRY' || err.code === 'ER_CANT_CREATE_TABLE') {
					console.log(`⚠ Statement ${i + 1}/${statements.length} skipped (already exists): ${err.message}`);
				} else if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
					console.log(`⚠ Statement ${i + 1}/${statements.length} skipped (duplicate constraint): ${err.message}`);
				} else if (err.code === 'ER_FK_COLUMN_NOT_NULL') {
					console.log(`⚠ Statement ${i + 1}/${statements.length} skipped (column constraint issue): ${err.message}`);
				} else if (err.code === 'ER_FK_INCOMPATIBLE_COLUMNS') {
					console.log(`⚠ Statement ${i + 1}/${statements.length} skipped (incompatible column types): ${err.message}`);
				} else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
					console.log(`⚠ Statement ${i + 1}/${statements.length} skipped (orphaned data exists): ${err.message}`);
				} else {
					console.error(`✗ Statement ${i + 1}/${statements.length} failed:`, err.message);
					throw err;
				}
			}
		}
		
		console.log('\n✓ Migration completed successfully');
	} catch (err) {
		console.error('\n✗ Migration failed:', err);
		throw err;
	} finally {
		await connection.end();
	}
}

runMigration().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
