import { z } from 'zod';

export const createCourseSchema = z.object({
  body: z.object({
    code: z.string().min(2, 'Course code is required'),
    name: z.string().min(2, 'Course name is required'),
    teacher_id: z.string().optional(),
    description: z.string().optional(),
  }).strict(),
});

export const updateCourseSchema = z.object({
  body: z.object({
    code: z.string().min(2, 'Course code is required').optional(),
    name: z.string().min(2, 'Course name is required').optional(),
    teacher_id: z.string().optional(),
    description: z.string().optional(),
  }).strict(),
});

export const getCoursesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
  }).strict(),
});
