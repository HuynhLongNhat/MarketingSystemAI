
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  hasPermission,
  type Permission,
} from "./permissions.js";
import { PERMISSIONS_KEY } from "./permissions.decorator.js";
import { AuthenticatedRequest } from "src/auth/request-context.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const ctx = request.requestContext;

    if (!ctx) {
      throw new ForbiddenException("Request context required");
    }

    const allowed = requiredPermissions.every((permission) =>
      hasPermission(ctx.role, permission),
    );

    if (!allowed) {
      throw new ForbiddenException(
        "Insufficient organization permissions",
      );
    }

    return true;
  }
}
