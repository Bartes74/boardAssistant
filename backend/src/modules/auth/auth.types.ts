import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  email?: string;
  token?: string;
}
