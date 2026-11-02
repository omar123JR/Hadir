const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'Backend/.env' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduflow_db',
  });

  console.log('Connected to database...');

  const [cols] = await conn.execute('DESCRIBE courses');
  const colNames = cols.map(c => c.Field);

  if (!colNames.includes('schedule_day')) {
    console.log('Adding schedule_day column...');
    await conn.execute("ALTER TABLE courses ADD COLUMN schedule_day VARCHAR(100) NULL DEFAULT 'الأحد - الثلاثاء'");
  }

  if (!colNames.includes('schedule_time')) {
    console.log('Adding schedule_time column...');
    await conn.execute("ALTER TABLE courses ADD COLUMN schedule_time VARCHAR(100) NULL DEFAULT '09:00 ص - 10:30 ص'");
  }

  if (!colNames.includes('room')) {
    console.log('Adding room column...');
    await conn.execute("ALTER TABLE courses ADD COLUMN room VARCHAR(100) NULL DEFAULT 'قاعة 101'");
  }

  // Populate existing courses with nice realistic classrooms and schedules
  await conn.execute(`
    UPDATE courses 
    SET 
      schedule_day = COALESCE(schedule_day, 'الأحد - الثلاثاء'),
      schedule_time = COALESCE(schedule_time, '09:00 ص - 10:30 ص'),
      room = COALESCE(room, 'قاعة الخوارزمي (204)')
    WHERE room IS NULL OR room = '' OR schedule_day IS NULL
  `);

  console.log('Migration completed successfully!');
  await conn.end();
}

migrate().catch(console.error);
