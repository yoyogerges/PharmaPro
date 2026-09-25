import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@pharmapro/shared';

export interface RequestUser extends AuthUser {
  /** Prisma user id from the JWT `sub` claim */
  sub: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
  return request.user;
});