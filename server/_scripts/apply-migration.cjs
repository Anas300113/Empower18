const sql = require('postgres').default({
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  username: 'postgres.nasefnbffsdxzjplzfmh',
  password: 'SkyBlue@123!',
  max: 1,
});

async function main() {
  const fs = require('fs');
  const migration = fs.readFileSync('drizzle/migrations/0006_fix_user_roles_rls.sql', 'utf8');
  await sql.unsafe(migration);
  console.log('Migration applied successfully');
  await sql.end();
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});