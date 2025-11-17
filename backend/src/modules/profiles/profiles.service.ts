import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProfile(user: AuthenticatedUser) {
    const existing = await this.prisma.userProfile.findUnique({
      where: { id: user.userId },
    });

    if (existing) {
      return existing;
    }

    const data: Prisma.UserProfileCreateInput = {
      id: user.userId,
      role: user.role,
      email: user.email,
      regions: [],
      industries: [],
      competitorsWatch: [],
      keywordsInclude: [],
      keywordsExclude: [],
      detailLevel: "medium",
      responseStyle: {
        length: "short",
        format: "bullets",
        language: "pl",
      },
    };

    return this.prisma.userProfile.create({ data });
  }

  async getProfile(user: AuthenticatedUser) {
    const profile = await this.prisma.userProfile.findUnique({ where: { id: user.userId } });
    if (!profile) {
      throw new NotFoundException("Profil użytkownika nie został znaleziony");
    }
    return profile;
  }

  async updateProfile(user: AuthenticatedUser, dto: UpdateProfileDto) {
    await this.ensureProfile(user);
    return this.prisma.userProfile.update({
      where: { id: user.userId },
      data: {
        regions: dto.regions,
        industries: dto.industries,
        competitorsWatch: dto.competitors_watchlist,
        keywordsInclude: dto.keywords_include,
        keywordsExclude: dto.keywords_exclude,
        detailLevel: dto.detail_level,
        responseStyle: dto.response_style,
        sourcePrefs: dto.source_prefs,
      },
    });
  }
}
