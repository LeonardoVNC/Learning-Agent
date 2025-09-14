import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENROLLMENT_REPO, STUDENT_REPO, CLASSES_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import { AlreadyCreatedError, NotFoundError } from "../../../../shared/handler/errors";
import { CreateStudentProfileUseCase } from "./create-student-profile.usecase";

@Injectable()
export class EnrollSingleStudentUseCase {
    private readonly logger = new Logger(EnrollSingleStudentUseCase.name)
    constructor(
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        private readonly createStudent: CreateStudentProfileUseCase,
    ) { }

    async execute(input: { studentName: string; studentLastname: string; studentCode: string; classId: string }) {
        const ojbClass = await this.classesRepo.findById(input.classId);
        if (!ojbClass) {
            this.logger.error(`Class not found with ID ${input.classId}`)
            throw new NotFoundError(`No se ha podido recupear la información del período académico`);
        }

        let student = await this.studentRepo.findByCode(input.studentCode);
        if (!student) {
            this.logger.log(`Student not found with code ${input.studentCode}, creating new user:`);
            try {
                student = await this.createStudent.execute(input)
                this.logger.log(student)
            } catch (error) {
                this.logger.error(`Error trying to create a new user for student with code ${input.studentCode}`);
                throw error
            }
        }

        const existingEnrollment = await this.enrollmentRepo.findByStudentAndClass(student.userId, input.classId);

        if (existingEnrollment) {
            if (!existingEnrollment.isActive) {
                await this.enrollmentRepo.enableEnrollment(student.userId,input.classId);
                return { ...existingEnrollment, isActive: true };
            }
            throw new AlreadyCreatedError(`Este estudiante ya se encuentra inscrito en el período académico`);
        }

        const enrollment = await this.enrollmentRepo.create(student.userId, input.classId);
        return enrollment;
    }
}   