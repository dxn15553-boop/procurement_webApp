const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const result = await pool.query('SELECT COUNT(*) FROM "ProcurementRequest"');
  console.log(`\n======================================`);
  console.log(`Total Procurement Requests in DB: ${result.rows[0].count}`);
  console.log(`======================================\n`);
  pool.end();
}

main().catch(console.error);
