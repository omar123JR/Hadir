import fs from 'fs';
import path from 'path';

const routesDir = path.join(__dirname, '../src/routes');

// adminRoutes.ts
let admin = fs.readFileSync(path.join(routesDir, 'adminRoutes.ts'), 'utf-8');
if (!admin.includes('validateRequest')) {
  admin = admin.replace(`import { ROLES } from '../utils/permissions';`, `import { ROLES } from '../utils/permissions';\nimport { validateRequest } from '../middleware/validator';\nimport { createUserSchema, updateUserSchema, resetPasswordSchema, getUsersSchema } from '../schemas/user.schema';\nimport { createCourseSchema, updateCourseSchema, getCoursesSchema } from '../schemas/course.schema';`);
  admin = admin.replace(`router.get('/users', async`, `router.get('/users', validateRequest(getUsersSchema), async`);
  admin = admin.replace(`router.post('/users', async`, `router.post('/users', validateRequest(createUserSchema), async`);
  admin = admin.replace(`router.put('/users/:id', async`, `router.put('/users/:id', validateRequest(updateUserSchema), async`);
  admin = admin.replace(`router.post('/users/:id/password', async`, `router.post('/users/:id/password', validateRequest(resetPasswordSchema), async`);
  admin = admin.replace(`router.get('/courses', async`, `router.get('/courses', validateRequest(getCoursesSchema), async`);
  admin = admin.replace(`router.post('/courses', async`, `router.post('/courses', validateRequest(createCourseSchema), async`);
  admin = admin.replace(`router.put('/courses/:id', async`, `router.put('/courses/:id', validateRequest(updateCourseSchema), async`);
  fs.writeFileSync(path.join(routesDir, 'adminRoutes.ts'), admin);
}

// courseRoutes.ts
let course = fs.readFileSync(path.join(routesDir, 'courseRoutes.ts'), 'utf-8');
// Currently no POST/PUT in courseRoutes, only GET. 

// lectureRoutes.ts
let lecture = fs.readFileSync(path.join(routesDir, 'lectureRoutes.ts'), 'utf-8');
if (!lecture.includes('validateRequest')) {
  lecture = lecture.replace(`import { ROLES } from '../utils/permissions';`, `import { ROLES } from '../utils/permissions';\nimport { validateRequest } from '../middleware/validator';\nimport { createLectureSchema, updateLectureSchema } from '../schemas/lecture.schema';`);
  lecture = lecture.replace(`router.post('/', authorize(ROLES.TEACHER), async`, `router.post('/', authorize(ROLES.TEACHER), validateRequest(createLectureSchema), async`);
  lecture = lecture.replace(`router.put('/:id', authorize(ROLES.TEACHER), checkLectureOwnership, async`, `router.put('/:id', authorize(ROLES.TEACHER), checkLectureOwnership, validateRequest(updateLectureSchema), async`);
  fs.writeFileSync(path.join(routesDir, 'lectureRoutes.ts'), lecture);
}

// assignmentRoutes.ts
let assignment = fs.readFileSync(path.join(routesDir, 'assignmentRoutes.ts'), 'utf-8');
if (!assignment.includes('validateRequest')) {
  assignment = assignment.replace(`import { ROLES } from '../utils/permissions';`, `import { ROLES } from '../utils/permissions';\nimport { validateRequest } from '../middleware/validator';\nimport { createAssignmentSchema, updateAssignmentSchema, gradeSubmissionSchema } from '../schemas/assignment.schema';`);
  assignment = assignment.replace(`router.post('/', authorize(ROLES.TEACHER), async`, `router.post('/', authorize(ROLES.TEACHER), validateRequest(createAssignmentSchema), async`);
  assignment = assignment.replace(`router.put('/:id', authorize(ROLES.TEACHER), checkAssignmentOwnership, async`, `router.put('/:id', authorize(ROLES.TEACHER), checkAssignmentOwnership, validateRequest(updateAssignmentSchema), async`);
  assignment = assignment.replace(`router.post('/:id/submissions/:studentId/grade', authorize(ROLES.TEACHER), checkAssignmentOwnership, async`, `router.post('/:id/submissions/:studentId/grade', authorize(ROLES.TEACHER), checkAssignmentOwnership, validateRequest(gradeSubmissionSchema), async`);
  fs.writeFileSync(path.join(routesDir, 'assignmentRoutes.ts'), assignment);
}

// attendanceRoutes.ts
let attendance = fs.readFileSync(path.join(routesDir, 'attendanceRoutes.ts'), 'utf-8');
if (!attendance.includes('validateRequest')) {
  attendance = attendance.replace(`import { ROLES } from '../utils/permissions';`, `import { ROLES } from '../utils/permissions';\nimport { validateRequest } from '../middleware/validator';\nimport { createSessionSchema, getSessionsSchema, markAttendanceSchema, recordAttendanceByStudentSchema } from '../schemas/attendance.schema';`);
  attendance = attendance.replace(`router.post('/sessions', authorize(ROLES.TEACHER), async`, `router.post('/sessions', authorize(ROLES.TEACHER), validateRequest(createSessionSchema), async`);
  attendance = attendance.replace(`router.get('/sessions', authorize(ROLES.TEACHER), async`, `router.get('/sessions', authorize(ROLES.TEACHER), validateRequest(getSessionsSchema), async`);
  attendance = attendance.replace(`router.post('/mark', authorize(ROLES.TEACHER), async`, `router.post('/mark', authorize(ROLES.TEACHER), validateRequest(markAttendanceSchema), async`);
  attendance = attendance.replace(`router.post('/record', authorize(ROLES.STUDENT), async`, `router.post('/record', authorize(ROLES.STUDENT), validateRequest(recordAttendanceByStudentSchema), async`);
  fs.writeFileSync(path.join(routesDir, 'attendanceRoutes.ts'), attendance);
}

console.log('Schemas injected.');
