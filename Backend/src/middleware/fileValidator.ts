import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { securityLogger } from '../logging/securityLogger';

// 50 MB maximum size
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Allowed extensions
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.pptx', '.txt', '.rtf',
  '.py', '.java', '.c', '.cpp', '.h', '.cs', '.sql',
  '.zip', '.jpg', '.jpeg', '.png'
]);

// Dangerous extensions strictly blocked
const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.php5',
  '.js', '.mjs', '.html', '.htm', '.svg', '.vbs', '.scr',
  '.msi', '.dll', '.jar', '.apk', '.bin', '.com', '.wsf'
];

// Malicious code signatures inside text/code files
const MALICIOUS_PATTERNS = [
  /eval\s*\(\s*base64_decode/i,
  /passthru\s*\(/i,
  /shell_exec\s*\(/i,
  /system\s*\(\s*["']rm\s+-rf/i,
  /<script\b[^>]*>/i,
  /<\?php/i,
  /__import__\s*\(\s*['"]os['"]\s*\)\.system/i,
  /subprocess\.Popen\s*\(/i,
];

export const validateFileUpload = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();
  const lowerName = file.originalname.toLowerCase();
  const uploaderUserId = (req as any).user?.userId as string | undefined;
  const ip = req.ip ?? 'unknown';

  // 1. Malicious Double-Extension & Blacklist Detection
  for (const badExt of FORBIDDEN_EXTENSIONS) {
    if (lowerName.includes(badExt + '.') || lowerName.endsWith(badExt)) {
      securityLogger.maliciousUpload({
        ip,
        userId: uploaderUserId,
        filename: file.originalname,
        reason: `Forbidden extension pattern detected: '${badExt}'`,
      });
      return res.status(400).json({
        success: false,
        securityBlocked: true,
        message: `تم رفض الملف: الامتداد "${badExt}" محظور أمنياً لاحتوائه على مخاطر تنفيذ برمجيات خبيثة.`
      });
    }
  }

  // 2. Allowed Extensions Whitelist Check
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    securityLogger.maliciousUpload({
      ip,
      userId: uploaderUserId,
      filename: file.originalname,
      reason: `Unsupported extension: '${ext}'`,
    });
    return res.status(400).json({
      success: false,
      securityBlocked: true,
      message: `نوع الملف "${ext}" غير مدعوم. الصيغ المعتمدة: PDF, Word, PowerPoint, Zip, Text, وملفات الأكواد البرمجية (.py, .java, .cpp, إلخ).`
    });
  }

  // 3. Strict 50MB Size Enforcement
  if (file.size > MAX_FILE_SIZE_BYTES) {
    securityLogger.maliciousUpload({
      ip,
      userId: uploaderUserId,
      filename: file.originalname,
      reason: `File exceeds 50MB. Size: ${file.size}B`,
    });
    return res.status(400).json({
      success: false,
      message: `حجم الملف (${(file.size / (1024 * 1024)).toFixed(1)} MB) يتجاوز الحد الأقصى المسموح به (50 ميجابايت).`
    });
  }

  // 4. Magic Bytes Inspection
  const buffer = file.buffer;
  if (ext === '.pdf') {
    const magic = buffer.slice(0, 5).toString('ascii');
    if (!magic.startsWith('%PDF-')) {
      return res.status(400).json({
        success: false,
        securityBlocked: true,
        message: 'تم رفض الملف: محتوى الملف لا يتطابق مع معايير PDF الحقيقية.'
      });
    }
  } else if (ext === '.zip' || ext === '.docx' || ext === '.pptx') {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B; // 'PK'
    if (!isZip) {
      return res.status(400).json({
        success: false,
        securityBlocked: true,
        message: 'تم رفض الملف: ترويسة الأرشيف أو المستند غير صالحة.'
      });
    }
  }

  // 5. Code & Script Heuristic Scan
  if (['.py', '.txt', '.sql', '.c', '.cpp', '.java', '.cs'].includes(ext)) {
    const textContent = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(textContent)) {
        securityLogger.maliciousUpload({
          ip,
          userId: uploaderUserId,
          filename: file.originalname,
          reason: `Malicious pattern detected: ${pattern.toString()}`,
        });
        return res.status(400).json({
          success: false,
          securityBlocked: true,
          message: 'تم حظر الملف: تم رصد شفرات برمجية مشبوهة أو أوامر تنفيذية ضارة داخل الملف.'
        });
      }
    }
  }

  // 6. VirusTotal Reputation Query (if configured)
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
  if (vtApiKey) {
    try {
      const vtRes = await fetch(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
        headers: { 'x-apikey': vtApiKey }
      });
      if (vtRes.ok) {
        const vtData: any = await vtRes.json();
        const malicious = vtData?.data?.attributes?.last_analysis_stats?.malicious || 0;
        if (malicious > 0) {
          return res.status(400).json({
            success: false,
            securityBlocked: true,
            message: `فحص الفيروسات: تم حظر الملف لأن خدمة VirusTotal تعتبره ضاراً (${malicious} محرك رصد).`
          });
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }
  }

  next();
};
