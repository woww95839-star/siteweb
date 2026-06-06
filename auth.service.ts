import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../config/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Validation utilisateur (utilisé par LocalStrategy) ──
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException({
        message: 'Identifiants invalides',
        messageAr: 'بيانات الاعتماد غير صالحة',
      });
    }

    if (!user.isActive) {
      throw new ForbiddenException({
        message: 'Compte désactivé. Contactez l\'administrateur.',
        messageAr: 'الحساب معطّل. تواصل مع المسؤول.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'Identifiants invalides',
        messageAr: 'بيانات الاعتماد غير صالحة',
      });
    }

    return user;
  }

  // ── Login principal ───────────────────────────────────────
  async login(loginDto: LoginDto): Promise<AuthTokens & { user: any }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Mise à jour du lastLogin
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log d'activité
    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login',
        resourceType: 'auth',
        metadata: { email: user.email },
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        fullNameAr: user.fullNameAr,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  // ── Refresh Token ─────────────────────────────────────────
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException({
        message: 'Token de rafraîchissement invalide ou expiré',
        messageAr: 'رمز التحديث غير صالح أو منتهي الصلاحية',
      });
    }

    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException({
        message: 'Token de rafraîchissement révoqué',
        messageAr: 'رمز التحديث مُلغى',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException();
    }

    // Révoquer l'ancien token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  // ── Logout ────────────────────────────────────────────────
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash },
        data: { isRevoked: true },
      });
    } else {
      // Révoquer tous les refresh tokens
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'logout',
        resourceType: 'auth',
      },
    });
  }

  // ── Get current user ──────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        fullNameAr: true,
        role: true,
        phone: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            companyName: true,
            companyNameAr: true,
            isValidated: true,
            wilayaCode: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  // ── Helpers ───────────────────────────────────────────────
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.secret'),
        expiresIn: this.config.get('jwt.expiresIn', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn', '7d'),
      }),
    ]);

    // Stocker le hash du refresh token
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    // Nettoyage des anciens tokens expirés
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes en secondes
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
