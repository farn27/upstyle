import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../src/lib/server/schema.js';

async function main() {
  const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'finance_engine_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

    const db = drizzle(connection, { schema, mode: 'default', logger: false });

  try {
    // Find a unit via raw query to ensure column names match DB
    const [unitRows] = await connection.query('SELECT * FROM unit_bisnis LIMIT 1');
    const unit = unitRows[0];
    if (!unit) {
      console.error('No unit found in unit_bisnis table. Create a unit first.');
      process.exit(1);
    }

    const ownerId = unit.user_id || unit.userId || 1;

    // Insert company (raw SQL)
    const [companyRes] = await connection.query(
      'INSERT INTO crm_companies (owner_id, unit_id, nama, alamat, industri, tags, created_at) VALUES (?,?,?,?,?,?,NOW())',
      [ownerId, unit.id, 'Acme Sample Co', 'Jl. Contoh No.1', 'Retail', 'sample,seed']
    );
    const companyId = companyRes.insertId || null;

    // Insert contact
    const [contactRes] = await connection.query(
      'INSERT INTO crm_contacts (owner_id, unit_id, nama, telepon, email, perusahaan, company_id, stage, sumber, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())',
      [ownerId, unit.id, 'Budi Customer', '+62811234567', 'budi@example.com', 'Acme Sample Co', companyId, 'lead', 'seed']
    );
    const contactId = contactRes.insertId || null;

    // Insert an activity
    await connection.query(
      'INSERT INTO crm_activities (owner_id, unit_id, kontak_id, tipe, catatan, tanggal) VALUES (?,?,?,?,?,NOW())',
      [ownerId, unit.id, contactId, 'Call', 'Seed call: follow up sample lead']
    );

    // Insert a task (no deal_id)
    await connection.query(
      'INSERT INTO crm_tasks (owner_id, unit_id, kontak_id, deal_id, deskripsi, status, created_at) VALUES (?,?,?,?,?,?,NOW())',
      [ownerId, unit.id, contactId, null, 'Follow up Budi for sample deal', 'pending']
    );

    console.log('Seed CRM data inserted for unit:', unit.slug || unit.id);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
