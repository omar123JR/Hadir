import { z } from 'zod';

const weakSecrets = [
  '123456',
  '12345678',
  'secret',
  'jwtsecret',
  'password',
  'your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random',
  'changeme'
];

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),

  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic safety.')
    .refine((val) => !weakSecrets.includes(val.toLowerCase()), {
      message: 'JWT_SECRET is too weak or uses a known insecure placeholder.',
    }),
  JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1, 'JWT_REFRESH_EXPIRES_IN is required'),

  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
  TRUST_PROXY: z.string().optional(),
}).superRefine((val, ctx) => {
  // Enforce TRUST_PROXY in production environments to ensure IP logging works correctly behind reverse proxies
  if (val.NODE_ENV === 'production' && !val.TRUST_PROXY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'TRUST_PROXY must be explicitly set in production to guarantee accurate client IP extraction.',
      path: ['TRUST_PROXY'],
    });
  }
});

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('\x1b[31m%s\x1b[0m', '❌ FATAL ERROR: Invalid Environment Configuration');
    console.error('\x1b[31m%s\x1b[0m', 'The application refused to start due to the following missing or invalid environment variables:\n');
    
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    
    console.error('\n\x1b[33m%s\x1b[0m', 'Please check your .env file and ensure all required secrets are set securely.');
    process.exit(1);
  }
  throw error;
}

export { env };
