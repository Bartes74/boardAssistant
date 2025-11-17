import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ResponseStyleDto {
  @IsIn(["short", "medium", "long"])
  length!: string;

  @IsIn(["bullets", "narrative"])
  format!: string;

  @IsIn(["pl", "en"])
  language!: string;
}

class SourcePrefsDto {
  @IsOptional()
  @IsBoolean()
  internal_priority?: boolean;

  @IsOptional()
  @IsBoolean()
  exclude_social?: boolean;
}

export class UpdateProfileDto {
  @IsArray()
  @IsString({ each: true })
  regions!: string[];

  @IsArray()
  @IsString({ each: true })
  industries!: string[];

  @IsArray()
  @IsString({ each: true })
  competitors_watchlist!: string[];

  @IsArray()
  @IsString({ each: true })
  @Length(1, 64, { each: true })
  keywords_include!: string[];

  @IsArray()
  @IsString({ each: true })
  @Length(1, 64, { each: true })
  keywords_exclude!: string[];

  @IsIn(["low", "medium", "high"])
  detail_level!: string;

  @ValidateNested()
  @Type(() => ResponseStyleDto)
  response_style!: ResponseStyleDto;

  @ValidateNested()
  @Type(() => SourcePrefsDto)
  source_prefs!: SourcePrefsDto;
}
