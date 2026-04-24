// src/setup/prompts.ts
import inquirer from "inquirer";
import chalk from "chalk";
import {
  UserConfig,
  LoginType,
  OAuthProvider,
  AuthFeature,
} from "../config/feature.matrix";
import { ExistingProjectInfo } from "./project.detector";

export async function collectPrompts(
  projectInfo: ExistingProjectInfo,
): Promise<UserConfig> {
  printConflictWarnings(projectInfo);

  const answers = await inquirer.prompt([
    // ─── DATABASE ───
    {
      type: "list",
      name: "database",
      message: chalk.blue("🗄️  Choose your database:"),
      default: projectInfo.hasPrisma
        ? "postgresql"
        : projectInfo.hasMongoose
          ? "mongodb"
          : "postgresql",
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
      default: () => {
        if (projectInfo.hasPrisma) return "prisma";
        if (projectInfo.hasTypeORM) return "typeorm";
        if (projectInfo.hasMongoose) return "mongoose";
        return "prisma";
      },
      choices: (ans: any) => {
        if (ans.database === "mongodb") {
          return [
            {
              name: `🍃 Mongoose${projectInfo.hasMongoose ? chalk.green(" (already installed)") : ""}`,
              value: "mongoose",
            },
            { name: "◮  Prisma", value: "prisma" },
          ];
        }
        return [
          {
            name: `◮  Prisma${projectInfo.hasPrisma ? chalk.green(" (already installed)") : ""}    (Recommended)`,
            value: "prisma",
          },
          {
            name: `🔷 TypeORM${projectInfo.hasTypeORM ? chalk.green(" (already installed)") : ""}`,
            value: "typeorm",
          },
          { name: "🌧️  Drizzle ORM", value: "drizzle" },
          { name: "🔶 MikroORM", value: "mikroorm" },
        ];
      },
    },

    // ─── DATABASE CONNECTION ───
    {
      type: "input",
      name: "databaseUrl",
      message: chalk.blue("🔗 Database connection URL:"),
      default: (ans: any) => {
        switch (ans.database) {
          case "postgresql":
            return "postgresql://postgres:postgres@localhost:5432/mydb";
          case "mongodb":
            return "mongodb://localhost:27017/mydb";
          case "mysql":
            return "mysql://root:root@localhost:3306/mydb";
          case "sqlite":
            return "file:./dev.db";
          default:
            return "";
        }
      },
      validate: (input: string) =>
        input.trim().length > 0 || "Please enter a database URL",
    },

    // ─── API STYLES ───
    {
      type: "checkbox",
      name: "apiStyles",
      message: chalk.blue("🌐 API style(s):"),
      choices: [
        { name: "🌍 REST API", value: "rest", checked: true },
        { name: "📊 GraphQL", value: "graphql" },
        { name: "📡 gRPC", value: "grpc" },
        { name: "🔌 WebSocket", value: "websocket" },
      ],
      validate: (input: string[]) => input.length > 0 || "Select at least one",
    },

    // ─── LOGIN TYPES ───
    {
      type: "checkbox",
      name: "loginTypes",
      message: chalk.blue("🔑 Login type(s): (Space=select, A=all)"),
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
      message: chalk.blue("🐳 Add/Update Docker Compose?"),
      default: !projectInfo.hasDocker,
    },

    // ─── MODULE LOCATION ───
    {
      type: "input",
      name: "moduleLocation",
      message: chalk.blue("📁 Where to place user-service files?"),
      default: "src/user-service",
      validate: (input: string) =>
        input.trim().length > 0 || "Please enter a valid path",
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
  ]);

  return normalizeAnswers(answers, projectInfo);
}

// ──────────────────────────────────────────────
//  CONFLICT WARNINGS
// ──────────────────────────────────────────────
function printConflictWarnings(info: ExistingProjectInfo): void {
  const warnings: string[] = [];

  if (info.hasPrisma && info.hasTypeORM) {
    warnings.push("Both Prisma and TypeORM detected. We will use one.");
  }
  if (info.hasDocker) {
    warnings.push("docker-compose.yml exists. We will append services.");
  }
  if (info.hasEnvFile) {
    warnings.push(".env exists. We will append new variables only.");
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow("\n⚠️  Heads up:"));
    warnings.forEach((w) => console.log(chalk.yellow(`   • ${w}`)));
    console.log("");
  }
}

// ──────────────────────────────────────────────
//  NORMALIZE ANSWERS
// ──────────────────────────────────────────────
function normalizeAnswers(
  raw: any,
  projectInfo: ExistingProjectInfo,
): UserConfig {
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
    projectName: raw.moduleLocation || "user-service",
    databaseUrl: raw.databaseUrl, // ← ADD THIS
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
    packageManager: projectInfo.packageManager,
  };

  return config;
}
