import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { UserRole } from "@prisma/client";

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}


