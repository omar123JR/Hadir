import { z } from 'zod';

const SAFE_STRING_REGEX = /^[\p{L}\p{N}\s.,@%/\-_]+$/u;
const SAFE_STRING_MSG = 'Input contains invalid symbols. Only letters, numbers, and (.,@%/-_) are allowed';

const safeString = z.string().regex(SAFE_STRING_REGEX, SAFE_STRING_MSG);

export const createUserSchema = z.object({
  body: z.object({
    name: safeString.min(2, 'Name must be at least 2 characters').max(30, 'Name is too long'),
    email: safeString.email('Invalid email address').max(100, 'Email is too long'),
    role: z.enum(['teacher', 'student']),
    student_id: safeString.max(30, 'Student ID is too long').optional(),
    department: safeString.max(30, 'Department is too long').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long').optional(),
  }).strict(),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: safeString.min(2, 'Name must be at least 2 characters').max(30, 'Name is too long').optional(),
    email: safeString.email('Invalid email address').max(100, 'Email is too long').optional(),
    role: z.enum(['teacher', 'student']).optional(),
    student_id: safeString.max(30, 'Student ID is too long').optional(),
    department: safeString.max(30, 'Department is too long').optional(),
    is_active: z.boolean().optional(),
  }).strict(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long'),
  }).strict(),
});

export const getUsersSchema = z.object({
  query: z.object({
    role: z.enum(['teacher', 'student', 'all']).optional(),
    search: safeString.max(50, 'Search query is too long').optional(),
  }).strict(),
});
