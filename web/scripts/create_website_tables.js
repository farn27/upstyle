import mysql from 'mysql2/promise';

async function createWebsiteTables() {
    try {
        console.log("Creating website and social media tables...");

        const connectionString = "mysql://root:@localhost:3306/finance_engine_db";
        const pool = mysql.createPool(connectionString);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS website_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                unit_id INT NOT NULL,
                domain_slug VARCHAR(100) NOT NULL UNIQUE,
                theme VARCHAR(50) DEFAULT 'modern',
                color_primary VARCHAR(10) DEFAULT '#4F46E5',
                hero_title VARCHAR(255),
                hero_subtitle TEXT,
                about_us TEXT,
                contact_phone VARCHAR(30),
                contact_email VARCHAR(100),
                contact_address TEXT,
                facebook_url VARCHAR(255),
                instagram_url VARCHAR(255),
                is_published BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS social_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                unit_id INT NOT NULL,
                platform VARCHAR(50) NOT NULL,
                caption TEXT NOT NULL,
                image_url VARCHAR(255),
                scheduled_at DATETIME,
                status VARCHAR(20) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE
            );
        `);

        console.log("Tables created successfully!");
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("Error creating tables:", err);
        process.exit(1);
    }
}

createWebsiteTables();
