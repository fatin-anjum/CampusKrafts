import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpPurpose, Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ForgotPasswordDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto, VerifyOtpDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Registration & OTP ────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.findByIdentifier(dto.email || dto.phone!);
    if (existing) throw new ConflictException({ code: 'USER_EXISTS', message: 'Account already exists' });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, phone: dto.phone, passwordHash },
    });

    await this.issueOtp(user.id, OtpPurpose.SIGNUP);
    return { userId: user.id, message: 'OTP sent. Verify to activate the account.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.findByIdentifier(dto.identifier);
    if (!user) throw new BadRequestException({ code: 'INVALID_OTP', message: 'Invalid code' });
    await this.consumeOtp(user.id, dto.purpose, dto.code);

    if (dto.purpose === OtpPurpose.SIGNUP) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    }
    return { verified: true };
  }

  // ── Login / tokens ────────────────────────────────────────────────────
  async login(dto: LoginDto, ctx: { ip?: string; userAgent?: string }) {
    const user = await this.findByIdentifier(dto.email || dto.phone!);
    if (!user || !user.passwordHash) throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Invalid credentials' });
    if (user.isBanned) throw new UnauthorizedException({ code: 'BANNED', message: 'Account suspended' });

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Invalid credentials' });

    return this.issueSession(user, ctx);
  }

  async refresh(dto: RefreshDto) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken, { secret: this.config.get('jwt.refreshSecret') });
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Invalid refresh token' });
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Session expired' });
    }
    const matches = await bcrypt.compare(dto.refreshToken, session.refreshTokenHash);
    if (!matches) throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Token mismatch' });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    const accessToken = await this.signAccess(user);
    return { accessToken, expiresIn: this.config.get<number>('jwt.accessTtl') };
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  // ── Password reset ────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findByIdentifier(dto.identifier);
    if (user) await this.issueOtp(user.id, OtpPurpose.RESET);
    // Always return success to avoid user enumeration
    return { message: 'If the account exists, a reset code was sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findByIdentifier(dto.identifier);
    if (!user) throw new BadRequestException({ code: 'INVALID_OTP', message: 'Invalid code' });
    await this.consumeOtp(user.id, OtpPurpose.RESET, dto.code);

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Force re-login everywhere on password change
      this.prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { success: true };
  }

  // ── Profile & sessions ────────────────────────────────────────────────
  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.sanitize(user);
  }

  async listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async issueSession(user: User, ctx: { ip?: string; userAgent?: string }) {
    const sid = randomUUID();
    const refreshTtl = this.config.get<number>('jwt.refreshTtl')!;
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid },
      { secret: this.config.get('jwt.refreshSecret'), expiresIn: refreshTtl },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.session.create({
      data: {
        id: sid,
        userId: user.id,
        refreshTokenHash,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    const accessToken = await this.signAccess(user);
    return {
      user: this.sanitize(user),
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.accessTtl'),
    };
  }

  private signAccess(user: User) {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role, email: user.email },
      { secret: this.config.get('jwt.accessSecret'), expiresIn: this.config.get<number>('jwt.accessTtl') },
    );
  }

  private async issueOtp(userId: string, purpose: OtpPurpose) {
    const code = randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(code, 10);
    await this.prisma.otpToken.create({
      data: { userId, purpose, codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    // DEV: log the OTP. PROD: send via SMS (BD provider) / email instead.
    this.logger.warn(`OTP for ${userId} [${purpose}] = ${code} (dev only)`);
  }

  private async consumeOtp(userId: string, purpose: OtpPurpose, code: string) {
    const token = await this.prisma.otpToken.findFirst({
      where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!token) throw new BadRequestException({ code: 'INVALID_OTP', message: 'Code expired or not found' });
    const ok = await bcrypt.compare(code, token.codeHash);
    if (!ok) throw new BadRequestException({ code: 'INVALID_OTP', message: 'Incorrect code' });
    await this.prisma.otpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
  }

  private findByIdentifier(identifier: string) {
    const where: Prisma.UserWhereInput = identifier.includes('@')
      ? { email: identifier }
      : { phone: identifier };
    return this.prisma.user.findFirst({ where });
  }

  private sanitize(user: User) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
