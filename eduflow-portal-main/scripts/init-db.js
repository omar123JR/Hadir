const fs = require('fs');
const path = require('path');

const seed = {
  admins: [
    { username: 'admin1', password: 'admin123' },
    { username: 'admin2', password: 'admin123' },
  ],
  users: [
    { id: '2', name: 'د. أحمد علي', email: 'ahmed@university.edu', role: 'teacher', department: 'علوم الحاسوب' },
    { id: '3', name: 'د. مها السعيد', email: 'maha@university.edu', role: 'teacher', department: 'الذكاء الاصطناعي' },
    { id: '4', name: 'أيمن محمد', email: 'ayman@student.edu', role: 'student', studentId: '20251034', department: 'علوم الحاسوب' },
    { id: '5', name: 'سارة أحمد', email: 'sara@student.edu', role: 'student', studentId: '20251035', department: 'علوم الحاسوب' },
    { id: '2450191', name: 'ابراهيم الزغيد', email: '2450191@student.edu', role: 'student', studentId: '2450191', department: 'ذكاء اصطناعي' },
    { id: '2450154', name: 'ابو القاسم الكوربو', email: '2450154@student.edu', role: 'student', studentId: '2450154', department: 'امن سيبراني' },
    { id: '2340068', name: 'احمد الثني', email: '2340068@student.edu', role: 'student', studentId: '2340068', department: 'امن سيبراني' },
    { id: '2450076', name: 'احمد عريبي', email: '2450076@student.edu', role: 'student', studentId: '2450076', department: 'امن سيبراني' },
    { id: '2450051', name: 'ادم طالب', email: '2450051@student.edu', role: 'student', studentId: '2450051', department: 'امن سيبراني' },
    { id: '2450124', name: 'امين شنبش', email: '2450124@student.edu', role: 'student', studentId: '2450124', department: 'امن سيبراني' },
    { id: '2340009', name: 'انس اللالي', email: '2340009@student.edu', role: 'student', studentId: '2340009', department: 'امن سيبراني' },
    { id: '2450115', name: 'انس بن زيتون', email: '2450115@student.edu', role: 'student', studentId: '2450115', department: 'ذكاء اصطناعي' },
    { id: '2340013', name: 'سند لطيف', email: '2340013@student.edu', role: 'student', studentId: '2340013', department: 'امن سيبراني' },
    { id: '2340082', name: 'عبد الباري عبد الصمد', email: '2340082@student.edu', role: 'student', studentId: '2340082', department: 'امن سيبراني' },
    { id: '2340040', name: 'عبد الرحمن مازق', email: '2340040@student.edu', role: 'student', studentId: '2340040', department: 'ذكاء اصطناعي' },
    { id: '2340110', name: 'عبد المجيد المريض', email: '2340110@student.edu', role: 'student', studentId: '2340110', department: 'ذكاء اصطناعي' },
    { id: '2340033', name: 'علي بي', email: '2340033@student.edu', role: 'student', studentId: '2340033', department: 'امن سيبراني' },
    { id: '2340033-2', name: 'فرج العربي', email: '2340033-2@student.edu', role: 'student', studentId: '2340033-2', department: 'هندسة برمجيات' },
    { id: '2450088', name: 'مراد سالم', email: '2450088@student.edu', role: 'student', studentId: '2450088', department: 'امن سيبراني' },
    { id: '2340004', name: 'مروان العمامي', email: '2340004@student.edu', role: 'student', studentId: '2340004', department: 'امن سيبراني' },
    { id: '2450134', name: 'يزيد المداغي', email: '2450134@student.edu', role: 'student', studentId: '2450134', department: 'امن سيبراني' },
    { id: '2340035', name: 'عمر الجربي', email: '2340035@student.edu', role: 'student', studentId: '2340035', department: 'امن سيبراني' },
    { id: '2340118', name: 'نفيسة ابورريقية', email: '2340118@student.edu', role: 'student', studentId: '2340118', department: 'امن سيبراني' },
    { id: '2340045', name: 'ضياء المقهور', email: '2340045@student.edu', role: 'student', studentId: '2340045', department: 'امن سيبراني' },
    { id: '2340025', name: 'عبد الرحمن المجدوب', email: '2340025@student.edu', role: 'student', studentId: '2340025', department: 'امن سيبراني' },
    { id: '2340062', name: 'جاد الازرملى', email: '2340062@student.edu', role: 'student', studentId: '2340062', department: 'امن سيبراني' },
    { id: '2450136', name: 'روان الشكشوكي', email: '2450136@student.edu', role: 'student', studentId: '2450136', department: 'امن سيبراني' },
    { id: '2450131', name: 'شهد المداغي', email: '2450131@student.edu', role: 'student', studentId: '2450131', department: 'امن سيبراني' },
    { id: '2340077', name: 'عبد الملك المرغني', email: '2340077@student.edu', role: 'student', studentId: '2340077', department: 'امن سيبراني' },
    { id: '2230001', name: 'سيف الدين العريفي', email: '2230001@student.edu', role: 'student', studentId: '2230001', department: 'امن سيبراني' },
    { id: '2450132', name: 'مريم السمراء', email: '2450132@student.edu', role: 'student', studentId: '2450132', department: 'امن سيبراني' },
    { id: '2340002', name: 'محمد القصبي', email: '2340002@student.edu', role: 'student', studentId: '2340002', department: 'امن سيبراني' },
    { id: '2340056', name: 'حسن الكيب', email: '2340056@student.edu', role: 'student', studentId: '2340056', department: 'امن سيبراني' },
    { id: '2340093', name: 'يوسف البوعزي', email: '2340093@student.edu', role: 'student', studentId: '2340093', department: 'امن سيبراني' },
    { id: '2340016', name: 'نادر البكوش', email: '2340016@student.edu', role: 'student', studentId: '2340016', department: 'امن سيبراني' },
    { id: '2340053', name: 'انس الجالي', email: '2340053@student.edu', role: 'student', studentId: '2340053', department: 'امن سيبراني' },
    { id: '2450135', name: 'ريم الشكشوكي', email: '2450135@student.edu', role: 'student', studentId: '2450135', department: 'هندسة برمجيات' },
    { id: '2340112', name: 'انس فتحي', email: '2340112@student.edu', role: 'student', studentId: '2340112', department: 'امن سيبراني' },
    { id: '2340088', name: 'اسامة القمبري', email: '2340088@student.edu', role: 'student', studentId: '2340088', department: 'امن سيبراني' },
    { id: '2450185', name: 'تسنيم الخوجه', email: '2450185@student.edu', role: 'student', studentId: '2450185', department: 'هندسة برمجيات' },
    { id: '0001', name: 'اسماء العصار', email: 'asmaa@university.edu', role: 'teacher', department: 'تصميم وهندسة برمجيات' },
    { id: '0002', name: 'حذيفة غولة', email: 'huthaifa@university.edu', role: 'teacher', department: 'شبكات' },
    { id: '0003', name: 'محمد الجهاني', email: 'mohammedj@university.edu', role: 'teacher', department: 'معمارية كمبيوتر' },
    { id: '0004', name: 'حنان المركوس', email: 'hanan@university.edu', role: 'teacher', department: 'تشفير' },
    { id: '0005', name: 'الاء الزواوي', email: 'alaa@university.edu', role: 'teacher', department: 'علم بيانات' },
  ],
};

const outDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'seed.json');
fs.writeFileSync(outFile, JSON.stringify(seed, null, 2), 'utf8');

console.log('Seed written to', outFile);
console.log('You can import src/data/seed.json or run app to use the data.');
