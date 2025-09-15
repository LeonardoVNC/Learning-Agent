import { Inject, Injectable, Logger } from "@nestjs/common";
import {  COURSE_REPO, CLASSES_REPO,ATTENDANCE_REPO, TEACHER_REPO ,STUDENT_REPO} from "../../tokens";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import type { AttendanceRepositoryPort } from "../../domain/ports/attendance.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import type { ProfessorRepositoryPort } from "../../domain/ports/teacher.repository.ports";
import {ForbiddenError, NotFoundError } from "../../../../shared/handler/errors";

@Injectable()
export class getDateAbsencesBystudentUseCase {
    private readonly logger = new Logger(getDateAbsencesBystudentUseCase.name)
    constructor(
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
        @Inject(ATTENDANCE_REPO) private readonly attendanceRepo: AttendanceRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
        @Inject(TEACHER_REPO) private teacherRepo : ProfessorRepositoryPort,
    ) {}

    async execute(input:{
        studentId:string,
        teacherId: string,
        classId: string,
    }) {
        const student = await this.studentRepo.findByUserId(input.studentId);
        if (!student) {
          this.logger.error(`Student not found with Id ${input.teacherId}`);
          throw new NotFoundError("No se encontró el estudiante");
        }
        const teacher = await this.teacherRepo.findByUserId(input.teacherId);
        if (!teacher) {
          this.logger.error(`Teacher not found with Id ${input.teacherId}`);
          throw new NotFoundError("No se encontró el docente");
        }
        const objClass = await this.classesRepo.findById(input.classId);
        if (!objClass) {
            this.logger.error(`Class not found with Id ${input.classId}`)
            throw new NotFoundError(`No se ha podido recuperar la información de la clase`)
        }
        
        const course = await this.courseRepo.findById(objClass.courseId);
        if (!course) {
          this.logger.error(`Course not found with id ${objClass.courseId}`);
          throw new NotFoundError("No se encontró el curso");
        }    
        if (course.teacherId !== input.teacherId) {
          this.logger.error(`Teacher ${input.teacherId} does not have permissions for the class ${input.classId}`);
          throw new ForbiddenError("El docente no tiene permisos sobre esta clase");
        }
        const attendances = await this.attendanceRepo.findByStudentAndClass(input.studentId, input.classId);  
        if (!attendances || attendances.length === 0) {
          this.logger.warn(`No attendance records found for student ${input.studentId} in class ${input.classId}`);
          return [];
        }

        const absenceDates = attendances
          .filter(a => !a.isPresent)
          .map(a => a.date);

        return absenceDates;

    }
}