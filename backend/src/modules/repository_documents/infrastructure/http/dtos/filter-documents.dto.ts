import { IsOptional, IsString } from 'class-validator';

export class FilterDocumentsDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  classId?: string;
}