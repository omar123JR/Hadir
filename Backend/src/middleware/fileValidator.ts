import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { securityLogger } from '../logging/securityLogger';

// Define allowed extensions and their corresponding MIME types & Magic Bytes
const ALLOWED_TYPES = {
  '.pdf':  { mime: 'application/pdf',                                                                        magic: [0x25, 0x50, 0x44, 0x46] },
  '.jpg':  { mime: 'image/jpeg',                                                                             magic: [0xFF, 0xD8, 0xFF] },
  '.jpeg': { mime: 'image/jpeg',                                                                             magic: [0xFF, 0xD8, 0xFF] },
  '.png':  { mime: 'image/png',                                                                              magic: [0x89, 0x50, 0x4E, 0x47] },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',               magic: [0x50, 0x4B, 0x03, 0x04] },
  '.pptx': { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',             magic: [0x50, 0x4B, 0x03, 0x04] },
};

export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();
  const lowerName = file.originalname.toLowerCase();
  const uploaderUserId = (req as any).user?.userId as string | undefined;
  const ip = req.ip ?? 'unknown';

  // 0. Malicious Double-Extension Detection
  const FORBIDDEN_EXTENSIONS = ['.exe', '.js', '.ts', '.sh', '.bat', '.php', '.html', '.htm', '.svg', '.dll', '.msi', '.zip', '.rar'];
  for (const badExt of FORBIDDEN_EXTENSIONS) {
    if (lowerName.includes(badExt + '.') || lowerName.endsWith(badExt)) {
      securityLogger.maliciousUpload({
        ip,
        userId: uploaderUserId,
        filename: file.originalname,
        reason: `Double/forbidden extension detected: '${badExt}'`,
      });
      return res.status(400).json({
        success: false,
        message: `Filename contains forbidden extension patterns.`
      });
    }
  }

  // 1. Extension Check
  if (!ALLOWED_TYPES[ext as keyof typeof ALLOWED_TYPES]) {
    securityLogger.maliciousUpload({
      ip,
      userId: uploaderUserId,
      filename: file.originalname,
      reason: `Unsupported extension: '${ext}'`,
    });
    return res.status(400).json({
      success: false,
      message: `Invalid file extension. Allowed extensions are: pdf, docx, pptx, jpg, png.`
    });
  }

  const allowedRule = ALLOWED_TYPES[ext as keyof typeof ALLOWED_TYPES];

  // 1.5. Type-Specific Size Enforcement
  const isImage = allowedRule.mime.startsWith('image/');
  const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;

  if (file.size > maxSize) {
    securityLogger.maliciousUpload({
      ip,
      userId: uploaderUserId,
      filename: file.originalname,
      reason: `File exceeds size limit. Size: ${file.size}B, Max: ${maxSize}B`,
    });
    return res.status(400).json({
      success: false,
      message: `File exceeds maximum allowed size (${isImage ? '5MB for images' : '10MB for documents'}).`
    });
  }

  // 2. Client MIME Type Check
  if (file.mimetype !== allowedRule.mime) {
    securityLogger.maliciousUpload({
      ip,
      userId: uploaderUserId,
      filename: file.originalname,
      reason: `MIME mismatch — declared: '${file.mimetype}', expected: '${allowedRule.mime}'`,
    });
    return res.status(400).json({
      success: false,
      message: `MIME type mismatch. The file extension does not match its declared content type.`
    });
  }

  // 3. Magic Bytes Check
  if (!file.buffer || file.buffer.length < allowedRule.magic.length) {
    securityLogger.maliciousUpload({
      ip,
      userId: uploaderUserId,
      filename: file.originalname,
      reason: 'File is empty or too short to read magic bytes',
    });
    return res.status(400).json({
      success: false,
      message: `File is empty or corrupted.`
    });
  }

  for (let i = 0; i < allowedRule.magic.length; i++) {
    if (file.buffer[i] !== allowedRule.magic[i]) {
      securityLogger.maliciousUpload({
        ip,
        userId: uploaderUserId,
        filename: file.originalname,
        reason: `Magic bytes mismatch — likely MIME spoofing (ext: ${ext}, mime: ${file.mimetype})`,
      });
      return res.status(400).json({
        success: false,
        message: `File content validation failed. The file signature does not match its extension.`
      });
    }
  }

  next();
};
