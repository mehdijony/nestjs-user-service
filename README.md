````markdown
<div align="center">

# 🚀 @mehdijony/nestjs-user-service

**The most powerful NestJS User Service CLI — install a complete auth system into any NestJS project in minutes.**

[![npm version](https://img.shields.io/npm/v/@mehdijony/nestjs-user-service?style=for-the-badge&color=red)](https://www.npmjs.com/package/@mehdijony/nestjs-user-service)
[![npm downloads](https://img.shields.io/npm/dm/@mehdijony/nestjs-user-service?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@mehdijony/nestjs-user-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://github.com/mehdijony/nestjs-user-service/blob/main/LICENSE)
[![Node >= 18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10%2B-red?style=for-the-badge&logo=nestjs)](https://nestjs.com)

<br/>

> Run one command. Answer a few questions. Get a **production-ready auth system** with users, JWT, OAuth, 2FA, RBAC, rate limiting, email/SMS, caching, Docker, Swagger — all wired up and ready to run.

<br/>

```bash
npx @mehdijony/nestjs-user-service init
```
````

<br/>

---

</div>

## 📋 Table of Contents

- [What You Get](#-what-you-get)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Usage — Existing Project](#-add-to-existing-nestjs-project)
- [Usage — New Project](#-create-a-brand-new-project)
- [CLI Commands](#-cli-commands)
- [Configuration Options](#-configuration-options)
- [Generated File Structure](#-generated-file-structure)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Rollback System](#-safe-rollback-system)
- [Post-Install Steps](#-post-install-steps)
- [Supported Technologies](#-supported-technologies)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🎁 What You Get

A fully wired **authentication + user management system** dropped directly into your existing NestJS project (or generated as a new project), including:

```
✅ Auth Module      → register, login, logout, refresh tokens
✅ User Module      → CRUD, profile, pagination
✅ JWT Strategy     → access + refresh tokens, configurable expiry
✅ Guards           → JwtAuthGuard, RolesGuard, ThrottlerGuard
✅ Decorators       → @CurrentUser(), @Roles()
✅ Password         → bcrypt hashing, reset flow, strength validation
✅ OAuth            → Google, GitHub, Facebook, Apple, Twitter, LinkedIn, Discord
✅ OTP              → email OTP, mobile OTP (SMS), magic link
✅ 2FA / TOTP       → QR code + authenticator app support
✅ RBAC             → roles + permissions system
✅ Rate Limiting    → per-IP throttling via @nestjs/throttler
✅ Email            → Nodemailer / SendGrid / AWS SES / Resend / Postmark
✅ SMS              → Twilio / Vonage / AWS SNS / MSG91
✅ Caching          → Redis or in-memory
✅ Queue            → BullMQ / RabbitMQ / Kafka
✅ Docker           → docker-compose with all services
✅ Swagger          → full OpenAPI docs at /api/docs
✅ Health Checks    → /api/v1/health endpoint
✅ Rollback         → safe restore point — undo the install anytime
```

---

## ✅ Requirements

| Requirement     | Version                 |
| --------------- | ----------------------- |
| Node.js         | >= 18                   |
| NestJS          | >= 9                    |
| TypeScript      | >= 4.8                  |
| Package manager | npm / yarn / pnpm / bun |

---

## 📦 Installation

No global install needed — just use `npx`:

```bash
npx @mehdijony/nestjs-user-service init
```

Or install globally for repeated use:

```bash
npm install -g @mehdijony/nestjs-user-service
```

```bash
yarn global add @mehdijony/nestjs-user-service
```

```bash
pnpm add -g @mehdijony/nestjs-user-service
```

```bash
bun add -g @mehdijony/nestjs-user-service
```

---

## 🔧 Add to Existing NestJS Project

The most common use case. Run this **inside your existing NestJS project root**:

```bash
cd your-nestjs-project
npx @mehdijony/nestjs-user-service init
```

**What happens step by step:**

```
1. 🔍  Detects your project (NestJS version, package manager, existing ORMs, Docker, .env)
2. 🧩  Asks you configuration questions (database, auth methods, features, monitoring)
3. ✅  Confirms your choices before touching anything
4. 💾  Creates a RESTORE POINT (safe to rollback anytime)
5. 📦  Installs required npm packages into YOUR project
6. 📁  Generates src/user-service/ module with all files
7. 🔌  Injects UserServiceModule into your app.module.ts
8. 🔑  Appends new .env variables (never overwrites existing keys)
9. 🐳  Updates docker-compose.yml (appends services/volumes)
10. 📖  Generates docs/USER_SERVICE.md
```

**Sample prompts you will see:**

```
🗄️  Choose your database:
  ❯ 🐘 PostgreSQL  (Recommended)
    🍃 MongoDB
    🐬 MySQL
    🪶 SQLite
    🏢 SQL Server

🔧 Choose your ORM:
  ❯ ◮  Prisma      (Recommended)
    🔷 TypeORM
    🌧️  Drizzle ORM
    🔶 MikroORM

🔑 Login type(s):
  ❯ ✅ 📧 Email + Password
    📧 Email OTP (Passwordless)
    🔗 Magic Link (Passwordless)
    📱 Mobile + OTP (SMS)
    🔴 Google OAuth
    ⚫ GitHub OAuth
    🔑 Two-Factor Auth (2FA/TOTP)
    🎭 RBAC
    ... and more

📊 Monitoring:
  ❯ ✅ 🏥 Health Checks
    ✅ 📖 Swagger / OpenAPI
    📝 Winston Logger
    📈 Prometheus
    🐛 Sentry
```

---

## 🆕 Create a Brand New Project

Use the generator to scaffold a complete NestJS project from scratch:

```bash
npx @mehdijony/nestjs-user-service init my-app
cd my-app
```

This creates a full NestJS project with everything configured: `package.json`, `tsconfig.json`, `nest-cli.json`, `main.ts`, `app.module.ts`, database schema, Docker, tests, `.env`, and full documentation.

---

## 🛠️ CLI Commands

### `init`

Install user service into current project or create new project.

```bash
npx @mehdijony/nestjs-user-service init
npx @mehdijony/nestjs-user-service init my-project-name
```

### `status`

Check if user service is already installed. Shows installation details.

```bash
npx @mehdijony/nestjs-user-service status
```

Output example:

```
✅ User service is INSTALLED.

📋 Installation details:
─────────────────────────────────────────────────
  Installed:     2024-01-15T10:30:00.000Z
  Database:      postgresql
  ORM:           prisma
  Login types:   email-password, google-oauth
  Files created: 24
  Deps added:    18
─────────────────────────────────────────────────
```

### `rollback`

Undo the installation completely — removes all generated files, uninstalls added packages, and restores modified files.

```bash
npx @mehdijony/nestjs-user-service rollback
```

### `remove`

_(Coming soon)_

```bash
npx @mehdijony/nestjs-user-service remove
```

---

## ⚙️ Configuration Options

Every option below is presented as an interactive prompt during `init`.

### 🗄️ Database

| Choice     | Value        | Notes                      |
| ---------- | ------------ | -------------------------- |
| PostgreSQL | `postgresql` | Recommended for production |
| MongoDB    | `mongodb`    | Use with Mongoose          |
| MySQL      | `mysql`      | Fully supported            |
| SQLite     | `sqlite`     | Dev/testing only           |
| SQL Server | `mssql`      | Enterprise                 |

### 🔧 ORM

| Choice   | Value      | Notes                                |
| -------- | ---------- | ------------------------------------ |
| Prisma   | `prisma`   | Recommended — auto schema generation |
| TypeORM  | `typeorm`  | Entity decorators + migrations       |
| Mongoose | `mongoose` | MongoDB native                       |
| Drizzle  | `drizzle`  | TypeScript-first                     |
| MikroORM | `mikroorm` | Advanced use cases                   |

### 🔑 Login Methods

| Method           | Description                           |
| ---------------- | ------------------------------------- |
| Email + Password | Classic login with bcrypt             |
| Email OTP        | Passwordless — OTP sent to email      |
| Magic Link       | Passwordless — JWT link sent to email |
| Mobile OTP       | SMS OTP via Twilio/Vonage/AWS SNS     |
| Google OAuth     | Google sign-in                        |
| GitHub OAuth     | GitHub sign-in                        |
| Facebook OAuth   | Facebook sign-in                      |
| Apple Sign In    | Apple ID                              |
| Twitter/X OAuth  | Twitter sign-in                       |
| LinkedIn OAuth   | LinkedIn sign-in                      |
| Discord OAuth    | Discord sign-in                       |
| LDAP             | Active Directory enterprise login     |
| SAML SSO         | SAML enterprise SSO                   |
| API Key          | Header-based API key auth             |

### 🛡️ Security Features

| Feature            | Description                    |
| ------------------ | ------------------------------ |
| Email Verification | Verify email on register       |
| Phone Verification | Verify mobile on OTP login     |
| 2FA / TOTP         | Time-based OTP with QR code    |
| Account Lockout    | Lock after failed attempts     |
| Rate Limiting      | Per-IP throttling              |
| Password Reset     | Forgot/reset password flow     |
| Password History   | Prevent reuse of old passwords |
| Password Strength  | Custom validator decorator     |
| RBAC               | Role-based access control      |
| Permissions        | Fine-grained permission system |
| Device Management  | Track and revoke sessions      |
| Login Notification | Alert user on new login        |

### 📧 Email Providers

| Provider          | Value        |
| ----------------- | ------------ |
| Nodemailer (SMTP) | `nodemailer` |
| SendGrid          | `sendgrid`   |
| AWS SES           | `aws-ses`    |
| Resend            | `resend`     |
| Postmark          | `postmark`   |

### 📱 SMS Providers

| Provider | Value     |
| -------- | --------- |
| Twilio   | `twilio`  |
| Vonage   | `vonage`  |
| AWS SNS  | `aws-sns` |
| MSG91    | `msg91`   |

### ⚡ Caching

| Option    | Value    |
| --------- | -------- |
| Redis     | `redis`  |
| In-Memory | `memory` |
| None      | `none`   |

### 📨 Message Queues

| Option   | Value      |
| -------- | ---------- |
| BullMQ   | `bullmq`   |
| RabbitMQ | `rabbitmq` |
| Kafka    | `kafka`    |
| None     | `none`     |

### 📤 File Upload

| Option               | Value        |
| -------------------- | ------------ |
| AWS S3               | `s3`         |
| Google Cloud Storage | `gcs`        |
| Cloudinary           | `cloudinary` |
| Local Storage        | `local`      |
| None                 | `none`       |

### 📊 Monitoring

| Option            | Description                  |
| ----------------- | ---------------------------- |
| Health Checks     | `/api/v1/health` endpoint    |
| Swagger / OpenAPI | `/api/docs` with full schema |
| Winston Logger    | Structured logging           |
| Pino Logger       | High-performance logging     |
| Prometheus        | Metrics endpoint             |
| Sentry            | Error tracking               |
| OpenTelemetry     | Distributed tracing          |

---

## 📁 Generated File Structure

After running `init` on an existing project, files are placed under `src/user-service/`:

```
your-project/
├── src/
│   └── user-service/
│       ├── user-service.module.ts          ← Root module (imported into AppModule)
│       │
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.service.ts             ← All auth logic
│       │   ├── auth.controller.ts          ← All auth endpoints
│       │   ├── otp.service.ts              ← OTP generate/verify (if OTP selected)
│       │   ├── dto/
│       │   │   ├── register-email.dto.ts
│       │   │   └── login-email.dto.ts
│       │   ├── guards/
│       │   │   └── jwt-auth.guard.ts
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts
│       │   │   ├── google.strategy.ts      ← (if Google OAuth selected)
│       │   │   ├── github.strategy.ts      ← (if GitHub OAuth selected)
│       │   │   └── ...
│       │   └── decorators/
│       │       └── current-user.decorator.ts
│       │
│       ├── user/
│       │   ├── user.module.ts
│       │   ├── user.service.ts             ← User CRUD
│       │   ├── user.controller.ts          ← User endpoints
│       │   ├── dto/
│       │   │   ├── create-user.dto.ts
│       │   │   └── update-user.dto.ts
│       │   └── entities/
│       │       ├── user.entity.ts          ← (TypeORM)
│       │       └── user.schema.ts          ← (Mongoose)
│       │
│       ├── two-factor/                     ← (if 2FA selected)
│       │   └── two-factor.service.ts
│       │
│       └── common/
│           ├── filters/
│           │   └── all-exceptions.filter.ts
│           └── interceptors/
│               └── transform.interceptor.ts
│
├── docs/
│   └── USER_SERVICE.md                     ← Auto-generated API docs
│
├── prisma/
│   └── schema.prisma                       ← User model added (if Prisma)
│
├── .env                                    ← New vars appended
├── docker-compose.yml                      ← Services added
└── .user-service-backup/                   ← Restore point (auto-created)
    └── manifest.json
```

---

## 🔑 Environment Variables

Generated and appended to your `.env` automatically. Keys are **never overwritten** if they already exist.

### Always added

```env
# ─── USER SERVICE ───
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
JWT_SECRET=change-this-to-a-secure-secret-minimum-32-characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
APP_URL=http://localhost:3000
```

### Redis (if caching = redis)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Google OAuth (if selected)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

### GitHub OAuth (if selected)

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/api/v1/auth/github/callback
```

### Email (Nodemailer example)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@example.com
```

### SMS (Twilio example)

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1234567890
```

### 2FA

```env
TWO_FACTOR_APP_NAME=YourAppName
```

### AWS S3 (if file upload = s3)

```env
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY=
AWS_S3_SECRET_KEY=
```

---

## 🌐 API Endpoints

All endpoints are prefixed with `/api/v1`. Full Swagger docs available at `/api/docs`.

### 🔐 Auth

| Method | Endpoint                         | Auth Required | Description                    |
| ------ | -------------------------------- | ------------- | ------------------------------ |
| `POST` | `/api/v1/auth/register`          | ❌            | Register with email + password |
| `POST` | `/api/v1/auth/login`             | ❌            | Login with email + password    |
| `POST` | `/api/v1/auth/refresh`           | ❌            | Refresh access token           |
| `POST` | `/api/v1/auth/logout`            | ✅            | Logout                         |
| `POST` | `/api/v1/auth/forgot-password`   | ❌            | Send password reset email      |
| `POST` | `/api/v1/auth/reset-password`    | ❌            | Reset password with token      |
| `POST` | `/api/v1/auth/email/otp/send`    | ❌            | Send email OTP                 |
| `POST` | `/api/v1/auth/email/otp/verify`  | ❌            | Verify email OTP               |
| `POST` | `/api/v1/auth/mobile/otp/send`   | ❌            | Send SMS OTP                   |
| `POST` | `/api/v1/auth/mobile/otp/verify` | ❌            | Verify SMS OTP                 |
| `POST` | `/api/v1/auth/magic-link/send`   | ❌            | Send magic link to email       |
| `GET`  | `/api/v1/auth/magic-link/verify` | ❌            | Verify magic link token        |
| `GET`  | `/api/v1/auth/google`            | ❌            | Start Google OAuth flow        |
| `GET`  | `/api/v1/auth/google/callback`   | ❌            | Google OAuth callback          |
| `GET`  | `/api/v1/auth/github`            | ❌            | Start GitHub OAuth flow        |
| `GET`  | `/api/v1/auth/github/callback`   | ❌            | GitHub OAuth callback          |
| `GET`  | `/api/v1/auth/facebook`          | ❌            | Start Facebook OAuth flow      |
| `GET`  | `/api/v1/auth/facebook/callback` | ❌            | Facebook OAuth callback        |

> OAuth endpoints only appear if that provider was selected during setup.

### 👤 Users

| Method   | Endpoint            | Auth Required | Description                |
| -------- | ------------------- | ------------- | -------------------------- |
| `GET`    | `/api/v1/users`     | ✅            | List all users (paginated) |
| `GET`    | `/api/v1/users/me`  | ✅            | Get current user profile   |
| `GET`    | `/api/v1/users/:id` | ✅            | Get user by ID             |
| `PATCH`  | `/api/v1/users/:id` | ✅            | Update user                |
| `DELETE` | `/api/v1/users/:id` | ✅            | Delete user                |

### 📡 Example Requests

**Register**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongP@ss1",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Login**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "StrongP@ss1"}'
```

**Authenticated request**

```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Refresh token**

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

---

## 🔁 Safe Rollback System

Every install creates a **restore point** before touching your project.

### How it works

```
Before install:
  ✅ Backs up app.module.ts
  ✅ Backs up .env
  ✅ Backs up docker-compose.yml
  ✅ Backs up prisma/schema.prisma
  ✅ Records all files that will be created
  ✅ Records all packages that will be installed

After install:
  ✅ Saves manifest to .user-service-backup/manifest.json

On rollback:
  ✅ Deletes all generated files
  ✅ Restores all modified files to original state
  ✅ Uninstalls all added npm packages
  ✅ Cleans up backup directory
```

### Run rollback

```bash
npx @mehdijony/nestjs-user-service rollback
```

You will see a confirmation prompt showing exactly what will be restored before anything happens.

### Check status first

```bash
npx @mehdijony/nestjs-user-service status
```

> ⚠️ If you already have a restore point and run `init` again, you will be asked whether to rollback first and reinstall, overwrite, or cancel.

---

## 🚀 Post-Install Steps

### Prisma

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (dev)
npx prisma db push

# Or run migrations (production)
npx prisma migrate dev --name init

# Open Prisma Studio
npx prisma studio
```

### TypeORM

```bash
# Generate migration
npm run migration:generate

# Run migrations
npm run migration:run
```

### Start Docker services

```bash
docker-compose up -d
```

### Start development server

```bash
npm run start:dev
```

### Open Swagger docs

```
http://localhost:3000/api/docs
```

### Check health

```
http://localhost:3000/api/v1/health
```

---

## 🧱 Supported Technologies

| Category             | Supported                                                       |
| -------------------- | --------------------------------------------------------------- |
| **Databases**        | PostgreSQL, MySQL, SQLite, SQL Server, MongoDB                  |
| **ORMs**             | Prisma, TypeORM, Mongoose, Drizzle, MikroORM                    |
| **Auth**             | JWT, Session, Paseto                                            |
| **OAuth**            | Google, GitHub, Facebook, Apple, Twitter, LinkedIn, Discord     |
| **Enterprise**       | LDAP (Active Directory), SAML SSO                               |
| **Email**            | Nodemailer (SMTP), SendGrid, AWS SES, Resend, Postmark, Mailgun |
| **SMS**              | Twilio, Vonage, AWS SNS, MSG91                                  |
| **Cache**            | Redis, In-memory                                                |
| **Queue**            | BullMQ, RabbitMQ, Kafka                                         |
| **File Upload**      | AWS S3, Google Cloud Storage, Cloudinary, Local                 |
| **Logging**          | Winston, Pino                                                   |
| **Monitoring**       | Prometheus, Sentry, OpenTelemetry                               |
| **CI/CD**            | GitHub Actions, GitLab CI                                       |
| **Package Managers** | npm, yarn, pnpm, bun                                            |

---

## 🆘 Troubleshooting

### ❌ "Not a NestJS project"

Make sure you are running the command inside a project that has `@nestjs/common` in its `package.json`.

### ❌ "No package.json found"

Run the command from your project root directory, not a subdirectory.

### ❌ Dependency conflicts after install

```bash
npm install --legacy-peer-deps
```

### ❌ Prisma client not generated

```bash
npx prisma generate
```

### ❌ OAuth callback URL mismatch

Make sure your OAuth provider's callback URL matches the value in your `.env` exactly, including the protocol and port.

```env
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

### ❌ JWT errors / "Invalid token"

- Check `JWT_SECRET` is set and at least 32 characters
- Make sure access token has not expired (default: 15 minutes)
- Use the `/api/v1/auth/refresh` endpoint to get a new access token

### ❌ Docker services not starting

```bash
docker-compose down -v
docker-compose up -d
docker-compose logs -f
```

### ❌ Rollback failed

Check `.user-service-backup/manifest.json` — it lists every file and dependency tracked. You can manually delete files listed under `generatedFiles` and restore files listed under `modifiedFiles`.

---

## 📄 License

MIT © [Mehdi Jony](https://github.com/mehdijony)

---

<div align="center">

**Built for NestJS developers who want to ship fast without cutting corners on security.**

⭐ Star the repo if this saved you time →
[github.com/mehdijony/nestjs-user-service](https://github.com/mehdijony/nestjs-user-service)

</div>
```
