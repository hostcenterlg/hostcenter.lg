const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Read the SQL file
const sqlFile = path.join(__dirname, 'prisma', 'init.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Create database
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Creating database...');

// Execute SQL statements
const statements = sql.split(';').filter(s => s.trim());
for (const statement of statements) {
  if (statement.trim()) {
    try {
      db.exec(statement);
    } catch (err) {
      console.error('Error executing statement:', statement.substring(0, 100));
      console.error(err.message);
    }
  }
}

console.log('Database created successfully at:', dbPath);

// Verify tables were created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\nTables created:');
tables.forEach(table => console.log('  -', table.name));

db.close();
