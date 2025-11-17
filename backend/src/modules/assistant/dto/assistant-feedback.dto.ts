import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class AssistantFeedbackDto {
  @IsString()
  queryId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  importantTopics?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completedArticles?: string[];

  @IsOptional()
  @IsBoolean()
  markAsUseful?: boolean;
}
