import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { TerminusModule } from "@nestjs/terminus";
import configuration from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { TopicsModule } from "./modules/topics/topics.module";
import { AssistantModule } from "./modules/assistant/assistant.module";
import { SourcesModule } from "./modules/sources/sources.module";
import { HealthModule } from "./modules/health/health.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        transport:
          process.env.NODE_ENV !== "production"
            ? {
                target: "pino-pretty",
                options: {
                  singleLine: true,
                  translateTime: "SYS:standard",
                },
              }
            : undefined,
        redact: {
          paths: ["req.headers.authorization", "req.body", "res.body"],
          remove: true,
        },
      },
    }),
    PrismaModule,
    TerminusModule,
    AuthModule,
    ProfilesModule,
    TopicsModule,
    AssistantModule,
    SourcesModule,
    HealthModule,
    AdminModule,
  ],
})
export class AppModule {}
