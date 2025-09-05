import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteStudentDTO {
  @IsNotEmpty()
  @IsString()
  teacherId: string;
  @IsNotEmpty()
  @IsString()
  studentId: string;
}

 