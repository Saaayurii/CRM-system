export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    users: process.env.USERS_SERVICE_URL || 'http://localhost:3002',
    projects: process.env.PROJECTS_SERVICE_URL || 'http://localhost:3003',
    tasks: process.env.TASKS_SERVICE_URL || 'http://localhost:3004',
    materials: process.env.MATERIALS_SERVICE_URL || 'http://localhost:3005',
    suppliers: process.env.SUPPLIERS_SERVICE_URL || 'http://localhost:3006',
    finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:3007',
    inspections: process.env.INSPECTIONS_SERVICE_URL || 'http://localhost:3008',
    hr: process.env.HR_SERVICE_URL || 'http://localhost:3009',
    notifications:
      process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3010',
    chat: process.env.CHAT_SERVICE_URL || 'http://localhost:3011',
    calendar: process.env.CALENDAR_SERVICE_URL || 'http://localhost:3012',
    equipment: process.env.EQUIPMENT_SERVICE_URL || 'http://localhost:3013',
    documents: process.env.DOCUMENTS_SERVICE_URL || 'http://localhost:3014',
    reports: process.env.REPORTS_SERVICE_URL || 'http://localhost:3015',
    dictionary: process.env.DICTIONARY_SERVICE_URL || 'http://localhost:3016',
    audit: process.env.AUDIT_SERVICE_URL || 'http://localhost:3017',
    clients: process.env.CLIENTS_SERVICE_URL || 'http://localhost:3018',
    wiki: process.env.WIKI_SERVICE_URL || 'http://localhost:3019',
    training: process.env.TRAINING_SERVICE_URL || 'http://localhost:3020',
    automation: process.env.AUTOMATION_SERVICE_URL || 'http://localhost:3021',
    settings: process.env.SETTINGS_SERVICE_URL || 'http://localhost:3022',
    dashboard: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:3023',
  },
});
