import { z } from 'zod';

export const createAssignmentSchema = z.object({
  body: z.object({
    course_id: z.string().min(1, 'Course ID is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    due_date: z.string().min(1, 'Due date is required'),
    file_url: z.string().optional(),
    file_name: z.string().optional(),
  }).strict(),
});

export const updateAssignmentSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    due_date: z.string().min(1, 'Due date is required').optional(),
  }).strict(),
});

export const gradeSubmissionSchema = z.object({
  body: z.object({
    grade: z.number().min(0, 'Grade must be at least 0'),
    feedback: z.string().optional(),
  }).strict(),
});
