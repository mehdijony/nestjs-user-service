## ✅ What I’m going to create (and where to put it)

1. **`README.md`** (root) — install, quick start (new project + existing project), feature matrix, CLI reference, troubleshooting, security notes
2. **`docs/README.md`** — documentation index + navigation
3. **`docs/SETUP_GUIDE.md`** — detailed setup for new projects and existing projects, with screenshots/step-by-step flows
4. **`docs/API_MAP.md`** — complete endpoint list, request/response examples, auth flows, OAuth callbacks, 2FA, password reset, RBAC
5. **`docs/ARCHITECTURE.md`** — how the generators work, where files go, how installer + backup manager + restore points work
6. **`docs/DATABASE.md`** — Prisma/TypeORM/Mongoose/Drizzle differences, schema, migrations, seeds, common gotchas
7. **`docs/DOCKER.md`** — docker-compose services, volumes, env, common commands
8. **`docs/SECURITY.md`** — JWT config, rate limiting, password policy, 2FA, session/device management, production checklist
9. **`docs/ROLLBACK.md`** — exactly how `user-service-setup rollback` works, what gets restored/removed, recovery steps
10. **`docs/FAQ.md`** — common errors + fixes
11. **`CONTRIBUTING.md`** — how to develop locally, run tests, submit PRs
12. **`CHANGELOG.md`** — initial release notes

---

## 🧾 1) `README.md` (drop into repo root)

````markdown
# @mehdijony/nestjs-user-service

[![npm version](https://img.shields.io/npm/v/@mehdijony/nestjs-user-service.svg)](https://www.npmjs.com/package/@mehdijjon/nestjs-user-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

A production-ready **NestJS User Service generator + installer** that adds authentication, user management, and security features to **new** or **existing** NestJS projects with a single command.

It supports **Prisma / TypeORM / Mongoose / Drizzle**, **multiple login strategies** (email/password, OTP, magic link, OAuth, LDAP/SAML, API key), **RBAC**, **2FA**, **rate limiting**, **email/SMS**, **caching**, **queues**, **Docker**, **Swagger**, and more — all generated with sensible defaults and a safe **rollback/restore** system.

---

## ✨ What it gives you

- 🔐 **Auth**: JWT, refresh tokens, email/password, email OTP, mobile OTP, magic link, OAuth (Google/GitHub/Facebook/Apple/LinkedIn/Twitter/Discord), LDAP, SAML, API key
- 👤 **Users**: CRUD, profile, verification, password reset, device/session management (optional)
- 🛡️ **Security**: 2FA/TOTP, rate limiting, account lockout, password strength, RBAC/permissions
- 🗄️ **Database**: Prisma / TypeORM / Mongoose / Drizzle + migrations/seed helpers
- ⚡ **Infra**: Redis cache, BullMQ/RabbitMQ/Kafka, email (Nodemailer/SendGrid/SES/Resend/Postmark), SMS (Twilio/Vonage/AWS SNS)
- 🐳 **Docker**: `docker-compose.yml` with database/cache/queue services
- 📖 **Docs**: Swagger/OpenAPI + full documentation bundle
- 🔁 **Safe install**: backup + restore point + `rollback` command

---

## ✅ Requirements

- **Node.js >= 18**
- **NestJS project** (for `setup` mode) or an empty directory (for `init` mode)
- **npm/yarn/pnpm/bun**

---

## 📦 Installation

```bash
npm install -g @mehdijony/nestjs-user-service
# or
npx @mehdijony/nestjs-user-service --help
```
````

---

## 🚀 Quick Start

### 1) 🧪 Create a **new** project from scratch

```bash
user-service-generator init my-user-service
cd my-user-service
```

The generator will prompt you for database/ORM, login methods, security features, Docker, monitoring, and more — then generate a complete, runnable NestJS app.

### 2) 🔧 Add to an **existing** NestJS project

```bash
cd your-existing-nestjs-app
user-service-setup init
```

The installer will:

- detect your project (Nest version, package manager, existing ORM, Docker, `.env`, etc.)
- prompt you for configuration
- install dependencies into your project
- generate `src/user-service/` module + auth/user controllers/services/guards
- inject `UserServiceModule` into your `AppModule`
- append `.env` variables (without overwriting existing keys)
- update `docker-compose.yml` (append services/volumes)
- create a **restore point** and allow `rollback` if anything fails

---

## 🧭 CLI Reference

### Generator (new project)

```bash
user-service-generator init [project-name]
user-service-generator add <feature>
```

### Setup (existing project)

```bash
user-service-setup init        # install into current project
user-service-setup status      # show restore point + install info
user-service-setup rollback    # restore project to pre-install state
user-service-setup remove      # (coming soon)
```

---

## 🧩 Feature Matrix (high level)

| Area              | Options                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Database**      | PostgreSQL, MySQL, SQLite, SQL Server, MongoDB                                                       |
| **ORM**           | Prisma, TypeORM, Mongoose, Drizzle, MikroORM                                                         |
| **Auth**          | Email/password, email OTP, magic link, mobile OTP, OAuth (7+), LDAP, SAML, API key                   |
| **Security**      | JWT + refresh, 2FA/TOTP, rate limiting, account lockout, password strength/history, RBAC/permissions |
| **Infra**         | Redis cache, BullMQ/RabbitMQ/Kafka, Nodemailer/SendGrid/SES/Resend/Postmark, Twilio/Vonage/AWS SNS   |
| **Observability** | Swagger/OpenAPI, health checks, Winston/Pino, Prometheus, Sentry, OpenTelemetry                      |
| **DevOps**        | Docker Compose, GitHub Actions / GitLab CI                                                           |

See **`docs/API_MAP.md`** for the full endpoint list and **`docs/ARCHITECTURE.md`** for file layout and internals.

---

## 🧪 Post-install checklist

- If using **Prisma**: `npx prisma generate && npx prisma db push` (or `migrate dev`)
- If using **TypeORM**: run migrations as generated in `src/database/migrations`
- If using **Docker**: `docker-compose up -d`
- Start dev server: `npm run start:dev`
- Open Swagger: `http://localhost:3000/api/docs`

---

## 🔐 Security notes (production)

- Change `JWT_SECRET` to a strong random value (>= 32 chars)
- Configure HTTPS, CORS, and secure cookies if using sessions
- Set proper rate limits and account lockout thresholds
- Use environment-specific `.env` files and secrets management
- Review **`docs/SECURITY.md`** before going live

---

## 🆘 Troubleshooting

- **“Not a NestJS project”**: run inside a project with `@nestjs/common` installed
- **Dependency conflicts**: check `package.json`, remove duplicates, reinstall
- **OAuth callbacks failing**: verify callback URLs match provider + your `APP_URL`
- **Prisma schema issues**: ensure `DATABASE_URL` is correct and run `prisma generate`
- **Rollback didn’t work**: check `.user-service-backup/manifest.json` and **`docs/ROLLBACK.md`**

Full FAQ: **`docs/FAQ.md`**

---

## 🤝 Contributing

PRs welcome. See **`CONTRIBUTING.md`** for local development, testing, and coding standards.

---

## 📄 License

MIT © [Mehdi Jony](https://github.com/mehdijony)

```

---


## 🧭 One quick question (so I don’t guess wrong)

For your published npm package, what exact name should the README badges and install instructions use?

- Is it **`@mehdijony/nestjs-user-service`** (what you wrote above), or a slightly different scoped name on npm?

Once you confirm that (and if you want any extra badges like build status/coverage), I’ll generate all the files above in the exact structure and you can commit them straight to the repo.
```
