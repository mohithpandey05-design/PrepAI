const { pool, initializeDatabase } = require('./config/database');
const dotenv = require('dotenv');

dotenv.config();

async function migrateData() {
  console.log('--- Optional MongoDB to MySQL Migration Utility ---');
  await initializeDatabase();
  console.log('MySQL ready for data migration.');
  console.log('Migration utility completed.');
  process.exit(0);
}

if (require.main === module) {
  migrateData().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrateData;
