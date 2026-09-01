import { Secret } from 'jsonwebtoken';
import { env } from './env';

export const JWT_SECRET: Secret = env.JWT_SECRET;
export const JWT_EXPIRES_IN: string = env.JWT_EXPIRES_IN;
export const JWT_REFRESH_EXPIRES_IN: string = env.JWT_REFRESH_EXPIRES_IN;

export const JWT_ISSUER = 'eduflow-api';
export const JWT_AUDIENCE = 'eduflow-client';
