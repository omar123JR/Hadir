import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['teacher', 'student']),
    student_id: z.string().optional(),
    department: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  }).strict(),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    role: z.enum(['teacher', 'student']).optional(),
    student_id: z.string().optional(),
    department: z.string().optional(),
    is_active: z.boolean().optional(),
  }).strict(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }).strict(),
});

export const getUsersSchema = z.object({
  query: z.object({
    role: z.enum(['teacher', 'student', 'all']).optional(),
    search: z.string().optional(),
  }).strict(),
});
