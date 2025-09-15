import { Inject, Injectable, Logger } from '@nestjs/common';
import { ATTENDANCE_REPO, CLASSES_REPO, COURSE_REPO, ENROLLMENT_REPO } from '../../tokens';
import type { AttendanceRepositoryPort } from '../../domain/ports/attendance.repository.ports';
import type { EnrollmentRepositoryPort } from '../../domain/ports/enrollment.repository.ports';
import type { ClassesRepositoryPort } from '../../domain/ports/classes.repository.ports';
import type { CourseRepositoryPort } from '../../domain/ports/courses.repository.ports';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../shared/handler/errors';
import { AttendenceGroupStudentRow } from '../../infrastructure/http/dtos/attendence-group-student.dto';
import { Attendance } from '../../domain/entities/attendance.entity';

@Injectable()
export class SaveAttendanceGroupStudentUseCase {
    private readonly logger = new Logger(SaveAttendanceGroupStudentUseCase.name)
    constructor(
        @Inject(ATTENDANCE_REPO) private readonly attendanceRepo: AttendanceRepositoryPort,
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
    ) { }
    //classId:string ,teacherId:string, date:Date, studentRows: AttendenceGroupStudentRow[] 
    async execute(input: {
        classId: string,
        teacherId: string,
        date: Date,
        studentRows: AttendenceGroupStudentRow[],
    }) {
        const objClass = await this.classesRepo.findById(input.classId);
        if (!objClass) {
            this.logger.error(`Class not found with ID ${input.classId}`);
            throw new NotFoundError(`No se ha podido recupear la información de la clase`);
        }
        const course = await this.courseRepo.findById(objClass.courseId);
        if (!course) {
            this.logger.error(`Course not found with id ${objClass.courseId}`);
            throw new NotFoundError(`No se ha podido recuperar la información de la materia`);
        }
        if (course.teacherId != input.teacherId) {
            this.logger.error(`Class ${objClass.id}-${objClass.name} doesnt belongs to teacher ${input.teacherId}`);
            throw new ForbiddenError(`El docente no está autorizado para registrar asistencia en esta clase.`);
        }
        let totalRows = input.studentRows.length, errorRows = 0, existingRows = 0, successRows = 0;
        for (const row of input.studentRows) {
            const enrollment = await this.enrollmentRepo.findByStudentAndClass(row.studentId, input.classId);
            if (!enrollment) {
                this.logger.error(`Enrollment not found for student ${row.studentId} and class ${input.classId}`);
                errorRows++;
                continue;
            }
            const existing = await this.attendanceRepo.findByStudentClassAndDate(
                row.studentId,
                input.classId,
                input.date
            );
            
            if (existing) {
                existingRows++;
                continue;
            }
            successRows++;
            const normalizedDate = new Date(input.date);
            normalizedDate.setHours(12, 0, 0, 0);
            await this.attendanceRepo.create(row.studentId, input.classId, normalizedDate, row.isPresent);
        }

        if (existingRows === totalRows) {
            this.logger.error(`Attendance on class ${input.classId} already saved today. Trying to overwrite attendances on POST endpoint.`)
            throw new ConflictError(`Ya se ha guardado la asistencia del día de hoy`)
        }
        return { totalRows, errorRows, existingRows, successRows };
    }
}
