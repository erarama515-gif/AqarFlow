import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from '../application/token.service';

/**
 * @CurrentUser() — convenience parameter decorator that pulls the JWT payload
 * from the request. Use only on routes protected by JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AccessTokenPayload;
  },
);
