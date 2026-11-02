import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { pool } from '../config/database';
import { securityLogger } from '../logging/securityLogger';

const router = Router();

// ============================================================================
// 1. Student endpoint: GET /api/financials/my-status
// ============================================================================
router.get('/my-status', authenticate, async (req: any, res) => {
  try {
    const studentId = req.user.userId;
    const [rows] = await pool.execute<any[]>(
      `SELECT sf.*, u.name as student_name, u.email as student_email, u.student_id as student_number
       FROM student_financials sf
       JOIN users u ON sf.student_id = u.id
       WHERE sf.student_id = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {
          total_tuition: 3500,
          paid_amount: 3500,
          remaining_amount: 0,
          status: 'paid',
          is_frozen: false,
          transactions: [],
        }
      });
    }

    const fin = rows[0];
    const [trans] = await pool.execute<any[]>(
      `SELECT * FROM financial_transactions WHERE student_id = ? ORDER BY created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      data: {
        ...fin,
        remaining_amount: Math.max(0, Number(fin.total_tuition) - Number(fin.paid_amount)),
        transactions: trans,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 2. Admin endpoints (Requires Admin Role)
// ============================================================================
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/financials - Summary + All records
router.get('/', async (req, res) => {
  try {
    const [records] = await pool.execute<any[]>(`
      SELECT 
        sf.id,
        sf.student_id,
        u.name as student_name,
        u.email as student_email,
        u.student_id as student_number,
        sf.total_tuition,
        sf.paid_amount,
        (sf.total_tuition - sf.paid_amount) as remaining_amount,
        sf.discount,
        sf.status,
        sf.is_frozen,
        sf.freeze_reason,
        sf.last_payment_date
      FROM student_financials sf
      JOIN users u ON sf.student_id = u.id
      ORDER BY sf.is_frozen DESC, remaining_amount DESC
    `);

    // Calculate aggregated statistics
    let totalExpected = 0;
    let totalCollected = 0;
    let frozenCount = 0;

    for (const r of records) {
      totalExpected += Number(r.total_tuition || 0);
      totalCollected += Number(r.paid_amount || 0);
      if (r.is_frozen) frozenCount++;
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalExpected,
          totalCollected,
          totalDebt: Math.max(0, totalExpected - totalCollected),
          totalStudents: records.length,
          frozenCount,
        },
        students: records,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/financials/payment - Record payment
router.post('/payment', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const adminId = req.user.userId;
    const { student_id, amount, receipt_number, payment_method, notes } = req.body;

    if (!student_id || !amount || Number(amount) <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'رقم الطالب والمبلغ المطلوب سداده حقول إلزامية' });
    }

    const payAmount = Number(amount);
    const receipt = receipt_number || `REC-${Date.now().toString().slice(-6)}`;

    // 1. Record transaction
    await connection.execute(
      `INSERT INTO financial_transactions (student_id, amount, receipt_number, payment_method, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student_id, payAmount, receipt, payment_method || 'نقدي', notes || null, adminId]
    );

    // 2. Lock & update student_financials
    const [finRows] = await connection.execute<any[]>(
      `SELECT * FROM student_financials WHERE student_id = ? FOR UPDATE`,
      [student_id]
    );

    if (finRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'سجل الطالب المالي غير موجود' });
    }

    const cur = finRows[0];
    const newPaid = Number(cur.paid_amount) + payAmount;
    const total = Number(cur.total_tuition);
    const newStatus = newPaid >= total ? 'paid' : 'partial';

    await connection.execute(
      `UPDATE student_financials 
       SET paid_amount = ?, status = ?, last_payment_date = NOW() 
       WHERE student_id = ?`,
      [newPaid, newStatus, student_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `تم تسجيل سداد مبلغ ${payAmount} د.ل بنجاح بموجب إيصال رقم ${receipt}`,
      data: { receiptNumber: receipt, newPaid, newStatus }
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/admin/financials/freeze - Freeze student account
router.post('/freeze', async (req: any, res) => {
  try {
    const { student_id, reason } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id مطلوب' });

    const freezeReason = reason || 'تجميد الحساب لمراجعة الأقساط المالية المتأخرة';

    await pool.execute(
      `UPDATE users SET is_frozen = TRUE, freeze_reason = ? WHERE id = ?`,
      [freezeReason, student_id]
    );

    await pool.execute(
      `UPDATE student_financials SET is_frozen = TRUE, freeze_reason = ? WHERE student_id = ?`,
      [freezeReason, student_id]
    );

    res.json({
      success: true,
      message: 'تم تجميد حساب الطالب بنجاح؛ لن يتمكن من تسجيل الحضور حتى تسوية الرسوم.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/financials/unfreeze - Unfreeze student account
router.post('/unfreeze', async (req: any, res) => {
  try {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id مطلوب' });

    await pool.execute(
      `UPDATE users SET is_frozen = FALSE, freeze_reason = NULL WHERE id = ?`,
      [student_id]
    );

    await pool.execute(
      `UPDATE student_financials SET is_frozen = FALSE, freeze_reason = NULL WHERE student_id = ?`,
      [student_id]
    );

    res.json({
      success: true,
      message: 'تم فك تجميد حساب الطالب واستعادة كافة الصلاحيات الأكاديمية بنجاح.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/financials/reset-password - Tech support reset password
router.post('/reset-password', async (req: any, res) => {
  try {
    const { user_id, custom_password, new_password } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id مطلوب' });

    const chosenPassword = (new_password || custom_password || '').trim();

    // Generate strong temporary password or use custom
    const tempPassword = chosenPassword.length >= 6
      ? chosenPassword
      : `Hadir@${crypto.randomInt(1000, 9999)}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Update user password and revoke other tokens
    await pool.execute(
      `UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?`,
      [hashedPassword, user_id]
    );

    const [uRows] = await pool.execute<any[]>(`SELECT name, email, role FROM users WHERE id = ?`, [user_id]);
    const user = uRows[0];

    res.json({
      success: true,
      message: `تم إعادة تعيين كلمة المرور بنجاح للمستخدم ${user?.name || ''}`,
      data: {
        userName: user?.name,
        userEmail: user?.email,
        role: user?.role,
        temporaryPassword: tempPassword,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
