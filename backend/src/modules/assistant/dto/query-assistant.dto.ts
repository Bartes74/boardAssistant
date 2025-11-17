import { IsOptional, IsString, Length } from "class-validator";

export class QueryAssistantDto {
  @IsString()
  @Length(4, 1500)
  question!: string;

  @IsOptional()
  from_date?: string;

  @IsOptional()
  to_date?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
