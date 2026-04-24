// src/config/feature.matrix.ts

export type LoginType =
  | "email-password"
  | "email-otp"
  | "magic-link"
  | "mobile-otp"
  | "mobile-password"
  | "google-oauth"
  | "facebook-oauth"
  | "github-oauth"
  | "apple-oauth"
  | "twitter-oauth"
  | "linkedin-oauth"
  | "discord-oauth"
  | "ldap"
  | "saml"
  | "api-key";

export type OAuthProvider = Extract<
  LoginType,
  | "google-oauth"
  | "facebook-oauth"
  | "github-oauth"
  | "apple-oauth"
  | "twitter-oauth"
  | "linkedin-oauth"
  | "discord-oauth"
>;

export type AuthFeature =
  | "email-verification"
  | "phone-verification"
  | "2fa"
  | "account-lockout"
  | "rate-limit"
  | "password-reset"
  | "password-history"
  | "password-strength"
  | "rbac"
  | "permissions"
  | "device-management"
  | "geo-restriction"
  | "login-notification";

export type Database = "postgresql" | "mongodb" | "mysql" | "sqlite" | "mssql";
export type ORM = "prisma" | "typeorm" | "mongoose" | "drizzle" | "mikroorm";
export type ApiStyle = "rest" | "graphql" | "grpc" | "websocket";
export type TokenStrategy = "jwt" | "session" | "paseto";
export type CachingType = "redis" | "memcached" | "memory" | "none";
export type MessageQueue = "bullmq" | "rabbitmq" | "kafka" | "none";
export type EmailProvider =
  | "nodemailer"
  | "sendgrid"
  | "aws-ses"
  | "mailgun"
  | "resend"
  | "postmark"
  | "none";
export type SmsProvider =
  | "twilio"
  | "aws-sns"
  | "vonage"
  | "msg91"
  | "africas-talking";
export type FileUpload = "s3" | "gcs" | "cloudinary" | "local" | "none";
export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";
export type CiCd = "github-actions" | "gitlab-ci" | "none";
export type OtpStorage = "redis" | "database" | "memory";
export type TestingType = "unit" | "e2e" | "integration" | "load";
export type MonitoringType =
  | "health"
  | "swagger"
  | "winston"
  | "pino"
  | "prometheus"
  | "sentry"
  | "opentelemetry";

export interface UserConfig {
  // ── Project ──
  projectName: string;
  // ── Database ──
  databaseUrl: string;
  database: Database;
  orm: ORM;

  // ── API ──
  apiStyles: ApiStyle[];

  // ── Login Types ──
  loginTypes: LoginType[];
  oauthProviders: OAuthProvider[];
  hasEmailLogin: boolean;
  hasMobileLogin: boolean;
  hasOtp: boolean;
  hasOAuth: boolean;
  hasEnterpriseAuth: boolean;
  hasApiKey: boolean;

  // ── Auth Config ──
  tokenStrategy: TokenStrategy;
  authFeatures: AuthFeature[];
  otpStorage: OtpStorage;

  // ── External Services ──
  smsProvider?: SmsProvider;
  emailProvider: EmailProvider;
  fileUpload: FileUpload;

  // ── Infrastructure ──
  caching: CachingType;
  messageQueue: MessageQueue;
  enableDocker: boolean;

  // ── Dev ──
  testing: TestingType[];
  monitoring: MonitoringType[];
  cicd: CiCd;
  packageManager: PackageManager;
}
