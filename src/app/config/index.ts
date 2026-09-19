import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  server_url: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
  base_url: process.env.BASE_URL || process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
  frontend_url: process.env.FRONTEND_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS || 12,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'secret',
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '1d',
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  smtp_from: process.env.SMTP_FROM,
  SMTP_USER: process.env.SMTP_USER || process.env.SMTP_MAIL,
  SMTP_PASS: process.env.APP_PASSWARD || process.env.SMTP_PASSWORD,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEYS,
  cloudinary_api_secret: process.env.CLOUDINARY_SECRET_KEYS,
  super_admin_email: process.env.SUPER_ADMIN_EMAIL || 'admin@sneakerhub.com',
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
  super_admin_first_name: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
  super_admin_last_name: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
  twilio_sid: process.env.TWILIO_SID,
  twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
  twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
  sms_enabled: process.env.SMS_ENABLED === 'true',

  // Backward compatibility mappings
  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'secret',
    refresh_secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    expires_in: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '1d',
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  bcrypt: {
    salt_round: process.env.BCRYPT_SALT_ROUNDS || 12,
  },
  smtp: {
    smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtp_port: process.env.SMTP_PORT || 587,
    smtp_service: process.env.SMTP_SERVICE || 'gmail',
    smtp_mail: process.env.SMTP_MAIL || process.env.SMTP_USER,
    smtp_password: process.env.SMTP_PASSWORD || process.env.APP_PASSWARD,
    name: process.env.SERVICE_NAME || 'Sneaker Hub',
  },
  aws: {
    access_key: process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket_name: process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'sneakerhub-bucket',
  },
  stripe: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  auth: {
    google_client_id: process.env.GOOGLE_CLIENT_ID,
    apple_bundle_id: process.env.APPLE_BUNDLE_ID,
  },
  password_reset_otp_expires_in_minutes:
    process.env.PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES || 10,
};

export default config;
