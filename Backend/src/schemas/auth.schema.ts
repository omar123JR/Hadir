import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Identifier is required'),
    password: z.string().min(1, 'Password is required'),
  }).strict(),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }).strict(),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }).strict(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }).strict(),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').optional(),
    email: z.string().email('Invalid email').optional(),
    department: z.string().optional(),
    avatar: z.string().optional(),
  }).strict(),
});
