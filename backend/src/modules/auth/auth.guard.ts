import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { AuthenticatedUser } from "./auth.types";

export const PUBLIC_ROUTE_KEY = "isPublic";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = await this.authService.validateHeaders(request.headers);
    request.user = user;
    return true;
  }
}
