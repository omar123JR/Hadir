import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

// ─────────────────────────────────────────────────────────────
//  Domain used for all auto-generated emails
// ─────────────────────────────────────────────────────────────
const DOMAIN = 'example.com';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
const hash = async (pw: string) => bcrypt.hash(pw, 10);
const log  = (msg: string) => process.stdout.write(msg + '\n');

// ─────────────────────────────────────────────────────────────
//  RAW DATA from db-Copy.txt
//  Email is auto-derived:
//    student  → {student_id}@example.com   password = student_id
//    teacher  → {teacher_code}@example.com password = teacher_code
// ─────────────────────────────────────────────────────────────

interface RawStudent { id: string; name: string; department: string; }
interface RawTeacher { code: string; name: string; subject: string; }

const STUDENTS: RawStudent[] = [
  // ID, Name, Department
  { id: '2450191', name: 'ابراهيم الزغيد',       department: 'ذكاء اصطناعي'    },
  { id: '2450154', name: 'ابو القاسم الكوربو',    department: 'امن سيبراني'     },
  { id: '2340068', name: 'احمد الثني',            department: 'امن سيبراني'     }, // note: typo in source (سيراني) corrected
  { id: '2450076', name: 'احمد عريبي',            department: 'امن سيبراني'     },
  { id: '2450051', name: 'ادم طالب',              department: 'امن سيبراني'     },
  { id: '2450124', name: 'امين شنبش',             department: 'امن سيبراني'     },
  { id: '2340009', name: 'انس اللالي',            department: 'امن سيبراني'     },
  { id: '2450115', name: 'انس بن زيتون',          department: 'ذكاء اصطناعي'    },
  { id: '2340013', name: 'سند لطيف',              department: 'امن سيبراني'     },
  { id: '2340082', name: 'عبد الباري عبد الصمد',  department: 'امن سيبراني'     },
  { id: '2340040', name: 'عبد الرحمن مازق',       department: 'ذكاء اصطناعي'    },
  { id: '2340110', name: 'عبد المجيد المريض',     department: 'ذكاء اصطناعي'    },
  { id: '2340033', name: 'علي بي',                department: 'امن سيبراني'     }, // duplicate ID: suffix -A
  { id: '2340033-B', name: 'فرج العربي',          department: 'هندسة برمجيات'   }, // duplicate ID: suffix -B
  { id: '2450088', name: 'مراد سالم',             department: 'امن سيبراني'     },
  { id: '2340004', name: 'مروان العمامي',          department: 'امن سيبراني'     },
  { id: '2450134', name: 'يزيد المداغي',          department: 'امن سيبراني'     },
  { id: '2340035', name: 'عمر الجربي',            department: 'امن سيبراني'     },
  { id: '2340118', name: 'نفيسة ابورقيقة',        department: 'امن سيبراني'     },
  { id: '2340045', name: 'ضياء المقهور',          department: 'امن سيبراني'     },
  { id: '2340025', name: 'عبد الرحمن المجدوب',    department: 'امن سيبراني'     },
  { id: '2340062', name: 'جاد الازرملى',          department: 'امن سيبراني'     },
  { id: '2450136', name: 'روان الشكشوكي',         department: 'امن سيبراني'     },
  { id: '2450131', name: 'شهد المداغي',           department: 'امن سيبراني'     },
  { id: '2340077', name: 'عبد الملك المرغني',     department: 'امن سيبراني'     },
  { id: '2230001', name: 'سيف الدين العريفي',     department: 'امن سيبراني'     },
  { id: '2450132', name: 'مريم السمراء',          department: 'امن سيبراني'     },
  { id: '2340002', name: 'محمد القصبي',           department: 'امن سيبراني'     },
  { id: '2340056', name: 'حسن الكيب',             department: 'امن سيبراني'     },
  { id: '2340093', name: 'يوسف البوعزي',          department: 'امن سيبراني'     },
  { id: '2340016', name: 'نادر البكوش',           department: 'امن سيبراني'     },
  { id: '2340053', name: 'انس الجالي',            department: 'امن سيبراني'     },
  { id: '2450135', name: 'ريم الشكشوكي',          department: 'هندسة برمجيات'   },
  { id: '2340112', name: 'انس فتحي',              department: 'امن سيبراني'     },
  { id: '2340088', name: 'اسامة القمبري',         department: 'امن سيبراني'     },
  { id: '2450185', name: 'تسنيم الخوجه',          department: 'هندسة برمجيات'   },
];

const TEACHERS: RawTeacher[] = [
  { code: 'T0001', name: 'اسماء العصار',  subject: 'تصميم وهندسة برمجيات' },
  { code: 'T0002', name: 'حذيفة غولة',   subject: 'شبكات'                },
  { code: 'T0003', name: 'محمد الجهاني', subject: 'معمارية كمبيوتر'      },
  { code: 'T0004', name: 'حنان المركوس', subject: 'مقدمة في التشفير'     },
  { code: 'T0005', name: 'الاء الزواوي', subject: 'علم بيانات'           },
];

// ─────────────────────────────────────────────────────────────
//  Courses (based on subjects in db-Copy.txt section)
//  Each subject is taught by the teacher who has that subject
// ─────────────────────────────────────────────────────────────
interface RawCourse {
  id: string; code: string; name: string;
  teacherCode: string; description?: string;
}

const COURSES: RawCourse[] = [
  { id: 'C001', code: 'CS-SWD', name: 'تصميم وهندسة برمجيات',          teacherCode: 'T0001', description: 'مادة تصميم وهندسة البرمجيات'        },
  { id: 'C002', code: 'CS-NET', name: 'شبكات',                          teacherCode: 'T0002', description: 'أساسيات الشبكات والبروتوكولات'       },
  { id: 'C003', code: 'CS-ARC', name: 'معمارية كمبيوتر',                teacherCode: 'T0003', description: 'بنية وتنظيم الحاسوب'                 },
  { id: 'C004', code: 'CS-CRY', name: 'مقدمة في التشفير',               teacherCode: 'T0004', description: 'أساسيات التشفير وأمن المعلومات'       },
  { id: 'C005', code: 'CS-DAT', name: 'علم بيانات',                     teacherCode: 'T0005', description: 'مقدمة في علم البيانات والإحصاء'       },
  // extra subjects per specialization
  { id: 'C006', code: 'SEC-400', name: 'أمن سيبراني',                   teacherCode: 'T0002', description: 'حماية الأنظمة والشبكات'               },
  { id: 'C007', code: 'AI-ROB',  name: 'أنظمة الروبوتات الذكية',        teacherCode: 'T0005', description: 'مقدمة في الروبوتات والذكاء الاصطناعي' },
  { id: 'C008', code: 'SE-QA',   name: 'اختبار البرمجيات وضمان الجودة', teacherCode: 'T0001', description: 'منهجيات اختبار البرمجيات وضمان الجودة' },
];

// Enrollments: map departments to courses
// امن سيبراني    → C001 C002 C003 C004 C005 C006
// ذكاء اصطناعي  → C001 C002 C003 C004 C005 C007
// هندسة برمجيات → C001 C002 C003 C004 C005 C008
const DEPT_COURSES: Record<string, string[]> = {
  'امن سيبراني':   ['C001','C002','C003','C004','C005','C006'],
  'ذكاء اصطناعي':  ['C001','C002','C003','C004','C005','C007'],
  'هندسة برمجيات': ['C001','C002','C003','C004','C005','C008'],
};

// ─────────────────────────────────────────────────────────────
//  Seeding functions
// ─────────────────────────────────────────────────────────────

async function seedAdmins() {
  log('\n👑 Seeding admins…');
  const admins = [
    { username: 'admin',  password: 'admin123' },
    { username: 'admin1', password: 'admin123' },
    { username: 'admin2', password: 'admin123' },
  ];
  for (const a of admins) {
    const [ex] = await pool.execute<any[]>('SELECT id FROM admin_accounts WHERE username=?', [a.username]);
    if (ex.length) { log(`  ⏭  ${a.username} already exists`); continue; }
    await pool.execute(
      'INSERT INTO admin_accounts (username, password_hash, is_active) VALUES (?,?,1)',
      [a.username, await hash(a.password)]
    );
    log(`  ✅  admin: ${a.username}`);
  }
}

async function seedTeachers() {
  log('\n🏫 Seeding teachers…');
  for (const t of TEACHERS) {
    const email = `${t.code}@${DOMAIN}`;   // e.g. T0001@example.com
    const pw    = t.code;                  // default password = teacher code

    const [ex] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE id=? OR email=?', [t.code, email]
    );
    if (ex.length) { log(`  ⏭  ${email} already exists`); continue; }

    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, role, teacher_code, department, is_active)
       VALUES (?,?,?,?,?,?,?,1)`,
      [t.code, t.name, email, await hash(pw), 'teacher', t.code, t.subject]
    );
    log(`  ✅  teacher: ${email} | pass: ${pw}`);
  }
}

async function seedStudents() {
  log('\n🎓 Seeding students…');
  for (const s of STUDENTS) {
    // For duplicates (e.g. 2340033-B) derive display student_id without suffix
    const displayId = s.id.includes('-') ? s.id.split('-')[0] : s.id;
    const email     = `${s.id}@${DOMAIN}`;   // 2340033-B@example.com stays unique
    const pw        = displayId;              // password = numeric ID portion

    const [ex] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE id=? OR email=?', [s.id, email]
    );
    if (ex.length) { log(`  ⏭  ${email} already exists`); continue; }

    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, department, is_active)
       VALUES (?,?,?,?,?,?,?,1)`,
      [s.id, s.name, email, await hash(pw), 'student', s.id, s.department]
    );
    log(`  ✅  student: ${email} | pass: ${pw}`);
  }
}

async function seedCourses() {
  log('\n📚 Seeding courses…');
  for (const c of COURSES) {
    const [ex] = await pool.execute<any[]>(
      'SELECT id FROM courses WHERE id=? OR code=?', [c.id, c.code]
    );
    if (ex.length) { log(`  ⏭  ${c.code} already exists`); continue; }

    await pool.execute(
      'INSERT INTO courses (id, code, name, teacher_id, description) VALUES (?,?,?,?,?)',
      [c.id, c.code, c.name, c.teacherCode, c.description ?? null]
    );
    log(`  ✅  course: ${c.code} – ${c.name}`);
  }
}

async function seedEnrollments() {
  log('\n📝 Seeding enrollments…');
  let count = 0;
  for (const s of STUDENTS) {
    const courseIds = DEPT_COURSES[s.department] ?? [];
    for (const cid of courseIds) {
      const [ex] = await pool.execute<any[]>(
        'SELECT id FROM enrollments WHERE course_id=? AND student_id=?', [cid, s.id]
      );
      if (ex.length) continue;

      // Make sure the course and student exist before inserting
      const [courseEx] = await pool.execute<any[]>('SELECT id FROM courses WHERE id=?', [cid]);
      const [studentEx] = await pool.execute<any[]>('SELECT id FROM users WHERE id=?', [s.id]);
      if (!courseEx.length || !studentEx.length) continue;

      await pool.execute(
        "INSERT INTO enrollments (course_id, student_id, status) VALUES (?,?,'active')",
        [cid, s.id]
      );
      count++;
    }
  }
  log(`  ✅  ${count} enrollments created`);
}

// ─────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────
async function main() {
  log('🌱 Starting database seed…\n');
  try {
    await seedAdmins();
    await seedTeachers();
    await seedStudents();
    await seedCourses();
    await seedEnrollments();

    log('\n✅  Seed complete!\n');
    log('─────────────────────────────────────────');
    log('📋  Demo login credentials:');
    log('  Admin:   admin / admin123');
    log('  Teacher: T0001@example.com / T0001');
    log('  Teacher: T0002@example.com / T0002');
    log('  Student: 2450191@example.com / 2450191');
    log('  Student: 2340068@example.com / 2340068');
    log('─────────────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

main();
