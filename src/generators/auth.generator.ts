// src/generators/auth.generator.ts
import * as fs from "fs-extra";
import * as path from "path";
import { UserConfig } from "../config/feature.matrix";

export class AuthGenerator {
  private config: UserConfig;
  private projectPath: string;
  private templatePath: string;

  constructor(config: UserConfig, projectPath: string, templatePath: string) {
    this.config = config;
    this.projectPath = projectPath;
    this.templatePath = templatePath;
  }

  async generate(): Promise<void> {
    await this.generateDTOs();
    await this.generateUserService();
    await this.generateUserModule();
    await this.generateAuthService();
    await this.generateAuthController();
    await this.generateAuthModule();

    // ── Token strategy ──
    if (this.config.tokenStrategy === "jwt") {
      await this.generateJwtStrategy();
    }

    // ── Per login type ──
    for (const loginType of this.config.loginTypes) {
      switch (loginType) {
        case "google-oauth":
          await this.generateOAuthStrategy("google");
          break;
        case "facebook-oauth":
          await this.generateOAuthStrategy("facebook");
          break;
        case "github-oauth":
          await this.generateOAuthStrategy("github");
          break;
        case "apple-oauth":
          await this.generateAppleStrategy();
          break;
        case "twitter-oauth":
          await this.generateOAuthStrategy("twitter");
          break;
        case "linkedin-oauth":
          await this.generateOAuthStrategy("linkedin");
          break;
        case "discord-oauth":
          await this.generateOAuthStrategy("discord");
          break;
        case "ldap":
          await this.generateLdapStrategy();
          break;
        case "saml":
          await this.generateSamlStrategy();
          break;
        case "api-key":
          await this.generateApiKeyStrategy();
          break;
      }
    }

    // ── OTP service ──
    if (this.config.hasOtp) {
      await this.generateOtpService();
    }

    // ── Extra features ──
    if (this.config.authFeatures.includes("2fa")) {
      await this.generateTwoFactorService();
    }
    if (this.config.authFeatures.includes("rbac")) {
      await this.generateRBACGuard();
    }
    if (this.config.authFeatures.includes("rate-limit")) {
      await this.generateRateLimiting();
    }
    if (this.config.authFeatures.includes("device-management")) {
      await this.generateSessionManagement();
    }
    if (this.config.authFeatures.includes("password-strength")) {
      await this.generatePasswordStrength();
    }
  }

  // ── DTOs ──
  private async generateDTOs(): Promise<void> {
    const registerDto = `
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
${this.config.monitoring.includes("swagger") ? "import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';" : ""}

export class RegisterEmailDto {
  ${this.config.monitoring.includes("swagger") ? "@ApiProperty({ example: 'user@example.com' })" : ""}
  @IsEmail()
  email: string;

  ${this.config.monitoring.includes("swagger") ? "@ApiProperty({ minLength: 8 })" : ""}
  @IsString()
  @MinLength(8)
  password: string;

  ${this.config.monitoring.includes("swagger") ? "@ApiPropertyOptional()" : ""}
  @IsOptional()
  @IsString()
  firstName?: string;

  ${this.config.monitoring.includes("swagger") ? "@ApiPropertyOptional()" : ""}
  @IsOptional()
  @IsString()
  lastName?: string;
}`;

    const loginDto = `
import { IsEmail, IsString } from 'class-validator';
${this.config.monitoring.includes("swagger") ? "import { ApiProperty } from '@nestjs/swagger';" : ""}

export class LoginEmailDto {
  ${this.config.monitoring.includes("swagger") ? "@ApiProperty({ example: 'user@example.com' })" : ""}
  @IsEmail()
  email: string;

  ${this.config.monitoring.includes("swagger") ? "@ApiProperty()" : ""}
  @IsString()
  password: string;
}`;

    const createUserDto = `
import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsBoolean() isVerified?: boolean;
}`;

    const updateUserDto = `
import { PartialType } from '${this.config.monitoring.includes("swagger") ? "@nestjs/swagger" : "@nestjs/mapped-types"}';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}`;

    await fs.ensureDir(path.join(this.projectPath, "src", "auth", "dto"));
    await fs.ensureDir(path.join(this.projectPath, "src", "user", "dto"));

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "dto",
        "register-email.dto.ts",
      ),
      registerDto,
    );
    await fs.writeFile(
      path.join(this.projectPath, "src", "auth", "dto", "login-email.dto.ts"),
      loginDto,
    );
    await fs.writeFile(
      path.join(this.projectPath, "src", "user", "dto", "create-user.dto.ts"),
      createUserDto,
    );
    await fs.writeFile(
      path.join(this.projectPath, "src", "user", "dto", "update-user.dto.ts"),
      updateUserDto,
    );
  }

  // ── User Service ──
  private async generateUserService(): Promise<void> {
    let content = "";

    if (this.config.orm === "prisma") {
      content = `
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    return this.prisma.user.create({ data });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true, email: true, phone: true,
          firstName: true, lastName: true, avatar: true,
          isActive: true, isVerified: true,
          createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findFirst({ where: { phone } });
  }

  async findByProvider(provider: string, providerId: string) {
    return this.prisma.user.findFirst({ where: { provider, providerId } });
  }

  async update(id: number, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: number, password: string) {
    return this.prisma.user.update({ where: { id }, data: { password } });
  }

  async delete(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}`;
    } else if (this.config.orm === "mongoose") {
      content = `
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(data: CreateUserDto): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find().select('-password').skip(skip).limit(limit),
      this.userModel.countDocuments(),
    ]);
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async findByPhone(phone: string) {
    return this.userModel.findOne({ phone });
  }

  async findByProvider(provider: string, providerId: string) {
    return this.userModel.findOne({ provider, providerId });
  }

  async update(id: string, data: UpdateUserDto) {
    return this.userModel.findByIdAndUpdate(id, data, { new: true });
  }

  async updatePassword(id: string, password: string) {
    return this.userModel.findByIdAndUpdate(id, { password });
  }

  async delete(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }
}`;
    } else {
      // typeorm default
      content = `
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      select: ['id', 'email', 'phone', 'firstName', 'lastName', 'isActive', 'createdAt'],
    });
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string) {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findByProvider(provider: string, providerId: string) {
    return this.userRepository.findOne({ where: { provider, providerId } });
  }

  async update(id: number, data: UpdateUserDto) {
    await this.userRepository.update(id, data);
    return this.findById(id);
  }

  async updatePassword(id: number, password: string) {
    return this.userRepository.update(id, { password });
  }

  async delete(id: number) {
    return this.userRepository.delete(id);
  }
}`;
    }

    await fs.ensureDir(path.join(this.projectPath, "src", "user"));
    await fs.writeFile(
      path.join(this.projectPath, "src", "user", "user.service.ts"),
      content,
    );
  }

  // ── User Module ──
  private async generateUserModule(): Promise<void> {
    let content = "";

    if (this.config.orm === "mongoose") {
      content = `
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './entities/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}`;
    } else if (this.config.orm === "typeorm") {
      content = `
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}`;
    } else {
      content = `
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}`;
    }

    await fs.writeFile(
      path.join(this.projectPath, "src", "user", "user.module.ts"),
      content,
    );
  }

  // ── Auth Service ──
  private async generateAuthService(): Promise<void> {
    const content = `
import {
  Injectable, UnauthorizedException,
  ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
${this.config.hasOtp ? "import { OtpService } from './otp.service';" : ""}
${this.config.emailProvider !== "none" ? "import { MailService } from '../mail/mail.service';" : ""}
import { RegisterEmailDto } from './dto/register-email.dto';
import { LoginEmailDto } from './dto/login-email.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    ${this.config.hasOtp ? "private readonly otpService: OtpService," : ""}
    ${this.config.emailProvider !== "none" ? "private readonly mailService: MailService," : ""}
  ) {}

  ${
    this.config.loginTypes.includes("email-password")
      ? `
  async registerWithEmail(dto: RegisterEmailDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userService.create({
      email: dto.email,
      password: hashed,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    return this.buildAuthResponse(user);
  }

  async loginWithEmail(dto: LoginEmailDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user?.password) throw new UnauthorizedException('Invalid credentials');
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
    if (!user) user = await this.userService.create({ phone });
    const otp = await this.otpService.generate(phone);
    this.logger.log(\`OTP for \${phone}: \${otp}\`);
    return { message: 'OTP sent', expiresIn: 300 };
  }

  async verifyMobileOtp(phone: string, otp: string) {
    const valid = await this.otpService.verify(phone, otp);
    if (!valid) throw new UnauthorizedException('Invalid or expired OTP');
    const user = await this.userService.findByPhone(phone);
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
    if (!user) user = await this.userService.create({ email });
    const otp = await this.otpService.generate(email);
    this.logger.log(\`OTP for \${email}: \${otp}\`);
    return { message: 'OTP sent', expiresIn: 300 };
  }

  async verifyEmailOtp(email: string, otp: string) {
    const valid = await this.otpService.verify(email, otp);
    if (!valid) throw new UnauthorizedException('Invalid or expired OTP');
    const user = await this.userService.findByEmail(email);
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
    if (!user) user = await this.userService.create({ email });
    const token = await this.jwtService.signAsync(
      { sub: user.id, email, type: 'magic-link' },
      { expiresIn: '15m' },
    );
    const link = \`\${this.configService.get('APP_URL')}/auth/magic-link/verify?token=\${token}\`;
    this.logger.log(\`Magic link: \${link}\`);
    return { message: 'Magic link sent', expiresIn: 900 };
  }

  async verifyMagicLink(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.type !== 'magic-link') throw new Error('Invalid type');
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
    if (!user) return { message: 'If email exists, reset link sent' };
    const token = await this.jwtService.signAsync(
      { sub: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );
    this.logger.log(\`Password reset token: \${token}\`);
    return { message: 'If email exists, reset link sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.type !== 'password-reset') throw new Error('Invalid type');
      const hashed = await bcrypt.hash(newPassword, 12);
      await this.userService.updatePassword(payload.sub, hashed);
      return { message: 'Password reset successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired token');
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
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number) {
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
    const { password, twoFactorSecret, ...safeUser } = user?.dataValues || user;
    return { user: safeUser, ...tokens };
  }
}`;

    await fs.ensureDir(path.join(this.projectPath, "src", "auth"));
    await fs.writeFile(
      path.join(this.projectPath, "src", "auth", "auth.service.ts"),
      content,
    );
  }

  // ── Auth Controller ──
  private async generateAuthController(): Promise<void> {
    const content = `
import {
  Controller, Post, Get, Body,
  Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
${this.config.monitoring.includes("swagger") ? "import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';" : ""}
${this.config.hasOAuth ? "import { AuthGuard } from '@nestjs/passport';" : ""}
${this.config.loginTypes.includes("email-password") ? "import { RegisterEmailDto } from './dto/register-email.dto';\nimport { LoginEmailDto } from './dto/login-email.dto';" : ""}

${this.config.monitoring.includes("swagger") ? "@ApiTags('Auth')" : ""}
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  ${
    this.config.loginTypes.includes("email-password")
      ? `
  @Post('register')
  register(@Body() dto: RegisterEmailDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginEmailDto) {
    return this.authService.loginWithEmail(dto);
  }
  `
      : ""
  }

  ${
    this.config.loginTypes.includes("mobile-otp")
      ? `
  @Post('mobile/otp/send')
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
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
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
      path.join(this.projectPath, "src", "auth", "auth.controller.ts"),
      content,
    );
  }

  // ── Auth Module ──
  private async generateAuthModule(): Promise<void> {
    const content = `
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
${this.config.tokenStrategy === "jwt" ? "import { JwtStrategy } from './strategies/jwt.strategy';" : ""}
${this.config.hasOtp ? "import { OtpService } from './otp.service';" : ""}

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ${this.config.tokenStrategy === "jwt" ? "JwtStrategy," : ""}
    ${this.config.hasOtp ? "OtpService," : ""}
  ],
  exports: [AuthService],
})
export class AuthModule {}`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "auth", "auth.module.ts"),
      content,
    );
  }

  // ── JWT Strategy ──
  private async generateJwtStrategy(): Promise<void> {
    await fs.ensureDir(
      path.join(this.projectPath, "src", "auth", "strategies"),
    );
    await fs.ensureDir(path.join(this.projectPath, "src", "auth", "guards"));
    await fs.ensureDir(
      path.join(this.projectPath, "src", "auth", "decorators"),
    );

    const strategy = `
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return user;
  }
}`;

    const guard = `
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}`;

    const decorator = `
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "strategies",
        "jwt.strategy.ts",
      ),
      strategy,
    );
    await fs.writeFile(
      path.join(this.projectPath, "src", "auth", "guards", "jwt-auth.guard.ts"),
      guard,
    );
    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "decorators",
        "current-user.decorator.ts",
      ),
      decorator,
    );
  }

  // ── OAuth Strategy ──
  private async generateOAuthStrategy(
    provider:
      | "google"
      | "facebook"
      | "github"
      | "twitter"
      | "linkedin"
      | "discord",
  ): Promise<void> {
    const configs: Record<string, any> = {
      google: {
        package: "passport-google-oauth20",
        scope: `['email', 'profile']`,
        profileMap: `{
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          avatar: profile.photos[0]?.value,
          provider: 'google',
          providerId: profile.id,
        }`,
      },
      github: {
        package: "passport-github2",
        scope: `['user:email']`,
        profileMap: `{
          email: profile.emails?.[0]?.value,
          firstName: profile.displayName?.split(' ')[0],
          lastName: profile.displayName?.split(' ')[1],
          avatar: profile.photos?.[0]?.value,
          provider: 'github',
          providerId: profile.id,
        }`,
      },
      facebook: {
        package: "passport-facebook",
        scope: `['email']`,
        profileMap: `{
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          avatar: profile.photos?.[0]?.value,
          provider: 'facebook',
          providerId: profile.id,
        }`,
      },
      discord: {
        package: "passport-discord",
        scope: `['identify', 'email']`,
        profileMap: `{
          email: profile.email,
          firstName: profile.username,
          avatar: null,
          provider: 'discord',
          providerId: profile.id,
        }`,
      },
      twitter: {
        package: "passport-twitter",
        scope: `[]`,
        profileMap: `{
          email: profile.emails?.[0]?.value,
          firstName: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          provider: 'twitter',
          providerId: profile.id,
        }`,
      },
      linkedin: {
        package: "passport-linkedin-oauth2",
        scope: `['r_emailaddress', 'r_liteprofile']`,
        profileMap: `{
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          avatar: profile.photos?.[0]?.value,
          provider: 'linkedin',
          providerId: profile.id,
        }`,
      },
    };

    const cfg = configs[provider];
    const envPrefix = provider.toUpperCase();
    const className = provider.charAt(0).toUpperCase() + provider.slice(1);

    const content = `
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from '${cfg.package}';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ${className}Strategy extends PassportStrategy(Strategy, '${provider}') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get('${envPrefix}_CLIENT_ID'),
      clientSecret: configService.get('${envPrefix}_CLIENT_SECRET'),
      callbackURL: configService.get('${envPrefix}_CALLBACK_URL'),
      scope: ${cfg.scope},
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    const user = ${cfg.profileMap};
    done(null, user);
  }
}`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "strategies",
        `${provider}.strategy.ts`,
      ),
      content,
    );
  }

  // ── Apple Strategy (separate — different auth flow) ──
  private async generateAppleStrategy(): Promise<void> {
    const content = `
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get('APPLE_CLIENT_ID'),
      teamID: configService.get('APPLE_TEAM_ID'),
      keyID: configService.get('APPLE_KEY_ID'),
      privateKeyLocation: configService.get('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: configService.get('APPLE_CALLBACK_URL'),
      scope: ['name', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    const user = {
      email: profile.email,
      firstName: profile.name?.firstName,
      lastName: profile.name?.lastName,
      provider: 'apple',
      providerId: profile.id,
    };
    done(null, user);
  }
}`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "strategies",
        "apple.strategy.ts",
      ),
      content,
    );
  }

  // ── LDAP Strategy ──
  private async generateLdapStrategy(): Promise<void> {
    const content = `
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-ldapauth';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, 'ldap') {
  constructor(configService: ConfigService) {
    super({
      server: {
        url: configService.get('LDAP_URL'),
        bindDN: configService.get('LDAP_BIND_DN'),
        bindCredentials: configService.get('LDAP_BIND_CREDENTIALS'),
        searchBase: configService.get('LDAP_SEARCH_BASE'),
        searchFilter: '(uid={{username}})',
      },
    });
  }

  async validate(user: any) {
    return user;
  }
}`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "strategies",
        "ldap.strategy.ts",
      ),
      content,
    );
  }

  // ── SAML Strategy ──
  private async generateSamlStrategy(): Promise<void> {
    const content = `
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-saml';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  constructor(configService: ConfigService) {
    super({
      entryPoint: configService.get('SAML_ENTRY_POINT'),
      issuer: configService.get('SAML_ISSUER'),
      callbackUrl: configService.get('SAML_CALLBACK_URL'),
      cert: configService.get('SAML_CERT'),
    });
  }

  async validate(profile: any, done: Function) {
    const user = {
      email: profile.email || profile.nameID,
      firstName: profile.firstName,
      lastName: profile.lastName,
      provider: 'saml',
      providerId: profile.nameID,
    };
    done(null, user);
  }
}`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "strategies",
        "saml.strategy.ts",
      ),
      content,
    );
  }

  // ── API Key Strategy ──
  private async generateApiKeyStrategy(): Promise<void> {
    const content = `
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { UserService } from '../../user/user.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private readonly userService: UserService) {
    super(
      { header: 'X-API-KEY', prefix: '' },
      true,
      async (apiKey: string, done: Function) => {
        return this.validate(apiKey, done);
      },
    );
  }

  async validate(apiKey: string, done: Function) {
    // Implement your API key validation logic here
    if (!apiKey) {
      return done(new UnauthorizedException('Invalid API key'), false);
    }
    // TODO: look up key in database
    done(null, { apiKey });
  }
}`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "strategies",
        "api-key.strategy.ts",
      ),
      content,
    );
  }

  // ── OTP Service ──
  private async generateOtpService(): Promise<void> {
    const content = `
import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpService {
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();

  async generate(identifier: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    this.otpStore.set(identifier, { otp, expiresAt });
    return otp;
  }

  async verify(identifier: string, otp: string): Promise<boolean> {
    const stored = this.otpStore.get(identifier);
    if (!stored) return false;
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(identifier);
      return false;
    }
    if (stored.otp === otp) {
      this.otpStore.delete(identifier);
      return true;
    }
    return false;
  }
}`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "auth", "otp.service.ts"),
      content,
    );
  }

  // ── Two Factor Service ──
  private async generateTwoFactorService(): Promise<void> {
    await fs.ensureDir(path.join(this.projectPath, "src", "two-factor"));
    const content = `
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async generateSecret(userId: number) {
    const user = await this.userService.findById(userId);
    const secret = authenticator.generateSecret();
    const appName = this.configService.get('TWO_FACTOR_APP_NAME') || 'App';
    const otpAuthUrl = authenticator.keyuri(user.email, appName, secret);
    await this.userService.update(userId, { twoFactorSecret: secret } as any);
    return { secret, otpAuthUrl };
  }

  async enable2FA(userId: number, token: string) {
    const user = await this.userService.findById(userId);
    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });
    if (!isValid) throw new UnauthorizedException('Invalid 2FA token');
    await this.userService.update(userId, { twoFactorEnabled: true } as any);
    return { message: '2FA enabled successfully' };
  }

  async verify2FA(userId: number, token: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    return authenticator.verify({ token, secret: user.twoFactorSecret });
  }

  async disable2FA(userId: number) {
    await this.userService.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    } as any);
    return { message: '2FA disabled' };
  }
}`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "two-factor", "two-factor.service.ts"),
      content,
    );
  }

  // ── RBAC Guard ──
  private async generateRBACGuard(): Promise<void> {
    const guard = `
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) =>
      user.roles?.map((r: any) => r.name || r).includes(role),
    );
  }
}`;

    const decorator = `
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);`;

    await fs.writeFile(
      path.join(this.projectPath, "src", "auth", "guards", "roles.guard.ts"),
      guard,
    );
    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "auth",
        "decorators",
        "roles.decorator.ts",
      ),
      decorator,
    );
  }

  // ── Rate Limiting ──
  private async generateRateLimiting(): Promise<void> {
    const content = `
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ips.length ? req.ips[0] : req.ip;
  }
}`;

    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "common",
        "guards",
        "throttler.guard.ts",
      ),
      content,
    );
  }

  // ── Session Management ──
  private async generateSessionManagement(): Promise<void> {
    const content = `
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionService {
  // Implement session/device management logic here
  async getSessions(userId: number) {
    return [];
  }

  async revokeSession(userId: number, sessionId: string) {
    return { message: 'Session revoked' };
  }

  async revokeAllSessions(userId: number) {
    return { message: 'All sessions revoked' };
  }
}`;

    await fs.ensureDir(path.join(this.projectPath, "src", "session"));
    await fs.writeFile(
      path.join(this.projectPath, "src", "session", "session.service.ts"),
      content,
    );
  }

  // ── Password Strength ──
  private async generatePasswordStrength(): Promise<void> {
    const content = `
import {
  registerDecorator, ValidationOptions,
  ValidatorConstraint, ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string) {
    if (!password || password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }

  defaultMessage() {
    return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}`;

    await fs.ensureDir(
      path.join(this.projectPath, "src", "common", "decorators"),
    );
    await fs.writeFile(
      path.join(
        this.projectPath,
        "src",
        "common",
        "decorators",
        "is-strong-password.decorator.ts",
      ),
      content,
    );
  }
}
