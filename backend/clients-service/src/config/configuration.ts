export default () => ({
  port: parseInt(process.env.PORT || '3018', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
  },
});
