// src/cli/prompts.ts
import inquirer from "inquirer";
import chalk from "chalk";
import {
  UserConfig,
  LoginType,
  OAuthProvider,
  AuthFeature,
} from "../config/feature.matrix";

export async function collectPrompts(
  projectName?: string,
): Promise<UserConfig> {
  const answers = await inquirer.prompt([
    // ─── PROJECT NAME ───
    {
      type: "input",
      name: "projectName",
      message: chalk.blue("📁 Project name:"),
      default: projectName || "user-service",
      validate: (input: string) => {
        if (/^[a-z][a-z0-9-]*$/.test(input)) return true;
        return "Must be lowercase, start with letter, only letters/numbers/hyphens";
      },
    },

    // ─── DATABASE ───
    {
      type: "list",
      name: "database",
      message: chalk.blue("🗄️  Choose your database:"),
      choices: [
        { name: "🐘 PostgreSQL  (Recommended)", value: "postgresql" },
        { name: "🍃 MongoDB", value: "mongodb" },
        { name: "🐬 MySQL", value: "mysql" },
        { name: "🪶 SQLite      (Dev only)", value: "sqlite" },
        { name: "🏢 SQL Server", value: "mssql" },
      ],
    },

    // ─── ORM ───
    {
      type: "list",
      name: "orm",
      message: chalk.blue("🔧 Choose your ORM:"),
      choices: (ans: any) => {
        if (ans.database === "mongodb") {
          return [
            {
              name: "🍃 Mongoose    (Recommended for MongoDB)",
              value: "mongoose",
            },
            {
              name: "◮  Prisma      (Limited MongoDB support)",
              value: "prisma",
            },
          ];
        }
        return [
          { name: "◮  Prisma      (Recommended)", value: "prisma" },
          { name: "🔷 TypeORM", value: "typeorm" },
          { name: "🌧️  Drizzle ORM", value: "drizzle" },
          { name: "🔶 MikroORM", value: "mikroorm" },
        ];
      },
    },

    // ─── API STYLES ───
    {
      type: "checkbox",
      name: "apiStyles",
      message: chalk.blue("🌐 Choose API style(s):"),
      choices: [
        { name: "🌍 REST API", value: "rest", checked: true },
        { name: "📊 GraphQL", value: "graphql" },
        { name: "📡 gRPC", value: "grpc" },
        { name: "🔌 WebSocket", value: "websocket" },
      ],
      validate: (input: string[]) =>
        input.length > 0 || "Select at least one API style",
    },

    // ─── LOGIN TYPES ───
    {
      type: "checkbox",
      name: "loginTypes",
      message: chalk.blue("🔑 Choose login type(s): (Space=select, A=all)"),
      choices: [
        new inquirer.Separator("── Email ──────────────────────────"),
        { name: "📧 Email + Password", value: "email-password", checked: true },
        { name: "📧 Email OTP         (Passwordless)", value: "email-otp" },
        { name: "🔗 Magic Link        (Passwordless)", value: "magic-link" },
        new inquirer.Separator("── Mobile ─────────────────────────"),
        { name: "📱 Mobile + OTP      (SMS)", value: "mobile-otp" },
        { name: "📱 Mobile + Password", value: "mobile-password" },
        new inquirer.Separator("── Social ─────────────────────────"),
        { name: "🔴 Google OAuth", value: "google-oauth" },
        { name: "🔵 Facebook OAuth", value: "facebook-oauth" },
        { name: "⚫ GitHub OAuth", value: "github-oauth" },
        { name: "⚪ Apple Sign In", value: "apple-oauth" },
        { name: "🔷 Twitter/X OAuth", value: "twitter-oauth" },
        { name: "🟦 LinkedIn OAuth", value: "linkedin-oauth" },
        { name: "🟠 Discord OAuth", value: "discord-oauth" },
        new inquirer.Separator("── Enterprise ─────────────────────"),
        { name: "🏢 LDAP / Active Directory", value: "ldap" },
        { name: "🏢 SAML SSO", value: "saml" },
        { name: "🔐 API Key", value: "api-key" },
        new inquirer.Separator("───────────────────────────────────"),
      ],
      validate: (input: string[]) =>
        input.length > 0 || "Select at least one login type",
    },

    // ─── SMS PROVIDER ───
    {
      type: "list",
      name: "smsProvider",
      message: chalk.blue("📱 SMS provider:"),
      when: (ans: any) => ans.loginTypes.includes("mobile-otp"),
      choices: [
        { name: "📞 Twilio", value: "twilio" },
        { name: "☁️  AWS SNS", value: "aws-sns" },
        { name: "🔶 Vonage", value: "vonage" },
        { name: "🇮🇳 MSG91", value: "msg91" },
      ],
    },

    // ─── OTP STORAGE ───
    {
      type: "list",
      name: "otpStorage",
      message: chalk.blue("🗄️  OTP storage:"),
      when: (ans: any) =>
        ans.loginTypes.includes("mobile-otp") ||
        ans.loginTypes.includes("email-otp"),
      choices: [
        { name: "⚡ Redis    (Recommended)", value: "redis" },
        { name: "🗄️  Database (Persistent)", value: "database" },
        { name: "💾 In-Memory (Dev only)", value: "memory" },
      ],
    },

    // ─── TOKEN STRATEGY ───
    {
      type: "list",
      name: "tokenStrategy",
      message: chalk.blue("🎟️  Token strategy:"),
      choices: [
        { name: "🔑 JWT (Recommended)", value: "jwt" },
        { name: "📋 Session", value: "session" },
        { name: "🔒 Paseto", value: "paseto" },
      ],
    },

    // ─── AUTH FEATURES ───
    {
      type: "checkbox",
      name: "authFeatures",
      message: chalk.blue("🛡️  Security features:"),
      choices: [
        new inquirer.Separator("── Verification ───────────────────"),
        { name: "📧 Email Verification", value: "email-verification" },
        { name: "📱 Phone Verification", value: "phone-verification" },
        new inquirer.Separator("── Security ────────────────────────"),
        { name: "🔑 Two-Factor Auth (2FA/TOTP)", value: "2fa" },
        { name: "🔒 Account Lockout", value: "account-lockout" },
        { name: "🚦 Rate Limiting", value: "rate-limit" },
        { name: "🔑 Password Reset", value: "password-reset" },
        { name: "📜 Password History", value: "password-history" },
        { name: "💪 Password Strength", value: "password-strength" },
        new inquirer.Separator("── Access Control ─────────────────"),
        { name: "🎭 RBAC", value: "rbac" },
        { name: "🔐 Permissions", value: "permissions" },
        new inquirer.Separator("── Sessions ────────────────────────"),
        { name: "📱 Device Management", value: "device-management" },
        { name: "🔔 Login Notification", value: "login-notification" },
        new inquirer.Separator("───────────────────────────────────"),
      ],
    },

    // ─── CACHING ───
    {
      type: "list",
      name: "caching",
      message: chalk.blue("⚡ Caching:"),
      choices: [
        { name: "🔴 Redis (Recommended)", value: "redis" },
        { name: "💾 In-Memory (Dev only)", value: "memory" },
        { name: "❌ None", value: "none" },
      ],
    },

    // ─── MESSAGE QUEUE ───
    {
      type: "list",
      name: "messageQueue",
      message: chalk.blue("📨 Message queue:"),
      choices: [
        { name: "🐂 BullMQ (Recommended)", value: "bullmq" },
        { name: "🐰 RabbitMQ", value: "rabbitmq" },
        { name: "🌊 Kafka", value: "kafka" },
        { name: "❌ None", value: "none" },
      ],
    },

    // ─── EMAIL PROVIDER ───
    {
      type: "list",
      name: "emailProvider",
      message: chalk.blue("📧 Email provider:"),
      choices: [
        { name: "📬 Nodemailer (SMTP)", value: "nodemailer" },
        { name: "📨 SendGrid", value: "sendgrid" },
        { name: "☁️  AWS SES", value: "aws-ses" },
        { name: "⚡ Resend", value: "resend" },
        { name: "🐙 Postmark", value: "postmark" },
        { name: "❌ None", value: "none" },
      ],
    },

    // ─── FILE UPLOAD ───
    {
      type: "list",
      name: "fileUpload",
      message: chalk.blue("📤 File upload:"),
      choices: [
        { name: "☁️  AWS S3", value: "s3" },
        { name: "🌩️  Google Cloud Storage", value: "gcs" },
        { name: "🖼️  Cloudinary", value: "cloudinary" },
        { name: "💾 Local Storage", value: "local" },
        { name: "❌ None", value: "none" },
      ],
    },

    // ─── DOCKER ───
    {
      type: "confirm",
      name: "enableDocker",
      message: chalk.blue("🐳 Generate Docker & Docker Compose?"),
      default: true,
    },

    // ─── TESTING ───
    {
      type: "checkbox",
      name: "testing",
      message: chalk.blue("🧪 Testing setup:"),
      choices: [
        { name: "🧪 Unit Tests (Jest)", value: "unit", checked: true },
        { name: "🔗 E2E Tests (Supertest)", value: "e2e", checked: true },
        { name: "🔄 Integration Tests", value: "integration" },
        { name: "⚡ Load Tests (k6)", value: "load" },
      ],
    },

    // ─── MONITORING ───
    {
      type: "checkbox",
      name: "monitoring",
      message: chalk.blue("📊 Monitoring:"),
      choices: [
        { name: "🏥 Health Checks", value: "health", checked: true },
        { name: "📖 Swagger / OpenAPI", value: "swagger", checked: true },
        { name: "📝 Winston Logger", value: "winston" },
        { name: "🚀 Pino Logger", value: "pino" },
        { name: "📈 Prometheus", value: "prometheus" },
        { name: "🐛 Sentry", value: "sentry" },
        { name: "🔭 OpenTelemetry", value: "opentelemetry" },
      ],
    },

    // ─── CI/CD ───
    {
      type: "list",
      name: "cicd",
      message: chalk.blue("🔄 CI/CD pipeline:"),
      choices: [
        { name: "🐙 GitHub Actions", value: "github-actions" },
        { name: "🦊 GitLab CI", value: "gitlab-ci" },
        { name: "❌ None", value: "none" },
      ],
    },

    // ─── PACKAGE MANAGER ───
    {
      type: "list",
      name: "packageManager",
      message: chalk.blue("📦 Package manager:"),
      choices: [
        { name: "⚡ pnpm (Recommended)", value: "pnpm" },
        { name: "📦 npm", value: "npm" },
        { name: "🧶 yarn", value: "yarn" },
        { name: "🚀 bun", value: "bun" },
      ],
    },
  ]);

  return normalizeAnswers(answers);
}

function normalizeAnswers(raw: any): UserConfig {
  const loginTypes = raw.loginTypes as LoginType[];
  const authFeatures = [...(raw.authFeatures as AuthFeature[])];

  // ── Auto-enable related features ──
  if (
    loginTypes.includes("mobile-otp") &&
    !authFeatures.includes("phone-verification")
  ) {
    authFeatures.push("phone-verification");
  }

  if (
    (loginTypes.includes("email-password") ||
      loginTypes.includes("email-otp")) &&
    !authFeatures.includes("email-verification")
  ) {
    authFeatures.push("email-verification");
  }

  if (
    loginTypes.includes("email-password") &&
    !authFeatures.includes("password-reset")
  ) {
    authFeatures.push("password-reset");
  }

  const oauthProviders = loginTypes.filter((t): t is OAuthProvider =>
    t.endsWith("-oauth"),
  );

  const config: UserConfig = {
    projectName: raw.projectName,
    databaseUrl: raw.databaseUrl,
    database: raw.database,
    orm: raw.orm,
    apiStyles: raw.apiStyles,
    loginTypes,
    oauthProviders,
    hasEmailLogin: loginTypes.some((t) =>
      ["email-password", "email-otp", "magic-link"].includes(t),
    ),
    hasMobileLogin: loginTypes.some((t) =>
      ["mobile-otp", "mobile-password"].includes(t),
    ),
    hasOtp:
      loginTypes.includes("mobile-otp") || loginTypes.includes("email-otp"),
    hasOAuth: oauthProviders.length > 0,
    hasEnterpriseAuth:
      loginTypes.includes("ldap") || loginTypes.includes("saml"),
    hasApiKey: loginTypes.includes("api-key"),
    tokenStrategy: raw.tokenStrategy,
    authFeatures,
    otpStorage: raw.otpStorage || "memory",
    smsProvider: raw.smsProvider,
    caching: raw.caching,
    messageQueue: raw.messageQueue,
    emailProvider: raw.emailProvider,
    fileUpload: raw.fileUpload,
    enableDocker: raw.enableDocker,
    testing: raw.testing,
    monitoring: raw.monitoring,
    cicd: raw.cicd,
    packageManager: raw.packageManager,
  };

  return config;
}
