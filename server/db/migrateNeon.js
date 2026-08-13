import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_n3uCa2lXqIRb@ep-plain-truth-awv6z84e.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function runMigration() {
  console.log("Connecting to Neon PostgreSQL database...");
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log("Reading schema.sql...");
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'server', 'db', 'schema.sql'), 'utf-8');
    
    console.log("Applying production schema to Neon database...");
    await client.query(schemaSql);
    console.log("✅ Production PostgreSQL Database Schema applied successfully!");

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log("Tables created:", res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
