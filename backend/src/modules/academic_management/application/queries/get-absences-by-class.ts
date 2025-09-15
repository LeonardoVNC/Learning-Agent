import { Inject, Injectable, Logger } from "@nestjs/common";
import {  COURSE_REPO, ENROLLMENT_REPO, CLASSES_REPO,ATTENDANCE_REPO, STUDENT_REPO, USER_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import type { AttendanceRepositoryPort } from "../../domain/ports/attendance.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import type { UserRepositoryPort } from "src/modules/identity/domain/ports/user.repository.port";
import { Enrollment } from "../../domain/entities/enrollment.entity";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../../shared/handler/errors";


@Injectable()
export class GetAbsencesByClass {
    private readonly logger = new Logger(GetAbsencesByClass.name)
    constructor(
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
        @Inject(ATTENDANCE_REPO) private readonly attendanceRepo: AttendanceRepositoryPort,
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
        @Inject(USER_REPO) private readonly userRepo: UserRepositoryPort,
    ) {}

    async execute(input:{
        classId: string,
        teacherId: string,
    }) {
        const teacher = await this.userRepo.findById(input.teacherId);
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
        if (course?.teacherId !== input.teacherId) {
          this.logger.error(`Teacher ${input.teacherId} does not have permissions for the class ${input.classId}`);
          throw new ForbiddenError("El docente no tiene permisos sobre esta clase");
        }
        const enrollments: Enrollment[] = await this.enrollmentRepo.findByClassId(input.classId);
        type AbsenceInfo = {
            id: string ;
            nombre: string ;
            apellido: string;
            codigo:string;
            totalAbsences: number;
        };  

        const result: AbsenceInfo[] = [];
        // const result = [];
        for (const enrollment of enrollments) {
            if (!enrollment.isActive)continue
            const totalAbsences = await this.attendanceRepo.countAbsenceByStudentAndClass(
                enrollment.studentId,
                input.classId,
            );
            
            const student = await this.studentRepo.findByUserId(enrollment.studentId);
            if (!student) {
              this.logger.warn(`Student not found: ${enrollment.studentId}`);
              continue;
            }
            const user  = await this.userRepo.findById(student.userId);
            if (!user) {
              this.logger.warn(`User not found: ${student.userId}`);
              continue;
            }
            result.push({
                id: student.userId,
                nombre: user.name,
                apellido: user.lastname,
                codigo: student.code,
                totalAbsences,
            });
        }
        return result;

    }
}