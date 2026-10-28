
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

import type {
  AuthenticatedRequest,
  RequestContext,
} from "./request-context.js";

export const CurrentContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestContext => {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.requestContext) {
      throw new UnauthorizedException("Request context unavailable");
    }

    return request.requestContext;
  },
);
