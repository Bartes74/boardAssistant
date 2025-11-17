import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "./auth.types";

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (user?.userId) {
      this.prisma.setAuthContext({ userId: user.userId, role: "authenticated" });
    }

    return next.handle().pipe(
      finalize(() => {
        this.prisma.clearAuthContext();
      })
    );
  }
}
