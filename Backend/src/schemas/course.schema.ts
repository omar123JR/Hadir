import { z } from 'zod';

const SAFE_STRING_REGEX = /^[\p{L}\p{N}\s.,@%/\-_]+$/u;
const SAFE_STRING_MSG = 'Input contains invalid symbols. Only letters, numbers, and (.,@%/-_) are allowed';

const safeString = z.string().regex(SAFE_STRING_REGEX, SAFE_STRING_MSG);

export const createCourseSchema = z.object({
  body: z.object({
    code: safeString.min(2, 'Course code is required').max(20, 'Course code is too long'),
    name: safeString.min(2, 'Course name is required').max(50, 'Course name is too long'),
    teacher_id: safeString.max(30, 'Teacher ID is too long').optional(),
    description: safeString.max(500, 'Description is too long').optional(),
  }).strict(),
});

export const updateCourseSchema = z.object({
  body: z.object({
    code: safeString.min(2, 'Course code is required').max(20, 'Course code is too long').optional(),
    name: safeString.min(2, 'Course name is required').max(50, 'Course name is too long').optional(),
    teacher_id: safeString.max(30, 'Teacher ID is too long').optional(),
    description: safeString.max(500, 'Description is too long').optional(),
  }).strict(),
});

export const getCoursesSchema = z.object({
  query: z.object({
    search: safeString.max(50, 'Search query is too long').optional(),
  }).strict(),
});
