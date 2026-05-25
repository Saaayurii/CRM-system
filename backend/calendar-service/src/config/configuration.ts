export default () => ({
  port: parseInt(process.env.PORT || '3012', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: { accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret' },
  TASKS_SERVICE_URL: process.env.TASKS_SERVICE_URL || 'http://tasks-service:3004',
  INSPECTIONS_SERVICE_URL: process.env.INSPECTIONS_SERVICE_URL || 'http://inspections-service:3008',
  HR_SERVICE_URL: process.env.HR_SERVICE_URL || 'http://hr-service:3009',
  PROJECTS_SERVICE_URL: process.env.PROJECTS_SERVICE_URL || 'http://projects-service:3003',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
  CALENDAR_ENC_KEY: process.env.CALENDAR_ENC_KEY || '',
});
