-- ============================================================
--  EduFlow DB Schema  –  domain: example.com
--  Run this file ONCE to create/reset the full database.
-- ============================================================

DROP DATABASE IF EXISTS eduflow_db;
CREATE DATABASE eduflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eduflow_db;

-- ─────────────────────────────────────────────────────────────
--  users  (students + teachers)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id           VARCHAR(50)  PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,   -- IDnumber@example.com
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('teacher','student') NOT NULL,
  student_id   VARCHAR(50)  UNIQUE,            -- numeric enrolment number
  teacher_code VARCHAR(20)  UNIQUE,            -- e.g. T0001
  department   VARCHAR(150),
  avatar       VARCHAR(255),
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP    NULL
);

CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_role       ON users(role);

-- ─────────────────────────────────────────────────────────────
--  admin_accounts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE admin_accounts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
--  courses
-- ─────────────────────────────────────────────────────────────
CREATE TABLE courses (
  id          VARCHAR(50)  PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id  VARCHAR(50),
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE INDEX idx_courses_teacher ON courses(teacher_id);

-- ─────────────────────────────────────────────────────────────
--  enrollments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE enrollments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  course_id   VARCHAR(50)  NOT NULL,
  student_id  VARCHAR(50)  NOT NULL,
  status      ENUM('active','dropped') DEFAULT 'active',
  enrolled_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE KEY uq_enrollment (course_id, student_id)
);

-- ─────────────────────────────────────────────────────────────
--  lectures
-- ─────────────────────────────────────────────────────────────
CREATE TABLE lectures (
  id          VARCHAR(50)  PRIMARY KEY,
  course_id   VARCHAR(50)  NOT NULL,
  title       VARCHAR(255) NOT NULL,
  date        DATE         NOT NULL,
  file_url    VARCHAR(500),
  file_name   VARCHAR(255),
  file_size   VARCHAR(50),
  file_type   VARCHAR(50),
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ─────────────────────────────────────────────────────────────
--  assignments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE assignments (
  id          VARCHAR(50)  PRIMARY KEY,
  course_id   VARCHAR(50)  NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  due_date    TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ─────────────────────────────────────────────────────────────
--  assignment_submissions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE assignment_submissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id VARCHAR(50)  NOT NULL,
  student_id    VARCHAR(50)  NOT NULL,
  file_url      VARCHAR(500),
  file_name     VARCHAR(255),
  status        ENUM('pending','submitted','graded') DEFAULT 'submitted',
  grade         VARCHAR(10),
  percentage    DECIMAL(5,2),
  feedback      TEXT,
  submitted_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  graded_at     TIMESTAMP    NULL,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  FOREIGN KEY (student_id)    REFERENCES users(id),
  UNIQUE KEY uq_submission (assignment_id, student_id)
);

-- ─────────────────────────────────────────────────────────────
--  attendance_sessions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE attendance_sessions (
  id          VARCHAR(50)  PRIMARY KEY,
  course_id   VARCHAR(50)  NOT NULL,
  date        DATE         NOT NULL,
  time        TIME         NOT NULL,
  qr_code     VARCHAR(30)  NOT NULL UNIQUE,
  status      ENUM('active','closed') DEFAULT 'active',
  created_by  VARCHAR(50),
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  closed_at   TIMESTAMP    NULL,
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_sessions_course  ON attendance_sessions(course_id);
CREATE INDEX idx_sessions_qr_code ON attendance_sessions(qr_code);

-- ─────────────────────────────────────────────────────────────
--  attendance_records
-- ─────────────────────────────────────────────────────────────
CREATE TABLE attendance_records (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      VARCHAR(50) NOT NULL,
  student_id      VARCHAR(50) NOT NULL,
  attendance_time TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  method          ENUM('qr','manual') DEFAULT 'qr',
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE KEY uq_attendance (session_id, student_id)
);

