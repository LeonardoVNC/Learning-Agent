import { Inject, Injectable, Logger } from "@nestjs/common";
import {  COURSE_REPO, ENROLLMENT_REPO, CLASSES_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import { Enrollment } from "../../domain/entities/enrollment.entity";
import { ConflictError, ForbiddenError, NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class SoftDeleteSingleEnrollmentUseCase {
    private readonly logger = new Logger(SoftDeleteSingleEnrollmentUseCase.name)
    constructor(
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classRepo: ClassesRepositoryPort,       
    ){}

    async execute(input: {classId: string, studentId: string, teacherId: string}): Promise<Enrollment> {
        const enrollment = await this.enrollmentRepo.findByStudentAndClass(input.studentId,input.classId);
        if (!enrollment) {
          this.logger.error(`Enrollment not found for student ${input.studentId} and class ${input.classId}`);
          throw new NotFoundError("No se encontró la inscripción del estudiante en esta clase");
        }
        const objClass = await this.classRepo.findById(input.classId);
        if (!objClass) {
          this.logger.error(`Class not found with id ${input.classId}`);
          throw new NotFoundError("No se encontró la clase");
        }    
        const course = await this.courseRepo.findById(objClass.courseId);
        if (!course) {
          this.logger.error(`Course not found with id ${objClass.courseId}`);
          throw new NotFoundError("No se encontró el curso");
        }    
        if (course?.teacherId !== input.teacherId) {
          this.logger.error(
            `Teacher ${input.teacherId} tried to delete enrollment in class ${input.classId}, but course ${course.id} belongs to teacher ${course.teacherId}`,
          );
          throw new ForbiddenError("El docente no tiene permisos sobre esta clase");
        }
        return this.enrollmentRepo.softDelete(input.studentId, input.classId);
    }
}