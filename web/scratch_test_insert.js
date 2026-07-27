import mysql from 'mysql2/promise';

async function run() {
    const pool = mysql.createPool({
        uri: 'mysql://root:@localhost:3306/finance_engine_db'
    });
    
    try {
        console.log("Testing insert employee...");
        // Get a unit_bisnis and user id
        const [units] = await pool.query('SELECT id, user_id FROM unit_bisnis LIMIT 1');
        if (units.length === 0) {
            console.log("No unit_bisnis found");
            return;
        }
        const unitId = units[0].id;
        const userId = units[0].user_id;

        const [result] = await pool.query(`
            INSERT INTO employees (
                company_id, user_id, full_name, slug, role, position, salary, status
            ) VALUES (?, ?, 'Test User', 'test-user-123', 'staff', 'Tester', 5000000, 'active')
        `, [unitId, userId]);
        
        console.log("Insert success!", result.insertId);
        
        // Clean up
        await pool.query('DELETE FROM employees WHERE id = ?', [result.insertId]);
        console.log("Clean up success!");
    } catch(err) {
        console.error("Insert failed:", err.message);
    } finally {
        pool.end();
    }
}
run();
