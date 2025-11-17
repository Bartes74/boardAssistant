import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

type PrismaAuthContext = {
  userId: string;
  role?: string;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private authContext?: PrismaAuthContext;
  private settingAuthContext = false;

  constructor() {
    super({
      log: process.env.NODE_ENV === "production" ? [] : ["query", "info", "warn", "error"],
    });

    this.$use(async (params, next) => {
      if (this.authContext && !this.settingAuthContext) {
        this.settingAuthContext = true;
        try {
          await super.$queryRaw`select set_config('request.jwt.claim.sub', ${this.authContext.userId}, true)`;
          const role = this.authContext.role ?? "authenticated";
          await super.$queryRaw`select set_config('request.jwt.claim.role', ${role}, true)`;
        } finally {
          this.settingAuthContext = false;
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Połączono z bazą danych");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on("beforeExit", async () => {
      await app.close();
    });
  }

  setAuthContext(context?: PrismaAuthContext) {
    this.authContext = context;
  }

  clearAuthContext() {
    this.authContext = undefined;
  }
}
