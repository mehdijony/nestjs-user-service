// src/setup/installer.ts
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { ExistingProjectInfo } from "./project.detector";
import { UserConfig } from "../config/feature.matrix";
import { BackupManager } from "./backup.manager";

export class Installer {
  private config: UserConfig;
  private projectInfo: ExistingProjectInfo;
  private targetPath: string;
  private backup: BackupManager;

  constructor(config: UserConfig, projectInfo: ExistingProjectInfo) {
    this.config = config;
    this.projectInfo = projectInfo;
    // ← where generated files go inside user's project
    this.targetPath = path.join(projectInfo.rootPath, "src", "user-service");
    this.backup = new BackupManager(projectInfo.rootPath);
  }

  async install(): Promise<void> {
    const spinner = ora();

    try {
      // ─── 0. CREATE RESTORE POINT FIRST ───
      await this.backup.createBackup();
      this.backup.setConfig(this.config);

      // Backup files that will be modified
      await this.backup.backupPackageFiles();

      if (this.projectInfo.appModulePath) {
        await this.backup.backupFile(this.projectInfo.appModulePath);
      }

      const envPath = path.join(this.projectInfo.rootPath, ".env");
      await this.backup.backupFile(envPath);

      const dockerPath = path.join(
        this.projectInfo.rootPath,
        "docker-compose.yml",
      );
      await this.backup.backupFile(dockerPath);

      const prismaPath = path.join(
        this.projectInfo.rootPath,
        "prisma",
        "schema.prisma",
      );
      await this.backup.backupFile(prismaPath);

      // 1. Install ALL dependencies first
      spinner.start("Installing required packages into your project...");
      await this.installDependencies();
      spinner.succeed("Packages installed");

      // 2. Create directories
      spinner.start("Creating user-service directories...");
      await this.createDirectories();
      spinner.succeed("Directories created");

      // 3. Generate all files
      spinner.start("Generating user-service files...");
      await this.generateFiles();
      spinner.succeed("Files generated");

      // 4. Inject into app.module.ts
      spinner.start("Updating app.module.ts...");
      await this.injectIntoAppModule();
      spinner.succeed("app.module.ts updated");

      // 5. Append env variables
      spinner.start("Updating .env file...");
      await this.appendEnvVariables();
      spinner.succeed(".env updated");

      // 6. Prisma setup
      if (this.config.orm === "prisma") {
        spinner.start("Setting up Prisma schema...");
        await this.setupPrisma();
        spinner.succeed("Prisma schema updated");
      }

      // 7. Docker
      if (this.config.enableDocker) {
        spinner.start("Updating Docker Compose...");
        await this.updateDockerCompose();
        spinner.succeed("docker-compose.yml updated");
      }

      // 8. Generate docs
      spinner.start("Generating documentation...");
      await this.generateDocs();
      spinner.succeed("Documentation generated");

      // ─── SAVE RESTORE POINT ───
      await this.backup.saveManifest();
    } catch (error: any) {
      spinner.fail(error.message);

      // ─── AUTO ROLLBACK ON FAILURE ───
      console.log(chalk.yellow("\n⚠️  Setup failed. Auto-rolling back..."));
      try {
        await BackupManager.rollback(this.projectInfo.rootPath);
      } catch {
        console.log(
          chalk.red("  Could not auto-rollback. Check .user-service-backup/"),
        );
      }
      throw error;
    }
  }

  // ──────────────────────────────────────────────
  //  INSTALL DEPENDENCIES INTO USER'S PROJECT
  //  This is the KEY fix — cwd must be rootPath
  // ──────────────────────────────────────────────
  private async installDependencies(): Promise<void> {
    const existingDeps = this.projectInfo.existingDeps;
    const pm = this.projectInfo.packageManager;

    // ─── Build install commands based on pm ───
    const installCmd: Record<string, string> = {
      npm: "npm install --save",
      yarn: "yarn add",
      pnpm: "pnpm add",
      bun: "bun add",
    };

    const installDevCmd: Record<string, string> = {
      npm: "npm install --save-dev",
      yarn: "yarn add -D",
      pnpm: "pnpm add -D",
      bun: "bun add -d",
    };

    // ─── Collect all needed deps ───
    const deps = this.collectDependencies();
    const devDeps = this.collectDevDependencies();

    // ─── Filter out already installed ───
    // const toInstall = deps.filter(
    //   (d) => !existingDeps[d] && !existingDeps[d.split("@")[0]],
    // );
    // const toInstallDev = devDeps.filter(
    //   (d) => !existingDeps[d] && !existingDeps[d.split("@")[0]],
    // );

    const toInstall = deps.filter(
      (d) => !existingDeps[d] && !existingDeps[d.split("@")[0]],
    );

    const toInstallDev = devDeps.filter(
      (d) => !existingDeps[d] && !existingDeps[d.split("@")[0]],
    );

    // ── Track what we are installing ──
    this.backup.trackAddedDependencies(toInstall);
    this.backup.trackAddedDevDependencies(toInstallDev);

    // ─── Install into USER'S PROJECT ───
    // KEY: cwd: this.projectInfo.rootPath
    //      This makes npm install INTO their project
    const installOptions = {
      cwd: this.projectInfo.rootPath, // ← USER'S PROJECT ROOT
      stdio: "inherit" as const, // ← show progress to user
    };

    if (toInstall.length > 0) {
      console.log(
        chalk.cyan(`\n📦 Installing ${toInstall.length} package(s)...`),
      );
      console.log(chalk.gray(`   ${toInstall.join("\n   ")}`));
      console.log("");

      execSync(`${installCmd[pm]} ${toInstall.join(" ")}`, installOptions);
    }

    if (toInstallDev.length > 0) {
      console.log(
        chalk.cyan(`\n📦 Installing ${toInstallDev.length} dev package(s)...`),
      );
      console.log(chalk.gray(`   ${toInstallDev.join("\n   ")}`));
      console.log("");

      execSync(
        `${installDevCmd[pm]} ${toInstallDev.join(" ")}`,
        installOptions,
      );
    }

    if (toInstall.length === 0 && toInstallDev.length === 0) {
      console.log(chalk.green("  ✅ All required packages already installed"));
    }

    // ─── Run prisma generate in user's project ───
    if (this.config.orm === "prisma" && !existingDeps["@prisma/client"]) {
      console.log(chalk.cyan("\n🔄 Running prisma generate..."));
      try {
        execSync("npx prisma generate", {
          cwd: this.projectInfo.rootPath, // ← USER'S PROJECT ROOT
          stdio: "inherit",
        });
      } catch {
        console.log(
          chalk.yellow("  ⚠️  Run manually later: npx prisma generate"),
        );
      }
    }
  }

  // ── Helper to write and track files ──
  private async writeAndTrack(
    filePath: string,
    content: string,
  ): Promise<void> {
    await fs.writeFile(filePath, content);
    this.backup.trackGeneratedFile(filePath);
  }

  // ──────────────────────────────────────────────
  //  COLLECT DEPENDENCIES
  // ──────────────────────────────────────────────
  private collectDependencies(): string[] {
    const deps: string[] = [
      // ── Always needed ──
      "@nestjs/jwt",
      "@nestjs/passport",
      "@nestjs/config",
      "@nestjs/mapped-types",
      "passport",
      "passport-jwt",
      "bcrypt",
      "class-validator",
      "class-transformer",
    ];

    // ── Swagger ──
    if (this.config.monitoring.includes("swagger")) {
      deps.push("@nestjs/swagger", "swagger-ui-express");
    }

    // ── ORM ──
    switch (this.config.orm) {
      case "prisma":
        deps.push("@prisma/client");
        break;
      case "typeorm":
        deps.push("typeorm", "@nestjs/typeorm");
        break;
      case "mongoose":
        deps.push("mongoose", "@nestjs/mongoose");
        break;
      case "drizzle":
        deps.push("drizzle-orm");
        break;
      case "mikroorm":
        deps.push("@mikro-orm/core", "@mikro-orm/nestjs");
        break;
    }

    // ── Database drivers ──
    switch (this.config.database) {
      case "postgresql":
        deps.push("pg");
        break;
      case "mysql":
        deps.push("mysql2");
        break;
      case "sqlite":
        deps.push("better-sqlite3");
        break;
      case "mssql":
        deps.push("mssql");
        break;
      // mongodb → handled by mongoose
    }

    // ── OAuth ──
    const oauthPackages: Record<string, string> = {
      "google-oauth": "passport-google-oauth20",
      "github-oauth": "passport-github2",
      "facebook-oauth": "passport-facebook",
      "discord-oauth": "passport-discord",
      "twitter-oauth": "passport-twitter",
      "linkedin-oauth": "passport-linkedin-oauth2",
      "apple-oauth": "passport-apple",
      ldap: "passport-ldapauth",
      saml: "passport-saml",
    };

    for (const loginType of this.config.loginTypes) {
      if (oauthPackages[loginType]) {
        deps.push(oauthPackages[loginType]);
      }
    }

    // ── Caching ──
    if (this.config.caching === "redis") {
      deps.push("@nestjs/cache-manager", "cache-manager", "ioredis");
    }

    // ── Email ──
    const emailPackages: Record<string, string[]> = {
      nodemailer: ["@nestjs-modules/mailer", "nodemailer", "handlebars"],
      sendgrid: ["@sendgrid/mail"],
      "aws-ses": ["@aws-sdk/client-ses"],
      resend: ["resend"],
      postmark: ["postmark"],
      mailgun: ["mailgun.js"],
    };

    if (
      this.config.emailProvider !== "none" &&
      emailPackages[this.config.emailProvider]
    ) {
      deps.push(...emailPackages[this.config.emailProvider]);
    }

    // ── SMS ──
    const smsPackages: Record<string, string> = {
      twilio: "twilio",
      vonage: "@vonage/server-sdk",
      "aws-sns": "@aws-sdk/client-sns",
      msg91: "msg91",
    };

    if (this.config.smsProvider && smsPackages[this.config.smsProvider]) {
      deps.push(smsPackages[this.config.smsProvider]);
    }

    // ── 2FA ──
    if (this.config.authFeatures.includes("2fa")) {
      deps.push("otplib", "qrcode");
    }

    // ── Rate limiting ──
    if (this.config.authFeatures.includes("rate-limit")) {
      deps.push("@nestjs/throttler");
    }

    // ── Health checks ──
    if (this.config.monitoring.includes("health")) {
      deps.push("@nestjs/terminus");
    }

    // ── Queue ──
    const queuePackages: Record<string, string[]> = {
      bullmq: ["@nestjs/bullmq", "bullmq"],
      rabbitmq: ["@nestjs/microservices", "amqplib"],
      kafka: ["@nestjs/microservices", "kafkajs"],
    };

    if (
      this.config.messageQueue !== "none" &&
      queuePackages[this.config.messageQueue]
    ) {
      deps.push(...queuePackages[this.config.messageQueue]);
    }

    // ── File upload ──
    const uploadPackages: Record<string, string[]> = {
      s3: ["@aws-sdk/client-s3", "multer"],
      gcs: ["@google-cloud/storage", "multer"],
      cloudinary: ["cloudinary", "multer"],
      local: ["multer"],
      none: [], // ← ADD THIS
    };

    const uploadDeps = uploadPackages[this.config.fileUpload] ?? [];
    if (uploadDeps.length > 0) {
      deps.push(...uploadDeps);
    }

    // ── Logging ──
    if (this.config.monitoring.includes("winston")) {
      deps.push("nest-winston", "winston");
    }
    if (this.config.monitoring.includes("pino")) {
      deps.push("nestjs-pino", "pino", "pino-pretty");
    }
    if (this.config.monitoring.includes("sentry")) {
      deps.push("@sentry/node");
    }

    // ── Return unique deps ──
    return [...new Set(deps)];
  }

  private collectDevDependencies(): string[] {
    const devDeps: string[] = [
      "@types/bcrypt",
      "@types/passport-jwt",
      "@types/passport",
    ];

    // ── Prisma CLI ──
    if (this.config.orm === "prisma") {
      devDeps.push("prisma");
    }

    // ── Drizzle kit ──
    if (this.config.orm === "drizzle") {
      devDeps.push("drizzle-kit");
    }

    // ── OAuth types ──
    const oauthTypes: Record<string, string> = {
      "google-oauth": "@types/passport-google-oauth20",
      "github-oauth": "@types/passport-github2",
      "facebook-oauth": "@types/passport-facebook",
    };

    for (const loginType of this.config.loginTypes) {
      if (oauthTypes[loginType]) {
        devDeps.push(oauthTypes[loginType]);
      }
    }

    // ── Other types ──
    if (this.config.authFeatures.includes("2fa")) {
      devDeps.push("@types/qrcode");
    }

    if (
      this.config.fileUpload === "s3" ||
      this.config.fileUpload === "gcs" ||
      this.config.fileUpload === "cloudinary" ||
      this.config.fileUpload === "local"
    ) {
      devDeps.push("@types/multer");
    }

    if (this.config.messageQueue === "rabbitmq") {
      devDeps.push("@types/amqplib");
    }

    if (this.config.database === "sqlite") {
      devDeps.push("@types/better-sqlite3");
    }

    if (this.config.monitoring.includes("swagger")) {
      devDeps.push("@types/swagger-ui-express");
    }

    return [...new Set(devDeps)];
  }

  // ──────────────────────────────────────────────
  //  CREATE DIRECTORIES
  // ──────────────────────────────────────────────
  private async createDirectories(): Promise<void> {
    const dirs = [
      this.targetPath,
      path.join(this.targetPath, "auth"),
      path.join(this.targetPath, "auth/dto"),
      path.join(this.targetPath, "auth/guards"),
      path.join(this.targetPath, "auth/strategies"),
      path.join(this.targetPath, "auth/decorators"),
      path.join(this.targetPath, "user"),
      path.join(this.targetPath, "user/dto"),
      path.join(this.targetPath, "user/entities"),
      path.join(this.targetPath, "common"),
      path.join(this.projectInfo.rootPath, "docs"),
    ];

    if (this.config.authFeatures.includes("2fa")) {
      dirs.push(path.join(this.targetPath, "two-factor"));
    }

    if (this.config.caching !== "none") {
      dirs.push(path.join(this.targetPath, "cache"));
    }

    if (this.config.emailProvider !== "none") {
      dirs.push(
        path.join(this.targetPath, "mail"),
        path.join(this.targetPath, "mail/templates"),
      );
    }

    for (const dir of dirs) {
      await fs.ensureDir(dir);
      this.backup.trackGeneratedDir(dir);
    }
  }

  // ──────────────────────────────────────────────
  //  GENERATE FILES
  // ──────────────────────────────────────────────
  private async generateFiles(): Promise<void> {
    await this.generateUserServiceModule();
    await this.generateAuthFiles();
    await this.generateUserFiles();
    await this.generateJwtStrategy();
    await this.generateCurrentUserDecorator();
    await this.generateJwtGuard();
  }

  private async generateUserServiceModule(): Promise<void> {
    const content = `
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    AuthModule,
  ],
  exports: [UserModule, AuthModule],
})
export class UserServiceModule {}`;

    await this.writeAndTrack(
      path.join(this.targetPath, "user-service.module.ts"),
      content,
    );
  }

  private async generateAuthFiles(): Promise<void> {
    // ── auth.service.ts ──
    const authService = `
import {
  Injectable, UnauthorizedException,
  ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  ${
    this.config.loginTypes.includes("email-password")
      ? `
  async registerWithEmail(dto: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userService.create({
      ...dto,
      password: hashed,
    });

    return this.buildAuthResponse(user);
  }

  async loginWithEmail(dto: { email: string; password: string }) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("mobile-otp")
      ? `
  async sendMobileOtp(phone: string) {
    let user = await this.userService.findByPhone(phone);
    if (!user) {
      user = await this.userService.create({ phone });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // TODO: Send OTP via SMS provider
    this.logger.warn(\`[DEV ONLY] OTP for \${phone}: \${otp}\`);
    return { message: 'OTP sent successfully', expiresIn: 300 };
  }

  async verifyMobileOtp(phone: string, otp: string) {
    // TODO: Validate OTP from Redis/DB
    const user = await this.userService.findByPhone(phone);
    if (!user) throw new UnauthorizedException('User not found');
    return this.buildAuthResponse(user);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("email-otp")
      ? `
  async sendEmailOtp(email: string) {
    let user = await this.userService.findByEmail(email);
    if (!user) {
      user = await this.userService.create({ email });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // TODO: Send OTP via email provider
    this.logger.warn(\`[DEV ONLY] OTP for \${email}: \${otp}\`);
    return { message: 'OTP sent to email', expiresIn: 300 };
  }

  async verifyEmailOtp(email: string, otp: string) {
    // TODO: Validate OTP from Redis/DB
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    return this.buildAuthResponse(user);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("magic-link")
      ? `
  async sendMagicLink(email: string) {
    let user = await this.userService.findByEmail(email);
    if (!user) {
      user = await this.userService.create({ email });
    }
    const token = await this.jwtService.signAsync(
      { sub: user.id, email, type: 'magic-link' },
      { expiresIn: '15m' },
    );
    const link = \`\${this.configService.get('APP_URL')}/api/v1/auth/magic-link/verify?token=\${token}\`;
    this.logger.warn(\`[DEV ONLY] Magic link: \${link}\`);
    return { message: 'Magic link sent to email' };
  }

  async verifyMagicLink(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.type !== 'magic-link') throw new Error('Invalid token type');
      const user = await this.userService.findById(payload.sub);
      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }
  `
      : ""
  }

  ${
    this.config.hasOAuth
      ? `
  async handleOAuthCallback(oauthUser: {
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }) {
    let user = await this.userService.findByProvider(
      oauthUser.provider,
      oauthUser.providerId,
    );

    if (!user && oauthUser.email) {
      user = await this.userService.findByEmail(oauthUser.email);
    }

    if (!user) {
      user = await this.userService.create({
        ...oauthUser,
        isVerified: true,
      });
    }

    return this.buildAuthResponse(user);
  }
  `
      : ""
  }

  ${
    this.config.authFeatures.includes("password-reset")
      ? `
  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) return { message: 'If email exists, reset link has been sent' };

    const token = await this.jwtService.signAsync(
      { sub: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    this.logger.warn(\`[DEV ONLY] Password reset token: \${token}\`);
    return { message: 'If email exists, reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      await this.userService.updatePassword(payload.sub, hashed);
      return { message: 'Password reset successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
  `
      : ""
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
      const user = await this.userService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: number) {
    // TODO: Add token to blacklist if needed
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email };
    const secret = this.configService.get('JWT_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async buildAuthResponse(user: any) {
    const tokens = await this.generateTokens(user);
    const { password, twoFactorSecret, ...safeUser } =
      user?.dataValues || user;
    return { user: safeUser, ...tokens };
  }
}`;

    await this.writeAndTrack(
      path.join(this.targetPath, "auth", "auth.service.ts"),
      authService,
    );

    // ── auth.controller.ts ──
    const authController = `
import {
  Controller, Post, Get, Body,
  Query, UseGuards, Req,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
${
  this.config.monitoring.includes("swagger")
    ? `import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';`
    : ""
}
${this.config.hasOAuth ? "import { AuthGuard } from '@nestjs/passport';" : ""}

${this.config.monitoring.includes("swagger") ? "@ApiTags('🔐 Auth')" : ""}
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  ${
    this.config.loginTypes.includes("email-password")
      ? `
  ${this.config.monitoring.includes("swagger") ? "@ApiOperation({ summary: 'Register with email and password' })" : ""}
  @Post('register')
  register(
    @Body() body: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    return this.authService.registerWithEmail(body);
  }

  ${this.config.monitoring.includes("swagger") ? "@ApiOperation({ summary: 'Login with email and password' })" : ""}
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email: string; password: string }) {
    return this.authService.loginWithEmail(body);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("mobile-otp")
      ? `
  @Post('mobile/otp/send')
  @HttpCode(HttpStatus.OK)
  sendMobileOtp(@Body('phone') phone: string) {
    return this.authService.sendMobileOtp(phone);
  }

  @Post('mobile/otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyMobileOtp(
    @Body('phone') phone: string,
    @Body('otp') otp: string,
  ) {
    return this.authService.verifyMobileOtp(phone, otp);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("email-otp")
      ? `
  @Post('email/otp/send')
  @HttpCode(HttpStatus.OK)
  sendEmailOtp(@Body('email') email: string) {
    return this.authService.sendEmailOtp(email);
  }

  @Post('email/otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyEmailOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
  ) {
    return this.authService.verifyEmailOtp(email, otp);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("magic-link")
      ? `
  @Post('magic-link/send')
  @HttpCode(HttpStatus.OK)
  sendMagicLink(@Body('email') email: string) {
    return this.authService.sendMagicLink(email);
  }

  @Get('magic-link/verify')
  verifyMagicLink(@Query('token') token: string) {
    return this.authService.verifyMagicLink(token);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("google-oauth")
      ? `
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any) {
    return this.authService.handleOAuthCallback(req.user);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("github-oauth")
      ? `
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req: any) {
    return this.authService.handleOAuthCallback(req.user);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("facebook-oauth")
      ? `
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  facebookCallback(@Req() req: any) {
    return this.authService.handleOAuthCallback(req.user);
  }
  `
      : ""
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  ${this.config.monitoring.includes("swagger") ? "@ApiBearerAuth()" : ""}
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('id') userId: number) {
    return this.authService.logout(userId);
  }

  ${
    this.config.authFeatures.includes("password-reset")
      ? `
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }
  `
      : ""
  }
}`;

    await fs.writeFile(
      path.join(this.targetPath, "auth", "auth.controller.ts"),
      authController,
    );

    // ── auth.module.ts ──
    const authModule = `
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET', 'default-secret-change-me');
        const expiresIn = configService.get('JWT_ACCESS_EXPIRATION', '15m') as any;
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}`;

    await fs.writeFile(
      path.join(this.targetPath, "auth", "auth.module.ts"),
      authModule,
    );
  }

  private async generateUserFiles(): Promise<void> {
    // ── user.service.ts ──
    const userService = `
import { Injectable, NotFoundException } from '@nestjs/common';

/**
 * In-memory user service (for development/testing)
 * TODO: Replace with your actual ORM implementation
 *       See docs/USER_SERVICE.md for Prisma/TypeORM/Mongoose examples
 */
@Injectable()
export class UserService {
  private users: any[] = [];
  private nextId = 1;

  async create(data: Partial<{
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    avatar: string;
    provider: string;
    providerId: string;
    isVerified: boolean;
  }>) {
    const user = {
      id: this.nextId++,
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    this.users.push(user);
    return user;
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const items = this.users.slice(skip, skip + limit);
    return {
      data: items.map(({ password, ...u }) => u),
      total: this.users.length,
      page,
      limit,
      totalPages: Math.ceil(this.users.length / limit),
    };
  }

  async findById(id: number) {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException(\`User #\${id} not found\`);
    return user;
  }

  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findByPhone(phone: string) {
    return this.users.find((u) => u.phone === phone) ?? null;
  }

  async findByProvider(provider: string, providerId: string) {
    return (
      this.users.find(
        (u) => u.provider === provider && u.providerId === providerId,
      ) ?? null
    );
  }

  async update(id: number, data: Partial<any>) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new NotFoundException(\`User #\${id} not found\`);
    this.users[index] = {
      ...this.users[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.users[index];
  }

  async updatePassword(id: number, password: string) {
    return this.update(id, { password });
  }

  async delete(id: number) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new NotFoundException(\`User #\${id} not found\`);
    const [removed] = this.users.splice(index, 1);
    const { password, ...safe } = removed;
    return safe;
  }
}`;

    // ── user.controller.ts ──
    const userController = `
import {
  Controller, Get, Patch, Delete,
  Param, Body, Query, UseGuards,
  ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
${this.config.monitoring.includes("swagger") ? "import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';" : ""}

${this.config.monitoring.includes("swagger") ? "@ApiTags('👤 Users')" : ""}
${this.config.monitoring.includes("swagger") ? "@ApiBearerAuth()" : ""}
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  ${this.config.monitoring.includes("swagger") ? "@ApiOperation({ summary: 'Get all users (paginated)' })" : ""}
  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.userService.findAll(Number(page), Number(limit));
  }

  ${this.config.monitoring.includes("swagger") ? "@ApiOperation({ summary: 'Get current user profile' })" : ""}
  @Get('me')
  getMe(@CurrentUser() user: any) {
    const { password, ...safe } = user;
    return safe;
  }

  ${this.config.monitoring.includes("swagger") ? "@ApiOperation({ summary: 'Get user by ID' })" : ""}
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }

  ${this.config.monitoring.includes("swagger") ? "@ApiOperation({ summary: 'Update user' })" : ""}
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const { password, ...safeBody } = body;
    return this.userService.update(id, safeBody);
  }

  ${this.config.monitoring.includes("swagger") ? "@ApiOperation({ summary: 'Delete user' })" : ""}
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }
}`;

    // ── user.module.ts ──
    const userModule = `
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}`;

    await fs.writeFile(
      path.join(this.targetPath, "user", "user.service.ts"),
      userService,
    );
    await fs.writeFile(
      path.join(this.targetPath, "user", "user.controller.ts"),
      userController,
    );
    await fs.writeFile(
      path.join(this.targetPath, "user", "user.module.ts"),
      userModule,
    );
  }

  private async generateJwtStrategy(): Promise<void> {
    const content = `
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret'),
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.userService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}`;

    await fs.writeFile(
      path.join(this.targetPath, "auth", "strategies", "jwt.strategy.ts"),
      content,
    );
  }

  private async generateJwtGuard(): Promise<void> {
    const content = `
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}`;

    await fs.writeFile(
      path.join(this.targetPath, "auth", "guards", "jwt-auth.guard.ts"),
      content,
    );
  }

  private async generateCurrentUserDecorator(): Promise<void> {
    const content = `
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);`;

    await fs.writeFile(
      path.join(
        this.targetPath,
        "auth",
        "decorators",
        "current-user.decorator.ts",
      ),
      content,
    );
  }

  // ── All other methods stay same (injectIntoAppModule, appendEnvVariables etc) ──
  // ── Copy them from previous version ──

  private async injectIntoAppModule(): Promise<void> {
    const appModulePath = this.projectInfo.appModulePath;
    if (!appModulePath) {
      console.log(chalk.yellow("  ⚠️  app.module.ts not found"));
      return;
    }

    let content = await fs.readFile(appModulePath, "utf-8");

    if (content.includes("UserServiceModule")) {
      console.log(chalk.yellow("  ⚠️  UserServiceModule already imported"));
      return;
    }

    const appModuleDir = path.dirname(appModulePath);
    let relativePath = path
      .relative(appModuleDir, path.join(this.targetPath, "user-service.module"))
      .replace(/\\/g, "/");

    if (!relativePath.startsWith(".")) {
      relativePath = "./" + relativePath;
    }

    const importStatement = `import { UserServiceModule } from '${relativePath}';\n`;

    // ── Add after last import ──
    const importLines = content.match(/^import .+;$/gm);
    if (importLines) {
      const lastImport = importLines[importLines.length - 1];
      content = content.replace(
        lastImport,
        lastImport + "\n" + importStatement,
      );
    } else {
      content = importStatement + content;
    }

    // ── Add to imports array ──
    content = content.replace(
      /imports:\s*\[/,
      "imports: [\n    UserServiceModule,",
    );

    await fs.writeFile(appModulePath, content, "utf-8");
    console.log(chalk.green("  ✅ UserServiceModule injected"));
  }

  private async appendEnvVariables(): Promise<void> {
    const envPath = path.join(this.projectInfo.rootPath, ".env");
    const newVars = this.buildEnvVariables();

    if (await fs.pathExists(envPath)) {
      const existing = await fs.readFile(envPath, "utf-8");

      const linesToAdd = newVars
        .split("\n")
        .filter((line) => {
          if (!line.includes("=")) return true;
          const key = line.split("=")[0].trim();
          return key && !existing.includes(key);
        })
        .join("\n");

      if (linesToAdd.trim()) {
        await fs.appendFile(envPath, "\n" + linesToAdd);
      }
    } else {
      await fs.writeFile(envPath, newVars);
    }
  }

  private buildEnvVariables(): string {
    let env = `\n# ─── USER SERVICE ───\n`;
    env += `DATABASE_URL=${this.config.databaseUrl || "postgresql://postgres:postgres@localhost:5432/mydb"}\n`;
    env += `JWT_SECRET=change-this-to-a-secure-secret-minimum-32-characters\n`;
    env += `JWT_ACCESS_EXPIRATION=15m\n`;
    env += `JWT_REFRESH_EXPIRATION=7d\n`;
    env += `APP_URL=http://localhost:3000\n`;

    if (this.config.caching === "redis") {
      env += `REDIS_HOST=localhost\nREDIS_PORT=6379\nREDIS_PASSWORD=\n`;
    }

    for (const provider of this.config.oauthProviders) {
      const name = provider.replace("-oauth", "").toUpperCase();
      env += `${name}_CLIENT_ID=\n${name}_CLIENT_SECRET=\n`;
      env += `${name}_CALLBACK_URL=http://localhost:3000/api/v1/auth/${name.toLowerCase()}/callback\n`;
    }

    return env;
  }

  private async setupPrisma(): Promise<void> {
    const schemaPath = path.join(
      this.projectInfo.rootPath,
      "prisma",
      "schema.prisma",
    );

    const userModel = `
model User {
  id         Int      @id @default(autoincrement())
  email      String?  @unique
  phone      String?  @unique
  password   String?
  firstName  String?
  lastName   String?
  avatar     String?
  isActive   Boolean  @default(true)
  isVerified Boolean  @default(false)
  provider   String?  @default("local")
  providerId String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("users")
}`;

    if (await fs.pathExists(schemaPath)) {
      const existing = await fs.readFile(schemaPath, "utf-8");
      if (!existing.includes("model User")) {
        await fs.appendFile(schemaPath, "\n" + userModel);
        console.log(chalk.green("  ✅ User model added to schema.prisma"));
      } else {
        console.log(chalk.yellow("  ⚠️  User model already in schema.prisma"));
      }
    } else {
      await fs.ensureDir(path.join(this.projectInfo.rootPath, "prisma"));
      const dbProvider =
        this.config.database === "mysql"
          ? "mysql"
          : this.config.database === "mongodb"
            ? "mongodb"
            : "postgresql";

      await fs.writeFile(
        schemaPath,
        `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${dbProvider}"
  url      = env("DATABASE_URL")
}
${userModel}`,
      );
      console.log(chalk.green("  ✅ prisma/schema.prisma created"));
    }
  }

  private async updateDockerCompose(): Promise<void> {
    const composePath = path.join(
      this.projectInfo.rootPath,
      "docker-compose.yml",
    );

    const serviceBlocks: Record<string, string> = {};
    const volumeNames: string[] = [];

    if (this.config.database === "postgresql") {
      volumeNames.push("postgres_data");
      serviceBlocks["postgres"] = `  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data`;
    }

    if (this.config.database === "mongodb") {
      volumeNames.push("mongo_data");
      serviceBlocks["mongo"] = `  mongo:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db`;
    }

    if (this.config.database === "mysql") {
      volumeNames.push("mysql_data");
      serviceBlocks["mysql"] = `  mysql:
    image: mysql:8
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mydb
    volumes:
      - mysql_data:/var/lib/mysql`;
    }

    if (
      this.config.caching === "redis" ||
      this.config.messageQueue === "bullmq"
    ) {
      volumeNames.push("redis_data");
      serviceBlocks["redis"] = `  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data`;
    }

    if (Object.keys(serviceBlocks).length === 0) return;

    // ─── Build volumes section ───
    const volumesSection =
      volumeNames.length > 0
        ? `\nvolumes:\n${volumeNames.map((v) => `  ${v}:`).join("\n")}\n`
        : "";

    if (await fs.pathExists(composePath)) {
      let existing = await fs.readFile(composePath, "utf-8");

      // Remove obsolete version attribute
      existing = existing.replace(/^version:\s*['"]?[\d.]+['"]?\s*\n/m, "");

      // Add new services
      for (const [name, block] of Object.entries(serviceBlocks)) {
        if (!existing.includes(`  ${name}:`)) {
          const volumesIdx = existing.indexOf("\nvolumes:");
          if (volumesIdx > -1) {
            existing =
              existing.slice(0, volumesIdx) +
              "\n\n" +
              block +
              existing.slice(volumesIdx);
          } else {
            existing += "\n\n" + block;
          }
        }
      }

      // Add new volumes
      for (const vol of volumeNames) {
        if (!existing.includes(`  ${vol}:`)) {
          if (existing.includes("\nvolumes:")) {
            existing = existing.replace("\nvolumes:", `\nvolumes:\n  ${vol}:`);
          } else {
            existing += `\n\nvolumes:\n  ${vol}:\n`;
          }
        }
      }

      await fs.writeFile(composePath, existing);
    } else {
      // Create fresh without version (not needed in modern Docker)
      const content =
        `services:\n` +
        Object.values(serviceBlocks).join("\n\n") +
        volumesSection;

      await fs.writeFile(composePath, content);
    }
  }

  private async generateDocs(): Promise<void> {
    const doc = `# 📖 User Service Documentation

Generated by @mehdijony/nestjs-user-service

## 🔑 Login Methods
${this.config.loginTypes.map((t) => `- ✅ ${t}`).join("\n")}

## 🛡️ Security Features
${this.config.authFeatures.map((f) => `- ✅ ${f}`).join("\n")}

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
${
  this.config.loginTypes.includes("email-password")
    ? `| POST | \`/api/v1/auth/register\` | Register | ❌ |
| POST | \`/api/v1/auth/login\` | Login | ❌ |`
    : ""
}
${
  this.config.loginTypes.includes("mobile-otp")
    ? `| POST | \`/api/v1/auth/mobile/otp/send\` | Send OTP | ❌ |
| POST | \`/api/v1/auth/mobile/otp/verify\` | Verify OTP | ❌ |`
    : ""
}
${
  this.config.loginTypes.includes("email-otp")
    ? `| POST | \`/api/v1/auth/email/otp/send\` | Send Email OTP | ❌ |
| POST | \`/api/v1/auth/email/otp/verify\` | Verify Email OTP | ❌ |`
    : ""
}
${
  this.config.loginTypes.includes("magic-link")
    ? `| POST | \`/api/v1/auth/magic-link/send\` | Send Magic Link | ❌ |
| GET | \`/api/v1/auth/magic-link/verify\` | Verify Magic Link | ❌ |`
    : ""
}
| POST | \`/api/v1/auth/refresh\` | Refresh Token | ❌ |
| POST | \`/api/v1/auth/logout\` | Logout | ✅ |
${
  this.config.authFeatures.includes("password-reset")
    ? `| POST | \`/api/v1/auth/forgot-password\` | Forgot Password | ❌ |
| POST | \`/api/v1/auth/reset-password\` | Reset Password | ❌ |`
    : ""
}

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | \`/api/v1/users\` | List users | ✅ |
| GET | \`/api/v1/users/me\` | My profile | ✅ |
| GET | \`/api/v1/users/:id\` | Get user | ✅ |
| PATCH | \`/api/v1/users/:id\` | Update user | ✅ |
| DELETE | \`/api/v1/users/:id\` | Delete user | ✅ |

## 🚀 Next Steps

\`\`\`bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start app
npm run start:dev

# 3. Open Swagger
http://localhost:3000/api/docs
\`\`\`
`;

    await fs.writeFile(
      path.join(this.projectInfo.rootPath, "docs", "USER_SERVICE.md"),
      doc,
    );
  }
}
