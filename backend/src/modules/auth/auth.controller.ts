import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./current-user.decorator";
import { AuthenticatedUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards()
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      userId: user.userId,
      role: user.role,
      email: user.email,
    };
  }
}

