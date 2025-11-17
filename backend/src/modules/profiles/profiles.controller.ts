import { Body, Controller, Get, Put } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { ProfilesService } from "./profiles.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.getProfile(user);
  }

  @Put("me")
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.profiles.updateProfile(user, dto);
  }
}
