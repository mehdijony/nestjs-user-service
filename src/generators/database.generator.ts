// src/generators/database.generator.ts
import * as fs from "fs-extra";
import * as path from "path";
import { UserConfig } from "../config/feature.matrix";

export class DatabaseGenerator {
  constructor(
    private config: UserConfig,
    private projectPath: string,
    private templatePath: string,
  ) {}

  async generate(): Promise<void> {
    switch (this.config.orm) {
      case "prisma":
        await this.generatePrisma();
        break;
      case "typeorm":
        await this.generateTypeORM();
        break;
      case "mongoose":
        await this.generateMongoose();
        break;
      case "drizzle":
        await this.generateDrizzle();
        break;
    }
  }

  private async generatePrisma(): Promise<void> {
    // Determine provider
    const providerMap: Record<string, string> = {
      postgresql: "postgresql",
      mongodb: "mongodb",
      mysql: "mysql",
      sqlite: "sqlite",
      mssql: "sqlserver",
    };

    const isRelational = this.config.database !== "mongodb";

    let schema = `// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${providerMap[this.config.database]}"
  url      = env("DATABASE_URL")
}

model User {
  ${isRelational ? "id        Int      @id @default(autoincrement())" : 'id        String   @id @default(auto()) @map("_id") @db.ObjectId'}
  email     String?  @unique
  phone     String?  @unique
  password  String?
  firstName String?
  lastName  String?
  avatar    String?
  isActive  Boolean  @default(true)
  isVerified Boolean @default(false)
  provider  String?  @default("local")
  providerId String?
  ${this.config.authFeatures.includes("2fa") ? "twoFactorSecret String?\n  twoFactorEnabled Boolean @default(false)" : ""}
  ${isRelational ? "createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt" : "createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt"}
  ${this.config.authFeatures.includes("rbac") && isRelational ? "roles     UserRole[]" : ""}
  ${this.config.authFeatures.includes("device-management") && isRelational ? "sessions  Session[]" : ""}
  ${this.config.tokenStrategy === "jwt" && isRelational ? "refreshTokens RefreshToken[]" : ""}

  @@map("users")
}

${
  this.config.tokenStrategy === "jwt"
    ? `
model RefreshToken {
  ${isRelational ? "id        Int      @id @default(autoincrement())" : 'id        String   @id @default(auto()) @map("_id") @db.ObjectId'}
  token     String   @unique
  expiresAt DateTime
  ${isRelational ? "userId    Int\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)" : "userId    String   @db.ObjectId"}
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
}`
    : ""
}

${
  this.config.authFeatures.includes("rbac") && isRelational
    ? `
model Role {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  description String?
  users     UserRole[]
  ${this.config.authFeatures.includes("permissions") ? "permissions RolePermission[]" : ""}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("roles")
}

model UserRole {
  id     Int  @id @default(autoincrement())
  userId Int
  roleId Int
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@map("user_roles")
}`
    : ""
}

${
  this.config.authFeatures.includes("permissions") && isRelational
    ? `
model Permission {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  resource    String
  action      String
  roles       RolePermission[]
  createdAt   DateTime @default(now())

  @@map("permissions")
}

model RolePermission {
  id           Int        @id @default(autoincrement())
  roleId       Int
  permissionId Int
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}`
    : ""
}

${
  this.config.authFeatures.includes("device-management") && isRelational
    ? `
model Session {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  device    String?
  ip        String?
  userAgent String?
  lastActive DateTime @default(now())
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("sessions")
}`
    : ""
}
`;

    await fs.writeFile(
      path.join(this.projectPath, "prisma", "schema.prisma"),
      schema,
    );

    // Prisma Service
    const prismaService = `
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "common", "prisma.service.ts"),
      prismaService,
    );

    // Prisma Module
    const prismaModule = `
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "common", "prisma.module.ts"),
      prismaModule,
    );

    // Seed file
    const seedFile = `
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isVerified: true,
    },
  });

  console.log('Seed completed:', { admin });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
`;

    await fs.writeFile(
      path.join(this.projectPath, "prisma", "seed.ts"),
      seedFile,
    );
  }

  private async generateTypeORM(): Promise<void> {
    // User Entity
    const userEntity = `
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ${this.config.authFeatures.includes("rbac") ? "ManyToMany, JoinTable, " : ""}
} from 'typeorm';
${this.config.authFeatures.includes("rbac") ? "import { Role } from '../../role/entities/role.entity';" : ""}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true, default: 'local' })
  provider: string;

  @Column({ nullable: true })
  providerId: string;

  ${
    this.config.authFeatures.includes("2fa")
      ? `
  @Column({ nullable: true })
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;
  `
      : ""
  }

  ${
    this.config.authFeatures.includes("rbac")
      ? `
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({ name: 'user_roles' })
  roles: Role[];
  `
      : ""
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "user", "entities", "user.entity.ts"),
      userEntity,
    );

    // Data source configuration
    const dbTypeMap: Record<string, string> = {
      postgresql: "postgres",
      mysql: "mysql",
      sqlite: "sqlite",
      mssql: "mssql",
    };

    const dataSource = `
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

export default new DataSource({
  type: '${dbTypeMap[this.config.database]}' as any,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '${this.config.database === "postgresql" ? "5432" : "3306"}'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '${this.config.projectName}',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
});`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "database", "data-source.ts"),
      dataSource,
    );
  }

  private async generateMongoose(): Promise<void> {
    const userSchema = `
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document${this.config.authFeatures.includes("rbac") ? ", Types" : ""} } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop()
  password?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  avatar?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 'local' })
  provider: string;

  @Prop()
  providerId?: string;

  ${
    this.config.authFeatures.includes("2fa")
      ? `
  @Prop()
  twoFactorSecret?: string;

  @Prop({ default: false })
  twoFactorEnabled: boolean;
  `
      : ""
  }

  ${
    this.config.authFeatures.includes("rbac")
      ? `
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }] })
  roles: Types.ObjectId[];
  `
      : ""
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "user", "entities", "user.schema.ts"),
      userSchema,
    );
  }

  private async generateDrizzle(): Promise<void> {
    // Generate Drizzle schema
    const drizzleSchema = `
import {
  pgTable, serial, varchar, boolean,
  timestamp, integer, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).unique(),
  password: varchar('password', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatar: varchar('avatar', { length: 500 }),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  provider: varchar('provider', { length: 50 }).default('local'),
  providerId: varchar('provider_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "database", "schema.ts"),
      drizzleSchema,
    );
  }
}
