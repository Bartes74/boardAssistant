import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService, AdminUser } from "./admin.service";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { UpdateAdminUserDto } from "./dto/update-admin-user.dto";

@Controller("admin/users")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async list(): Promise<{ users: AdminUser[] }> {
    const users = await this.adminService.listUsers();
    return { users };
  }

  @Post()
  async create(@Body() dto: CreateAdminUserDto): Promise<AdminUser> {
    return this.adminService.createUser(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateAdminUserDto): Promise<AdminUser> {
    return this.adminService.updateUser(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<{ status: "ok" }> {
    await this.adminService.deleteUser(id);
    return { status: "ok" };
  }
}


