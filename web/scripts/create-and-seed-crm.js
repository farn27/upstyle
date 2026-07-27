import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'finance_engine_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Create tables if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS crm_companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        unit_id INT NOT NULL,
        nama VARCHAR(150) NOT NULL,
        alamat TEXT,
        industri VARCHAR(100),
        tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS crm_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        unit_id INT NOT NULL,
        nama VARCHAR(150) NOT NULL,
        telepon VARCHAR(30),
        email VARCHAR(100),
        perusahaan VARCHAR(150),
        company_id INT,
        stage VARCHAR(50) DEFAULT 'lead',
        sumber VARCHAR(80) DEFAULT 'manual',
        tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS crm_deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        unit_id INT NOT NULL,
        kontak_id INT,
        company_id INT,
        nama_deal VARCHAR(200) NOT NULL,
        nilai DECIMAL(15,2) DEFAULT '0.00',
        stage VARCHAR(50) DEFAULT 'prospek',
        sales_owner_id INT,
        status ENUM('open','won','lost','stagnant') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS crm_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        unit_id INT NOT NULL,
        kontak_id INT,
        tipe ENUM('Call','WA','Meeting','Email','Task') NOT NULL,
        catatan TEXT,
        tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS crm_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        unit_id INT NOT NULL,
        kontak_id INT,
        deal_id INT,
        deskripsi TEXT NOT NULL,
        deadline DATETIME,
        status ENUM('pending','done') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Choose unit: optional first CLI arg is slug or id; optional second arg is user id for duplicate slugs
    const target = process.argv[2];
    const userArg = process.argv[3];
    let unit;

    if (target) {
      if (/^\d+$/.test(target) && !userArg) {
        const [rows] = await connection.query('SELECT * FROM unit_bisnis WHERE id = ? LIMIT 1', [Number(target)]);
        unit = rows[0];
      } else if (target && userArg && /^\d+$/.test(userArg)) {
        const [rows] = await connection.query(
          'SELECT * FROM unit_bisnis WHERE slug = ? AND user_id = ? LIMIT 1',
          [target, Number(userArg)]
        );
        unit = rows[0];
      } else {
        const [rows] = await connection.query('SELECT * FROM unit_bisnis WHERE slug = ? LIMIT 1', [target]);
        unit = rows[0];
      }

      if (!unit) {
        console.error('No unit found matching:', target, userArg ? `user_id=${userArg}` : '');
        process.exit(1);
      }
    } else {
      const [unitRows] = await connection.query('SELECT * FROM unit_bisnis LIMIT 1');
      unit = unitRows[0];
      if (!unit) {
        console.error('No unit found in unit_bisnis table. Create a unit first.');
        process.exit(1);
      }
    }

    const explicitOwnerId = userArg && /^\d+$/.test(userArg) ? Number(userArg) : undefined;
    const ownerId = explicitOwnerId || unit.user_id || unit.userId || 1;
    console.log('Seeding unit:', unit.id, unit.slug, 'unit.user_id=', unit.user_id, 'ownerId=', ownerId);

    // Insert sample company
    const [companyRes] = await connection.query(
      'INSERT INTO crm_companies (owner_id, unit_id, nama, alamat, industri, tags, created_at) VALUES (?,?,?,?,?,?,NOW())',
      [ownerId, unit.id, 'Acme Sample Co', 'Jl. Contoh No.1', 'Retail', 'seed']
    );
    const companyId = companyRes.insertId;

    // Insert sample contact
    const [contactRes] = await connection.query(
      'INSERT INTO crm_contacts (owner_id, unit_id, nama, telepon, email, perusahaan, company_id, stage, sumber, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())',
      [ownerId, unit.id, 'Budi Customer', '+62811234567', 'budi@example.com', 'Acme Sample Co', companyId, 'lead', 'seed']
    );
    const contactId = contactRes.insertId;

    // Insert sample activity
    await connection.query(
      'INSERT INTO crm_activities (owner_id, unit_id, kontak_id, tipe, catatan, tanggal) VALUES (?,?,?,?,?,NOW())',
      [ownerId, unit.id, contactId, 'Call', 'Seed call: follow up sample lead']
    );

    // Insert sample task
    await connection.query(
      'INSERT INTO crm_tasks (owner_id, unit_id, kontak_id, deal_id, deskripsi, status, created_at) VALUES (?,?,?,?,?,?,NOW())',
      [ownerId, unit.id, contactId, null, 'Follow up Budi for sample deal', 'pending']
    );

    console.log('CRM tables ensured and sample data inserted for unit:', unit.slug || unit.id);
    process.exit(0);
  } catch (err) {
    console.error('Create/seed failed:', err);
    process.exit(1);
  }
}

main();
