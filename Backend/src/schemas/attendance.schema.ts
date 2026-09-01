import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    course_id: z.string().min(1, 'Course ID is required'),
    duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  }).strict(),
});

export const getSessionsSchema = z.object({
  query: z.object({
    course_id: z.string().optional(),
  }).strict(),
});

export const markAttendanceSchema = z.object({
  body: z.object({
    session_id: z.string().min(1, 'Session ID is required'),
    student_id: z.string().min(1, 'Student ID is required'),
    status: z.enum(['present', 'absent', 'late']),
    device_id: z.string().optional(),
    ip_address: z.string().optional(),
  }).strict(),
});

export const recordAttendanceByStudentSchema = z.object({
  body: z.object({
    qr_code: z.string().min(1, 'QR code is required'),
  }).strict(),
});
