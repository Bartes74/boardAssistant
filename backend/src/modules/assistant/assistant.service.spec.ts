import { describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { AssistantService } from "./assistant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { UserRole } from "@prisma/client";

vi.mock("axios", () => ({
  default: {
    create: vi.fn().mockReturnValue({
      post: vi.fn().mockRejectedValue(new Error("network error")),
    }),
  },
}));

class PrismaMock {
  userProfile = {
    findUnique: vi.fn().mockResolvedValue(null),
  };

  userQueryLog = {
    create: vi.fn().mockResolvedValue({ id: "query-1" }),
  };

  userTopicScore = {
    upsert: vi.fn().mockResolvedValue(undefined),
  };
}

describe("AssistantService", () => {
  it("powinien zwrócić fallback gdy rag-service niedostępny", async () => {
    const prisma = new PrismaMock() as unknown as PrismaService;
    const config = {
      get: vi.fn().mockReturnValue("http://rag-service"),
    } as unknown as ConfigService;
    const service = new AssistantService(prisma, config);
    const user: AuthenticatedUser = { userId: "ceo-001", role: UserRole.BOARD_MEMBER };

    const response = await service.query(user, { question: "Co nowego?" });

    expect(response.tldr).toContain("Brak odpowiedzi");
    expect(prisma.userQueryLog.create).toHaveBeenCalled();
  });
});
