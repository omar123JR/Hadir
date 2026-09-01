import { z } from 'zod';

export const createLectureSchema = z.object({
  body: z.object({
    course_id: z.string().min(1, 'Course ID is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    file_url: z.string().optional(),
    file_name: z.string().optional(),
    file_size: z.string().optional(),
    file_type: z.string().optional(),
  }).strict(),
});

export const updateLectureSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
  }).strict(),
});
