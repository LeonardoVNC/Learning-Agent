import { IsNotEmpty, IsString } from "class-validator";

export class absencesByClassDTO {
  @IsNotEmpty()
  @IsString()
  teacherId: string;
}
