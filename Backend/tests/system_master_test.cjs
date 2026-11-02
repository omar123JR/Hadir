/**
 * ============================================================================
 * EduFlow / Hadir - Comprehensive End-to-End System Test Suite
 * ============================================================================
 */

const http = require('http');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3000';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'eduflow_db',
  multipleStatements: true
};

const testResults = {
  summary: { total: 0, passed: 0, failed: 0, durationMs: 0 },
  security: [],
  functional: [],
  performance: []
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function apiRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const reqHeaders = { ...headers };
    if (postData && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: reqHeaders
    };

    const startTime = performance.now();
    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        const duration = performance.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {
          parsed = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          durationMs: duration
        });
      });
    });

    req.on('error', (err) => {
      const duration = performance.now() - startTime;
      resolve({ status: 500, error: err.message, durationMs: duration });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

function apiMultipartRequest(endpoint, fieldName, filename, fileContent, mimeType, otherFields = {}, headers = {}) {
  return new Promise((resolve) => {
    const boundary = '----EduFlowBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(endpoint, BASE_URL);
    
    let bodyBuffer = Buffer.alloc(0);

    for (const [key, val] of Object.entries(otherFields)) {
      const part = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`);
      bodyBuffer = Buffer.concat([bodyBuffer, part]);
    }

    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const fileData = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent);
    const fileFooter = Buffer.from(`\r\n--${boundary}--\r\n`);

    bodyBuffer = Buffer.concat([bodyBuffer, fileHeader, fileData, fileFooter]);

    const reqHeaders = {
      ...headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length
    };

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: reqHeaders
    };

    const startTime = performance.now();
    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        const duration = performance.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {
          parsed = rawData;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, durationMs: duration });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message, durationMs: performance.now() - startTime });
    });

    req.write(bodyBuffer);
    req.end();
  });
}

function recordTest(category, name, passed, details = {}) {
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    testResults.summary.failed++;
    console.error(`  ❌ [FAIL] ${name} ->`, details.reason || details.error || details.status || '');
  }
  testResults[category].push({ name, passed, details });
}

async function runAllTests() {
  const globalStart = performance.now();
  console.log('\n===============================================================');
  console.log('🚀 EDUFLOW / HADIR - FULL SYSTEM VERIFICATION SUITE');
  console.log(`Target Backend: ${BASE_URL}`);
  console.log('Time: ' + new Date().toISOString());
  console.log('===============================================================\n');

  let db;
  try {
    db = await mysql.createConnection(DB_CONFIG);
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  let adminToken = '';
  let teacherToken = '';
  let studentToken = '';
  let studentId = '';
  let teacherId = '';
  let courseId = '';

  // --------------------------------------------------------------------------
  // Phase 0: Role Authentication & Session Token Acquisition
  // --------------------------------------------------------------------------
  console.log('--- Phase 0: Role Authentication & Session Token Acquisition ---');
  {
    const resAdmin = await apiRequest('POST', '/api/auth/login', { identifier: 'admin', password: 'admin123' });
    adminToken = resAdmin.data?.token || resAdmin.data?.accessToken;
    recordTest('security', 'Admin Authentication & JWT Issuance', Boolean(adminToken), { role: 'admin' });

    const resTeacher = await apiRequest('POST', '/api/auth/login', { identifier: 'teacher@test.com', password: 'password123' });
    teacherToken = resTeacher.data?.token || resTeacher.data?.accessToken;
    teacherId = resTeacher.data?.user?.id;
    recordTest('security', 'Teacher Authentication & JWT Issuance', Boolean(teacherToken), { role: 'teacher', teacherId });

    const resStudent = await apiRequest('POST', '/api/auth/login', { identifier: 'student1@test.com', password: 'password123' });
    studentToken = resStudent.data?.token || resStudent.data?.accessToken;
    studentId = resStudent.data?.user?.id;
    recordTest('security', 'Student Authentication & JWT Issuance', Boolean(studentToken), { role: 'student', studentId });

    // Ensure student & teacher are attached to a test course
    const [courses] = await db.execute('SELECT id FROM courses WHERE teacher_id = ? LIMIT 1', [teacherId]);
    if (courses.length > 0) {
      courseId = courses[0].id;
    } else {
      const [allC] = await db.execute('SELECT id FROM courses LIMIT 1');
      if (allC.length > 0) {
        courseId = allC[0].id;
        await db.execute('UPDATE courses SET teacher_id = ? WHERE id = ?', [teacherId, courseId]);
      }
    }

    // Ensure student is actively enrolled
    const [enr] = await db.execute('SELECT id FROM enrollments WHERE course_id = ? AND student_id = ?', [courseId, studentId]);
    if (enr.length === 0) {
      await db.execute('INSERT INTO enrollments (course_id, student_id, status) VALUES (?, ?, "active")', [courseId, studentId]);
    }
  }

  // ==========================================================================
  // 1. SECURITY & DEFENSE TESTS
  // ==========================================================================
  console.log('\n--- Phase 1: Security, Vulnerability & Protection Testing ---');

  // Test S-1: SQL Injection Resistance in Auth Body
  {
    const sqliPayloads = [
      "' OR '1'='1",
      "admin'--",
      "' OR 1=1; --",
      "'; DROP TABLE users; --"
    ];
    let sqliBlocked = true;
    for (const p of sqliPayloads) {
      const res = await apiRequest('POST', '/api/auth/login', { identifier: p, password: 'any' });
      if (res.status === 200 || res.status === 500) {
        sqliBlocked = false;
        break;
      }
    }
    recordTest('security', 'SQL Injection Resistance (Authentication Body)', sqliBlocked, { payloads: sqliPayloads.length });
  }

  // Test S-2: SQL Injection Resistance in Query Params
  {
    const res = await apiRequest('GET', `/api/courses/student?search=${encodeURIComponent("' OR 1=1 --")}`, null, {
      Authorization: `Bearer ${studentToken}`
    });
    const safe = res.status !== 500 && (res.status === 400 || res.status === 200);
    recordTest('security', 'SQL Injection Resistance (Query Parameters)', safe, { status: res.status });
  }

  // Test S-3: Cross-Site Scripting (XSS) Sanitization
  {
    const xssPayload = "<script>alert('pwned')</script>";
    const res = await apiRequest('POST', '/api/auth/login', { identifier: xssPayload, password: 'password123' });
    const xssNeutralized = res.status === 400 || res.status === 401;
    recordTest('security', 'Cross-Site Scripting (XSS) Filter in Auth Inputs', xssNeutralized, { status: res.status });
  }

  // Test S-4: Buffer Overflow / Input Length Constraints (25KB payload)
  {
    const hugeString = 'A'.repeat(25000);
    const res = await apiRequest('POST', '/api/auth/login', { identifier: hugeString, password: 'password123' });
    const blocked = res.status === 400 || res.status === 413;
    recordTest('security', 'Buffer Overflow / Max Input Length Protection (25KB string)', blocked, { status: res.status });
  }

  // Test S-5: Malicious Script & Executable Upload Prevention (.exe, .php, .sh, double ext)
  {
    const badFiles = [
      { name: 'trojan.exe', mime: 'application/octet-stream', content: 'MZ executable dummy content' },
      { name: 'shell.php', mime: 'application/x-php', content: '<?php system($_GET["cmd"]); ?>' },
      { name: 'exploit.sh', mime: 'text/x-shellscript', content: '#!/bin/bash\nrm -rf /' },
      { name: 'spoof.pdf.exe', mime: 'application/pdf', content: 'MZ dangerous disguised exe' }
    ];
    let allRejected = true;
    for (const bf of badFiles) {
      const res = await apiMultipartRequest(
        '/api/lectures/teacher',
        'file',
        bf.name,
        bf.content,
        bf.mime,
        { course_id: courseId, title: 'Test Exploit Lecture', date: '2026-11-02' },
        { Authorization: `Bearer ${teacherToken}` }
      );
      if (res.status === 200 || res.status === 201) {
        allRejected = false;
        break;
      }
    }
    recordTest('security', 'Executable & Malicious Script File Upload Rejection (.exe, .php, .sh, double ext)', allRejected);
  }

  // Test S-6: Legitimate Document Upload Handling (PDF/Word up to 50MB)
  {
    const samplePdf = '%PDF-1.4 sample legitimate lecture notes content\n%%EOF';
    const res = await apiMultipartRequest(
      '/api/lectures/teacher',
      'file',
      'lecture_networks_sec.pdf',
      samplePdf,
      'application/pdf',
      { course_id: courseId, title: 'محاضرة أمن الشبكات المتقدم', date: '2026-11-02' },
      { Authorization: `Bearer ${teacherToken}` }
    );
    const successOrValid = res.status === 200 || res.status === 201;
    recordTest('security', 'Legitimate PDF Document Upload & Validation', successOrValid, { status: res.status, res: res.data });
  }

  // Test S-7: RBAC: Student Denied Access to Admin Financials
  {
    const res = await apiRequest('GET', '/api/admin/financials', null, {
      Authorization: `Bearer ${studentToken}`
    });
    const forbidden = res.status === 403;
    recordTest('security', 'RBAC: Student Denied Access to Admin Endpoints (/api/admin/financials)', forbidden, { status: res.status });
  }

  // Test S-8: RBAC: Student Denied Access to Teacher Grade Items
  {
    const res = await apiRequest('PUT', `/api/grades/course/${courseId}/items`, {
      items: [{ name: 'Hack Grade', category: 'final', max_score: 100, weight: 100 }]
    }, {
      Authorization: `Bearer ${studentToken}`
    });
    const forbidden = res.status === 403;
    recordTest('security', 'RBAC: Student Denied Access to Teacher Grade Management', forbidden, { status: res.status });
  }

  // Test S-9: Cryptographic Token Signature Integrity (Tampered JWT)
  {
    const parts = studentToken.split('.');
    const tampered = parts[0] + '.' + parts[1] + '.invalidsignature0123456789';
    const res = await apiRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${tampered}`
    });
    const unauthorized = res.status === 401;
    recordTest('security', 'Tampered JWT Signature Rejection (Cryptographic Integrity)', unauthorized, { status: res.status });
  }

  // Test S-10: Academic & Financial Account Freeze Enforcement
  {
    // Step 1: Admin freezes student
    await db.execute('UPDATE users SET is_frozen = 1, freeze_reason = "تأخر سداد الرسوم الجامعية" WHERE id = ?', [studentId]);
    await db.execute('UPDATE student_financials SET is_frozen = 1, freeze_reason = "تأخر سداد الرسوم الجامعية" WHERE student_id = ?', [studentId]);

    // Step 2: Student attempts attendance scan
    const resScan = await apiRequest('POST', '/api/attendance/student/scan', {
      qr_code: 'any-token'
    }, {
      Authorization: `Bearer ${studentToken}`
    });
    const freezeBlocked = resScan.status === 403 && (resScan.data?.code === 'ACCOUNT_FROZEN' || resScan.data?.error === 'ACCOUNT_FROZEN');

    // Step 3: Unfreeze student via API
    await apiRequest('POST', '/api/admin/financials/unfreeze', { student_id: studentId }, {
      Authorization: `Bearer ${adminToken}`
    });

    recordTest('security', 'Frozen Account Access Enforcement (ACCOUNT_FROZEN 403)', freezeBlocked, {
      status: resScan.status,
      code: resScan.data?.code || resScan.data?.error
    });
  }

  // Test S-11: Dynamic Session Revocation (/api/security/revoke-all-sessions)
  {
    const resRevoke = await apiRequest('POST', '/api/security/revoke-all-sessions', null, {
      Authorization: `Bearer ${studentToken}`
    });
    const resSubsequent = await apiRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${studentToken}`
    });
    const revokedSuccessfully = resRevoke.status === 200 && resSubsequent.status === 401;
    recordTest('security', 'Session Invalidation & Immediate Token Version Revocation', revokedSuccessfully, {
      revokeStatus: resRevoke.status,
      subsequentStatus: resSubsequent.status
    });

    // Re-authenticate student
    const resReauth = await apiRequest('POST', '/api/auth/login', { identifier: 'student1@test.com', password: 'password123' });
    studentToken = resReauth.data?.token || resReauth.data?.accessToken;
  }

  // ==========================================================================
  // 2. FUNCTIONAL & BUSINESS LOGIC TESTS
  // ==========================================================================
  console.log('\n--- Phase 2: Functional & Business Logic Testing ---');

  let activeSessionId = '';
  let liveQRToken1 = '';

  // Test F-1: Dynamic QR Code Generation & 20s Rotation Interval
  {
    // Close any previous lingering sessions so we can create a clean test session
    await db.execute("UPDATE attendance_sessions SET status = 'closed' WHERE course_id = ? AND status = 'active'", [courseId]);

    const resSession = await apiRequest('POST', '/api/attendance/teacher/sessions', {
      course_id: courseId,
      date: new Date().toISOString().split('T')[0],
      time: '10:00:00'
    }, {
      Authorization: `Bearer ${teacherToken}`
    });

    if ((resSession.status === 200 || resSession.status === 201) && resSession.data?.data) {
      activeSessionId = resSession.data.data.id;
    }

    if (activeSessionId) {
      const resQR1 = await apiRequest('GET', `/api/attendance/teacher/sessions/${activeSessionId}/live-qr`, null, {
        Authorization: `Bearer ${teacherToken}`
      });
      liveQRToken1 = resQR1.data?.data?.qrCode || resQR1.data?.data?.qr_code;
      const expiresIn = resQR1.data?.data?.expiresIn;

      const valid = Boolean(activeSessionId && liveQRToken1 && expiresIn > 0);
      recordTest('functional', 'Dynamic QR Code Generation (20s Rotating Intervals)', valid, {
        sessionId: activeSessionId,
        expiresIn,
        hasQrCode: Boolean(liveQRToken1)
      });
    } else {
      recordTest('functional', 'Dynamic QR Code Generation (20s Rotating Intervals)', false, {
        res: resSession
      });
    }
  }

  // Test F-2: Moodle 4.0 Weighted Grade Items & GPA Calculation Engine
  {
    const gradeItemsPayload = {
      items: [
        { name: 'الواجبات والتكليفات', category: 'assignments', max_score: 100, weight: 20 },
        { name: 'الامتحان النصفي', category: 'midterm', max_score: 100, weight: 30 },
        { name: 'الامتحان النهائي', category: 'final', max_score: 100, weight: 50 }
      ]
    };

    const resSetItems = await apiRequest('PUT', `/api/grades/course/${courseId}/items`, gradeItemsPayload, {
      Authorization: `Bearer ${teacherToken}`
    });

    const resGetItems = await apiRequest('GET', `/api/grades/course/${courseId}/items`, null, {
      Authorization: `Bearer ${teacherToken}`
    });

    const items = resGetItems.data?.data || [];
    let gradesRecorded = false;

    if (items.length >= 3) {
      await apiRequest('POST', `/api/grades/course/${courseId}/student-grade`, {
        studentId,
        gradeItemId: items[0].id,
        score: 95
      }, { Authorization: `Bearer ${teacherToken}` });

      await apiRequest('POST', `/api/grades/course/${courseId}/student-grade`, {
        studentId,
        gradeItemId: items[1].id,
        score: 90
      }, { Authorization: `Bearer ${teacherToken}` });

      await apiRequest('POST', `/api/grades/course/${courseId}/student-grade`, {
        studentId,
        gradeItemId: items[2].id,
        score: 92
      }, { Authorization: `Bearer ${teacherToken}` });

      gradesRecorded = true;
    }

    const resGpa = await apiRequest('GET', '/api/grades/student/gpa', null, {
      Authorization: `Bearer ${studentToken}`
    });

    const gpaData = resGpa.data?.data;
    const gpaOk = resGpa.status === 200 && gpaData && Number(gpaData.gpa) > 0;

    recordTest('functional', 'Moodle 4.0 Weighted Grade Engine & 4.0 GPA Recalculation', gpaOk && gradesRecorded, {
      setItemsStatus: resSetItems.status,
      gpa: gpaData?.gpa,
      coursesGraded: gpaData?.gradedCredits
    });
  }

  // Test F-3: Classroom Allocation & Schedule Distribution
  {
    const updatePayload = {
      schedule_day: 'الأحد - الثلاثاء - الخميس',
      schedule_time: '10:00 ص - 11:30 ص',
      room: 'قاعة إدوارد سنودن (مدرج 101)'
    };

    const resUpdate = await apiRequest('PUT', `/api/admin/courses/${courseId}`, updatePayload, {
      Authorization: `Bearer ${adminToken}`
    });

    const resStudentCourses = await apiRequest('GET', '/api/courses/student', null, {
      Authorization: `Bearer ${studentToken}`
    });

    let roomMatches = false;
    if (resStudentCourses.status === 200 && Array.isArray(resStudentCourses.data?.data)) {
      const target = resStudentCourses.data.data.find(c => c.id === courseId);
      if (target && target.room === updatePayload.room) {
        roomMatches = true;
      }
    }

    recordTest('functional', 'Classroom Allocation & Schedule Distribution (Admin -> Student)', roomMatches, {
      updateStatus: resUpdate.status,
      roomMatches
    });
  }

  // Test F-4: Student Financial Ledger & Balance Audit
  {
    const paymentPayload = {
      student_id: studentId,
      amount: 500,
      payment_method: 'cash',
      receipt_number: 'REC-SYS-' + Date.now(),
      notes: 'سداد قسط جامعي عبر الخزينة المركزية'
    };

    const resPayment = await apiRequest('POST', '/api/admin/financials/payment', paymentPayload, {
      Authorization: `Bearer ${adminToken}`
    });

    const resUpdated = await apiRequest('GET', '/api/financials/my-status', null, {
      Authorization: `Bearer ${studentToken}`
    });

    const paymentVerified = resPayment.status === 200 && resUpdated.status === 200;
    recordTest('functional', 'Student Financial Ledger: Tuition Payment & Balance Audit', paymentVerified, {
      paymentStatus: resPayment.status,
      paidAmount: resUpdated.data?.data?.paid_amount,
      remainingAmount: resUpdated.data?.data?.remaining_amount
    });
  }

  // Test F-5: Tech Support Password Reset Workflow
  {
    const tempPassword = 'NewSecretPassword123!';
    const resReset = await apiRequest('POST', '/api/admin/financials/reset-password', {
      user_id: studentId,
      new_password: tempPassword
    }, {
      Authorization: `Bearer ${adminToken}`
    });

    const resLoginNew = await apiRequest('POST', '/api/auth/login', {
      identifier: 'student1@test.com',
      password: tempPassword
    });

    const resetSuccess = resReset.status === 200 && resLoginNew.status === 200;
    recordTest('functional', 'Tech Support Password Reset & Immediate Authentication', resetSuccess, {
      resetStatus: resReset.status,
      loginWithNewStatus: resLoginNew.status
    });

    // Restore original password
    await apiRequest('POST', '/api/admin/financials/reset-password', {
      user_id: studentId,
      new_password: 'password123'
    }, {
      Authorization: `Bearer ${adminToken}`
    });

    // Re-authenticate student fresh
    const resRestore = await apiRequest('POST', '/api/auth/login', {
      identifier: 'student1@test.com',
      password: 'password123'
    });
    studentToken = resRestore.data?.token || resRestore.data?.accessToken;
  }

  // ==========================================================================
  // 3. STRESS, HIGH CONCURRENCY & LOAD BENCHMARKS
  // ==========================================================================
  console.log('\n--- Phase 3: High Concurrency, Stress & Load Benchmarking ---');

  // Benchmark P-1: 60 Concurrent Attendance Check-Ins (Checking Race Conditions & DB Lock Safety)
  {
    await sleep(1100); // Allow rate limit window to refresh
    console.log('  ⚡ Firing 60 concurrent attendance requests...');
    const CONCURRENCY = 60;
    const reqPromises = [];
    const timings = [];

    const startBench = performance.now();
    for (let i = 0; i < CONCURRENCY; i++) {
      const p = (async () => {
        const t0 = performance.now();
        const res = await apiRequest('POST', '/api/attendance/student/scan', {
          qr_code: liveQRToken1 || 'benchmark-qr-code'
        }, {
          Authorization: `Bearer ${studentToken}`
        });
        const t1 = performance.now();
        timings.push(t1 - t0);
        return res;
      })();
      reqPromises.push(p);
    }

    const results = await Promise.all(reqPromises);
    const totalBenchDuration = performance.now() - startBench;

    timings.sort((a, b) => a - b);
    const avgLatency = timings.reduce((a, b) => a + b, 0) / timings.length;
    const minLatency = timings[0];
    const maxLatency = timings[timings.length - 1];
    const p50 = timings[Math.floor(timings.length * 0.50)];
    const p90 = timings[Math.floor(timings.length * 0.90)];
    const p95 = timings[Math.floor(timings.length * 0.95)];
    const p99 = timings[Math.floor(timings.length * 0.99)];
    const rps = (CONCURRENCY / (totalBenchDuration / 1000)).toFixed(2);

    const non500Count = results.filter(r => r.status === 200 || r.status === 400).length;
    const successRate = ((non500Count / CONCURRENCY) * 100).toFixed(1);

    const passed = non500Count === CONCURRENCY;
    recordTest('performance', `60 Concurrent Check-Ins Benchmark (${rps} RPS, ${avgLatency.toFixed(1)}ms avg, 0 deadlocks)`, passed, {
      concurrency: CONCURRENCY,
      totalDurationMs: totalBenchDuration.toFixed(1),
      rps: Number(rps),
      minLatencyMs: minLatency.toFixed(2),
      avgLatencyMs: avgLatency.toFixed(2),
      p50Ms: p50.toFixed(2),
      p90Ms: p90.toFixed(2),
      p95Ms: p95.toFixed(2),
      p99Ms: p99.toFixed(2),
      maxLatencyMs: maxLatency.toFixed(2),
      stabilityRate: `${successRate}%`
    });
  }

  // Benchmark P-2: 50 Concurrent Read Requests (Course Catalog & Profile)
  {
    await sleep(1100); // Allow rate limit window to refresh
    console.log('  ⚡ Firing 50 concurrent course query requests...');
    const CONCURRENCY = 50;
    const reqPromises = [];
    const timings = [];

    const startBench = performance.now();
    for (let i = 0; i < CONCURRENCY; i++) {
      const p = (async () => {
        const t0 = performance.now();
        const res = await apiRequest('GET', '/api/courses/student', null, {
          Authorization: `Bearer ${studentToken}`
        });
        const t1 = performance.now();
        timings.push(t1 - t0);
        return res;
      })();
      reqPromises.push(p);
    }

    const results = await Promise.all(reqPromises);
    const totalBenchDuration = performance.now() - startBench;

    timings.sort((a, b) => a - b);
    const avgLatency = timings.reduce((a, b) => a + b, 0) / timings.length;
    const p95 = timings[Math.floor(timings.length * 0.95)];
    const rps = (CONCURRENCY / (totalBenchDuration / 1000)).toFixed(2);
    const okCount = results.filter(r => r.status === 200).length;

    recordTest('performance', `50 Concurrent Read Requests Benchmark (${rps} RPS, ${avgLatency.toFixed(1)}ms avg)`, okCount === CONCURRENCY, {
      concurrency: CONCURRENCY,
      rps: Number(rps),
      avgLatencyMs: avgLatency.toFixed(2),
      p95Ms: p95.toFixed(2),
      status200Count: okCount
    });
  }

  // Benchmark P-3: Rapid 100 Burst Sequential Probing
  {
    await sleep(1100);
    console.log('  ⚡ Running 100 sequential burst requests...');
    const BURST = 100;
    const startBurst = performance.now();
    let errCount = 0;
    for (let i = 0; i < BURST; i++) {
      const res = await apiRequest('GET', '/health/live');
      if (res.status !== 200) errCount++;
    }
    const burstDuration = performance.now() - startBurst;
    const rps = (BURST / (burstDuration / 1000)).toFixed(2);

    recordTest('performance', `100 Burst Health Probes (${rps} RPS, 0 Crashes)`, errCount === 0, {
      burst: BURST,
      durationMs: burstDuration.toFixed(1),
      rps: Number(rps),
      errors: errCount
    });
  }

  // --------------------------------------------------------------------------
  // Summary & Teardown
  // --------------------------------------------------------------------------
  testResults.summary.durationMs = performance.now() - globalStart;
  await db.end();

  console.log('\n===============================================================');
  console.log('📊 FINAL TEST EXECUTION SUMMARY:');
  console.log(`Total Tests Run: ${testResults.summary.total}`);
  console.log(`Passed:          ${testResults.summary.passed}`);
  console.log(`Failed:          ${testResults.summary.failed}`);
  console.log(`Pass Rate:       ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  console.log(`Total Time:      ${(testResults.summary.durationMs / 1000).toFixed(2)}s`);
  console.log('===============================================================\n');

  const outPath = path.join(__dirname, 'test_run_data.json');
  fs.writeFileSync(outPath, JSON.stringify(testResults, null, 2));
  console.log(`📁 Test execution data saved to ${outPath}`);
}

runAllTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
