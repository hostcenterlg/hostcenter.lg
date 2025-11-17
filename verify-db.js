const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('═══════════════════════════════════════════');
console.log('  DATABASE VERIFICATION');
console.log('═══════════════════════════════════════════\n');

console.log('Database path:', dbPath);
console.log('\nTables created:\n');

// Get all tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

tables.forEach((table, index) => {
  console.log(`${(index + 1).toString().padStart(2, ' ')}. ${table.name}`);

  // Get table info
  const columns = db.prepare(`PRAGMA table_info("${table.name}")`).all();

  console.log('    Columns:');
  columns.forEach(col => {
    const nullable = col.notnull ? '' : ' (nullable)';
    const pk = col.pk ? ' [PK]' : '';
    const defVal = col.dflt_value ? ` = ${col.dflt_value}` : '';
    console.log(`    - ${col.name}: ${col.type}${nullable}${pk}${defVal}`);
  });

  // Get foreign keys
  const fks = db.prepare(`PRAGMA foreign_key_list("${table.name}")`).all();
  if (fks.length > 0) {
    console.log('    Foreign Keys:');
    fks.forEach(fk => {
      console.log(`    - ${fk.from} -> ${fk.table}.${fk.to}`);
    });
  }

  console.log('');
});

console.log('═══════════════════════════════════════════');
console.log(`Total tables: ${tables.length}`);
console.log('Database created successfully! ✓');
console.log('═══════════════════════════════════════════');

db.close();
