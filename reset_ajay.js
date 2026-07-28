const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=([^\s]+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].replace(/['"]/g, '') : '';

async function main() {
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const passwordHash = await bcrypt.hash('ajay123', 12);
    const result = await pool.query(
      "UPDATE \"User\" SET \"passwordHash\" = $1 WHERE name ILIKE '%ajay%' RETURNING id, name, email",
      [passwordHash]
    );

    if (result.rows.length === 0) {
      console.log('User Ajay not found!');
    } else {
      for (const user of result.rows) {
        console.log(`Successfully updated password for ${user.name} (${user.email}) to ajay123`);
      }
    }
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

main();
