import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Reusable pagination + search query params. */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Free-text search' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Sort field, prefix with - for desc, e.g. -createdAt' })
  @IsOptional() @IsString()
  sort?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/** Builds the standard { data, meta } paginated envelope. */
export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}
