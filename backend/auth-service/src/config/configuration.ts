export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  services: {
    notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3010',
  },

  // Public URL of the frontend — used to build links in emails (password reset).
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  // Outgoing email (SMTP) for account-recovery messages.
  mail: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@construction-crm.com',
    fromName: process.env.MAIL_FROM_NAME || 'Construction CRM',
  },

  // Password reset token lifetime in minutes.
  passwordReset: {
    expiresMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES || '60', 10),
  },

  // Outgoing SMS (SMSC.ru) for phone-based account recovery.
  sms: {
    smscLogin: process.env.SMSC_LOGIN || '',
    smscPassword: process.env.SMSC_PASSWORD || '',
    smscSender: process.env.SMSC_SENDER || '',
  },

  // Phone reset OTP: lifetime and max verification attempts.
  phoneReset: {
    expiresMinutes: parseInt(process.env.PHONE_RESET_EXPIRES_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.PHONE_RESET_MAX_ATTEMPTS || '5', 10),
    resendCooldownSeconds: parseInt(process.env.PHONE_RESET_RESEND_COOLDOWN || '60', 10),
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '15', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '5', 10),
  },

  // Brute-force protection (per-email / per-OTP lockout, stored in Redis).
  // Account-level `max_login_attempts` (system-settings) overrides the threshold when set.
  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10),
    attemptWindowMinutes: parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MINUTES || '15', 10),
  },

  // Two-factor authentication (TOTP / authenticator apps)
  totp: {
    issuer: process.env.TOTP_ISSUER || 'Construction CRM',
  },
});
