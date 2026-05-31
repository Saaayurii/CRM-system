import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const SUPER_ADMIN_ROLE_ID = 1;

/**
 * Allows the request only for super_admin (roleId = 1).
 * Used to protect writes to the global construction-norms knowledge base.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
      throw new ForbiddenException(
        'Только супер-администратор может изменять нормативную базу',
      );
    }
    return true;
  }
}
