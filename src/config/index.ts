import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  base_url: process.env.BASE_URL,
  database_url: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    refresh_secret: process.env.JWT_REFRESH_SECRET,
    expires_in: process.env.JWT_EXPIRES_IN,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  bcrypt: {
    salt_round: process.env.BCRYPT_SALT_ROUNDS
  },
  smtp: {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_service: process.env.SMTP_SERVICE,
    smtp_mail: process.env.SMTP_MAIL,
    smtp_password: process.env.SMTP_PASSWORD,
    name: process.env.SERVICE_NAME,
  },
  aws:{
    access_key: process.env.AWS_ACCESS_KEY,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket_name: process.env.S3_BUCKET_NAME
  },
  auth:{
    google_client_id: process.env.GOOGLE_CLIENT_ID,
    apple_bundle_id: process.env.APPLE_BUNDLE_ID,
  },
//   cloudinary: {
//     cloud_name: process.env.CLOUD_NAME,
//     api_key: process.env.API_KEY,
//     api_secret: process.env.API_SECRET,
//     cloudinary_url: process.env.CLOUDINARY_URL,
//   },
//   stripe: {
//     stripe_secret_key: process.env.STRIPE_SECRET_KEY,
//     stripe_webhook_secret_test: process.env.STRIPE_WEBHOOK_SECRET_TEST,
//     stripe_webhook_secret_production:
//       process.env.STRIPE_WEBHOOK_SECRET_PRODUCTION,
//   },
  // openai: {
  //   openai_api_key: process.env.OPENAI_API_KEY,
  // },
//   variables: {
//     email_temp_image: process.env.EMAIL_TEMP_IMAGE,
//     email_temp_text_secondary_color:
//       process.env.EMAIL_TEMP_TEXT_SECONDARY_COLOR,
//   },
  
};
