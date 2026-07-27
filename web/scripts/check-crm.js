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
  } else {
    const [unitRows] = await connection.query('SELECT * FROM unit_bisnis LIMIT 1');
    unit = unitRows[0];
  }

  if (!unit) {
    console.error('No unit found matching:', target, userArg ? `user_id=${userArg}` : '');
    process.exit(1);
  }

  try {
    const [rowsContacts] = await connection.query('SELECT COUNT(*) as c FROM crm_contacts WHERE unit_id = ?', [unit.id]);
    const [rowsDeals] = await connection.query('SELECT COUNT(*) as c FROM crm_deals WHERE unit_id = ?', [unit.id]);
    const [rowsActivities] = await connection.query('SELECT COUNT(*) as c FROM crm_activities WHERE unit_id = ?', [unit.id]);
    const [rowsTasks] = await connection.query('SELECT COUNT(*) as c FROM crm_tasks WHERE unit_id = ?', [unit.id]);

    console.log('Unit:', unit.id, unit.slug, 'user_id=', unit.user_id);
    console.log('Contacts:', rowsContacts[0].c);
    console.log('Deals:', rowsDeals[0].c);
    console.log('Activities:', rowsActivities[0].c);
    console.log('Tasks:', rowsTasks[0].c);
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

main();
