import { z } from 'zod';

const SAFE_STRING_REGEX = /^[\p{L}\p{N}\s.,@%/\-_]+$/u;
const SAFE_STRING_MSG = 'Input contains invalid symbols. Only letters, numbers, and (.,@%/-_) are allowed';

const safeString = z.string().regex(SAFE_STRING_REGEX, SAFE_STRING_MSG);

export const loginSchema = z.object({
  body: z.object({
    identifier: safeString.min(1, 'Identifier is required').max(30, 'Identifier is too long'),
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
    newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100, 'Password is too long'),
  }).strict(),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: safeString.min(2, 'Name is required').max(30, 'Name is too long').optional(),
    email: safeString.email('Invalid email').max(100, 'Email is too long').optional(),
    department: safeString.max(30, 'Department name is too long').optional(),
    avatar: safeString.optional(),
  }).strict(),
});
