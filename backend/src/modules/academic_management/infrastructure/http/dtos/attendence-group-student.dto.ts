import { IsBoolean, IsDate, IsNotEmpty, IsString } from "class-validator";
import { Type } from 'class-transformer';

export class AttendenceGroupStudentDTO {
    @IsNotEmpty()
    @IsString()
    teacherId: string;

    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsNotEmpty()
    studentRows: AttendenceGroupStudentRow[];
}

export class AttendenceGroupStudentRow {
    @IsNotEmpty()
    @IsString()
    studentId: string; 

    @IsNotEmpty()
    @IsBoolean()
    isPresent: boolean;
} 