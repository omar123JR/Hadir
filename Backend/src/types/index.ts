export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  student_id?: string | null;
  teacher_code?: string | null;
  department?: string | null;
  avatar?: string | null;
}

export interface UserWithPassword extends User {
  password_hash: string;
  is_active?: boolean;
}

export interface LoginRequest {
  identifier: string; // email (ID@example.com), username (admin), student_id, or teacher_code
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string;
  user?: User;
  error?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  student_id?: string;
  teacher_code?: string;
  department?: string;
}

export interface JwtPayload {
  sub: string;
  role: string;
  tokenVersion: number;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}
