export default () => ({
  port: parseInt(process.env.PORT || '3017', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
  },
  // Comma-separated Kafka brokers. Empty → consumer disabled (HTTP endpoint only).
  kafka: {
    brokers: process.env.KAFKA_BROKERS || '',
  },
});
