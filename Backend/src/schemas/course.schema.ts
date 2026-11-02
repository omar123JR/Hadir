import { z } from 'zod';

const SAFE_STRING_REGEX = /^[\p{L}\p{N}\s.,@%/\-_():]+$/u;
const SAFE_STRING_MSG = 'Input contains invalid symbols. Only letters, numbers, and (.,@%/-_():) are allowed';

const safeString = z.string().regex(SAFE_STRING_REGEX, SAFE_STRING_MSG);

export const createCourseSchema = z.object({
  body: z.object({
    code: safeString.min(2, 'Course code is required').max(20, 'Course code is too long'),
    name: safeString.min(2, 'Course name is required').max(100, 'Course name is too long'),
    teacher_id: safeString.max(30, 'Teacher ID is too long').optional().nullable(),
    description: safeString.max(500, 'Description is too long').optional().nullable(),
    credit_hours: z.number().int().min(1).max(10).optional().nullable(),
    schedule_day: safeString.max(100).optional().nullable(),
    schedule_time: safeString.max(100).optional().nullable(),
    room: safeString.max(100).optional().nullable(),
  }).strict(),
});

export const updateCourseSchema = z.object({
  body: z.object({
    id: safeString.optional(),
    code: safeString.min(2, 'Course code is required').max(20, 'Course code is too long').optional(),
    name: safeString.min(2, 'Course name is required').max(100, 'Course name is too long').optional(),
    teacher_id: safeString.max(30, 'Teacher ID is too long').optional().nullable(),
    teacher_name: z.string().optional().nullable(),
    teacher_department: z.string().optional().nullable(),
    students_count: z.number().optional().nullable(),
    lectures_count: z.number().optional().nullable(),
    description: safeString.max(500, 'Description is too long').optional().nullable(),
    credit_hours: z.number().int().min(1).max(10).optional().nullable(),
    schedule_day: safeString.max(100).optional().nullable(),
    schedule_time: safeString.max(100).optional().nullable(),
    room: safeString.max(100).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
  }).passthrough(),
});

export const getCoursesSchema = z.object({
  query: z.object({
    search: safeString.max(50, 'Search query is too long').optional(),
  }).strict(),
});
