import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { AssistantService } from "./assistant.service";
import { QueryAssistantDto } from "./dto/query-assistant.dto";
import { AssistantFeedbackDto } from "./dto/assistant-feedback.dto";

@Controller("assistant")
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post("query")
  query(@CurrentUser() user: AuthenticatedUser, @Body() dto: QueryAssistantDto) {
    return this.assistant.query(user, dto);
  }

  @Post("feedback")
  feedback(@CurrentUser() user: AuthenticatedUser, @Body() dto: AssistantFeedbackDto) {
    return this.assistant.feedback(user, dto);
  }
}
