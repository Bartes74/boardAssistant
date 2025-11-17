import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

const STATUSES = ["new", "updated", "archived"] as const;

class ChunkDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsArray()
  embedding?: number[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

class DocumentDto {
  @IsString()
  canonical_url!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  doc_type?: string;

  @IsOptional()
  @IsUUID()
  topic_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChunkDto)
  chunks!: ChunkDto[];
}

export class IngestSourceDto {
  @IsOptional()
  @IsUUID()
  source_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents!: DocumentDto[];
}
