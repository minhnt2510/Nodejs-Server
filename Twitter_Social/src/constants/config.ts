import dotenv from 'dotenv'
dotenv.config()

export const envConfig = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'http://localhost',
  dbUsername: process.env.DB_USERNAME as string,
  dbPassword: process.env.DB_PASSWORD as string,
  dbName: process.env.DB_NAME || 'twitter',
  dbHost: process.env.DB_HOST as string,

  jwtSecretAccessToken: process.env.JWT_SECRET_ACCESS_TOKEN as string,
  jwtSecretRefreshToken: process.env.JWT_SECRET_REFRESH_TOKEN as string,
  jwtSecretEmailVerifyToken: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
  jwtSecretForgotPasswordToken: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '100d',
  emailVerifyTokenExpiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN || '7d',
  forgotPasswordTokenExpiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN || '7d',

  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  clientRedirectCallback: process.env.CLIENT_REDIRECT_CALLBACK || 'http://localhost:3000/oauth2-redirect.html',

  smtpService: process.env.SMTP_SERVICE || 'gmail',
  smtpUser: process.env.SMTP_USER as string,
  smtpPass: process.env.SMTP_PASS as string,
  smtpFrom: process.env.SMTP_FROM || 'Twitter App',

  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI as string,

  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
  s3BucketName: process.env.S3_BUCKET_NAME as string,
  sesFromAddress: process.env.SES_FROM_ADDRESS as string,

  passwordSecret: process.env.PASSWORD_SECRET || 'twitter-secret',
  geminiApiKey: process.env.GEMINI_API_KEY as string
}
