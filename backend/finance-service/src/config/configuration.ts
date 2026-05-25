export default () => ({
  port: parseInt(process.env.PORT, 10) || 3007,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-secret',
  },
  services: {
    settings: process.env.SETTINGS_SERVICE_URL || 'http://settings-service:3000',
    projects: process.env.PROJECTS_SERVICE_URL || 'http://projects-service:3000',
    clients: process.env.CLIENTS_SERVICE_URL || 'http://clients-service:3000',
  },
});
