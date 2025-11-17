import { Controller, Get, Param, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { TopicsService } from "./topics.service";
import { QueryTopicsDto } from "./dto/query-topics.dto";

@Controller("topics")
export class TopicsController {
  constructor(private readonly topics: TopicsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryTopicsDto) {
    return this.topics.listTopics(user, query);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.topics.getTopic(user, id);
  }
}
