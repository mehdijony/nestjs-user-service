// src/generators/docs.generator.ts
import * as fs from "fs-extra";
import * as path from "path";
import { UserConfig } from "../config/feature.matrix";

export class DocsGenerator {
  constructor(
    private config: UserConfig,
    private projectPath: string,
    private templatePath: string,
  ) {}

  async generate(): Promise<void> {
    await this.generateReadme();
    await this.generateApiMap();
    await this.generateSetupGuide();
  }

  private async generateReadme(): Promise<void> {
    let readme = `# ${this.config.projectName}

> Auto-generated NestJS User Service with production-ready features.

## 🏗️ Tech Stack

| Category | Choice |
|----------|--------|
| Framework | NestJS |
| Database | ${this.config.database} |
| ORM | ${this.config.orm} |
| API | ${this.config.apiStyles.join(", ")} |
| Auth | ${this.config.tokenStrategy.toUpperCase()} |
| Cache | ${this.config.caching} |
| Queue | ${this.config.messageQueue} |

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
${this.config.packageManager} install

# Start infrastructure
${this.config.enableDocker ? "docker-compose up -d" : "# Start your database manually"}

${
  this.config.orm === "prisma"
    ? `# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed`
    : ""
}

# Start development server
${this.config.packageManager} run start:dev
\`\`\`

## 📚 Documentation

- [API Map](./docs/API_MAP.md) - Complete API endpoints documentation
- [Setup Guide](./docs/SETUP_GUIDE.md) - Detailed setup instructions
${this.config.monitoring.includes("swagger") ? "- [Swagger UI](http://localhost:3000/api/docs) - Interactive API documentation" : ""}

## 🔐 Authentication Methods

${this.config.loginTypes.map((m) => `- ✅ ${m.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`).join("\n")}

## 🛡️ Security Features

${this.config.authFeatures.map((f) => `- ✅ ${f.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`).join("\n")}
`;

    await fs.writeFile(path.join(this.projectPath, "README.md"), readme);
  }

  private async generateApiMap(): Promise<void> {
    let apiMap = `# 🗺️ API Map

## Base URL: \`http://localhost:3000\`

---

## 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
`;

    if (this.config.loginTypes.includes("email-password")) {
      apiMap += `| POST | \`/auth/register\` | Register with email & password | ❌ |
| POST | \`/auth/login\` | Login with email & password | ❌ |
`;
    }

    apiMap += `| POST | \`/auth/refresh\` | Refresh access token | ❌ |
| POST | \`/auth/logout\` | Logout | ✅ |
`;

    if (this.config.loginTypes.includes("mobile-otp")) {
      apiMap += `| POST | \`/auth/otp/send\` | Send OTP to mobile | ❌ |
| POST | \`/auth/otp/verify\` | Verify mobile OTP | ❌ |
`;
    }

    if (this.config.loginTypes.includes("email-otp")) {
      apiMap += `| POST | \`/auth/email-otp/send\` | Send OTP to email | ❌ |
| POST | \`/auth/email-otp/verify\` | Verify email OTP | ❌ |
`;
    }

    if (this.config.loginTypes.includes("magic-link")) {
      apiMap += `| POST | \`/auth/magic-link/send\` | Send magic link | ❌ |
| GET | \`/auth/magic-link/verify\` | Verify magic link | ❌ |
`;
    }

    if (this.config.loginTypes.includes("google-oauth")) {
      apiMap += `| GET | \`/auth/google\` | Google OAuth redirect | ❌ |
| GET | \`/auth/google/callback\` | Google OAuth callback | ❌ |
`;
    }

    if (this.config.authFeatures.includes("password-reset")) {
      apiMap += `| POST | \`/auth/forgot-password\` | Request password reset | ❌ |
| POST | \`/auth/reset-password\` | Reset password with token | ❌ |
`;
    }

    if (this.config.authFeatures.includes("2fa")) {
      apiMap += `
## 🔑 Two-Factor Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| POST | \`/auth/2fa/generate\` | Generate 2FA secret & QR | ✅ |
| POST | \`/auth/2fa/enable\` | Enable 2FA with TOTP | ✅ |
| POST | \`/auth/2fa/verify\` | Verify 2FA token | ✅ |
| POST | \`/auth/2fa/disable\` | Disable 2FA | ✅ |
`;
    }

    apiMap += `
## 👤 User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| GET | \`/users\` | List all users (paginated) | ✅ |
| GET | \`/users/me\` | Get current user profile | ✅ |
| GET | \`/users/:id\` | Get user by ID | ✅ |
| PATCH | \`/users/:id\` | Update user | ✅ |
| DELETE | \`/users/:id\` | Delete user | ✅ |
`;

    if (this.config.authFeatures.includes("rbac")) {
      apiMap += `
## 🎭 Roles & Permissions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| GET | \`/roles\` | List all roles | ✅ (Admin) |
| POST | \`/roles\` | Create role | ✅ (Admin) |
| POST | \`/roles/:id/assign/:userId\` | Assign role to user | ✅ (Admin) |
`;
    }

    if (this.config.monitoring.includes("health")) {
      apiMap += `
## 🏥 Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| GET | \`/health\` | Health check | ❌ |
`;
    }

    if (this.config.apiStyles.includes("graphql")) {
      apiMap += `
## 📊 GraphQL

| Endpoint | Description |
|----------|-------------|
| \`/graphql\` | GraphQL Playground & API |

### Queries
\`\`\`graphql
query {
  users(page: 1, limit: 10) { users { id email firstName } }
  user(id: 1) { id email firstName lastName }
  me { id email firstName }
}
\`\`\`

### Mutations
\`\`\`graphql
mutation {
  register(input: { email: "user@test.com", password: "pass123" }) {
    accessToken
    user { id email }
  }
  login(input: { email: "user@test.com", password: "pass123" }) {
    accessToken
    user { id email }
  }
}
\`\`\`
`;
    }

    if (this.config.apiStyles.includes("grpc")) {
      apiMap += `
## 📡 gRPC

| Service | Method | Description |
|---------|--------|-------------|
| UserService | GetUser | Get user by ID |
| UserService | ListUsers | List users |
| UserService | CreateUser | Create user |
| AuthService | Login | Login |
| AuthService | Register | Register |

Proto file: \`src/proto/user.proto\`
`;
    }

    await fs.writeFile(
      path.join(this.projectPath, "docs", "API_MAP.md"),
      apiMap,
    );
  }

  private async generateSetupGuide(): Promise<void> {
    let guide = `# 🔧 Setup Guide

## Prerequisites

- Node.js >= 18
- ${this.config.packageManager}
${this.config.enableDocker ? "- Docker & Docker Compose" : ""}
${this.config.database === "postgresql" ? "- PostgreSQL 16+" : ""}
${this.config.database === "mongodb" ? "- MongoDB 7+" : ""}
${this.config.caching === "redis" ? "- Redis 7+" : ""}

## Step-by-Step Setup

### 1. Clone & Install
\`\`\`bash
cd ${this.config.projectName}
${this.config.packageManager} install
\`\`\`

### 2. Environment Configuration
\`\`\`bash
cp .env.example .env
# Edit .env with your actual values
\`\`\`

### 3. Start Infrastructure
${
  this.config.enableDocker
    ? `\`\`\`bash
docker-compose up -d
\`\`\``
    : "Start your database and other services manually."
}

### 4. Database Setup
${
  this.config.orm === "prisma"
    ? `\`\`\`bash
npx prisma generate
npx prisma db push
npx prisma db seed  # Optional: seed with test data
\`\`\``
    : ""
}
${
  this.config.orm === "typeorm"
    ? `\`\`\`bash
npm run migration:run
\`\`\``
    : ""
}

### 5. Start the Application
\`\`\`bash
${this.config.packageManager} run start:dev
\`\`\`

### 6. Verify
${this.config.monitoring.includes("swagger") ? "- Swagger UI: http://localhost:3000/api/docs" : ""}
${this.config.monitoring.includes("health") ? "- Health Check: http://localhost:3000/health" : ""}
${this.config.apiStyles.includes("graphql") ? "- GraphQL Playground: http://localhost:3000/graphql" : ""}

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|:--------:|
| PORT | Application port | ✅ |
| DATABASE_URL | Database connection string | ✅ |
| JWT_SECRET | JWT signing secret | ✅ |
${this.config.caching === "redis" ? "| REDIS_HOST | Redis host | ✅ |" : ""}
${this.config.loginTypes.includes("google-oauth") ? "| GOOGLE_CLIENT_ID | Google OAuth ID | ✅ |\n| GOOGLE_CLIENT_SECRET | Google OAuth Secret | ✅ |" : ""}
${this.config.smsProvider === "twilio" ? "| TWILIO_ACCOUNT_SID | Twilio SID | ✅ |\n| TWILIO_AUTH_TOKEN | Twilio Token | ✅ |" : ""}
`;

    await fs.writeFile(
      path.join(this.projectPath, "docs", "SETUP_GUIDE.md"),
      guide,
    );
  }
}
