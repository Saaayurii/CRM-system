export default () => ({
  port: parseInt(process.env.PORT, 10) || 3007,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-secret',
  },
});
