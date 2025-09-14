import { Inject, Injectable, Logger } from "@nestjs/common";
import { CLASSES_REPO, COURSE_REPO, ENROLLMENT_REPO } from "../../tokens";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import { Classes } from "../../domain/entities/classes.entity";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../../shared/handler/errors";

@Injectable()
export class SoftDeleteClassUseCase {
    private readonly logger = new Logger(SoftDeleteClassUseCase.name)
    constructor(
        @Inject(CLASSES_REPO) private readonly classRepo: ClassesRepositoryPort,
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
    ){}

    async execute(input: {teacherId: string, classId: string}): Promise<Classes> {
        const objClass = await this.classRepo.findById(input.classId)
        if (!objClass) {
            this.logger.error(`Class not found with id ${input.classId}`)
            throw new NotFoundError(`No se ha podido recuprar la información del período académico}`)
        }

        const course = await this.courseRepo.findById(objClass.courseId)
        if (!course) {
            this.logger.error(`Course not found with id ${objClass.courseId}`)
            throw new NotFoundError(`No se ha podido recuperar la información de la materia`)
        }
        
        if (course.teacherId != input.teacherId) {
            this.logger.error(`Class ${objClass.id}-${objClass.name} doesnt belongs to teacher ${input.teacherId}`)
            throw new ForbiddenError(`No se ha podido recuperar la información del Docente`)
        }

        const enrollments = await this.enrollmentRepo.findByClassId(input.classId)
        const pendingEnrollments = enrollments.filter((e)=>e.isActive)
        if (pendingEnrollments.length > 0) {
            this.logger.error(`Class ${objClass.id}-${objClass.name} has pending enrollments`)
            throw new ConflictError(`No se pudo eliminar este período. Elimine a los estudiantes inscritos e intente de nuevo.`)
        }

        return this.classRepo.softDelete(input.classId)
    }
}