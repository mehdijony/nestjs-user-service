// src/generators/project.generator.ts
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { UserConfig } from "../config/feature.matrix";
import { DEPENDENCY_MAP } from "../config/dependencies.map";
import { DatabaseGenerator } from "./database.generator";
import { AuthGenerator } from "./auth.generator";
import { DockerGenerator } from "./docker.generator";
import { DocsGenerator } from "./docs.generator";

// ─── Removed broken imports ───
// ApiGenerator    → inline below
// CacheGenerator  → inline below
// TestGenerator   → inline below

export class ProjectGenerator {
  private config: UserConfig;
  private projectPath: string;
  private templatePath: string;

  constructor(config: UserConfig) {
    this.config = config;
    this.projectPath = path.join(process.cwd(), config.projectName);
    this.templatePath = path.join(__dirname, "..", "templates");
  }

  async generate(): Promise<void> {
    const spinner = ora();

    try {
      spinner.start("Creating project structure...");
      await this.createProjectStructure();
      spinner.succeed("Project structure created");

      spinner.start("Resolving dependencies...");
      await this.generatePackageJson();
      spinner.succeed("Dependencies resolved");

      spinner.start("Generating base NestJS files...");
      await this.generateBaseFiles();
      spinner.succeed("Base files generated");

      spinner.start(
        `Setting up ${this.config.orm} with ${this.config.database}...`,
      );
      const dbGenerator = new DatabaseGenerator(
        this.config,
        this.projectPath,
        this.templatePath,
      );
      await dbGenerator.generate();
      spinner.succeed("Database layer generated");

      spinner.start("Generating authentication module...");
      const authGenerator = new AuthGenerator(
        this.config,
        this.projectPath,
        this.templatePath,
      );
      await authGenerator.generate();
      spinner.succeed("Authentication module generated");

      // ─── Inline: Cache Setup ───
      if (this.config.caching !== "none") {
        spinner.start(`Setting up ${this.config.caching}...`);
        await this.generateCacheModule();
        spinner.succeed("Cache layer generated");
      }

      // ─── Inline: Docker ───
      if (this.config.enableDocker) {
        spinner.start("Generating Docker configuration...");
        const dockerGenerator = new DockerGenerator(
          this.config,
          this.projectPath,
          this.templatePath,
        );
        await dockerGenerator.generate();
        spinner.succeed("Docker configuration generated");
      }

      // ─── Inline: Tests ───
      spinner.start("Generating test files...");
      await this.generateTestFiles();
      spinner.succeed("Test files generated");

      spinner.start("Generating documentation...");
      const docsGenerator = new DocsGenerator(
        this.config,
        this.projectPath,
        this.templatePath,
      );
      await docsGenerator.generate();
      spinner.succeed("Documentation generated");

      spinner.start("Generating environment files...");
      await this.generateEnvFiles();
      spinner.succeed("Environment files generated");

      spinner.start("Generating configuration files...");
      await this.generateConfigFiles();
      spinner.succeed("Configuration files generated");

      spinner.start("Installing dependencies...");
      this.installDependencies();
      spinner.succeed("Dependencies installed");
    } catch (error: any) {
      spinner.fail(error.message);
      throw error;
    }
  }

  // ──────────────────────────────────────────────
  //  PROJECT STRUCTURE
  // ──────────────────────────────────────────────
  private async createProjectStructure(): Promise<void> {
    const dirs = [
      "src",
      "src/common",
      "src/common/decorators",
      "src/common/filters",
      "src/common/guards",
      "src/common/interceptors",
      "src/common/pipes",
      "src/common/interfaces",
      "src/common/constants",
      "src/common/utils",
      "src/config",
      "src/user",
      "src/user/dto",
      "src/user/entities",
      "src/auth",
      "src/auth/dto",
      "src/auth/guards",
      "src/auth/strategies",
      "src/auth/decorators",
      "src/health",
      "docs",
      "test",
      "test/unit",
      "test/e2e",
    ];

    if (this.config.authFeatures.includes("rbac")) {
      dirs.push("src/role", "src/role/dto", "src/role/entities");
      dirs.push("src/permission", "src/permission/dto");
    }

    if (this.config.authFeatures.includes("2fa")) {
      dirs.push("src/two-factor");
    }

    if (this.config.caching !== "none") {
      dirs.push("src/cache");
    }

    if (this.config.messageQueue !== "none") {
      dirs.push("src/queue", "src/queue/processors");
    }

    if (this.config.emailProvider !== "none") {
      dirs.push("src/mail", "src/mail/templates");
    }

    if (this.config.smsProvider) {
      dirs.push("src/sms");
    }

    if (this.config.fileUpload !== "none") {
      dirs.push("src/upload");
    }

    if (this.config.apiStyles.includes("graphql")) {
      dirs.push("src/user/graphql", "src/auth/graphql");
    }

    if (this.config.apiStyles.includes("grpc")) {
      dirs.push("src/proto", "src/user/grpc", "src/auth/grpc");
    }

    if (this.config.orm === "prisma") {
      dirs.push("prisma");
    }

    if (this.config.orm === "typeorm") {
      dirs.push("src/database", "src/database/migrations");
    }

    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.projectPath, dir));
    }
  }

  // ──────────────────────────────────────────────
  //  PACKAGE JSON
  // ──────────────────────────────────────────────
  private async generatePackageJson(): Promise<void> {
    const dependencies: Record<string, string> = {
      ...DEPENDENCY_MAP.core.dependencies,
    };
    const devDependencies: Record<string, string> = {
      ...DEPENDENCY_MAP.core.devDependencies,
    };

    // ── Database driver ──
    const dbDeps = DEPENDENCY_MAP.database[this.config.database];
    if (dbDeps) {
      Object.assign(dependencies, dbDeps);
    }

    // ── ORM ──
    const ormEntry = DEPENDENCY_MAP.orm[this.config.orm];
    if (ormEntry) {
      // safely access dependencies
      const ormDeps = (ormEntry as any).dependencies;
      const ormDevDeps = (ormEntry as any).devDependencies;
      if (ormDeps) Object.assign(dependencies, ormDeps);
      if (ormDevDeps) Object.assign(devDependencies, ormDevDeps);
    }

    // ── API styles ──
    for (const style of this.config.apiStyles) {
      const apiDeps = DEPENDENCY_MAP.api[style];
      if (apiDeps) Object.assign(dependencies, apiDeps);
    }

    // ── Auth — token strategy ──
    const tokenDeps = (DEPENDENCY_MAP.auth as any)[this.config.tokenStrategy];
    if (tokenDeps) Object.assign(dependencies, tokenDeps);

    // ── Auth — login types ──
    for (const loginType of this.config.loginTypes) {
      const loginDeps = (DEPENDENCY_MAP.auth as any)[loginType];
      if (loginDeps) Object.assign(dependencies, loginDeps);
    }

    // ── Caching ──
    if (this.config.caching !== "none") {
      const cacheDeps = (DEPENDENCY_MAP.caching as any)[this.config.caching];
      if (cacheDeps) Object.assign(dependencies, cacheDeps);
    }

    // ── Email ──
    if (this.config.emailProvider !== "none") {
      const emailDeps = (DEPENDENCY_MAP.email as any)[
        this.config.emailProvider
      ];
      if (emailDeps) Object.assign(dependencies, emailDeps);
    }

    // ── SMS ──
    if (this.config.smsProvider) {
      const smsDeps = (DEPENDENCY_MAP.sms as any)[this.config.smsProvider];
      if (smsDeps) Object.assign(dependencies, smsDeps);
    }

    // ── Queue ──
    if (this.config.messageQueue !== "none") {
      const queueDeps = (DEPENDENCY_MAP.queue as any)[this.config.messageQueue];
      if (queueDeps) Object.assign(dependencies, queueDeps);
    }

    // ── Monitoring ──
    for (const monitor of this.config.monitoring) {
      const monitorDeps = (DEPENDENCY_MAP.monitoring as any)[monitor];
      if (monitorDeps) Object.assign(dependencies, monitorDeps);
    }

    // ── File upload ──
    if (this.config.fileUpload !== "none") {
      const uploadDeps = (DEPENDENCY_MAP.upload as any)[this.config.fileUpload];
      if (uploadDeps) Object.assign(dependencies, uploadDeps);
    }

    const packageJson = {
      name: this.config.projectName,
      version: "0.0.1",
      description: "Auto-generated NestJS User Service",
      scripts: {
        build: "nest build",
        format: 'prettier --write "src/**/*.ts" "test/**/*.ts"',
        start: "nest start",
        "start:dev": "nest start --watch",
        "start:debug": "nest start --debug --watch",
        "start:prod": "node dist/main",
        lint: 'eslint "{src,apps,libs,test}/**/*.ts" --fix',
        test: "jest",
        "test:watch": "jest --watch",
        "test:cov": "jest --coverage",
        "test:e2e": "jest --config ./test/jest-e2e.json",
        ...(this.config.orm === "prisma" && {
          "prisma:generate": "prisma generate",
          "prisma:migrate": "prisma migrate dev",
          "prisma:push": "prisma db push",
          "prisma:studio": "prisma studio",
          "prisma:seed": "ts-node prisma/seed.ts",
        }),
        ...(this.config.orm === "typeorm" && {
          "migration:generate":
            "typeorm migration:generate -d src/database/data-source.ts",
          "migration:run":
            "typeorm migration:run -d src/database/data-source.ts",
          "migration:revert":
            "typeorm migration:revert -d src/database/data-source.ts",
        }),
        ...(this.config.enableDocker && {
          "docker:up": "docker-compose up -d",
          "docker:down": "docker-compose down",
          "docker:logs": "docker-compose logs -f",
        }),
      },
      dependencies,
      devDependencies,
    };

    await fs.writeJSON(
      path.join(this.projectPath, "package.json"),
      packageJson,
      { spaces: 2 },
    );
  }

  // ──────────────────────────────────────────────
  //  BASE FILES
  // ──────────────────────────────────────────────
  private async generateBaseFiles(): Promise<void> {
    // ── main.ts ──
    const mainTs = `
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
${this.config.monitoring.includes("swagger") ? "import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';" : ""}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Global prefix ──
  app.setGlobalPrefix('api/v1');

  // ── Validation ──
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // ── CORS ──
  app.enableCors();

  ${
    this.config.monitoring.includes("swagger")
      ? `
  // ── Swagger ──
  const swaggerConfig = new DocumentBuilder()
    .setTitle('${this.config.projectName}')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  `
      : ""
  }

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(\`🚀 Application running on: http://localhost:\${port}/api/v1\`);
  ${this.config.monitoring.includes("swagger") ? `logger.log(\`📖 Swagger docs: http://localhost:\${port}/api/docs\`);` : ""}
}

bootstrap();`;

    // ── app.module.ts ──
    const appModule = `
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
${this.config.orm === "prisma" ? "import { PrismaModule } from './common/prisma.module';" : ""}
${this.config.orm === "typeorm" ? `import { TypeOrmModule } from '@nestjs/typeorm';\nimport { typeOrmConfig } from './config/typeorm.config';` : ""}
${this.config.orm === "mongoose" ? `import { MongooseModule } from '@nestjs/mongoose';` : ""}
${this.config.monitoring.includes("health") ? "import { TerminusModule } from '@nestjs/terminus';\nimport { HealthModule } from './health/health.module';" : ""}
${this.config.caching === "redis" ? "import { CacheModule } from './cache/cache.module';" : ""}

@Module({
  imports: [
    // ── Config ──
    ConfigModule.forRoot({ isGlobal: true }),

    ${this.config.orm === "prisma" ? "// ── Database ──\n    PrismaModule," : ""}
    ${this.config.orm === "typeorm" ? "// ── Database ──\n    TypeOrmModule.forRootAsync(typeOrmConfig)," : ""}
    ${this.config.orm === "mongoose" ? `// ── Database ──\n    MongooseModule.forRoot(process.env.DATABASE_URL || 'mongodb://localhost:27017/${this.config.projectName}'),` : ""}

    ${this.config.caching === "redis" ? "// ── Cache ──\n    CacheModule," : ""}

    ${this.config.monitoring.includes("health") ? "// ── Health ──\n    TerminusModule,\n    HealthModule," : ""}

    // ── Feature Modules ──
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}`;

    await fs.writeFile(path.join(this.projectPath, "src", "main.ts"), mainTs);
    await fs.writeFile(
      path.join(this.projectPath, "src", "app.module.ts"),
      appModule,
    );

    await this.generateCommonFiles();
  }

  // ──────────────────────────────────────────────
  //  COMMON FILES
  // ──────────────────────────────────────────────
  private async generateCommonFiles(): Promise<void> {
    // ── Exception Filter ──
    const filter = `
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      \`\${request.method} \${request.url} \${status}\`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
    });
  }
}`;

    // ── Transform Interceptor ──
    const interceptor = `
import {
  Injectable, NestInterceptor,
  ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "common",
        "filters",
        "all-exceptions.filter.ts",
      ),
      filter,
    );

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "common",
        "interceptors",
        "transform.interceptor.ts",
      ),
      interceptor,
    );
  }

  // ──────────────────────────────────────────────
  //  CACHE MODULE  (inline — no separate file)
  // ──────────────────────────────────────────────
  private async generateCacheModule(): Promise<void> {
    const cacheModule = `
import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
${this.config.caching === "redis" ? "import { redisStore } from 'cache-manager-redis-store';\nimport { ConfigModule, ConfigService } from '@nestjs/config';" : ""}

@Module({
  imports: [
    NestCacheModule.register${this.config.caching === "redis" ? "Async" : ""}(${
      this.config.caching === "redis"
        ? `{
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST') || 'localhost',
        port: configService.get('REDIS_PORT') || 6379,
        ttl: 300,
      }),
      inject: [ConfigService],
    }`
        : `{ ttl: 300 }`
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "cache", "cache.module.ts"),
      cacheModule,
    );
  }

  // ──────────────────────────────────────────────
  //  TEST FILES  (inline — no separate file)
  // ──────────────────────────────────────────────
  private async generateTestFiles(): Promise<void> {
    // ── Jest E2E config ──
    const jestE2e = {
      moduleFileExtensions: ["js", "json", "ts"],
      rootDir: ".",
      testEnvironment: "node",
      testRegex: ".e2e-spec.ts$",
      transform: { "^.+\\.(t|j)s$": "ts-jest" },
    };

    await fs.writeJSON(
      path.join(this.projectPath, "test", "jest-e2e.json"),
      jestE2e,
      { spaces: 2 },
    );

    // ── App E2E test ──
    const e2eTest = `
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
  });

  ${
    this.config.loginTypes.includes("email-password")
      ? `
  it('/api/v1/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'StrongP@ss1',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);
  });
  `
      : ""
  }
});`;

    await fs.writeFile(
      path.join(this.projectPath, "test", "app.e2e-spec.ts"),
      e2eTest,
    );

    // ── Auth unit test ──
    if (this.config.testing.includes("unit")) {
      const unitTest = `
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { UserService } from '../src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  ${
    this.config.loginTypes.includes("email-password")
      ? `
  describe('registerWithEmail', () => {
    it('should throw if email already exists', async () => {
      mockUserService.findByEmail.mockResolvedValue({ id: 1, email: 'test@test.com' });
      await expect(
        service.registerWithEmail({
          email: 'test@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow();
    });

    it('should create user successfully', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue({
        id: 1,
        email: 'new@test.com',
      });
      const result = await service.registerWithEmail({
        email: 'new@test.com',
        password: 'StrongP@ss1',
      });
      expect(result).toHaveProperty('accessToken');
    });
  });
  `
      : ""
  }
});`;

      await fs.writeFile(
        path.join(this.projectPath, "test", "unit", "auth.service.spec.ts"),
        unitTest,
      );
    }
  }

  // ──────────────────────────────────────────────
  //  ENV FILES
  // ──────────────────────────────────────────────
  private async generateEnvFiles(): Promise<void> {
    let env = `# ─── APP ───
NODE_ENV=development
PORT=3000
APP_NAME=${this.config.projectName}
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:4200

# ─── DATABASE ───\n`;

    switch (this.config.database) {
      case "postgresql":
        env += `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${this.config.projectName}
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=${this.config.projectName}\n`;
        break;
      case "mongodb":
        env += `DATABASE_URL=mongodb://localhost:27017/${this.config.projectName}
MONGO_URI=mongodb://localhost:27017/${this.config.projectName}\n`;
        break;
      case "mysql":
        env += `DATABASE_URL=mysql://root:root@localhost:3306/${this.config.projectName}
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=${this.config.projectName}\n`;
        break;
    }

    if (this.config.tokenStrategy === "jwt") {
      env += `
# ─── JWT ───
JWT_SECRET=change-this-secret-in-production-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d\n`;
    }

    if (
      this.config.caching === "redis" ||
      this.config.messageQueue === "bullmq"
    ) {
      env += `
# ─── REDIS ───
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=\n`;
    }

    if (this.config.emailProvider !== "none") {
      env += `\n# ─── EMAIL ───\n`;
      switch (this.config.emailProvider) {
        case "nodemailer":
          env += `SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@example.com\n`;
          break;
        case "sendgrid":
          env += `SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@example.com\n`;
          break;
        case "aws-ses":
          env += `AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
EMAIL_FROM=noreply@example.com\n`;
          break;
        case "resend":
          env += `RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@example.com\n`;
          break;
      }
    }

    if (this.config.smsProvider) {
      env += `\n# ─── SMS ───\n`;
      switch (this.config.smsProvider) {
        case "twilio":
          env += `TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890\n`;
          break;
        case "vonage":
          env += `VONAGE_API_KEY=your-vonage-api-key
VONAGE_API_SECRET=your-vonage-api-secret\n`;
          break;
      }
    }

    // ── OAuth env vars ──
    if (this.config.oauthProviders.length > 0) {
      env += `\n# ─── OAUTH ───\n`;
      for (const provider of this.config.oauthProviders) {
        const name = provider.replace("-oauth", "").toUpperCase();
        env += `${name}_CLIENT_ID=your-${name.toLowerCase()}-client-id
${name}_CLIENT_SECRET=your-${name.toLowerCase()}-client-secret
${name}_CALLBACK_URL=http://localhost:3000/api/v1/auth/${name.toLowerCase()}/callback\n`;
      }
    }

    if (this.config.authFeatures.includes("2fa")) {
      env += `\n# ─── 2FA ───
TWO_FACTOR_APP_NAME=${this.config.projectName}\n`;
    }

    if (this.config.fileUpload === "s3") {
      env += `\n# ─── AWS S3 ───
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY=your-access-key
AWS_S3_SECRET_KEY=your-secret-key\n`;
    }

    await fs.writeFile(path.join(this.projectPath, ".env"), env);
    await fs.writeFile(path.join(this.projectPath, ".env.example"), env);
  }

  // ──────────────────────────────────────────────
  //  CONFIG FILES
  // ──────────────────────────────────────────────
  private async generateConfigFiles(): Promise<void> {
    // ── tsconfig.json ──
    const tsconfig = {
      compilerOptions: {
        module: "commonjs",
        declaration: true,
        removeComments: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        allowSyntheticDefaultImports: true,
        target: "ES2021",
        sourceMap: true,
        outDir: "./dist",
        baseUrl: "./",
        incremental: true,
        skipLibCheck: true,
        strictNullChecks: false,
        noImplicitAny: false,
        paths: { "@/*": ["src/*"] },
      },
    };
    await fs.writeJSON(path.join(this.projectPath, "tsconfig.json"), tsconfig, {
      spaces: 2,
    });

    // ── nest-cli.json ──
    const nestCli: any = {
      $schema: "https://json.schemastore.org/nest-cli",
      collection: "@nestjs/schematics",
      sourceRoot: "src",
      compilerOptions: { deleteOutDir: true },
    };

    if (this.config.apiStyles.includes("grpc")) {
      nestCli.compilerOptions.assets = ["**/*.proto"];
      nestCli.compilerOptions.watchAssets = true;
    }

    await fs.writeJSON(path.join(this.projectPath, "nest-cli.json"), nestCli, {
      spaces: 2,
    });

    // ── .gitignore ──
    const gitignore = `node_modules/
dist/
.env
*.log
coverage/
.DS_Store
.idea/
.vscode/`;

    await fs.writeFile(path.join(this.projectPath, ".gitignore"), gitignore);

    // ── .prettierrc ──
    await fs.writeJSON(
      path.join(this.projectPath, ".prettierrc"),
      {
        singleQuote: true,
        trailingComma: "all",
        printWidth: 80,
        tabWidth: 2,
        semi: true,
      },
      { spaces: 2 },
    );
  }

  // ──────────────────────────────────────────────
  //  INSTALL DEPENDENCIES
  // ──────────────────────────────────────────────
  private installDependencies(): void {
    const cmds: Record<string, string> = {
      pnpm: "pnpm install",
      yarn: "yarn install",
      npm: "npm install",
      bun: "bun install",
    };
    const cmd = cmds[this.config.packageManager] || "npm install";
    execSync(cmd, { cwd: this.projectPath, stdio: "pipe" });
  }
}
