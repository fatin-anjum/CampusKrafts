/** Typed application configuration loaded from environment variables. */
export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL || '900', 10),
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL || '2592000', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  s3: {
    region: process.env.AWS_REGION || 'ap-south-1',
    bucket: process.env.AWS_S3_BUCKET || 'campuskrafts-media',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signedUrlTtl: parseInt(process.env.S3_SIGNED_URL_TTL || '900', 10),
  },

  payment: {
    successUrl: process.env.PAYMENT_SUCCESS_URL || 'http://localhost:3000/payment/success',
    failUrl: process.env.PAYMENT_FAIL_URL || 'http://localhost:3000/payment/fail',
    sslcommerz: {
      storeId: process.env.SSLCOMMERZ_STORE_ID,
      storePass: process.env.SSLCOMMERZ_STORE_PASS,
      sandbox: (process.env.SSLCOMMERZ_SANDBOX || 'true') === 'true',
    },
  },

  course: {
    crashCoursePriceBdt: parseInt(process.env.CRASH_COURSE_PRICE_BDT || '2500', 10),
  },
});
