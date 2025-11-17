import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { TopicStatus } from "@prisma/client";

export class QueryTopicsDto {
  @IsOptional()
  @IsIn(Object.values(TopicStatus))
  status?: TopicStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}
