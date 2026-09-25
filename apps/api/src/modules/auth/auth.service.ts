import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { AuthUser, LoginResponse } from '@pharmapro/shared';
import * as argon2 from 'argon2';
import type { Request } from 'express';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../../common/services/audit.service';
import { ENV } from '../../env';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from './strategy/jwt.strategy';

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } };
        };
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: { email: string; password: string }, request?: Request): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is disabled');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password).catch(() => false);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    void this.auditService.log({
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.buildLoginResponse(user);
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: ENV.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.buildLoginResponse(user);
  }

  logout(userId: string, request?: Request): { success: boolean } {
    void this.auditService.log({
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });
    return { success: true };
  }

  async changePassword(
    user: RequestUser,
    dto: { currentPassword: string; newPassword: string },
    request?: Request,
  ): Promise<{ success: boolean }> {
    const current = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!current || current.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await argon2.verify(current.passwordHash, dto.currentPassword).catch(() => false);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: user.sub }, data: { passwordHash } });

    void this.auditService.log({
      action: 'auth.change-password',
      entityType: 'User',
      entityId: user.sub,
      userId: user.sub,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  async me(user: RequestUser): Promise<AuthUser> {
    const current = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!current || current.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }

  private buildLoginResponse(user: UserWithRoles): LoginResponse {
    const authUser = this.toAuthUser(user);
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, username: user.username, type: 'access' } satisfies JwtPayload,
      { secret: ENV.jwtSecret, expiresIn: ENV.accessTokenTtl as JwtSignOptions['expiresIn'] },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email, username: user.username, type: 'refresh' } satisfies JwtPayload,
      { secret: ENV.jwtRefreshSecret, expiresIn: ENV.refreshTokenTtl as JwtSignOptions['expiresIn'] },
    );
    return { user: authUser, accessToken, refreshToken, expiresIn: parseTtlSeconds(ENV.accessTokenTtl) };
  }

  private toAuthUser(user: UserWithRoles | RequestUser): AuthUser {
    if ('userRoles' in user) {
      const roles = user.userRoles.map((ur) => ur.role.name);
      const permissions = Array.from(
        new Set(
          user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => `${rp.permission.module}.${rp.permission.action}`),
          ),
        ),
      );
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        roles,
        permissions,
      };
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}

function parseTtlSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = Number(match[1]);
  switch (match[2]) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return value;
  }
}