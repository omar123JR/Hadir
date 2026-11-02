USE eduflow_db;

-- 1. Add credit_hours, semester, capacity to courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS credit_hours INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS semester VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 50;

-- 2. Create course_grade_items table (teacher-configurable grade weights)
CREATE TABLE IF NOT EXISTS course_grade_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  course_id   VARCHAR(50)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  category    ENUM('attendance','assignments','midterm','final','other') NOT NULL,
  weight      DECIMAL(5,2) NOT NULL,
  max_score   DECIMAL(7,2) NOT NULL DEFAULT 100.00,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY uq_grade_item (course_id, category)
);

-- 3. Create student_grades table for individual grade item scores
CREATE TABLE IF NOT EXISTS student_grades (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  course_id       VARCHAR(50) NOT NULL,
  student_id      VARCHAR(50) NOT NULL,
  grade_item_id   INT NOT NULL,
  score           DECIMAL(7,2) DEFAULT NULL,
  version         INT NOT NULL DEFAULT 1,
  graded_by       VARCHAR(50) DEFAULT NULL,
  graded_at       TIMESTAMP   NULL,
  created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id)     REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (grade_item_id) REFERENCES course_grade_items(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by)     REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_student_grade (student_id, grade_item_id)
);

-- 4. Update enrollments table: add numeric score, letter grade, grade points
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS total_score   DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS letter_grade  VARCHAR(3)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grade_points  DECIMAL(3,2) DEFAULT NULL;

-- 5. Add token_version to users and admin_accounts for JWT revocation
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

ALTER TABLE admin_accounts
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

-- 6. Add version column to assignment_submissions for optimistic locking
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- 7. Add qr_secret to attendance_sessions for rotating dynamic QR codes
ALTER TABLE attendance_sessions
  ADD COLUMN IF NOT EXISTS qr_secret VARCHAR(64) DEFAULT NULL;
